using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class Product
    {
        public int ProductId { get; set; }

        [Required(ErrorMessage = "Product name is required.")]
        [StringLength(200)]
        public string? ProductName { get; set; }

        [Required(ErrorMessage = "Category is required.")]
        public int CategoryId { get; set; }

        [Required(ErrorMessage = "Barcode is required.")]
        [StringLength(100)]
        public string? Barcode { get; set; }

        [Required(ErrorMessage = "Cost price is required.")]
        [Range(0, double.MaxValue, ErrorMessage = "Cost price must be 0 or greater.")]
        [Column(TypeName = "decimal(18,2)")]
        public decimal CostPrice { get; set; }

        [Required(ErrorMessage = "Selling price is required.")]
        [Range(0, double.MaxValue, ErrorMessage = "Selling price must be 0 or greater.")]
        [Column(TypeName = "decimal(18,2)")]
        public decimal SellingPrice { get; set; }

        [Required(ErrorMessage = "Stock quantity is required.")]
        [Range(0, int.MaxValue, ErrorMessage = "Stock quantity must be 0 or greater.")]
        public int StockQty { get; set; }

        [Required(ErrorMessage = "Minimum stock alert is required.")]
        [Range(0, int.MaxValue, ErrorMessage = "Minimum stock alert must be 0 or greater.")]
        public int MinStock { get; set; }

        public string? ImageUrl { get; set; }

        [StringLength(1000)]
        public string? Description { get; set; }

        public bool Status { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        // Navigation Property
        public Category? Category { get; set; }
    }
}
