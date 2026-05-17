namespace MiniMartPOSWeb.ViewModels
{
    public class SupplierAjaxModel
    {
        public int Id { get; set; }
        public string SupplierName { get; set; } = string.Empty;
        public string Contact { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string ImagePath { get; set; } = string.Empty;
        public IFormFile? ImageFile { get; set; }
    }
}