using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Services
{
    public class AdminNotificationService : IAdminNotificationService
    {
        private readonly ApplicationDbContext _context;

        public AdminNotificationService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task CreateSaleCompletedNotificationAsync(int saleId, decimal totalAmount, string paymentMethod, DateTime completedAt, int createdByUserId)
        {
            var actorName = await _context.Users
                .Where(u => u.UserId == createdByUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? $"User #{createdByUserId}";

            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = "Sale Completed",
                Message = $"{actorName} completed Sale #{saleId} for ${totalAmount:F2} via {paymentMethod} at {completedAt:yyyy-MM-dd HH:mm:ss}.",
                Type = "Sale",
                RelatedSaleId = saleId,
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
        }

        public async Task CreatePaymentConfirmedNotificationAsync(int saleId, decimal amount, string paymentMethod, DateTime paymentDate, int createdByUserId)
        {
            var actorName = await _context.Users
                .Where(u => u.UserId == createdByUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? $"User #{createdByUserId}";

            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = "Payment Confirmed",
                Message = $"{actorName} confirmed payment for Sale #{saleId}: ${amount:F2} via {paymentMethod} at {paymentDate:yyyy-MM-dd HH:mm:ss}.",
                Type = "Payment",
                RelatedSaleId = saleId,
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
        }

        public async Task CreateStockLevelNotificationAsync(int saleId, int productId, string productName, int stockQty, int minStock, int createdByUserId)
        {
            if (stockQty > minStock && stockQty > 0)
            {
                return;
            }

            var actorName = await _context.Users
                .Where(u => u.UserId == createdByUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? $"User #{createdByUserId}";

            var safeProductName = string.IsNullOrWhiteSpace(productName) ? $"Product #{productId}" : productName;
            var isOutOfStock = stockQty <= 0;
            var title = isOutOfStock ? "Out of Stock Alert" : "Low Stock Alert";
            var type = isOutOfStock ? "OutOfStock" : "LowStock";
            var message = isOutOfStock
                ? $"{actorName} completed Sale #{saleId}. {safeProductName} is now out of stock (0 left)."
                : $"{actorName} completed Sale #{saleId}. {safeProductName} is low in stock ({stockQty} left, min {minStock}).";

            // Prevent duplicate alerts for the same product and stock level burst.
            var duplicateExists = await _context.AdminNotifications.AnyAsync(n =>
                n.Type == type &&
                n.RelatedSaleId == saleId &&
                n.Message == message);

            if (duplicateExists)
            {
                return;
            }

            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = title,
                Message = message,
                Type = type,
                RelatedSaleId = saleId,
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
        }

        public async Task CreateInventoryStockNotificationAsync(int productId, string productName, int stockQty, int minStock, string source, int createdByUserId)
        {
            if (stockQty > minStock && stockQty > 0)
            {
                return;
            }

            var actorName = await _context.Users
                .Where(u => u.UserId == createdByUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync() ?? $"User #{createdByUserId}";

            var safeProductName = string.IsNullOrWhiteSpace(productName) ? $"Product #{productId}" : productName;
            var normalizedSource = string.IsNullOrWhiteSpace(source) ? "Inventory" : source.Trim();
            var isOutOfStock = stockQty <= 0;
            var title = isOutOfStock ? "Out of Stock Alert" : "Low Stock Alert";
            var type = isOutOfStock ? "OutOfStock" : "LowStock";
            var message = isOutOfStock
                ? $"{actorName} updated {normalizedSource}. {safeProductName} is now out of stock (0 left)."
                : $"{actorName} updated {normalizedSource}. {safeProductName} is low in stock ({stockQty} left, min {minStock}).";

            var duplicateExists = await _context.AdminNotifications.AnyAsync(n =>
                n.Type == type &&
                n.IsRead == false &&
                n.Message == message);

            if (duplicateExists)
            {
                return;
            }

            _context.AdminNotifications.Add(new AdminNotification
            {
                Title = title,
                Message = message,
                Type = type,
                RelatedSaleId = null,
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
        }
    }
}