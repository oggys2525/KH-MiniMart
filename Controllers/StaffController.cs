using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Controllers
{
    [Authorize(Roles = "Admin,Staff")]
    public class StaffController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public StaffController(ApplicationDbContext context, IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public class OrderItemDto
        {
            public int ProductId { get; set; }
            public int Quantity { get; set; }
            public decimal Price { get; set; }
            public string? Name { get; set; }
        }

        public class CreateOrderDto
        {
            public List<OrderItemDto> Items { get; set; } = new List<OrderItemDto>();
            public string PaymentMethod { get; set; } = "cash";
            public int? CustomerId { get; set; }
        }

        private bool HasPermission(string page)
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return false;

            var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userId == null) return false;

            if (!int.TryParse(userId, out int userIdInt)) return false;

            var perm = _context.StaffPermissions.FirstOrDefault(p => p.UserId == userIdInt);
            if (perm == null)
            {
                HttpContext.Session.SetString("AllowedPages", "Pos,Orders,Products,Customers,Reports,Profile,ChangePassword,Overview");
                return true;
            }

            var allowedPages = (perm.AllowedPages ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(p => p.Trim())
                .Where(p => !string.IsNullOrEmpty(p))
                .ToList();

            HttpContext.Session.SetString("AllowedPages", string.Join(',', allowedPages));

            return allowedPages.Any(p => p.Equals(page, StringComparison.OrdinalIgnoreCase));
        }

        private int GetCurrentUserId()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext == null) return 0;

            var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userId, out int userIdInt);
            return userIdInt;
        }

        public async Task<IActionResult> Dashboard()
        {
            if (User.IsInRole("Staff") && !HasPermission("Overview"))
                return RedirectToAction("AccessDenied", "Home");

            if (HttpContext.Session.GetString("CategoriesLoaded") != "true")
            {
                var categories = await _context.Categories.ToListAsync();
                HttpContext.Session.SetString("CategoriesLoaded", "true");
            }

            var userId = GetCurrentUserId();

            var today = DateTime.Today;
            var startOfMonth = new DateTime(today.Year, today.Month, 1);
            var startOfWeek = today.AddDays(-(int)today.DayOfWeek);

            var myTodaySales = await _context.Sales
                .Where(s => s.UserId == userId && s.SaleDate.Date == today)
                .SumAsync(s => s.TotalAmount);

            var myMonthSales = await _context.Sales
                .Where(s => s.UserId == userId && s.SaleDate >= startOfMonth)
                .SumAsync(s => s.TotalAmount);

            var myTotalOrders = await _context.Sales
                .Where(s => s.UserId == userId)
                .CountAsync();

            var myTodayOrders = await _context.Sales
                .Where(s => s.UserId == userId && s.SaleDate.Date == today)
                .CountAsync();

            var lowStockCount = await _context.Products
                .Where(p => p.StockQty < p.MinStock)
                .CountAsync();

            var totalProducts = await _context.Products.CountAsync();

            var recentSales = await _context.Sales
                .Include(s => s.User)
                .Include(s => s.SaleDetails)
                .OrderByDescending(s => s.SaleDate)
                .Take(5)
                .ToListAsync();

            ViewBag.MyTodaySales = myTodaySales;
            ViewBag.MyMonthSales = myMonthSales;
            ViewBag.MyTotalOrders = myTotalOrders;
            ViewBag.MyTodayOrders = myTodayOrders;
            ViewBag.LowStockCount = lowStockCount;
            ViewBag.TotalProducts = totalProducts;
            ViewBag.RecentSales = recentSales;

            return View();
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Overview()
        {
            if (User.IsInRole("Staff") && !HasPermission("Overview"))
                return RedirectToAction("AccessDenied", "Home");
            return View();
        }

        public async Task<IActionResult> Pos()
        {
            if (User.IsInRole("Staff") && !HasPermission("Pos"))
                return RedirectToAction("AccessDenied", "Home");

            var products = await _context.Products
                .Include(p => p.Category)
                .Where(p => p.Status)
                .OrderBy(p => p.ProductName)
                .ToListAsync();

            var categories = await _context.Categories
                .OrderBy(c => c.CategoryName)
                .ToListAsync();

            ViewBag.Products = products;
            ViewBag.Categories = categories;
            return View();
        }

        public async Task<IActionResult> Orders(string? search, DateTime? fromDate, DateTime? toDate)
        {
            if (User.IsInRole("Staff") && !HasPermission("Orders"))
                return RedirectToAction("AccessDenied", "Home");

            var userId = GetCurrentUserId();
            if (userId == 0)
                return RedirectToAction("AccessDenied", "Home");

            var query = _context.Sales
                .Include(s => s.SaleDetails)
                    .ThenInclude(sd => sd.Product)
                .Include(s => s.User)
                .Where(s => s.UserId == userId);

            if (fromDate.HasValue)
                query = query.Where(s => s.SaleDate >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(s => s.SaleDate <= toDate.Value.AddDays(1));
            if (!string.IsNullOrWhiteSpace(search))
            {
                if (int.TryParse(search, out int saleId))
                    query = query.Where(s => s.SaleId == saleId);
            }

            var orders = await query.OrderByDescending(s => s.SaleDate).ToListAsync();

            ViewBag.Orders = orders;
            ViewBag.Search = search;
            ViewBag.FromDate = fromDate?.ToString("yyyy-MM-dd");
            ViewBag.ToDate = toDate?.ToString("yyyy-MM-dd");

            return View();
        }

        public async Task<IActionResult> Products(string? search, int? categoryId)
        {
            if (User.IsInRole("Staff") && !HasPermission("Products"))
                return RedirectToAction("AccessDenied", "Home");

            var query = _context.Products.Include(p => p.Category).Where(p => p.Status);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(p => (p.ProductName != null && p.ProductName.Contains(search)) || (p.Barcode != null && p.Barcode.Contains(search)));
            if (categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            var products = await query.OrderBy(p => p.ProductName).ToListAsync();
            var categories = await _context.Categories.OrderBy(c => c.CategoryName).ToListAsync();

            ViewBag.Products = products;
            ViewBag.Categories = categories;
            ViewBag.Search = search;
            ViewBag.CategoryId = categoryId;

            return View();
        }

        public async Task<IActionResult> Customers(string? search)
        {
            if (User.IsInRole("Staff") && !HasPermission("Customers"))
                return RedirectToAction("AccessDenied", "Home");

            var query = _context.Customers.Where(c => c.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(c => (c.CustomerName != null && c.CustomerName.Contains(search)) ||
                                          (c.Phone != null && c.Phone.Contains(search)) ||
                                          (c.Email != null && c.Email.Contains(search)));

            var customers = await query.OrderByDescending(c => c.CreatedDate).ToListAsync();

            ViewBag.Customers = customers;
            ViewBag.Search = search;

            return View();
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> CreateCustomer(Customer customer)
        {
            if (User.IsInRole("Staff") && !HasPermission("Customers"))
                return RedirectToAction("AccessDenied", "Home");

            if (string.IsNullOrWhiteSpace(customer.CustomerName))
            {
                TempData["ErrorMessage"] = "Customer name is required.";
                return RedirectToAction("Customers");
            }

            customer.CreatedDate = DateTime.Now;
            customer.IsActive = true;
            _context.Customers.Add(customer);
            await _context.SaveChangesAsync();

            TempData["SuccessMessage"] = "Customer added successfully.";
            return RedirectToAction("Customers");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateCustomer(Customer customer)
        {
            if (User.IsInRole("Staff") && !HasPermission("Customers"))
                return RedirectToAction("AccessDenied", "Home");

            var existing = await _context.Customers.FindAsync(customer.CustomerId);
            if (existing == null)
            {
                TempData["ErrorMessage"] = "Customer not found.";
                return RedirectToAction("Customers");
            }

            existing.CustomerName = customer.CustomerName;
            existing.Phone = customer.Phone;
            existing.Email = customer.Email;
            existing.Address = customer.Address;
            existing.IsActive = customer.IsActive;

            await _context.SaveChangesAsync();
            TempData["SuccessMessage"] = "Customer updated successfully.";
            return RedirectToAction("Customers");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> DeleteCustomer(int id)
        {
            if (User.IsInRole("Staff") && !HasPermission("Customers"))
                return RedirectToAction("AccessDenied", "Home");

            var customer = await _context.Customers.FindAsync(id);
            if (customer != null)
            {
                customer.IsActive = false;
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = "Customer deleted successfully.";
            }
            return RedirectToAction("Customers");
        }

        public async Task<IActionResult> Reports(DateTime? fromDate, DateTime? toDate)
        {
            if (User.IsInRole("Staff") && !HasPermission("Reports"))
                return RedirectToAction("AccessDenied", "Home");

            var userId = GetCurrentUserId();
            if (userId == 0)
                return RedirectToAction("AccessDenied", "Home");

            var today = DateTime.Today;
            var start = fromDate ?? today.AddDays(-30);
            var end = toDate ?? today;

            var salesQuery = _context.Sales
                .Include(s => s.SaleDetails)
                    .ThenInclude(sd => sd.Product)
                .Where(s => s.UserId == userId && s.SaleDate >= start && s.SaleDate < end.AddDays(1));

            var sales = await salesQuery.OrderByDescending(s => s.SaleDate).ToListAsync();

            var totalSales = sales.Sum(s => s.TotalAmount);
            var totalOrders = sales.Count;
            var avgOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
            var totalItemsSold = sales.SelectMany(s => s.SaleDetails).Sum(sd => sd.Quantity);

            // Daily breakdown
            var dailySales = sales
                .GroupBy(s => s.SaleDate.Date)
                .Select(g => new { Date = g.Key, Total = g.Sum(s => s.TotalAmount), Count = g.Count() })
                .OrderBy(d => d.Date)
                .ToList();

            // Top products
            var topProducts = sales
                .SelectMany(s => s.SaleDetails)
                .GroupBy(sd => new { sd.ProductId, ProductName = sd.Product?.ProductName ?? "Unknown" })
                .Select(g => new { g.Key.ProductName, Quantity = g.Sum(sd => sd.Quantity), Revenue = g.Sum(sd => sd.Price * sd.Quantity) })
                .OrderByDescending(p => p.Revenue)
                .Take(10)
                .ToList();

            ViewBag.Sales = sales;
            ViewBag.TotalSales = totalSales;
            ViewBag.TotalOrders = totalOrders;
            ViewBag.AvgOrder = avgOrder;
            ViewBag.TotalItemsSold = totalItemsSold;
            ViewBag.DailySales = dailySales;
            ViewBag.TopProducts = topProducts;
            ViewBag.FromDate = start.ToString("yyyy-MM-dd");
            ViewBag.ToDate = end.ToString("yyyy-MM-dd");

            return View();
        }

        public async Task<IActionResult> Profile()
        {
            if (User.IsInRole("Staff") && !HasPermission("Profile"))
                return RedirectToAction("AccessDenied", "Home");

            var userId = GetCurrentUserId();
            var user = await _context.Users.Include(u => u.Role).FirstOrDefaultAsync(u => u.UserId == userId);
            ViewBag.User = user;

            return View();
        }

        public IActionResult ChangePassword()
        {
            if (User.IsInRole("Staff") && !HasPermission("ChangePassword"))
                return RedirectToAction("AccessDenied", "Home");
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ChangePassword(string currentPassword, string newPassword, string confirmPassword)
        {
            try
            {
                var userId = GetCurrentUserId();
                var user = await _context.Users.FindAsync(userId);

                if (user == null)
                {
                    TempData["Error"] = "User not found";
                    return View();
                }

                if (!user.VerifyPassword(currentPassword))
                {
                    TempData["Error"] = "Current password is incorrect";
                    return View();
                }

                if (newPassword != confirmPassword)
                {
                    TempData["Error"] = "New passwords do not match";
                    return View();
                }

                if (newPassword.Length < 6)
                {
                    TempData["Error"] = "Password must be at least 6 characters";
                    return View();
                }

                user.SetPassword(newPassword);
                await _context.SaveChangesAsync();

                TempData["Success"] = "Password updated successfully";
                return RedirectToAction("Profile", "Staff");
            }
            catch (Exception ex)
            {
                TempData["Error"] = "An error occurred: " + ex.Message;
                return View();
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetProductByBarcode(string code)
        {
            if (string.IsNullOrWhiteSpace(code))
                return Json(null);

            var product = await _context.Products
                .FirstOrDefaultAsync(p => p.Barcode == code);

            if (product == null)
                return Json(null);

            return Json(new
            {
                id = product.ProductId,
                name = product.ProductName,
                price = product.SellingPrice,
                stockQty = product.StockQty
            });
        }

        [HttpGet]
        public async Task<IActionResult> SearchProducts(string query)
        {
            if (string.IsNullOrWhiteSpace(query))
                return Json(new List<object>());

            var products = await _context.Products
                .Where(p => ((p.Barcode != null && p.Barcode.Contains(query)) || (p.ProductName != null && p.ProductName.Contains(query))) && p.Status == true)
                .Take(10)
                .Select(p => new
                {
                    id = p.ProductId,
                    name = p.ProductName,
                    price = p.SellingPrice,
                    barcode = p.Barcode,
                    stockQty = p.StockQty,
                    imageUrl = p.ImageUrl ?? "/images/no-image.png"
                })
                .ToListAsync();

            return Json(products);
        }

        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto request)
        {
            if (request == null || request.Items == null || request.Items.Count == 0)
                return BadRequest("No items in cart.");

            var userId = GetCurrentUserId();
            if (userId == 0)
                return Unauthorized();

            var sale = new Sale
            {
                SaleDate = DateTime.Now,
                UserId = userId,
                CustomerId = request.CustomerId,
                TotalAmount = request.Items.Sum(i => i.Price * i.Quantity)
            };

            _context.Sales.Add(sale);
            await _context.SaveChangesAsync();

            foreach (var item in request.Items)
            {
                _context.SaleDetails.Add(new SaleDetail
                {
                    SaleId = sale.SaleId,
                    ProductId = item.ProductId,
                    Quantity = item.Quantity,
                    Price = item.Price
                });

                var product = await _context.Products.FindAsync(item.ProductId);
                if (product != null)
                {
                    product.StockQty = Math.Max(0, product.StockQty - item.Quantity);
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { success = true, orderId = sale.SaleId, paymentMethod = request.PaymentMethod });
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers()
        {
            var customers = await _context.Customers
                .Where(c => c.IsActive)
                .Select(c => new { c.CustomerId, c.CustomerName, c.Phone })
                .ToListAsync();
            return Json(customers);
        }
    }
}
