using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using MiniMartPOSWeb.Data;
using MiniMartPOSWeb.Models;
using MiniMartPOSWeb.Services;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    }); // For API controllers
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Register Email Service
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAdminNotificationService, AdminNotificationService>();

var app = builder.Build();

await ApplyMigrationsWithRetryAsync(app.Services, app.Logger);
await SeedDefaultDataAsync(app.Services, app.Logger);

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseStaticFiles();

app.UseRouting();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers(); // For API controllers
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

static async Task SeedDefaultDataAsync(IServiceProvider services, ILogger logger)
{
    using var scope = services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

    var hasAdminRole = await dbContext.Roles.AnyAsync(r => r.RoleName == "Admin");
    var hasStaffRole = await dbContext.Roles.AnyAsync(r => r.RoleName == "Staff");

    if (!hasAdminRole)
    {
        dbContext.Roles.Add(new Role { RoleName = "Admin" });
    }

    if (!hasStaffRole)
    {
        dbContext.Roles.Add(new Role { RoleName = "Staff" });
    }

    if (!hasAdminRole || !hasStaffRole)
    {
        await dbContext.SaveChangesAsync();
        logger.LogInformation("Default roles seeded.");
    }

    var adminRoleId = await dbContext.Roles.Where(r => r.RoleName == "Admin").Select(r => r.RoleId).FirstAsync();
    var staffRoleId = await dbContext.Roles.Where(r => r.RoleName == "Staff").Select(r => r.RoleId).FirstAsync();

    var hasAdminUser = await dbContext.Users.AnyAsync(u => u.Username == "admin");
    if (!hasAdminUser)
    {
        var adminUser = new User
        {
            Username = "admin",
            FullName = "Administrator",
            Email = "admin@example.com",
            RoleId = adminRoleId,
            Status = true,
            CreatedDate = DateTime.Now
        };

        adminUser.SetPassword("admin123");
        dbContext.Users.Add(adminUser);
        logger.LogInformation("Default admin account seeded (username: admin).");
    }

    var hasStaffUser = await dbContext.Users.AnyAsync(u => u.Username == "staff");
    if (!hasStaffUser)
    {
        var staffUser = new User
        {
            Username = "staff",
            FullName = "Staff User",
            Email = "staff@example.com",
            RoleId = staffRoleId,
            Status = true,
            CreatedDate = DateTime.Now
        };

        staffUser.SetPassword("staff123");
        dbContext.Users.Add(staffUser);
        logger.LogInformation("Default staff account seeded (username: staff).");
    }

    if (!hasAdminUser || !hasStaffUser)
    {
        await dbContext.SaveChangesAsync();
    }
}

static async Task ApplyMigrationsWithRetryAsync(IServiceProvider services, ILogger logger)
{
    const int maxRetries = 10;

    for (var attempt = 1; attempt <= maxRetries; attempt++)
    {
        try
        {
            using var scope = services.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await dbContext.Database.MigrateAsync();
            logger.LogInformation("Database migration completed successfully.");
            return;
        }
        catch (Exception ex)
        {
            if (attempt == maxRetries)
            {
                logger.LogError(ex, "Database migration failed after {MaxRetries} attempts.", maxRetries);
                throw;
            }

            logger.LogWarning(ex, "Database migration attempt {Attempt}/{MaxRetries} failed. Retrying in 5 seconds...", attempt, maxRetries);
            await Task.Delay(TimeSpan.FromSeconds(5));
        }
    }
}