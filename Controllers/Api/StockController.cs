using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Services;
using System.Security.Claims;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class StockController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAdminNotificationService _notificationService;

        public StockController(ApplicationDbContext context, IAdminNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var stock = await _context.Products
                .Include(p => p.Category)
                .OrderBy(p => p.ProductName)
                .Select(p => new
                {
                    p.ProductId,
                    p.ProductName,
                    p.StockQty,
                    p.MinStock,
                    p.Status,
                    p.CategoryId,
                    CategoryName = p.Category != null ? p.Category.CategoryName : null
                })
                .ToListAsync();

            return Ok(stock);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.Products
                .Include(p => p.Category)
                .Where(p => p.ProductId == id)
                .Select(p => new
                {
                    p.ProductId,
                    p.ProductName,
                    p.StockQty,
                    p.MinStock,
                    p.Status,
                    p.CategoryId,
                    CategoryName = p.Category != null ? p.Category.CategoryName : null
                })
                .FirstOrDefaultAsync();

            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Create([FromBody] StockRequest request)
        {
            var product = await _context.Products.FindAsync(request.ProductId);
            if (product == null) return NotFound(new { message = "Product not found." });

            product.StockQty = request.StockQty;
            product.MinStock = request.MinStock;
            product.Status = request.Status;
            await _context.SaveChangesAsync();

            var actorUserId = GetCurrentUserId();
            if (actorUserId > 0)
            {
                try
                {
                    await _notificationService.CreateInventoryStockNotificationAsync(
                        product.ProductId,
                        product.ProductName ?? string.Empty,
                        product.StockQty,
                        product.MinStock,
                        "stock settings",
                        actorUserId);
                }
                catch
                {
                    // Keep stock update successful even if notification fails.
                }
            }

            return CreatedAtAction(nameof(GetById), new { id = product.ProductId }, new
            {
                product.ProductId,
                product.ProductName,
                product.StockQty,
                product.MinStock,
                product.Status,
                product.CategoryId
            });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Update(int id, [FromBody] StockRequest request)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            product.StockQty = request.StockQty;
            product.MinStock = request.MinStock;
            product.Status = request.Status;
            await _context.SaveChangesAsync();

            var actorUserId = GetCurrentUserId();
            if (actorUserId > 0)
            {
                try
                {
                    await _notificationService.CreateInventoryStockNotificationAsync(
                        product.ProductId,
                        product.ProductName ?? string.Empty,
                        product.StockQty,
                        product.MinStock,
                        "stock settings",
                        actorUserId);
                }
                catch
                {
                    // Keep stock update successful even if notification fails.
                }
            }

            return Ok(new
            {
                product.ProductId,
                product.ProductName,
                product.StockQty,
                product.MinStock,
                product.Status,
                product.CategoryId
            });
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();

            product.StockQty = 0;
            await _context.SaveChangesAsync();

            var actorUserId = GetCurrentUserId();
            if (actorUserId > 0)
            {
                try
                {
                    await _notificationService.CreateInventoryStockNotificationAsync(
                        product.ProductId,
                        product.ProductName ?? string.Empty,
                        product.StockQty,
                        product.MinStock,
                        "stock settings",
                        actorUserId);
                }
                catch
                {
                    // Keep stock update successful even if notification fails.
                }
            }

            return NoContent();
        }

        private int GetCurrentUserId()
        {
            var claimValue = User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claimValue, out var userId) ? userId : 0;
        }

        public class StockRequest
        {
            public int ProductId { get; set; }
            public int StockQty { get; set; }
            public int MinStock { get; set; }
            public bool Status { get; set; } = true;
        }
    }
}
