using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tigercat.Admin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOperationsWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PublicId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    GroupKey = table.Column<string>(type: "TEXT", maxLength: 30, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: false),
                    ToastType = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Read = table.Column<bool>(type: "INTEGER", nullable: false),
                    LinkUrl = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    MetadataJson = table.Column<string>(type: "TEXT", maxLength: 2000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ReadAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminNotifications", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "AdminTasks",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    PublicId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Assignee = table.Column<string>(type: "TEXT", maxLength: 80, nullable: false),
                    Priority = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    DueAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    EstimateHours = table.Column<double>(type: "REAL", nullable: false),
                    Blocked = table.Column<bool>(type: "INTEGER", nullable: false),
                    CreatedBy = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminTasks", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdminNotifications_GroupKey_Read_CreatedAt",
                table: "AdminNotifications",
                columns: new[] { "GroupKey", "Read", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminNotifications_PublicId",
                table: "AdminNotifications",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdminTasks_PublicId",
                table: "AdminTasks",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdminTasks_Status_DueAt",
                table: "AdminTasks",
                columns: new[] { "Status", "DueAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminNotifications");

            migrationBuilder.DropTable(
                name: "AdminTasks");
        }
    }
}
