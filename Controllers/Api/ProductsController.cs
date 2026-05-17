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
    public class ProductsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public ProductsController(ApplicationDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        [HttpPost("upload-image")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UploadImage([FromForm] IFormFile imageFile)
        {
            if (imageFile == null || imageFile.Length == 0)
            {
                return BadRequest(new { message = "Image file is required." });
            }

            if (!imageFile.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Only image files are allowed." });
            }

            if (imageFile.Length > 5 * 1024 * 1024)
            {
                return BadRequest(new { message = "Image size must be less than 5MB." });
            }

            var uploadsFolder = Path.Combine(_environment.WebRootPath, "images", "products");
            Directory.CreateDirectory(uploadsFolder);

            var extension = Path.GetExtension(imageFile.FileName);
            var fileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            await using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await imageFile.CopyToAsync(stream);
            }

            var imageUrl = $"/images/products/{fileName}";
            return Ok(new { imageUrl });
        }

        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .ToListAsync();
            return Ok(products);
        }

        [HttpGet("customer-display")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProductsForCustomerDisplay()
        {
            var products = await _context.Products
                .Where(p => p.Status)
                .OrderBy(p => p.ProductName)
                .Select(p => new
                {
                    p.ProductId,
                    p.ProductName,
                    p.SellingPrice,
                    p.ImageUrl,
                    p.StockQty
                })
                .ToListAsync();

            return Ok(products);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetProduct(int id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.ProductId == id);
            if (product == null) return NotFound();
            return Ok(product);
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateProduct([FromBody] Product product)
        {
            _context.Products.Add(product);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetProduct), new { id = product.ProductId }, product);
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateProduct(int id, [FromBody] Product product)
        {
            var existing = await _context.Products.FindAsync(id);
            if (existing == null) return NotFound();

            existing.ProductName = product.ProductName;
            existing.CategoryId = product.CategoryId;
            existing.Barcode = product.Barcode;
            existing.CostPrice = product.CostPrice;
            existing.SellingPrice = product.SellingPrice;
            existing.StockQty = product.StockQty;
            existing.MinStock = product.MinStock;
            existing.Description = product.Description;
            existing.ImageUrl = product.ImageUrl;
            existing.Status = product.Status;

            await _context.SaveChangesAsync();
            return Ok(existing);
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteProduct(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();
            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}