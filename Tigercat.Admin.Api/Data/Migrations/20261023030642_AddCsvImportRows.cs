using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tigercat.Admin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddCsvImportRows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Failed",
                table: "ImportJobs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Operator",
                table: "ImportJobs",
                type: "TEXT",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "Processed",
                table: "ImportJobs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "RowsJson",
                table: "ImportJobs",
                type: "TEXT",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<int>(
                name: "Total",
                table: "ImportJobs",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Failed",
                table: "ImportJobs");

            migrationBuilder.DropColumn(
                name: "Operator",
                table: "ImportJobs");

            migrationBuilder.DropColumn(
                name: "Processed",
                table: "ImportJobs");

            migrationBuilder.DropColumn(
                name: "RowsJson",
                table: "ImportJobs");

            migrationBuilder.DropColumn(
                name: "Total",
                table: "ImportJobs");
        }
    }
}
