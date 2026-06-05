using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tigercat.Admin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaProductionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "MediaResources",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Height",
                table: "MediaResources",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Sha256Hash",
                table: "MediaResources",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorageKey",
                table: "MediaResources",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StorageProvider",
                table: "MediaResources",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Width",
                table: "MediaResources",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MediaResources_Sha256Hash_SizeBytes",
                table: "MediaResources",
                columns: new[] { "Sha256Hash", "SizeBytes" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MediaResources_Sha256Hash_SizeBytes",
                table: "MediaResources");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "MediaResources");

            migrationBuilder.DropColumn(
                name: "Height",
                table: "MediaResources");

            migrationBuilder.DropColumn(
                name: "Sha256Hash",
                table: "MediaResources");

            migrationBuilder.DropColumn(
                name: "StorageKey",
                table: "MediaResources");

            migrationBuilder.DropColumn(
                name: "StorageProvider",
                table: "MediaResources");

            migrationBuilder.DropColumn(
                name: "Width",
                table: "MediaResources");
        }
    }
}
