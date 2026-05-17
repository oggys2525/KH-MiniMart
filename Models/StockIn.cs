using System;

namespace MiniMartPOSWeb.Models
{
    public class StockIn
    {
        public int StockInId { get; set; }
        public int SupplierId { get; set; }
        public DateTime StockInDate { get; set; }

        public Supplier? Supplier { get; set; }
        public ICollection<StockInDetail> StockInDetails { get; set; } = new List<StockInDetail>();
    }
}