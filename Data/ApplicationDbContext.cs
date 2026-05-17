using Microsoft.EntityFrameworkCore;
using MiniMartPOSWeb.Models;

namespace MiniMartPOSWeb.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Role> Roles { get; set; }
        public DbSet<Product> Products { get; set; }
        public DbSet<Category> Categories { get; set; }
        public DbSet<Sale> Sales { get; set; }
        public DbSet<SaleDetail> SaleDetails { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Supplier> Suppliers { get; set; }
        public DbSet<Refund> Refunds { get; set; }
        public DbSet<StockIn> StockIns { get; set; }
        public DbSet<StockInDetail> StockInDetails { get; set; }
        public DbSet<StaffPermission> StaffPermissions { get; set; }
        public DbSet<Customer> Customers { get; set; }
        public DbSet<Expense> Expenses { get; set; }
        public DbSet<AdminNotification> AdminNotifications { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<AdminNotification>(entity =>
            {
                entity.HasKey(x => x.AdminNotificationId);
                entity.Property(x => x.Title).HasMaxLength(150).IsRequired();
                entity.Property(x => x.Message).HasMaxLength(500).IsRequired();
                entity.Property(x => x.Type).HasMaxLength(50);
                entity.HasIndex(x => x.CreatedAt);
                entity.HasIndex(x => x.IsRead);
            });

            // Seed default roles
            modelBuilder.Entity<Role>().HasData(
                new Role { RoleId = 1, RoleName = "Admin" },
                new Role { RoleId = 2, RoleName = "Staff" }
            );
        }
    }
}