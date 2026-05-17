using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RefundsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<RefundsController> _logger;

        public RefundsController(ApplicationDbContext context, ILogger<RefundsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> ProcessRefund([FromBody] RefundRequest request)
        {
            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "Please select at least one item to return" });

            if (string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { message = "Please provide a reason for the return" });

            var sale = await _context.Sales
                .Include(s => s.SaleDetails)
                .FirstOrDefaultAsync(s => s.SaleId == request.SaleId);

            if (sale == null)
                return NotFound(new { message = "Sale not found" });

            await using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                decimal refundAmount = 0m;

                // Process each returned item
                foreach (var item in request.Items)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                    {
                        await tx.RollbackAsync();
                        return BadRequest(new { message = $"Product not found: {item.ProductId}" });
                    }

                    // Return stock to inventory
                    product.StockQty += item.Quantity;

                    refundAmount += item.Quantity * item.Price;
                }

                // Create refund record
                var refund = new Refund
                {
                    SaleId = sale.SaleId,
                    RefundAmount = refundAmount,
                    RefundMethod = request.RefundMethod,
                    Reason = request.Reason,
                    ProcessedBy = request.ProcessedBy,
                    ProcessedAt = request.ProcessedAt ?? DateTime.Now,
                    Status = "Completed"
                };

                _context.Refunds.Add(refund);

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                _logger.LogInformation($"Refund processed for sale {sale.SaleId}: {refundAmount:C}");

                return Ok(new
                {
                    message = "Refund processed successfully",
                    refundAmount,
                    refundId = refund.RefundId,
                    refundMethod = request.RefundMethod
                });
            }
            catch (Exception ex)
            {
                await tx.RollbackAsync();
                _logger.LogError($"Error processing refund: {ex.Message}");
                return StatusCode(500, new { message = "Failed to process refund" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetRefunds()
        {
            var refunds = await _context.Refunds
                .Include(r => r.Sale)
                .ThenInclude(s => s.User)
                .OrderByDescending(r => r.ProcessedAt)
                .ToListAsync();

            return Ok(refunds);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetRefund(int id)
        {
            var refund = await _context.Refunds
                .Include(r => r.Sale)
                .ThenInclude(s => s.User)
                .FirstOrDefaultAsync(r => r.RefundId == id);

            if (refund == null)
                return NotFound();

            return Ok(refund);
        }
    }

    public class RefundRequest
    {
        public int SaleId { get; set; }
        public List<RefundItemRequest> Items { get; set; } = new();
        public decimal RefundAmount { get; set; }
        public string RefundMethod { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
        public string ProcessedBy { get; set; } = string.Empty;
        public DateTime? ProcessedAt { get; set; }
    }

    public class RefundItemRequest
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }
}
