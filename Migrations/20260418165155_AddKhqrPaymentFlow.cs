using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace MiniMartPOS.Migrations
{
    /// <inheritdoc />
    public partial class AddKhqrPaymentFlow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Sales",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Paid");

            migrationBuilder.AddColumn<DateTime>(
                name: "ConfirmedAt",
                table: "Payments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "Payments",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "USD");

            migrationBuilder.AddColumn<DateTime>(
                name: "ExpiresAt",
                table: "Payments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExternalTransactionId",
                table: "Payments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "KhqrPayload",
                table: "Payments",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastStatusCheckAt",
                table: "Payments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MerchantId",
                table: "Payments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MerchantName",
                table: "Payments",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MerchantReference",
                table: "Payments",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Provider",
                table: "Payments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "Internal");

            migrationBuilder.AddColumn<DateTime>(
                name: "QrGeneratedAt",
                table: "Payments",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "Payments",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Paid");

            migrationBuilder.AddColumn<string>(
                name: "StatusMessage",
                table: "Payments",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Sales_Status",
                table: "Sales",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_MerchantReference",
                table: "Payments",
                column: "MerchantReference");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_Status",
                table: "Payments",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sales_Status",
                table: "Sales");

            migrationBuilder.DropIndex(
                name: "IX_Payments_MerchantReference",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_Status",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Sales");

            migrationBuilder.DropColumn(
                name: "ConfirmedAt",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ExpiresAt",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "ExternalTransactionId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "KhqrPayload",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "LastStatusCheckAt",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "MerchantId",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "MerchantName",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "MerchantReference",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Provider",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "QrGeneratedAt",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "StatusMessage",
                table: "Payments");
        }
    }
}
