using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class Expense
    {
        public int ExpenseId { get; set; }

        [Required]
        [StringLength(200)]
        public string Title { get; set; } = string.Empty;

        [Column(TypeName = "decimal(18,2)")]
        [Range(0, double.MaxValue)]
        public decimal Amount { get; set; }

        public DateTime ExpenseDate { get; set; } = DateTime.Now;

        [StringLength(500)]
        public string? Note { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}