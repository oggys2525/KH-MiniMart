using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class Payment
    {
        public int PaymentId { get; set; }
        public int SaleId { get; set; }
        [Column(TypeName = "decimal(18,2)")]
        public decimal Amount { get; set; }
        [StringLength(50)]
        public string PaymentMethod { get; set; } = "Cash";
        public DateTime PaymentDate { get; set; }

        // navigation property may be null until loaded
        public Sale? Sale { get; set; }
    }
}