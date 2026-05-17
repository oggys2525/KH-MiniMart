namespace MiniMartPOSWeb.Models
{
    public class Supplier
    {
        public int SupplierId { get; set; }
        public string? SupplierName { get; set; }
        public string? ContactNumber { get; set; }
        public string? Email { get; set; }
        public string? Image { get; set; }

        public ICollection<StockIn> StockIns { get; set; } = new List<StockIn>();
    }
}