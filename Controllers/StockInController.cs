using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Controllers
{
    [Authorize(Roles = "Admin")]
    public class StockInController : Controller
    {
        private readonly ApplicationDbContext _context;

        public StockInController(ApplicationDbContext context)
        {
            _context = context;
        }

        // GET: /StockIn
        public async Task<IActionResult> Index(string search = "")
        {
            var query = _context.StockIns
                .Include(s => s.Supplier)
                .Include(s => s.StockInDetails)
                    .ThenInclude(d => d.Product)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower();
                query = query.Where(s =>
                    (s.Supplier != null && s.Supplier.SupplierName != null && s.Supplier.SupplierName.ToLower().Contains(search)) ||
                    s.StockInId.ToString().Contains(search) ||
                    s.StockInDetails.Any(d => d.Product != null && d.Product.ProductName != null && d.Product.ProductName.ToLower().Contains(search))
                );
            }

            var stockIns = await query.OrderByDescending(s => s.StockInDate).ToListAsync();
            return View(stockIns);
        }

        // GET: /StockIn/Details/5
        public async Task<IActionResult> Details(int? id)
        {
            if (id == null) return NotFound();

            var stockIn = await _context.StockIns
                .Include(s => s.Supplier)
                .Include(s => s.StockInDetails)
                    .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(s => s.StockInId == id);

            if (stockIn == null) return NotFound();

            return View(stockIn);
        }

        // GET: /StockIn/Create
        public async Task<IActionResult> Create()
        {
            ViewBag.Suppliers = await _context.Suppliers.OrderBy(s => s.SupplierName).ToListAsync();
            ViewBag.Products = await _context.Products.OrderBy(p => p.ProductName).ToListAsync();
            return View();
        }

        // POST: /StockIn/Create
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Create(int SupplierId, DateTime StockInDate, int[] ProductIds, int[] Quantities, decimal[] Prices)
        {
            var isAjax = Request.Headers["X-Requested-With"].ToString() == "XMLHttpRequest";
            
            if (SupplierId <= 0)
            {
                if (isAjax)
                {
                    return Json(new { success = false, message = "Please select a supplier." });
                }
                TempData["ErrorMessage"] = "Please select a supplier.";
                ViewBag.Suppliers = await _context.Suppliers.OrderBy(s => s.SupplierName).ToListAsync();
                ViewBag.Products = await _context.Products.OrderBy(p => p.ProductName).ToListAsync();
                return View();
            }

            if (ProductIds == null || ProductIds.Length == 0)
            {
                if (isAjax)
                {
                    return Json(new { success = false, message = "Please add at least one product." });
                }
                TempData["ErrorMessage"] = "Please add at least one product.";
                ViewBag.Suppliers = await _context.Suppliers.OrderBy(s => s.SupplierName).ToListAsync();
                ViewBag.Products = await _context.Products.OrderBy(p => p.ProductName).ToListAsync();
                return View();
            }

            var stockIn = new StockIn
            {
                SupplierId = SupplierId,
                StockInDate = StockInDate == default ? DateTime.Now : StockInDate
            };

            _context.StockIns.Add(stockIn);
            await _context.SaveChangesAsync();

            for (int i = 0; i < ProductIds.Length; i++)
            {
                if (ProductIds[i] > 0 && Quantities[i] > 0)
                {
                    var detail = new StockInDetail
                    {
                        StockInId = stockIn.StockInId,
                        ProductId = ProductIds[i],
                        Quantity = Quantities[i],
                        Price = i < Prices.Length ? Prices[i] : 0
                    };
                    _context.StockInDetails.Add(detail);

                    // Update product stock
                    var product = await _context.Products.FindAsync(ProductIds[i]);
                    if (product != null)
                    {
                        product.StockQty += Quantities[i];
                    }
                }
            }

            await _context.SaveChangesAsync();
            
            if (isAjax)
            {
                return Json(new { success = true, message = "Stock In created successfully!" });
            }
            
            TempData["SuccessMessage"] = "Stock In created successfully!";
            return RedirectToAction(nameof(Index));
        }

        // GET: /StockIn/Edit/5
        public async Task<IActionResult> Edit(int? id)
        {
            if (id == null) return NotFound();

            var stockIn = await _context.StockIns
                .Include(s => s.Supplier)
                .Include(s => s.StockInDetails)
                    .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(s => s.StockInId == id);

            if (stockIn == null) return NotFound();

            ViewBag.Suppliers = await _context.Suppliers.OrderBy(s => s.SupplierName).ToListAsync();
            ViewBag.Products = await _context.Products.OrderBy(p => p.ProductName).ToListAsync();
            return View(stockIn);
        }

        // POST: /StockIn/Edit/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Edit(int StockInId, int SupplierId, DateTime StockInDate,
            int[] DetailIds, int[] ProductIds, int[] Quantities, decimal[] Prices)
        {
            var stockIn = await _context.StockIns
                .Include(s => s.StockInDetails)
                .FirstOrDefaultAsync(s => s.StockInId == StockInId);

            if (stockIn == null) return NotFound();

            if (SupplierId <= 0)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return Json(new { success = false, message = "Please select a supplier." });
                }
                TempData["ErrorMessage"] = "Please select a supplier.";
                ViewBag.Suppliers = await _context.Suppliers.OrderBy(s => s.SupplierName).ToListAsync();
                ViewBag.Products = await _context.Products.OrderBy(p => p.ProductName).ToListAsync();
                return View(stockIn);
            }

            // Revert old stock quantities
            foreach (var oldDetail in stockIn.StockInDetails)
            {
                var product = await _context.Products.FindAsync(oldDetail.ProductId);
                if (product != null)
                {
                    product.StockQty = Math.Max(0, product.StockQty - oldDetail.Quantity);
                }
            }

            // Remove old details
            _context.StockInDetails.RemoveRange(stockIn.StockInDetails);
            await _context.SaveChangesAsync();

            // Update stock in header
            stockIn.SupplierId = SupplierId;
            stockIn.StockInDate = StockInDate;
            _context.StockIns.Update(stockIn);

            // Add new details and update stock
            if (ProductIds != null && ProductIds.Length > 0)
            {
                for (int i = 0; i < ProductIds.Length; i++)
                {
                    if (ProductIds[i] > 0 && Quantities[i] > 0)
                    {
                        var detail = new StockInDetail
                        {
                            StockInId = StockInId,
                            ProductId = ProductIds[i],
                            Quantity = Quantities[i],
                            Price = i < Prices.Length ? Prices[i] : 0
                        };
                        _context.StockInDetails.Add(detail);

                        // Update product stock
                        var product = await _context.Products.FindAsync(ProductIds[i]);
                        if (product != null)
                        {
                            product.StockQty += Quantities[i];
                        }
                    }
                }
            }

            await _context.SaveChangesAsync();
            TempData["SuccessMessage"] = "Stock In updated successfully!";
            
            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                return Json(new { success = true, message = "Stock In updated successfully!" });
            }
            
            return RedirectToAction(nameof(Index));
        }

        // POST: /StockIn/Delete/5
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete(int id)
        {
            var stockIn = await _context.StockIns
                .Include(s => s.StockInDetails)
                .FirstOrDefaultAsync(s => s.StockInId == id);

            if (stockIn == null)
            {
                TempData["ErrorMessage"] = "Stock In record not found.";
                return RedirectToAction(nameof(Index));
            }

            // Revert stock quantities
            foreach (var detail in stockIn.StockInDetails)
            {
                var product = await _context.Products.FindAsync(detail.ProductId);
                if (product != null)
                {
                    product.StockQty = Math.Max(0, product.StockQty - detail.Quantity);
                }
            }

            _context.StockInDetails.RemoveRange(stockIn.StockInDetails);
            _context.StockIns.Remove(stockIn);
            await _context.SaveChangesAsync();

            TempData["SuccessMessage"] = "Stock In deleted successfully!";
            return RedirectToAction(nameof(Index));
        }

        // AJAX: GET /StockIn/GetProducts
        [HttpGet]
        public async Task<IActionResult> GetProducts()
        {
            var products = await _context.Products
                .OrderBy(p => p.ProductName)
                .Select(p => new { productId = p.ProductId, productName = p.ProductName, costPrice = p.CostPrice, stockQty = p.StockQty })
                .ToListAsync();
            return Json(products);
        }

        // AJAX: GET /StockIn/GetSuppliers
        [HttpGet]
        public async Task<IActionResult> GetSuppliers()
        {
            var suppliers = await _context.Suppliers
                .OrderBy(s => s.SupplierName)
                .Select(s => new { supplierId = s.SupplierId, supplierName = s.SupplierName })
                .ToListAsync();
            return Json(suppliers);
        }

        // AJAX: GET /StockIn/GetDetails/5
        [HttpGet]
        public async Task<IActionResult> GetDetails(int id)
        {
            var stockIn = await _context.StockIns
                .Include(s => s.Supplier)
                .Include(s => s.StockInDetails)
                    .ThenInclude(d => d.Product)
                .FirstOrDefaultAsync(s => s.StockInId == id);

            if (stockIn == null) return NotFound();

            var result = new
            {
                stockInId = stockIn.StockInId,
                supplierName = stockIn.Supplier?.SupplierName ?? "Unknown",
                stockInDate = stockIn.StockInDate.ToString("MMM dd, yyyy HH:mm"),
                items = stockIn.StockInDetails.Select(d => new
                {
                    productName = d.Product?.ProductName ?? "Unknown",
                    quantity = d.Quantity,
                    price = d.Price,
                    total = d.Quantity * d.Price
                }),
                totalItems = stockIn.StockInDetails.Count,
                totalQuantity = stockIn.StockInDetails.Sum(d => d.Quantity),
                totalAmount = stockIn.StockInDetails.Sum(d => d.Quantity * d.Price)
            };

            return Json(result);
        }
    }
}
