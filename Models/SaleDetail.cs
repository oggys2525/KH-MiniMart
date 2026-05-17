using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class SaleDetail
    {
        public int SaleDetailId { get; set; }
        public int SaleId { get; set; }
        public int ProductId { get; set; }
        public int Quantity { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Price { get; set; }

        public Sale? Sale { get; set; } // <--- Make nullable
        public Product? Product { get; set; } // <--- Make nullable
    }
}