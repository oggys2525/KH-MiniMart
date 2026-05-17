using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class Customer
    {
        public int CustomerId { get; set; }

        [Required(ErrorMessage = "Customer name is required.")]
        [StringLength(200)]
        [Column("FullName")]
        public string? CustomerName { get; set; }

        [StringLength(20)]
        public string? Phone { get; set; }

        [StringLength(200)]
        [EmailAddress(ErrorMessage = "Invalid email format.")]
        public string? Email { get; set; }

        [StringLength(500)]
        public string? Address { get; set; }

        public DateTime CreatedDate { get; set; } = DateTime.Now;

        public bool IsActive { get; set; } = true;

        public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    }
}
