using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class StockInDetail
    {
        public int StockInDetailId { get; set; }
        public int StockInId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public StockIn? StockIn { get; set; }
        public Product? Product { get; set; }
    }
}