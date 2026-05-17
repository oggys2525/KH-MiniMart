using System;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class Sale
    {
        public int SaleId { get; set; }
        public DateTime SaleDate { get; set; }
        public int UserId { get; set; }
        public int? CustomerId { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal TotalAmount { get; set; }

        public User? User { get; set; }
        public Customer? Customer { get; set; }
        public ICollection<SaleDetail> SaleDetails { get; set; } = new List<SaleDetail>();
        public ICollection<Payment> Payments { get; set; } = new List<Payment>();
    }
}
