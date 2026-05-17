namespace MiniMartPOSWeb.ViewModels
{
    public class PagedResult<T>
    {
        public IEnumerable<T> Items { get; set; } = Enumerable.Empty<T>();
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalItems { get; set; }
        public string Search { get; set; } = string.Empty;
    }
}