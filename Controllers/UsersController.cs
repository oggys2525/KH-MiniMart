using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using MiniMartPOSWeb.ViewModels;

namespace MiniMartPOSWeb.Controllers
{
    [Authorize(Roles = "Admin")]
    public class UsersController : Controller
    {
        private readonly ApplicationDbContext _context;

        public UsersController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: /Users
        public async Task<IActionResult> Index(int page = 1, int pageSize = 10, string search = "")
        {
            // Ensure default roles exist
            if (!await _context.Roles.AnyAsync())
            {
                _context.Roles.AddRange(
                    new Role { RoleId = 1, RoleName = "Admin" },
                    new Role { RoleId = 2, RoleName = "Staff" }
                );
                await _context.SaveChangesAsync();
            }

            // Ensure default admin user exists
            if (!await _context.Users.AnyAsync())
            {
                var adminUser = new User
                {
                    Username = "admin",
                    FullName = "Administrator",
                    Email = "admin@example.com",
                    RoleId = 1,
                    Status = true,
                    CreatedDate = DateTime.Now
                };
                adminUser.SetPassword("admin123");
                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();
            }

            var query = _context.Users
                .Include(u => u.Role)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u => (u.Username != null && u.Username.Contains(search)) ||
                                        (u.FullName != null && u.FullName.Contains(search)) ||
                                        (u.Email != null && u.Email.Contains(search)) ||
                                        (u.Role != null && u.Role.RoleName != null && u.Role.RoleName.Contains(search)));
            }

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderBy(u => u.Username)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new PagedResult<User>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Search = search
            };

            ViewBag.Roles = await _context.Roles.ToListAsync();
            return View("~/Views/Admin/Users/Index.cshtml", result);
        }

        // GET: /Users/Create
        public async Task<IActionResult> Create()
        {
            ViewBag.Roles = await _context.Roles.ToListAsync();
            return View("~/Views/Admin/Users/Create.cshtml");
        }

        // POST: /Users/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(UserViewModel model)
        {
            if (ModelState.IsValid)
            {
                // Check if username already exists
                var existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.Username == model.Username);

                if (existingUser != null)
                {
                    ModelState.AddModelError("Username", "Username already exists.");
                    ViewBag.Roles = await _context.Roles.ToListAsync();

                    // If it's an AJAX request, return JSON error
                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "Username already exists." });
                    }
                    return View("~/Views/Admin/Users/Create.cshtml", model);
                }

                // Check if email already exists
                var existingEmail = await _context.Users
                    .FirstOrDefaultAsync(u => u.Email == model.Email);

                if (existingEmail != null)
                {
                    ModelState.AddModelError("Email", "Email already exists.");
                    ViewBag.Roles = await _context.Roles.ToListAsync();

                    // If it's an AJAX request, return JSON error
                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "Email already exists." });
                    }
                    return View("~/Views/Admin/Users/Create.cshtml", model);
                }
                // Check if role exists
                if (model.RoleId <= 0)
                {
                    ModelState.AddModelError("RoleId", "Please select a role.");
                    ViewBag.Roles = await _context.Roles.ToListAsync();

                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "Please select a role." });
                    }
                    return View("~/Views/Admin/Users/Create.cshtml", model);
                }

                var role = await _context.Roles.FindAsync(model.RoleId);
                if (role == null)
                {
                    ModelState.AddModelError("RoleId", "Selected role does not exist.");
                    ViewBag.Roles = await _context.Roles.ToListAsync();

                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "Selected role does not exist." });
                    }
                    return View("~/Views/Admin/Users/Create.cshtml", model);
                }

                var user = new User
                {
                    Username = model.Username,
                    FullName = model.FullName,
                    Email = model.Email,
                    RoleId = model.RoleId,
                    Status = model.Status,
                    CreatedDate = DateTime.Now
                };

                // For create, password must be provided and confirmed.
                if (string.IsNullOrWhiteSpace(model.Password))
                {
                    ModelState.AddModelError("Password", "Password is required for new users.");
                    ViewBag.Roles = await _context.Roles.ToListAsync();

                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "Password is required for new users." });
                    }
                    return View("~/Views/Admin/Users/Create.cshtml", model);
                }

                if (model.Password != model.ConfirmPassword)
                {
                    ModelState.AddModelError("ConfirmPassword", "Password and Confirm Password do not match.");
                    ViewBag.Roles = await _context.Roles.ToListAsync();

                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "Password and Confirm Password do not match." });
                    }
                    return View("~/Views/Admin/Users/Create.cshtml", model);
                }

                user.SetPassword(model.Password);

                _context.Add(user);
                try
                {
                    await _context.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    ModelState.AddModelError("", "An error occurred while saving the user: " + ex.Message);
                    ViewBag.Roles = await _context.Roles.ToListAsync();

                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = false, message = "An error occurred while saving the user: " + ex.Message });
                    }
                    return View("~/Views/Admin/Users/Create.cshtml", model);
                }

                TempData["Success"] = "User created successfully!";

                // If it's an AJAX request, return JSON success
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Json(new { success = true, message = "User created successfully!" });
                }
                return RedirectToAction(nameof(Index));
            }

            ViewBag.Roles = await _context.Roles.ToListAsync();

            // If it's an AJAX request, return JSON error
            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return Json(new { success = false, message = string.Join(", ", errors) });
            }
            return View("~/Views/Admin/Users/Create.cshtml", model);
        }

        // GET: /Users/GetUser/5 (API endpoint to get user data for edit)
        [HttpGet]
        public async Task<IActionResult> GetUser(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserId == id);

            if (user == null)
            {
                return Json(new { success = false, message = "User not found" });
            }

            return Json(new
            {
                success = true,
                data = new
                {
                    userId = user.UserId,
                    username = user.Username,
                    fullName = user.FullName,
                    email = user.Email,
                    roleId = user.RoleId,
                    roleName = user.Role?.RoleName ?? "N/A",
                    status = user.Status,
                    createdDate = user.CreatedDate
                }
            });
        }

        // GET: /Users/Update/5
        public async Task<IActionResult> Update(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            var model = new UserViewModel
            {
                UserId = user.UserId,
                Username = user.Username ?? string.Empty,
                FullName = user.FullName ?? string.Empty,
                Email = user.Email ?? string.Empty,
                RoleId = user.RoleId,
                Status = user.Status,
                CreatedDate = user.CreatedDate
            };

            ViewBag.Roles = await _context.Roles.ToListAsync();
            return View("~/Views/Admin/Users/Update.cshtml", model);
        }

        // POST: /Users/Update/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Update(UserViewModel model)
        {
            if (model.UserId <= 0)
            {
                return NotFound();
            }

            var existingUser = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.UserId == model.UserId);
            if (existingUser == null)
            {
                return NotFound();
            }

            // Allow editing without entering password.
            if (string.IsNullOrWhiteSpace(model.Password) && string.IsNullOrWhiteSpace(model.ConfirmPassword))
            {
                ModelState.Remove("Password");
                ModelState.Remove("ConfirmPassword");
            }

            if (ModelState.IsValid)
            {
                try
                {
                    // Check if username already exists for other users
                    var usernameExists = await _context.Users
                        .FirstOrDefaultAsync(u => u.Username == model.Username && u.UserId != model.UserId);

                    if (usernameExists != null)
                    {
                        ModelState.AddModelError("Username", "Username already exists.");
                        ViewBag.Roles = await _context.Roles.ToListAsync();
                        return View("~/Views/Admin/Users/Update.cshtml", model);
                    }

                    // Check if email already exists for other users
                    var emailExists = await _context.Users
                        .FirstOrDefaultAsync(u => u.Email == model.Email && u.UserId != model.UserId);

                    if (emailExists != null)
                    {
                        ModelState.AddModelError("Email", "Email already exists.");
                        ViewBag.Roles = await _context.Roles.ToListAsync();
                        return View("~/Views/Admin/Users/Update.cshtml", model);
                    }

                    var user = new User
                    {
                        UserId = model.UserId,
                        Username = model.Username ?? string.Empty,
                        FullName = model.FullName ?? string.Empty,
                        Email = model.Email ?? string.Empty,
                        RoleId = model.RoleId,
                        Status = model.Status,
                        CreatedDate = existingUser.CreatedDate,
                        PasswordHash = existingUser.PasswordHash
                    };

                    // Update password if provided
                    if (!string.IsNullOrEmpty(model.Password))
                    {
                        user.SetPassword(model.Password!);
                    }

                    _context.Update(user);
                    await _context.SaveChangesAsync();

                    TempData["Success"] = "User updated successfully!";

                    // If it's an AJAX request, return JSON success
                    if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                    {
                        return Json(new { success = true, message = "User updated successfully!" });
                    }
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!UserExists(model.UserId))
                    {
                        return NotFound();
                    }
                    throw;
                }
            }

            ViewBag.Roles = await _context.Roles.ToListAsync();

            // If it's an AJAX request, return JSON error
            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return Json(new { success = false, message = string.Join(", ", errors) });
            }
            return View("~/Views/Admin/Users/Update.cshtml", model);
        }

        // GET: /Users/Details/5
        public async Task<IActionResult> Details(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(m => m.UserId == id);

            if (user == null)
            {
                return NotFound();
            }

            return View("~/Views/Admin/Users/Details.cshtml", user);
        }

        // GET: /Users/Delete/5
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(m => m.UserId == id);

            if (user == null)
            {
                return NotFound();
            }

            return View("~/Views/Admin/Users/Delete.cshtml", user);
        }

        // POST: /Users/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user != null)
            {
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                TempData["Success"] = "User deleted successfully!";

                // If it's an AJAX request, return JSON
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Json(new { success = true, message = "User deleted successfully!" });
                }
            }

            return RedirectToAction(nameof(Index));
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.UserId == id);
        }
    }
}
