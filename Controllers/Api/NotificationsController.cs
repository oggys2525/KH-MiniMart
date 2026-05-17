using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class NotificationsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public NotificationsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int take = 20)
        {
            var safeTake = Math.Clamp(take, 1, 100);

            var notifications = await _context.AdminNotifications
                .OrderByDescending(n => n.CreatedAt)
                .Take(safeTake)
                .Select(n => new
                {
                    n.AdminNotificationId,
                    n.Title,
                    n.Message,
                    n.Type,
                    n.RelatedSaleId,
                    n.IsRead,
                    n.CreatedAt
                })
                .ToListAsync();

            return Ok(notifications);
        }

        [HttpGet("unread-count")]
        public async Task<IActionResult> GetUnreadCount()
        {
            var count = await _context.AdminNotifications.CountAsync(n => !n.IsRead);
            return Ok(new { count });
        }

        [HttpPost("{id}/read")]
        public async Task<IActionResult> MarkAsRead(int id)
        {
            var notification = await _context.AdminNotifications.FirstOrDefaultAsync(n => n.AdminNotificationId == id);
            if (notification == null)
            {
                return NotFound();
            }

            notification.IsRead = true;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Notification marked as read." });
        }

        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var unread = await _context.AdminNotifications
                .Where(n => !n.IsRead)
                .ToListAsync();

            if (unread.Count == 0)
            {
                return Ok(new { updated = 0 });
            }

            foreach (var item in unread)
            {
                item.IsRead = true;
            }

            await _context.SaveChangesAsync();

            return Ok(new { updated = unread.Count });
        }

        [HttpDelete("clear-all")]
        public async Task<IActionResult> ClearAll()
        {
            var allItems = await _context.AdminNotifications.ToListAsync();
            if (allItems.Count == 0)
            {
                return Ok(new { deleted = 0 });
            }

            _context.AdminNotifications.RemoveRange(allItems);
            await _context.SaveChangesAsync();

            return Ok(new { deleted = allItems.Count });
        }
    }
}