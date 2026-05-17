using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.ViewModels;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Controllers
{
    [Authorize(Roles = "Admin")]
    public class AdminController : Controller
    {
        private readonly ApplicationDbContext _context;

        public AdminController(ApplicationDbContext context)
        {
            _context = context;
        }

        // ==================== DASHBOARD ====================

        public async Task<IActionResult> Dashboard()
        {
            ViewBag.TotalProducts = await _context.Products.CountAsync();
            ViewBag.TotalCategories = await _context.Categories.CountAsync();
            ViewBag.TotalUsers = await _context.Users.CountAsync();
            ViewBag.TotalOrders = await _context.Sales.CountAsync();
            ViewBag.TotalSales = await _context.Sales.SumAsync(s => (decimal?)s.TotalAmount) ?? 0m;
            ViewBag.LowStockCount = await _context.Products.CountAsync(p => p.StockQty < p.MinStock);

            // Chart data - Sales by month (last 6 months)
            var sixMonthsAgo = DateTime.Now.AddMonths(-6);
            var salesByMonth = await _context.Sales
                .Where(s => s.SaleDate >= sixMonthsAgo)
                .GroupBy(s => new { s.SaleDate.Year, s.SaleDate.Month })
                .Select(g => new { Month = g.Key.Month, Year = g.Key.Year, Total = g.Sum(s => s.TotalAmount) })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToListAsync();

            var months = new List<string>();
            var salesData = new List<decimal>();
            foreach (var item in salesByMonth)
            {
                months.Add(new DateTime(item.Year, item.Month, 1).ToString("MMM"));
                salesData.Add(item.Total);
            }
            ViewBag.SalesMonths = System.Text.Json.JsonSerializer.Serialize(months);
            ViewBag.SalesData = System.Text.Json.JsonSerializer.Serialize(salesData);

            // Stock by category
            var stockByCategory = await _context.Products
                .Include(p => p.Category)
                .GroupBy(p => p.Category != null ? p.Category.CategoryName : "Uncategorized")
                .Select(g => new { Category = g.Key, TotalStock = g.Sum(p => p.StockQty) })
                .ToListAsync();

            ViewBag.Categories = System.Text.Json.JsonSerializer.Serialize(stockByCategory.Select(x => x.Category).ToList());
            ViewBag.StockData = System.Text.Json.JsonSerializer.Serialize(stockByCategory.Select(x => (int)x.TotalStock).ToList());

            // Ensure categories are loaded
            if (HttpContext.Session.GetString("CategoriesLoaded") != "true")
            {
                var categories = await _context.Categories.ToListAsync();
                HttpContext.Session.SetString("CategoriesLoaded", "true");
            }

            return View();
        }

        // ==================== PRODUCTS CRUD ====================

        // GET: /Admin/ProductsList - Redirect to new ProductsController
        public async Task<IActionResult> ProductsList(int page = 1, int pageSize = 10, string search = "")
        {
            return RedirectToAction("Index", "Products", new { page, pageSize, search });
        }

        // GET: /Admin/CreateProduct - Redirect to new ProductsController
        public async Task<IActionResult> CreateProduct()
        {
            return RedirectToAction("Add", "Products");
        }

        // POST: /Admin/CreateProduct - Redirect to new ProductsController
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateProduct(Product product, IFormFile? imageFile)
        {
            return RedirectToAction("Add", "Products");
        }

        // GET: /Admin/EditProduct/5 - Redirect to new ProductsController
        public async Task<IActionResult> EditProduct(int? id)
        {
            if (id == null)
            {
                return NotFound();
            }
            return RedirectToAction("Update", "Products", new { id });
        }

        // POST: /Admin/EditProduct/5 - Redirect to new ProductsController
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditProduct(int id, Product product)
        {
            return RedirectToAction("Update", "Products", new { id });
        }

        // GET: /Admin/DeleteProduct/5
        public async Task<IActionResult> DeleteProduct(int? id)
        {
            return RedirectToAction("Delete", "Products", new { id });
        }

        // POST: /Admin/DeleteProductConfirmed/5
        [HttpPost, ActionName("DeleteProductConfirmed")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteProductConfirmed(int id)
        {
            return RedirectToAction("Delete", "Products", new { id });
        }

        private bool ProductExists(int id)
        {
            return _context.Products.Any(e => e.ProductId == id);
        }

        // ==================== CATEGORIES CRUD ====================

        public async Task<IActionResult> CategoriesList()
        {
            var categories = await _context.Categories.ToListAsync();
            return View("~/Views/Admin/Categories/CategoriesList.cshtml", categories);
        }

        // GET: /Admin/CreateCategory
        public IActionResult CreateCategory()
        {
            return View("~/Views/Admin/Categories/add.cshtml");
        }

        // POST: /Admin/CreateCategory
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateCategory(Category category)
        {
            if (ModelState.IsValid)
            {
                _context.Categories.Add(category);
                await _context.SaveChangesAsync();

                // Update the session to indicate categories have been modified
                HttpContext.Session.SetString("CategoriesLoaded", "true");

                TempData["SuccessMessage"] = "Category created successfully!";
                return RedirectToAction(nameof(CategoriesList));
            }
            return View("~/Views/Admin/Categories/add.cshtml", category);
        }

        // GET: /Admin/EditCategory/5
        public async Task<IActionResult> EditCategory(int? id)
        {
            if (id == null) return NotFound();

            var category = await _context.Categories.FindAsync(id);
            if (category == null) return NotFound();

            return View(category);
        }

        // POST: /Admin/EditCategory/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditCategory(int id, Category category)
        {
            if (id != category.CategoryId) return NotFound();

            if (ModelState.IsValid)
            {
                _context.Update(category);
                await _context.SaveChangesAsync();

                // Update the session to indicate categories have been modified
                HttpContext.Session.SetString("CategoriesLoaded", "true");

                TempData["SuccessMessage"] = "Category updated successfully!";
                return RedirectToAction(nameof(CategoriesList));
            }
            return View(category);
        }

        // POST: /Admin/DeleteCategory/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category != null)
            {
                _context.Categories.Remove(category);
                await _context.SaveChangesAsync();

                // Update the session to indicate categories have been modified
                HttpContext.Session.SetString("CategoriesLoaded", "true");

                TempData["SuccessMessage"] = "Category deleted successfully!";
            }
            return RedirectToAction(nameof(CategoriesList));
        }

        // AJAX: CreateCategory - Add new category and return JSON
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateCategoryAjax([FromBody] Category category)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(category.CategoryName))
                {
                    return Json(new { success = false, message = "Category name is required." });
                }

                // Check if category already exists
                var existingCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => (c.CategoryName ?? string.Empty).ToLower() == category.CategoryName.ToLower());

                if (existingCategory != null)
                {
                    return Json(new { success = false, message = "Category already exists." });
                }

                _context.Categories.Add(category);
                await _context.SaveChangesAsync();

                // Update the session to indicate categories have been modified
                HttpContext.Session.SetString("CategoriesLoaded", "true");

                return Json(new
                {
                    success = true,
                    message = "Category created successfully!",
                    categoryId = category.CategoryId,
                    categoryName = category.CategoryName
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error creating category: " + ex.Message });
            }
        }

        // AJAX: GetCategories - Return all categories as JSON for dropdown refresh
        [HttpGet]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _context.Categories
                .OrderBy(c => c.CategoryName)
                .Select(c => new { id = c.CategoryId, name = c.CategoryName })
                .ToListAsync();

            return Json(categories);
        }

        // AJAX: EditCategoryAjax - Update category and return JSON
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditCategoryAjax([FromBody] Category category)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(category.CategoryName))
                {
                    return Json(new { success = false, message = "Category name is required." });
                }

                // Check if category exists
                var existingCategory = await _context.Categories.FindAsync(category.CategoryId);
                if (existingCategory == null)
                {
                    return Json(new { success = false, message = "Category not found." });
                }

                // Check if category name already exists (excluding current category)
                var duplicateCategory = await _context.Categories
                    .FirstOrDefaultAsync(c => (c.CategoryName ?? string.Empty).ToLower() == category.CategoryName.ToLower()
                                           && c.CategoryId != category.CategoryId);

                if (duplicateCategory != null)
                {
                    return Json(new { success = false, message = "Category name already exists." });
                }

                existingCategory.CategoryName = category.CategoryName;
                await _context.SaveChangesAsync();

                // Update the session to indicate categories have been modified
                HttpContext.Session.SetString("CategoriesLoaded", "true");

                return Json(new
                {
                    success = true,
                    message = "Category updated successfully!",
                    categoryId = existingCategory.CategoryId,
                    categoryName = existingCategory.CategoryName
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error updating category: " + ex.Message });
            }
        }

        // AJAX: DeleteCategoryAjax - Delete category and return JSON
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteCategoryAjax([FromBody] Category category)
        {
            try
            {
                // Check if category exists
                var existingCategory = await _context.Categories
                    .Include(c => c.Products)
                    .FirstOrDefaultAsync(c => c.CategoryId == category.CategoryId);

                if (existingCategory == null)
                {
                    return Json(new { success = false, message = "Category not found." });
                }

                // Check if category has products
                if (existingCategory.Products != null && existingCategory.Products.Any())
                {
                    return Json(new { success = false, message = "Cannot delete category with associated products. Please remove products first." });
                }

                _context.Categories.Remove(existingCategory);
                await _context.SaveChangesAsync();

                // Update the session to indicate categories have been modified
                HttpContext.Session.SetString("CategoriesLoaded", "true");

                return Json(new
                {
                    success = true,
                    message = "Category deleted successfully!"
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error deleting category: " + ex.Message });
            }
        }

        // ==================== OTHER PAGES ====================

        public async Task<IActionResult> UsersList()
        {
            // Redirect to UsersController for full CRUD functionality
            return RedirectToAction("Index", "Users");
        }

        public async Task<IActionResult> RolesList()
        {
            var roles = await _context.Roles.ToListAsync();
            return View(roles);
        }

        // GET: /Admin/AddRole
        public IActionResult AddRole()
        {
            return View();
        }

        // POST: /Admin/AddRole
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddRole(Role role)
        {
            if (ModelState.IsValid)
            {
                _context.Roles.Add(role);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = "Role created successfully!";
                return RedirectToAction(nameof(RolesList));
            }
            return View(role);
        }

        // POST: /Admin/EditRole
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> EditRole(int id, Role role)
        {
            if (id != role.RoleId) return NotFound();

            if (ModelState.IsValid)
            {
                _context.Update(role);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = "Role updated successfully!";
                return RedirectToAction(nameof(RolesList));
            }
            return RedirectToAction(nameof(RolesList));
        }

        // POST: /Admin/DeleteRole
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteRole(int id)
        {
            var role = await _context.Roles.FindAsync(id);
            if (role != null)
            {
                _context.Roles.Remove(role);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = "Role deleted successfully!";
            }
            return RedirectToAction(nameof(RolesList));
        }

        public async Task<IActionResult> SuppliersList()
        {
            return RedirectToAction("Index", "Suppliers");
        }

        public async Task<IActionResult> StockInsList()
        {
            var stockins = await _context.StockIns
                .Include(si => si.Supplier)
                .Include(si => si.StockInDetails)
                    .ThenInclude(d => d.Product)
                .ToListAsync();
            return View(stockins);
        }

        [HttpGet]
        public async Task<IActionResult> GetStockInDetails(int id)
        {
            var stockIn = await _context.StockIns
                .Include(s => s.Supplier)
                .Include(s => s.StockInDetails)
                    .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(s => s.StockInId == id);

            if (stockIn == null)
                return NotFound();

            return Json(new
            {
                stockInId = stockIn.StockInId,
                stockInDate = stockIn.StockInDate.ToString("MMM dd, yyyy HH:mm"),
                stockInDateRaw = stockIn.StockInDate,
                supplierId = stockIn.SupplierId,
                supplierName = stockIn.Supplier?.SupplierName,
                items = stockIn.StockInDetails.Select(d => new
                {
                    productId = d.ProductId,
                    productName = d.Product?.ProductName,
                    quantity = d.Quantity,
                    price = d.Price
                }).ToList(),
                totalItems = stockIn.StockInDetails.Count,
                totalQuantity = stockIn.StockInDetails.Sum(d => d.Quantity),
                totalAmount = stockIn.StockInDetails.Sum(d => d.Quantity * d.Price)
            });
        }

        [HttpPost]
        public async Task<IActionResult> DeleteStockIn(int id)
        {
            var stockIn = await _context.StockIns
                .Include(s => s.StockInDetails)
                .FirstOrDefaultAsync(s => s.StockInId == id);

            if (stockIn == null)
                return NotFound();

            _context.StockInDetails.RemoveRange(stockIn.StockInDetails);
            _context.StockIns.Remove(stockIn);
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpGet]
        public IActionResult AddStockIn()
        {
            return View();
        }

        [HttpGet]
        public IActionResult EditStockIn(int id)
        {
            return View();
        }

        public async Task<IActionResult> SalesHistory()
        {
            var sales = await _context.Sales
                .Include(s => s.User)
                .OrderByDescending(s => s.SaleDate)
                .ToListAsync();
            return View(sales);
        }

        public async Task<IActionResult> PaymentsList()
        {
            var payments = await _context.Payments
                .Include(p => p.Sale)
                .ToListAsync();
            return View(payments);
        }

        public async Task<IActionResult> ManageStock()
        {
            var products = await _context.Products
                .Include(p => p.Category)
                .ToListAsync();
            var categories = await _context.Categories.ToListAsync();

            ViewData["Products"] = products;
            ViewData["Categories"] = categories;

            return View();
        }

        public IActionResult Calculator()
        {
            return View();
        }

        public async Task<IActionResult> StaffPermissions()
        {
            var staffUsers = await _context.Users
                .Where(u => u.Role != null && u.Role.RoleName == "Staff")
                .Include(u => u.Role)
                .ToListAsync();

            var permissions = await _context.StaffPermissions.ToListAsync();

            var viewModel = staffUsers.Select(u =>
            {
                var userPerm = permissions.FirstOrDefault(p => p.UserId == u.UserId);
                var allowedPages = new List<string> { "Pos", "Orders", "Products", "Customers", "Reports", "Profile", "ChangePassword", "Overview" };

                if (userPerm != null && !string.IsNullOrWhiteSpace(userPerm.AllowedPages))
                {
                    allowedPages = userPerm.AllowedPages
                        .Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(p => p.Trim())
                        .Where(p => !string.IsNullOrEmpty(p))
                        .ToList();
                }

                return new StaffPermissionViewModel
                {
                    UserId = u.UserId,
                    FullName = u.FullName ?? string.Empty,
                    Email = u.Email ?? string.Empty,
                    AllowedPages = allowedPages
                };
            }).ToList();

            ViewBag.StaffPermissions = viewModel;
            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateStaffPermissions(List<StaffPermissionViewModel> permissions)
        {
            foreach (var perm in permissions)
            {
                int userId = perm.UserId;
                var allowedPages = string.Join(",", perm.AllowedPages);
                var existingPerm = await _context.StaffPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
                if (existingPerm != null)
                {
                    existingPerm.AllowedPages = allowedPages;
                }
                else
                {
                    _context.StaffPermissions.Add(new StaffPermission { UserId = userId, AllowedPages = allowedPages });
                }
            }

            await _context.SaveChangesAsync();
            TempData["SuccessMessage"] = "Staff permissions updated successfully!";
            return RedirectToAction(nameof(StaffPermissions));
        }
    }
}
