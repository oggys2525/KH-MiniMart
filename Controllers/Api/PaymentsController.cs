using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using MiniMartPOSWeb.Services;
using System.Security.Claims;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaymentsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAdminNotificationService _notificationService;

        public PaymentsController(ApplicationDbContext context, IAdminNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var payments = await _context.Payments
                .Include(p => p.Sale)
                .ThenInclude(s => s.Customer)
                .OrderByDescending(p => p.PaymentDate)
                .ToListAsync();
            return Ok(payments);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var payment = await _context.Payments
                .Include(p => p.Sale)
                .ThenInclude(s => s.Customer)
                .FirstOrDefaultAsync(p => p.PaymentId == id);
            if (payment == null) return NotFound();
            return Ok(payment);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Create([FromBody] Payment request)
        {
            var sale = await _context.Sales.FindAsync(request.SaleId);
            if (sale == null) return BadRequest(new { message = "Invalid SaleId." });

            request.PaymentDate = request.PaymentDate == default ? DateTime.Now : NormalizeToLocalDateTime(request.PaymentDate);
            _context.Payments.Add(request);
            await _context.SaveChangesAsync();

            var actorUserId = GetCurrentUserId();
            if (actorUserId > 0)
            {
                try
                {
                    await _notificationService.CreatePaymentConfirmedNotificationAsync(request.SaleId, request.Amount, request.PaymentMethod, request.PaymentDate, actorUserId);
                }
                catch
                {
                    // Payment should still succeed if notification creation fails.
                }
            }

            return CreatedAtAction(nameof(GetById), new { id = request.PaymentId }, request);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Update(int id, [FromBody] Payment request)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null) return NotFound();

            var sale = await _context.Sales.FindAsync(request.SaleId);
            if (sale == null) return BadRequest(new { message = "Invalid SaleId." });

            payment.SaleId = request.SaleId;
            payment.Amount = request.Amount;
            payment.PaymentMethod = request.PaymentMethod;
            payment.PaymentDate = request.PaymentDate == default ? payment.PaymentDate : NormalizeToLocalDateTime(request.PaymentDate);

            await _context.SaveChangesAsync();
            return Ok(payment);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var payment = await _context.Payments.FindAsync(id);
            if (payment == null) return NotFound();

            _context.Payments.Remove(payment);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private int GetCurrentUserId()
        {
            var claimValue = User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claimValue, out var userId) ? userId : 0;
        }

        private static DateTime NormalizeToLocalDateTime(DateTime value)
        {
            if (value.Kind == DateTimeKind.Utc)
            {
                return value.ToLocalTime();
            }

            if (value.Kind == DateTimeKind.Unspecified)
            {
                return DateTime.SpecifyKind(value, DateTimeKind.Local);
            }

            return value;
        }
    }
}
