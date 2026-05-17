using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MiniMartPOSWeb.Migrations
{
    public partial class AddSupplierImage : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Image",
                table: "Suppliers",
                type: "nvarchar(max)",
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Image",
                table: "Suppliers");
        }
    }
}