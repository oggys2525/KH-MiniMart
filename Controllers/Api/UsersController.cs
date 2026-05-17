using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using MiniMartPOSWeb.ViewModels;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UsersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers(int page = 1, int pageSize = 10, string search = "")
        {
            var query = _context.Users.Include(u => u.Role).AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u =>
                    (u.Username != null && u.Username.Contains(search)) ||
                    (u.FullName != null && u.FullName.Contains(search)) ||
                    (u.Email != null && u.Email.Contains(search)));
            }

            var totalItems = await query.CountAsync();
            var users = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.UserId,
                    u.Username,
                    u.FullName,
                    u.Email,
                    u.ProfileImage,
                    RoleName = u.Role!.RoleName,
                    u.Status
                })
                .ToListAsync();

            return Ok(new { items = users, totalItems, page, pageSize });
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser([FromBody] UserViewModel model)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            if (await _context.Users.AnyAsync(u => u.Username == model.Username))
                return BadRequest("Username already exists");

            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == model.RoleName);
            if (role == null)
                return BadRequest("Invalid role");

            var user = new User
            {
                Username = model.Username,
                FullName = model.FullName,
                Email = model.Email,
                ProfileImage = string.IsNullOrWhiteSpace(model.ProfileImage) ? null : model.ProfileImage,
                RoleId = role.RoleId,
                Status = model.Status,
                CreatedDate = DateTime.Now
            };
            user.SetPassword(model.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(user);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UserViewModel model)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            if (!string.IsNullOrWhiteSpace(model.Username))
                user.Username = model.Username;
            user.FullName = model.FullName;
            user.Email = model.Email;
            user.ProfileImage = string.IsNullOrWhiteSpace(model.ProfileImage) ? null : model.ProfileImage;
            var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == model.RoleName);
            if (role != null)
                user.RoleId = role.RoleId;
            user.Status = model.Status;

            if (!string.IsNullOrEmpty(model.Password))
            {
                user.SetPassword(model.Password);
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }

        [HttpPost("upload-image")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = "Invalid file type." });

            if (file.Length > 5 * 1024 * 1024)
                return BadRequest(new { message = "File must be less than 5 MB." });

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

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
                return NotFound();

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok();
        }
    }
}