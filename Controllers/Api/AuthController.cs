using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using BCrypt.Net;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Username and password are required" });
            }

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username != null && u.Username.ToLower() == request.Username.Trim().ToLower());

            if (user == null || user.Role == null)
            {
                return Unauthorized(new { message = "Invalid username or password" });
            }

            if (!user.Status)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your account is disabled. Please contact an administrator." });
            }

            var passwordHash = user.PasswordHash ?? string.Empty;
            var passwordValid = false;

            if (IsBcryptHash(passwordHash))
            {
                try
                {
                    passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, passwordHash);
                }
                catch
                {
                    // Corrupt hash should not crash login endpoint.
                    passwordValid = false;
                }
            }
            else
            {
                // Legacy plain-text password support.
                passwordValid = request.Password == passwordHash;

                if (passwordValid)
                {
                    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                    await _context.SaveChangesAsync();
                }
            }

            if (!passwordValid)
            {
                return Unauthorized(new { message = "Invalid username or password" });
            }

            var roleName = user.Role.RoleName?.Trim() ?? string.Empty;

            // Fetch allowed pages for Staff users
            var allowedPages = "Pos,Orders,Products,Customers,Reports,Profile,ChangePassword,Overview";
            if (string.Equals(roleName, "Staff", StringComparison.OrdinalIgnoreCase))
            {
                var perm = await _context.StaffPermissions.FirstOrDefaultAsync(p => p.UserId == user.UserId);
                // If a permission record exists, respect it exactly (including empty string for "no access").
                if (perm != null)
                    allowedPages = perm.AllowedPages ?? string.Empty;
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.Name, user.Username ?? string.Empty),
                new Claim(ClaimTypes.Role, roleName),
                new Claim("UserId", user.UserId.ToString()),
                new Claim("FullName", user.FullName ?? user.Username ?? string.Empty),
                new Claim("AllowedPages", allowedPages)
            };

            var jwtKey = _configuration["Jwt:Key"];
            if (string.IsNullOrWhiteSpace(jwtKey))
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = "Server authentication configuration is invalid." });
            }

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _configuration["Jwt:Issuer"],
                audience: _configuration["Jwt:Audience"],
                claims: claims,
                expires: DateTime.Now.AddHours(8),
                signingCredentials: creds);

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                userId = user.UserId,
                role = roleName,
                username = user.Username ?? string.Empty,
                fullName = user.FullName ?? user.Username ?? string.Empty,
                profileImage = user.ProfileImage ?? string.Empty,
                allowedPages
            });
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { message = "Invalid user session." });
            }

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId.Value);

            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            return Ok(new
            {
                userId = user.UserId,
                username = user.Username ?? string.Empty,
                fullName = user.FullName ?? string.Empty,
                email = user.Email ?? string.Empty,
                profileImage = user.ProfileImage ?? string.Empty,
                role = user.Role?.RoleName ?? string.Empty
            });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] ProfileUpdateRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Profile data is required." });
            }

            var userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { message = "Invalid user session." });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.UserId == userId.Value);
            if (user == null)
            {
                return NotFound(new { message = "User not found." });
            }

            if (request.FullName != null)
            {
                var trimmedFullName = request.FullName.Trim();
                if (string.IsNullOrWhiteSpace(trimmedFullName))
                {
                    return BadRequest(new { message = "Full name cannot be empty." });
                }

                user.FullName = trimmedFullName;
            }

            if (request.ProfileImage != null)
            {
                user.ProfileImage = string.IsNullOrWhiteSpace(request.ProfileImage)
                    ? null
                    : request.ProfileImage.Trim();
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Profile updated successfully.",
                fullName = user.FullName ?? string.Empty,
                profileImage = user.ProfileImage ?? string.Empty
            });
        }

        [Authorize]
        [HttpPost("profile/upload-image")]
        public async Task<IActionResult> UploadProfileImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided." });
            }

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new { message = "Invalid file type." });
            }

            if (file.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "File must be less than 5 MB." });
            }

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "users");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var imageUrl = $"/images/users/{fileName}";
            return Ok(new { url = imageUrl });
        }

        private int? GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst("UserId")?.Value;
            if (int.TryParse(userIdClaim, out var userId))
            {
                return userId;
            }

            return null;
        }

        private static bool IsBcryptHash(string value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return false;
            }

            return value.StartsWith("$2a$") || value.StartsWith("$2b$") || value.StartsWith("$2y$");
        }
    }

    public class LoginRequest
    {
        public string Username { get; set; } = null!;
        public string Password { get; set; } = null!;
    }

    public class ProfileUpdateRequest
    {
        public string? FullName { get; set; }
        public string? ProfileImage { get; set; }
    }
}