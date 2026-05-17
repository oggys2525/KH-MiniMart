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
    public class SalesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IAdminNotificationService _notificationService;

        public SalesController(ApplicationDbContext context, IAdminNotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        [HttpGet]
        public async Task<IActionResult> GetSales()
        {
            var sales = await _context.Sales
                .Include(s => s.User)
                .Include(s => s.Customer)
                .Include(s => s.SaleDetails)
                .ThenInclude(sd => sd.Product)
                .Include(s => s.Payments)
                .OrderByDescending(s => s.SaleDate)
                .ToListAsync();
            return Ok(sales);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetSale(int id)
        {
            var sale = await _context.Sales
                .Include(s => s.User)
                .Include(s => s.Customer)
                .Include(s => s.SaleDetails)
                .ThenInclude(sd => sd.Product)
                .Include(s => s.Payments)
                .FirstOrDefaultAsync(s => s.SaleId == id);
            if (sale == null) return NotFound();
            return Ok(sale);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> CreateSale([FromBody] SaleRequest request)
        {
            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "Sale items are required." });

            var userId = request.UserId > 0 ? request.UserId : GetCurrentUserId();
            if (userId <= 0)
                return Unauthorized(new { message = "Unable to determine the current user." });

            var paymentMethod = NormalizePaymentMethod(request.PaymentMethod);
            var completedAt = NormalizeToLocalDateTime(request.SaleDate);

            await using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                decimal total = 0m;
                var stockSignals = new Dictionary<int, (string productName, int stockQty, int minStock)>();

                var sale = new Sale
                {
                    UserId = userId,
                    CustomerId = request.CustomerId,
                    SaleDate = completedAt
                };

                _context.Sales.Add(sale);
                await _context.SaveChangesAsync();

                foreach (var item in request.Items)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Product not found: {item.ProductId}" });

                    if (item.Quantity <= 0)
                        return BadRequest(new { message = "Quantity must be greater than zero." });

                    if (product.StockQty < item.Quantity)
                        return BadRequest(new { message = $"Not enough stock for {product.ProductName}. Available: {product.StockQty}" });

                    var price = item.Price > 0 ? item.Price : product.SellingPrice;

                    _context.SaleDetails.Add(new SaleDetail
                    {
                        SaleId = sale.SaleId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        Price = price
                    });

                    product.StockQty -= item.Quantity;
                    stockSignals[product.ProductId] = (product.ProductName ?? string.Empty, product.StockQty, product.MinStock);
                    total += price * item.Quantity;
                }

                var discountAmount = Math.Min(total, Math.Max(0m, request.DiscountAmount));
                var finalTotal = Math.Max(0m, total - discountAmount);
                var amountTendered = request.AmountTendered > 0 ? request.AmountTendered : finalTotal;

                if (paymentMethod == "Cash" && amountTendered < finalTotal)
                    return BadRequest(new { message = "Cash received must be greater than or equal to the total amount." });

                sale.TotalAmount = finalTotal;

                _context.Payments.Add(new Payment
                {
                    SaleId = sale.SaleId,
                    Amount = finalTotal,
                    PaymentMethod = paymentMethod,
                    PaymentDate = completedAt
                });

                await _context.SaveChangesAsync();
                try
                {
                    await _notificationService.CreateSaleCompletedNotificationAsync(sale.SaleId, finalTotal, paymentMethod, completedAt, userId);
                }
                catch
                {
                    // Do not block checkout if notification persistence fails.
                }

                foreach (var signal in stockSignals)
                {
                    try
                    {
                        await _notificationService.CreateStockLevelNotificationAsync(
                            sale.SaleId,
                            signal.Key,
                            signal.Value.productName,
                            signal.Value.stockQty,
                            signal.Value.minStock,
                            userId);
                    }
                    catch
                    {
                        // Do not block checkout if stock alert persistence fails.
                    }
                }

                await tx.CommitAsync();

                var created = await _context.Sales
                    .Include(s => s.Customer)
                    .Include(s => s.User)
                    .Include(s => s.SaleDetails)
                    .ThenInclude(sd => sd.Product)
                    .Include(s => s.Payments)
                    .FirstOrDefaultAsync(s => s.SaleId == sale.SaleId);

                return CreatedAtAction(nameof(GetSale), new { id = sale.SaleId }, created);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> UpdateSale(int id, [FromBody] SaleRequest request)
        {
            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "Sale items are required." });

            var existing = await _context.Sales
                .Include(s => s.SaleDetails)
                .Include(s => s.Payments)
                .FirstOrDefaultAsync(s => s.SaleId == id);

            if (existing == null) return NotFound();

            var paymentMethod = NormalizePaymentMethod(request.PaymentMethod);
            var completedAt = NormalizeToLocalDateTime(request.SaleDate, existing.SaleDate);

            await using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                // Restore previous stock
                foreach (var oldItem in existing.SaleDetails)
                {
                    var product = await _context.Products.FindAsync(oldItem.ProductId);
                    if (product != null)
                    {
                        product.StockQty += oldItem.Quantity;
                    }
                }

                _context.SaleDetails.RemoveRange(existing.SaleDetails);
                await _context.SaveChangesAsync();

                decimal total = 0m;
                foreach (var item in request.Items)
                {
                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Product not found: {item.ProductId}" });

                    if (item.Quantity <= 0)
                        return BadRequest(new { message = "Quantity must be greater than zero." });

                    if (product.StockQty < item.Quantity)
                        return BadRequest(new { message = $"Not enough stock for {product.ProductName}. Available: {product.StockQty}" });

                    var price = item.Price > 0 ? item.Price : product.SellingPrice;

                    _context.SaleDetails.Add(new SaleDetail
                    {
                        SaleId = existing.SaleId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        Price = price
                    });

                    product.StockQty -= item.Quantity;
                    total += price * item.Quantity;
                }

                var discountAmount = Math.Min(total, Math.Max(0m, request.DiscountAmount));
                var finalTotal = Math.Max(0m, total - discountAmount);
                var amountTendered = request.AmountTendered > 0 ? request.AmountTendered : finalTotal;

                if (paymentMethod == "Cash" && amountTendered < finalTotal)
                    return BadRequest(new { message = "Cash received must be greater than or equal to the total amount." });

                existing.UserId = request.UserId > 0 ? request.UserId : existing.UserId;
                existing.CustomerId = request.CustomerId;
                existing.SaleDate = completedAt;
                existing.TotalAmount = finalTotal;

                var payment = existing.Payments.FirstOrDefault();
                if (payment == null)
                {
                    _context.Payments.Add(new Payment
                    {
                        SaleId = existing.SaleId,
                        Amount = finalTotal,
                        PaymentMethod = paymentMethod,
                        PaymentDate = completedAt
                    });
                }
                else
                {
                    payment.Amount = finalTotal;
                    payment.PaymentMethod = paymentMethod;
                    payment.PaymentDate = completedAt;
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                var updated = await _context.Sales
                    .Include(s => s.Customer)
                    .Include(s => s.User)
                    .Include(s => s.SaleDetails)
                    .ThenInclude(sd => sd.Product)
                    .Include(s => s.Payments)
                    .FirstOrDefaultAsync(s => s.SaleId == existing.SaleId);

                return Ok(updated);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteSale(int id)
        {
            var sale = await _context.Sales
                .Include(s => s.SaleDetails)
                .Include(s => s.Payments)
                .FirstOrDefaultAsync(s => s.SaleId == id);

            if (sale == null) return NotFound();

            foreach (var item in sale.SaleDetails)
            {
                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                {
                    product.StockQty += item.Quantity;
                }
            }

            _context.Payments.RemoveRange(sale.Payments);
            _context.SaleDetails.RemoveRange(sale.SaleDetails);
            _context.Sales.Remove(sale);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        public class SaleRequest
        {
            public int UserId { get; set; }
            public int? CustomerId { get; set; }
            public DateTime? SaleDate { get; set; }
            public string? PaymentMethod { get; set; }
            public decimal AmountTendered { get; set; }
            public string? DiscountCode { get; set; }
            public decimal DiscountAmount { get; set; }
            public decimal Subtotal { get; set; }
            public List<SaleItemRequest> Items { get; set; } = new();
        }

        public class SaleItemRequest
        {
            public int ProductId { get; set; }
            public int Quantity { get; set; }
            public decimal Price { get; set; }
        }

        private int GetCurrentUserId()
        {
            var claimValue = User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(claimValue, out var userId) ? userId : 0;
        }

        private static string NormalizePaymentMethod(string? paymentMethod)
        {
            return paymentMethod?.Trim().ToUpperInvariant() switch
            {
                "CARD" => "Card",
                "ABA" => "ABA",
                _ => "Cash"
            };
        }

        private static DateTime NormalizeToLocalDateTime(DateTime? value, DateTime? fallback = null)
        {
            if (value == null)
            {
                return fallback ?? DateTime.Now;
            }

            var dateTime = value.Value;
            if (dateTime.Kind == DateTimeKind.Utc)
            {
                return dateTime.ToLocalTime();
            }

            if (dateTime.Kind == DateTimeKind.Unspecified)
            {
                return DateTime.SpecifyKind(dateTime, DateTimeKind.Local);
            }

            return dateTime;
        }
    }
}
