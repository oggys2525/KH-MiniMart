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
    public class StockInsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public StockInsController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var items = await _context.StockIns
                .Include(s => s.Supplier)
                .Include(s => s.StockInDetails)
                .ThenInclude(d => d.Product)
                .OrderByDescending(s => s.StockInDate)
                .ToListAsync();
            return Ok(items);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _context.StockIns
                .Include(s => s.Supplier)
                .Include(s => s.StockInDetails)
                .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(s => s.StockInId == id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Create([FromBody] StockInRequest request)
        {
            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "Stock in items are required." });

            var supplier = await _context.Suppliers.FindAsync(request.SupplierId);
            if (supplier == null) return BadRequest(new { message = "Supplier not found." });

            await using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                var stockIn = new StockIn
                {
                    SupplierId = request.SupplierId,
                    StockInDate = request.StockInDate ?? DateTime.Now
                };

                _context.StockIns.Add(stockIn);
                await _context.SaveChangesAsync();

                foreach (var item in request.Items)
                {
                    if (item.Quantity <= 0)
                        return BadRequest(new { message = "Quantity must be greater than zero." });

                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Product not found: {item.ProductId}" });

                    _context.StockInDetails.Add(new StockInDetail
                    {
                        StockInId = stockIn.StockInId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        Price = item.Price
                    });

                    product.StockQty += item.Quantity;
                }

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                var created = await _context.StockIns
                    .Include(s => s.Supplier)
                    .Include(s => s.StockInDetails)
                    .ThenInclude(d => d.Product)
                    .FirstOrDefaultAsync(s => s.StockInId == stockIn.StockInId);

                return CreatedAtAction(nameof(GetById), new { id = stockIn.StockInId }, created);
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Staff")]
        public async Task<IActionResult> Update(int id, [FromBody] StockInRequest request)
        {
            if (request.Items == null || request.Items.Count == 0)
                return BadRequest(new { message = "Stock in items are required." });

            var existing = await _context.StockIns
                .Include(s => s.StockInDetails)
                .FirstOrDefaultAsync(s => s.StockInId == id);
            if (existing == null) return NotFound();

            await using var tx = await _context.Database.BeginTransactionAsync();

            try
            {
                // Revert previous stock effect
                foreach (var oldItem in existing.StockInDetails)
                {
                    var product = await _context.Products.FindAsync(oldItem.ProductId);
                    if (product != null)
                    {
                        product.StockQty = Math.Max(0, product.StockQty - oldItem.Quantity);
                    }
                }

                _context.StockInDetails.RemoveRange(existing.StockInDetails);
                await _context.SaveChangesAsync();

                foreach (var item in request.Items)
                {
                    if (item.Quantity <= 0)
                        return BadRequest(new { message = "Quantity must be greater than zero." });

                    var product = await _context.Products.FindAsync(item.ProductId);
                    if (product == null)
                        return BadRequest(new { message = $"Product not found: {item.ProductId}" });

                    _context.StockInDetails.Add(new StockInDetail
                    {
                        StockInId = existing.StockInId,
                        ProductId = item.ProductId,
                        Quantity = item.Quantity,
                        Price = item.Price
                    });

                    product.StockQty += item.Quantity;
                }

                existing.SupplierId = request.SupplierId;
                existing.StockInDate = request.StockInDate ?? existing.StockInDate;

                await _context.SaveChangesAsync();
                await tx.CommitAsync();

                var updated = await _context.StockIns
                    .Include(s => s.Supplier)
                    .Include(s => s.StockInDetails)
                    .ThenInclude(d => d.Product)
                    .FirstOrDefaultAsync(s => s.StockInId == existing.StockInId);

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
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _context.StockIns
                .Include(s => s.StockInDetails)
                .FirstOrDefaultAsync(s => s.StockInId == id);
            if (existing == null) return NotFound();

            foreach (var detail in existing.StockInDetails)
            {
                var product = await _context.Products.FindAsync(detail.ProductId);
                if (product != null)
                {
                    product.StockQty = Math.Max(0, product.StockQty - detail.Quantity);
                }
            }

            _context.StockInDetails.RemoveRange(existing.StockInDetails);
            _context.StockIns.Remove(existing);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        public class StockInRequest
        {
            public int SupplierId { get; set; }
            public DateTime? StockInDate { get; set; }
            public List<StockInItemRequest> Items { get; set; } = new();
        }

        public class StockInItemRequest
        {
            public int ProductId { get; set; }
            public int Quantity { get; set; }
            public decimal Price { get; set; }
        }
    }
}
