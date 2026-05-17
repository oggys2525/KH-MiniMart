using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using System.Security.Claims;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StaffPermissionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StaffPermissionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.StaffPermissions
                .Include(p => p.User)
                .OrderByDescending(p => p.Id)
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.StaffPermissions
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Id == id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpGet("me")]
        public async Task<IActionResult> GetMyPermissions()
        {
            var userIdClaim = User.FindFirstValue("UserId");
            if (!int.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Invalid user context." });

            var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
            var defaultAllowedPages = "Pos,Orders,Products,Customers,Reports,Profile,ChangePassword,Overview";
            var allowedPages = defaultAllowedPages;

            if (string.Equals(role, "Staff", StringComparison.OrdinalIgnoreCase))
            {
                var permission = await _context.StaffPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
                if (permission != null)
                    allowedPages = permission.AllowedPages ?? string.Empty;
            }

            return Ok(new { userId, role, allowedPages });
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] StaffPermission permission)
        {
            var userExists = await _context.Users.AnyAsync(u => u.UserId == permission.UserId);
            if (!userExists) return BadRequest(new { message = "Invalid UserId." });

            _context.StaffPermissions.Add(permission);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = permission.Id }, permission);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(int id, [FromBody] StaffPermission permission)
        {
            var existing = await _context.StaffPermissions.FindAsync(id);
            if (existing == null) return NotFound();

            var userExists = await _context.Users.AnyAsync(u => u.UserId == permission.UserId);
            if (!userExists) return BadRequest(new { message = "Invalid UserId." });

            existing.UserId = permission.UserId;
            existing.AllowedPages = permission.AllowedPages;

            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.StaffPermissions.FindAsync(id);
            if (item == null) return NotFound();

            _context.StaffPermissions.Remove(item);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
