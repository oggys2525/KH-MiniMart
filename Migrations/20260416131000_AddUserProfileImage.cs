using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using MiniMartPOSWeb.Data;

#nullable disable

namespace MiniMartPOS.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260416131000_AddUserProfileImage")]
    public partial class AddUserProfileImage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ProfileImage",
                table: "Users",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ProfileImage",
                table: "Users");
        }
    }
}
