using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MiniMartPOSWeb.Models
{
    public class User
    {
        [Key]
        public int UserId { get; set; }

        [Required]
        [StringLength(50)]
        public string? Username { get; set; }

        [Required]
        // Mapping property 'PasswordHash' to database column 'Password'
        [Column("Password")]
        public string PasswordHash { get; set; } = string.Empty;

        // helper to set a new password (hashes automatically)
        public void SetPassword(string plainText)
        {
            if (string.IsNullOrWhiteSpace(plainText))
                throw new ArgumentException("Password cannot be empty", nameof(plainText));

            PasswordHash = BCrypt.Net.BCrypt.HashPassword(plainText);
        }

        // verify supplied password against stored hash
        public bool VerifyPassword(string plainText)
        {
            return BCrypt.Net.BCrypt.Verify(plainText, PasswordHash);
        }

        [StringLength(100)]
        public string? FullName { get; set; }

        [StringLength(100)]
        public string? Email { get; set; }

        [StringLength(255)]
        public string? ProfileImage { get; set; }

        [Required]
        public int RoleId { get; set; }

        [ForeignKey("RoleId")]
        public Role? Role { get; set; }

        public bool Status { get; set; } = true;

        public DateTime CreatedDate { get; set; } = DateTime.Now;
    }
}