using System;
using System.ComponentModel.DataAnnotations;

namespace MiniMartPOSWeb.Models
{
    public class AdminNotification
    {
        public int AdminNotificationId { get; set; }

        [Required]
        [StringLength(150)]
        public string Title { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string Message { get; set; } = string.Empty;

        [StringLength(50)]
        public string Type { get; set; } = "Sale";

        public int? RelatedSaleId { get; set; }
        public bool IsRead { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
    }
}