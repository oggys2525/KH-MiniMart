using System;
using System.Threading.Tasks;

namespace MiniMartPOSWeb.Services
{
    public interface IAdminNotificationService
    {
        Task CreateSaleCompletedNotificationAsync(int saleId, decimal totalAmount, string paymentMethod, DateTime completedAt, int createdByUserId);
        Task CreatePaymentConfirmedNotificationAsync(int saleId, decimal amount, string paymentMethod, DateTime paymentDate, int createdByUserId);
        Task CreateStockLevelNotificationAsync(int saleId, int productId, string productName, int stockQty, int minStock, int createdByUserId);
        Task CreateInventoryStockNotificationAsync(int productId, string productName, int stockQty, int minStock, string source, int createdByUserId);
    }
}