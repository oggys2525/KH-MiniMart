using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using MiniMartPOSWeb.ViewModels;

namespace MiniMartPOSWeb.Controllers
{
    [Authorize(Roles = "Admin")]
    public class SuppliersController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _environment;

        public SuppliersController(ApplicationDbContext context, IWebHostEnvironment environment)
        {
            _context = context;
            _environment = environment;
        }

        public async Task<IActionResult> Index(string search = "", int page = 1, int pageSize = 10)
        {
            var query = _context.Suppliers
                .Include(s => s.StockIns)
                .OrderBy(s => s.SupplierName)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                search = search.ToLower();
                query = query.Where(s => 
                    (s.SupplierName != null && s.SupplierName.ToLower().Contains(search)) ||
                    (s.ContactNumber != null && s.ContactNumber.Contains(search)) ||
                    (s.Email != null && s.Email.ToLower().Contains(search))
                );
            }

            var totalItems = await query.CountAsync();
            var suppliers = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new MiniMartPOSWeb.ViewModels.PagedResult<Supplier>
            {
                Items = suppliers,
                Page = page,
                PageSize = pageSize,
                TotalItems = totalItems,
                Search = search
            };

            ViewBag.CurrentSearch = search;
            ViewBag.CurrentPageSize = pageSize;

            return View("~/Views/Admin/SuppliersList.cshtml", result);
        }

        public IActionResult Add()
        {
            return View("~/Views/Admin/Suppliers/Add.cshtml");
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Add(Supplier supplier, IFormFile? ImageFile)
        {
            if (ModelState.IsValid)
            {
                var existingSupplier = await _context.Suppliers
                    .FirstOrDefaultAsync(s => (s.SupplierName ?? string.Empty).ToLower() == (supplier.SupplierName ?? string.Empty).ToLower());

                if (existingSupplier != null)
                {
                    ModelState.AddModelError("SupplierName", "Supplier already exists.");
                    return View("~/Views/Admin/Suppliers/Add.cshtml", supplier);
                }

                if (ImageFile != null && ImageFile.Length > 0)
                {
                    supplier.Image = await SaveImage(ImageFile);
                }

                _context.Suppliers.Add(supplier);
                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = "Supplier created successfully!";
                return RedirectToAction(nameof(Index));
            }
            return View("~/Views/Admin/Suppliers/Add.cshtml", supplier);
        }

        public async Task<IActionResult> Update(int id)
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null)
            {
                return NotFound();
            }
            return View("~/Views/Admin/Suppliers/Update.cshtml", supplier);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Update(Supplier supplier, IFormFile? ImageFile)
        {
            if (ModelState.IsValid)
            {
                var existingSupplier = await _context.Suppliers.FindAsync(supplier.SupplierId);
                if (existingSupplier == null)
                {
                    return NotFound();
                }

                var duplicateSupplier = await _context.Suppliers
                    .FirstOrDefaultAsync(s => (s.SupplierName ?? string.Empty).ToLower() == (supplier.SupplierName ?? string.Empty).ToLower()
                                               && s.SupplierId != supplier.SupplierId);

                if (duplicateSupplier != null)
                {
                    ModelState.AddModelError("SupplierName", "Supplier name already exists.");
                    return View("~/Views/Admin/Suppliers/Update.cshtml", supplier);
                }

                existingSupplier.SupplierName = supplier.SupplierName;
                existingSupplier.ContactNumber = supplier.ContactNumber;
                existingSupplier.Email = supplier.Email;

                if (ImageFile != null && ImageFile.Length > 0)
                {
                    if (!string.IsNullOrEmpty(existingSupplier.Image))
                    {
                        DeleteImage(existingSupplier.Image);
                    }
                    existingSupplier.Image = await SaveImage(ImageFile);
                }

                await _context.SaveChangesAsync();
                TempData["SuccessMessage"] = "Supplier updated successfully!";
                return RedirectToAction(nameof(Index));
            }
            return View("~/Views/Admin/Suppliers/Update.cshtml", supplier);
        }

        private async Task<string> SaveImage(IFormFile imageFile)
        {
            var uploadsFolder = Path.Combine(_environment.WebRootPath, "uploads", "suppliers");
            Directory.CreateDirectory(uploadsFolder);

            var fileName = Guid.NewGuid() + Path.GetExtension(imageFile.FileName);
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await imageFile.CopyToAsync(stream);
            }

            return "/uploads/suppliers/" + fileName;
        }

        private void DeleteImage(string imagePath)
        {
            var fullPath = _environment.WebRootPath + imagePath.Replace("/", "\\");
            if (System.IO.File.Exists(fullPath))
            {
                System.IO.File.Delete(fullPath);
            }
        }

        // AJAX endpoints for list page
        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> AddAjax([FromForm] SupplierAjaxModel model)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(model.SupplierName))
                {
                    return Json(new { success = false, message = "Supplier name is required." });
                }

                var existingSupplier = await _context.Suppliers
                    .FirstOrDefaultAsync(s => (s.SupplierName ?? string.Empty).ToLower() == (model.SupplierName ?? string.Empty).ToLower());

                if (existingSupplier != null)
                {
                    return Json(new { success = false, message = "Supplier already exists." });
                }

                var supplier = new Supplier
                {
                    SupplierName = model.SupplierName,
                    ContactNumber = model.ContactNumber,
                    Email = model.Email
                };

                if (model.ImageFile != null && model.ImageFile.Length > 0)
                {
                    supplier.Image = await SaveImage(model.ImageFile);
                }

                _context.Suppliers.Add(supplier);
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Supplier created successfully!" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateAjaxWithImage([FromForm] SupplierAjaxUpdateModel model)
        {
            try
            {
                var existingSupplier = await _context.Suppliers.FindAsync(model.SupplierId);
                if (existingSupplier == null)
                {
                    return Json(new { success = false, message = "Supplier not found." });
                }

                existingSupplier.SupplierName = model.SupplierName;
                existingSupplier.ContactNumber = model.ContactNumber;
                existingSupplier.Email = model.Email;

                if (model.ImageFile != null && model.ImageFile.Length > 0)
                {
                    if (!string.IsNullOrEmpty(existingSupplier.Image))
                    {
                        DeleteImage(existingSupplier.Image);
                    }
                    existingSupplier.Image = await SaveImage(model.ImageFile);
                }

                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Supplier updated successfully!" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> UpdateAjax([FromBody] Supplier supplier)
        {
            try
            {
                var existingSupplier = await _context.Suppliers.FindAsync(supplier.SupplierId);
                if (existingSupplier == null)
                {
                    return Json(new { success = false, message = "Supplier not found." });
                }

                existingSupplier.SupplierName = supplier.SupplierName;
                existingSupplier.ContactNumber = supplier.ContactNumber;
                existingSupplier.Email = supplier.Email;
                await _context.SaveChangesAsync();

                return Json(new { success = true, message = "Supplier updated successfully!" });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error: " + ex.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetSupplier(int id)
        {
            var supplier = await _context.Suppliers.FindAsync(id);
            if (supplier == null)
            {
                return NotFound();
            }

            return Json(new
            {
                supplierId = supplier.SupplierId,
                supplierName = supplier.SupplierName,
                contactNumber = supplier.ContactNumber,
                email = supplier.Email,
                image = supplier.Image
            });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Delete([FromBody] Supplier supplier)
        {
            try
            {
                var existingSupplier = await _context.Suppliers
                    .Include(s => s.StockIns)
                    .FirstOrDefaultAsync(s => s.SupplierId == supplier.SupplierId);

                if (existingSupplier == null)
                {
                    return Json(new { success = false, message = "Supplier not found." });
                }

                if (existingSupplier.StockIns != null && existingSupplier.StockIns.Any())
                {
                    return Json(new { success = false, message = "Cannot delete supplier with associated stock entries. Please remove stock entries first." });
                }

                if (!string.IsNullOrEmpty(existingSupplier.Image))
                {
                    DeleteImage(existingSupplier.Image);
                }

                _context.Suppliers.Remove(existingSupplier);
                await _context.SaveChangesAsync();

                return Json(new
                {
                    success = true,
                    message = "Supplier deleted successfully!"
                });
            }
            catch (Exception ex)
            {
                return Json(new { success = false, message = "Error deleting supplier: " + ex.Message });
            }
        }
    }
}
