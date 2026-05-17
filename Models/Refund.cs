using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    [Table("Refunds")]
    public class Refund
    {
        [Key]
        public int RefundId { get; set; }

        [Required]
        public int SaleId { get; set; }

        [ForeignKey(nameof(SaleId))]
        public Sale? Sale { get; set; }

        [Required]
        [Column(TypeName = "decimal(18, 2)")]
        public decimal RefundAmount { get; set; }

        [Required]
        [MaxLength(50)]
        public string RefundMethod { get; set; } = string.Empty; // original, cash, store-credit

        [Required]
        [MaxLength(500)]
        public string Reason { get; set; } = string.Empty;

        [MaxLength(100)]
        public string ProcessedBy { get; set; } = string.Empty;

        [Required]
        public DateTime ProcessedAt { get; set; }

        [MaxLength(50)]
        public string Status { get; set; } = "Completed"; // Completed, Pending

        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}
