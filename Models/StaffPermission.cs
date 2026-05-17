using System.ComponentModel.DataAnnotations;

namespace MiniMartPOSWeb.Models
{
    public class StaffPermission
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        public User? User { get; set; }

        // Comma-separated list of allowed pages: Pos,Orders,Products,Customers,Reports,Profile,ChangePassword,Overview
        public string AllowedPages { get; set; } = "Pos,Orders,Products,Customers,Reports,Profile,ChangePassword,Overview"; // Default all allowed
    }
}