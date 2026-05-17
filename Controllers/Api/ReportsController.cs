using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using MiniMartPOSWeb.Services;

namespace MiniMartPOSWeb.Controllers.Api
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(ApplicationDbContext context, IEmailService emailService, ILogger<ReportsController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpPost("send-receipt")]
        public async Task<IActionResult> SendReceipt([FromBody] SendReceiptRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.CustomerEmail))
                return BadRequest(new { message = "Customer email is required" });

            try
            {
                var sale = await _context.Sales
                    .Include(s => s.SaleDetails)
                    .ThenInclude(sd => sd.Product)
                    .Include(s => s.User)
                    .FirstOrDefaultAsync(s => s.SaleId == request.SaleId);

                if (sale == null)
                    return NotFound(new { message = "Sale not found" });

                var receiptHtml = GenerateReceiptHtml(sale);
                await _emailService.SendReceiptAsync(request.CustomerEmail, receiptHtml, sale.SaleId);

                return Ok(new { message = "Receipt sent successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError($"Error sending receipt: {ex.Message}");
                return StatusCode(500, new { message = "Failed to send receipt" });
            }
        }

        private string GenerateReceiptHtml(Sale sale)
        {
            var itemsHtml = string.Join("", sale.SaleDetails.Select(item => $@"
                <tr>
                    <td style='padding: 8px; border-bottom: 1px solid #eee;'>{item.Product.ProductName}</td>
                    <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: center;'>{item.Quantity}</td>
                    <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: right;'>${item.Price:F2}</td>
                    <td style='padding: 8px; border-bottom: 1px solid #eee; text-align: right;'>${item.Quantity * item.Price:F2}</td>
                </tr>
            "));

            var subtotal = sale.SaleDetails.Sum(x => x.Quantity * x.Price);
            var discount = 0m;
            var total = sale.TotalAmount;

            return $@"
                <div style='font-size: 14px;'>
                    <p><strong>Receipt #:</strong> {sale.SaleId}</p>
                    <p><strong>Date:</strong> {sale.SaleDate:F}</p>
                    <p><strong>Cashier:</strong> {sale.User?.FullName ?? "Staff"}</p>
                    
                    <table style='width: 100%; margin: 20px 0;'>
                        <thead>
                            <tr style='background-color: #f3f4f6;'>
                                <th style='padding: 8px; text-align: left;'>Item</th>
                                <th style='padding: 8px; text-align: center;'>Qty</th>
                                <th style='padding: 8px; text-align: right;'>Price</th>
                                <th style='padding: 8px; text-align: right;'>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsHtml}
                        </tbody>
                    </table>
                    
                    <div style='margin-top: 20px; border-top: 2px solid #e5e7eb; padding-top: 10px;'>
                        <div style='display: flex; justify-content: space-between; margin: 5px 0;'>
                            <span>Subtotal:</span>
                            <strong>${subtotal:F2}</strong>
                        </div>
                        {(discount > 0 ? $@"
                        <div style='display: flex; justify-content: space-between; margin: 5px 0; color: #10b981;'>
                            <span>Discount:</span>
                            <strong>-${discount:F2}</strong>
                        </div>
                        " : "")}
                        <div style='display: flex; justify-content: space-between; margin: 10px 0; font-size: 18px; font-weight: bold;'>
                            <span>TOTAL:</span>
                            <span style='color: #047857;'>${total:F2}</span>
                        </div>
                    </div>
                    
                    <p style='margin-top: 20px; text-align: center; color: #666; font-size: 12px;'>
                        Thank you for shopping at KH Mart!
                    </p>
                </div>
            ";
        }
    }

    public class SendReceiptRequest
    {
        public int SaleId { get; set; }
        public string CustomerEmail { get; set; } = string.Empty;
    }
}
