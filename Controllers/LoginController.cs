using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using BCrypt.Net;
using Microsoft.AspNetCore.Http; // IMPORTANT: Added for Session handling
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace MiniMartPOSWeb.Controllers
{
    public class LoginController : Controller
    {
        private readonly ApplicationDbContext _context;

        public LoginController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public IActionResult Login()
        {
            // FIX: Point specifically to the view location shown in your screenshot
            return View("~/Views/Account/Login.cshtml");
        }



        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(string username, string password)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Username == username);

            // user not found
            if (user == null)
            {
                ModelState.AddModelError("", "Invalid username or password.");
                return View("~/Views/Account/Login.cshtml");
            }

            // legacy case: password stored in plain text instead of a bcrypt hash
            if (!user.PasswordHash.StartsWith("$2") && password == user.PasswordHash)
            {
                // re-hash and save so future logins work
                user.SetPassword(password);
                await _context.SaveChangesAsync();
            }

            // verify the (now hashed) password
            if (!user.VerifyPassword(password))
            {
                ModelState.AddModelError("", "Invalid username or password.");
                return View("~/Views/Account/Login.cshtml");
            }

            // determine role from db safe fallback
            var roleName = user.Role?.RoleName;
            if (string.IsNullOrWhiteSpace(roleName))
            {
                var dbRole = await _context.Roles.FindAsync(user.RoleId);
                roleName = dbRole?.RoleName ?? "Guest";
            }
            roleName = roleName.Trim();

            // Login Successful - Set up Claims for Cookie Authentication
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Name, user.Username ?? string.Empty),
                new Claim(ClaimTypes.GivenName, user.FullName ?? string.Empty),
                new Claim(ClaimTypes.Role, roleName)
            };

            var claimsIdentity = new ClaimsIdentity(claims, "DefaultCookieAuth");
            var authProperties = new AuthenticationProperties
            {
                IsPersistent = true
            };

            await HttpContext.SignInAsync(
                "DefaultCookieAuth",
                new ClaimsPrincipal(claimsIdentity),
                authProperties);

            // Also set session for backward compatibility
            HttpContext.Session.SetString("Username", user.Username ?? string.Empty);
            HttpContext.Session.SetString("Role", roleName);

            // also set staff permissions cache
            var permission = await _context.StaffPermissions.FirstOrDefaultAsync(p => p.UserId == user.UserId);
            var allowedPages = permission == null
                ? "Pos,Orders,Products,Customers,Reports,Profile,ChangePassword,Overview"
                : permission.AllowedPages ?? string.Empty;
            HttpContext.Session.SetString("AllowedPages", allowedPages);

            // Load categories into session
            var categories = await _context.Categories.ToListAsync();
            HttpContext.Session.SetString("CategoriesLoaded", "true");

            // Redirect based on role
            if (string.Equals(roleName, "Admin", StringComparison.OrdinalIgnoreCase))
            {
                return RedirectToAction("Dashboard", "Admin");
            }
            else
            {
                return RedirectToAction("Dashboard", "Staff");
            }
        }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            // allow GET logout for simple anchor link
            await HttpContext.SignOutAsync("DefaultCookieAuth");
            HttpContext.Session.Clear();
            return RedirectToAction("Login", "Login");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> LogoutConfirmed()
        {
            // explicit POST version if you want to use antiforgery
            await HttpContext.SignOutAsync("DefaultCookieAuth");
            HttpContext.Session.Clear();
            return RedirectToAction("Login", "Login");
        }
    }
}