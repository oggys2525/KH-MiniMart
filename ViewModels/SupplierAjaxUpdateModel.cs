namespace MiniMartPOSWeb.ViewModels
{
    public class SupplierAjaxUpdateModel
    {
        public int Id { get; set; }
        public int SupplierId { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string Contact { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public IFormFile? Image { get; set; }
        public IFormFile? ImageFile { get; set; }
    }
}