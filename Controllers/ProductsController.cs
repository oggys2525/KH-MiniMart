using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using MiniMartPOSWeb.ViewModels;
using System.Text.Json;

namespace MiniMartPOSWeb.Controllers
{
    [Authorize(Roles = "Admin")]
    public class ProductsController : Controller
    {
        private readonly ApplicationDbContext _context;

        public ProductsController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: /Products
        public async Task<IActionResult> Index(int page = 1, int pageSize = 10, string search = "")
        {
            var query = _context.Products
                .Include(p => p.Category)
                .AsQueryable();

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(p =>
                    (p.ProductName != null && p.ProductName.Contains(search)) ||
                    (p.Barcode != null && p.Barcode.Contains(search)) ||
                    (p.Category != null && p.Category.CategoryName != null && p.Category.CategoryName.Contains(search)));
            }

            var totalItems = await query.CountAsync();

            var items = await query
                .OrderBy(p => p.ProductName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new PagedResult<Product>
            {
                Items = items,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Search = search
            };

            ViewBag.Categories = await _context.Categories.ToListAsync();
            return View(result);
        }

        // GET: /Products/Add
        public async Task<IActionResult> Add()
        {
            ViewBag.Categories = await _context.Categories.ToListAsync();
            return View();
        }

        // POST: /Products/Add
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Add(Product product, IFormFile? imageFile)
        {
            if (ModelState.IsValid)
            {
                // Handle image upload
                if (imageFile != null && imageFile.Length > 0)
                {
                    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                    var extension = Path.GetExtension(imageFile.FileName).ToLower();

                    if (!allowedExtensions.Contains(extension))
                    {
                        ModelState.AddModelError("imageFile", "Only JPG, PNG, and GIF files are allowed.");
                        ViewBag.Categories = await _context.Categories.ToListAsync();
                        return View(product);
                    }

                    if (imageFile.Length > 5 * 1024 * 1024)
                    {
                        ModelState.AddModelError("imageFile", "File size must be less than 5MB.");
                        ViewBag.Categories = await _context.Categories.ToListAsync();
                        return View(product);
                    }

                    var fileName = Guid.NewGuid().ToString() + extension;
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "products", fileName);

                    Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await imageFile.CopyToAsync(stream);
                    }

                    product.ImageUrl = "/images/products/" + fileName;
                }

                product.CreatedDate = DateTime.Now;
                _context.Add(product);
                await _context.SaveChangesAsync();

                // Check if this is an AJAX request
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Json(new { success = true, message = "Product added successfully!" });
                }

                TempData["Success"] = "Product added successfully!";
                return RedirectToAction(nameof(Index));
            }

            ViewBag.Categories = await _context.Categories.ToListAsync();
            return View(product);
        }

        // POST: /Products/AddCategory (AJAX)
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddCategory([FromBody] JsonElement model)
        {
            try
            {
                var categoryName = model.GetProperty("categoryName").GetString();

                if (string.IsNullOrWhiteSpace(categoryName))
                {
                    return Json(new { success = false, message = "Category name is required" });
                }

                // Check if category already exists
                var existingCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => c.CategoryName!.ToLower() == categoryName.ToLower());

                if (existingCategory != null)
                {
                    return Json(new { success = false, message = "Category already exists" });
                }

                var category = new Category
                {
                    CategoryName = categoryName.Trim()
                };

                _context.Categories.Add(category);
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    categoryId = category.CategoryId,
                    message = "Category added successfully"
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "An error occurred: " + ex.Message });
            }
        }

        // GET: /Products/Update/5
        public async Task<IActionResult> Update(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound();
            }

            ViewBag.Categories = await _context.Categories.ToListAsync();
            return View(product);
        }

        // POST: /Products/Update/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Update(Product product, IFormFile? imageFile)
        {
            var existingProduct = await _context.Products.AsNoTracking().FirstOrDefaultAsync(p => p.ProductId == product.ProductId);
            if (existingProduct == null)
            {
                return NotFound();
            }

            if (ModelState.IsValid)
            {
                try
                {
                    product.ImageUrl = existingProduct.ImageUrl;
                    product.CreatedDate = existingProduct.CreatedDate;

                    // Handle image upload
                    if (imageFile != null && imageFile.Length > 0)
                    {
                        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif" };
                        var extension = Path.GetExtension(imageFile.FileName).ToLower();

                        if (!allowedExtensions.Contains(extension))
                        {
                            TempData["Error"] = "Only JPG, PNG, and GIF files are allowed.";
                            return RedirectToAction(nameof(Index));
                        }

                        if (imageFile.Length > 5 * 1024 * 1024)
                        {
                            TempData["Error"] = "File size must be less than 5MB.";
                            return RedirectToAction(nameof(Index));
                        }

                        var fileName = Guid.NewGuid().ToString() + extension;
                        var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "products", fileName);

                        Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);

                        using (var stream = new FileStream(filePath, FileMode.Create))
                        {
                            await imageFile.CopyToAsync(stream);
                        }

                        // Delete old image if exists
                        if (!string.IsNullOrEmpty(existingProduct.ImageUrl))
                        {
                            var oldFilePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", existingProduct.ImageUrl.TrimStart('/'));
                            if (System.IO.File.Exists(oldFilePath))
                            {
                                System.IO.File.Delete(oldFilePath);
                            }
                        }

                        product.ImageUrl = "/images/products/" + fileName;
                    }

                    _context.Update(product);
                    await _context.SaveChangesAsync();

                    TempData["Success"] = "Product updated successfully!";
                    return RedirectToAction(nameof(Index));
                }
                catch (DbUpdateConcurrencyException)
                {
                    if (!ProductExists(product.ProductId))
                    {
                        return NotFound();
                    }

                    throw;
                }
            }

            TempData["Error"] = "Failed to update product. Please check your input and try again.";
            return RedirectToAction(nameof(Index));
        }

        // GET: /Products/Delete/5
        public async Task<IActionResult> Delete(int id)
        {
            var product = await _context.Products
                .Include(p => p.Category)
                .FirstOrDefaultAsync(m => m.ProductId == id);

            if (product == null)
            {
                return NotFound();
            }

            return View(product);
        }

        // POST: /Products/Delete/5
        [HttpPost, ActionName("Delete")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteConfirmed(int id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product != null)
            {
                // Delete image file if exists
                if (!string.IsNullOrEmpty(product.ImageUrl))
                {
                    var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", product.ImageUrl.TrimStart('/'));
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }
                }

                _context.Products.Remove(product);
                await _context.SaveChangesAsync();

                TempData["Success"] = "Product deleted successfully!";
            }

            return RedirectToAction(nameof(Index));
        }

        private bool ProductExists(int id)
        {
            return _context.Products.Any(e => e.ProductId == id);
        }
    }
}