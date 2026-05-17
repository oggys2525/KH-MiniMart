namespace MiniMartPOSWeb.ViewModels
{
    public class StaffPermissionViewModel
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PermissionName { get; set; } = string.Empty;
        public bool IsGranted { get; set; }
        public List<string> AllowedPages { get; set; } = new List<string>();
    }
}