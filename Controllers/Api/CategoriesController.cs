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
    public class CategoriesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CategoriesController(ApplicationDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Get all categories
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetCategories()
        {
            try
            {
                var categories = await _context.Categories
                    .OrderBy(c => c.CategoryName)
                    .ToListAsync();

                return Ok(categories);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching categories", error = ex.Message });
            }
        }

        /// <summary>
        /// Get category by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategory(int id)
        {
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null)
                    return NotFound(new { message = "Category not found" });

                return Ok(category);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error fetching category", error = ex.Message });
            }
        }

        /// <summary>
        /// Create a new category
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateCategory([FromBody] Category category)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(category.CategoryName))
                    return BadRequest(new { message = "Category name is required" });

                if (await _context.Categories.AnyAsync(c => (c.CategoryName ?? string.Empty).ToLower() == category.CategoryName.ToLower()))
                    return BadRequest(new { message = "Category with this name already exists" });

                _context.Categories.Add(category);
                await _context.SaveChangesAsync();

                return CreatedAtAction(nameof(GetCategory), new { id = category.CategoryId }, category);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error creating category", error = ex.Message });
            }
        }

        /// <summary>
        /// Update an existing category
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateCategory(int id, [FromBody] Category category)
        {
            try
            {
                var existingCategory = await _context.Categories.FindAsync(id);
                if (existingCategory == null)
                    return NotFound(new { message = "Category not found" });

                if (string.IsNullOrWhiteSpace(category.CategoryName))
                    return BadRequest(new { message = "Category name is required" });

                // Check if another category with the same name exists
                if (await _context.Categories.AnyAsync(c => (c.CategoryName ?? string.Empty).ToLower() == category.CategoryName.ToLower() && c.CategoryId != id))
                    return BadRequest(new { message = "Category with this name already exists" });

                existingCategory.CategoryName = category.CategoryName;

                _context.Entry(existingCategory).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                return Ok(new { message = "Category updated successfully", data = existingCategory });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error updating category", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete a category
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null)
                    return NotFound(new { message = "Category not found" });

                // Check if category has associated products
                var hasProducts = await _context.Products.AnyAsync(p => p.CategoryId == id);
                if (hasProducts)
                    return BadRequest(new { message = "Cannot delete category with associated products" });

                _context.Categories.Remove(category);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Category deleted successfully" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error deleting category", error = ex.Message });
            }
        }
    }
}
