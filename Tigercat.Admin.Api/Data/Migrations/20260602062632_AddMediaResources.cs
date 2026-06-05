using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tigercat.Admin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMediaResources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AvatarMediaId",
                table: "Users",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MediaResources",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false),
                    PublicId = table.Column<string>(maxLength: 64, nullable: false),
                    OriginalFileName = table.Column<string>(maxLength: 255, nullable: false),
                    StoredFileName = table.Column<string>(maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(maxLength: 100, nullable: false),
                    Extension = table.Column<string>(maxLength: 20, nullable: true),
                    SizeBytes = table.Column<long>(nullable: false),
                    UploadedBy = table.Column<string>(maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaResources", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MediaReferences",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false),
                    MediaResourceId = table.Column<int>(nullable: false),
                    ReferenceType = table.Column<string>(maxLength: 50, nullable: false),
                    ReferenceKey = table.Column<string>(maxLength: 100, nullable: false),
                    DisplayName = table.Column<string>(maxLength: 200, nullable: true),
                    CreatedAt = table.Column<DateTime>(nullable: false),
                    UpdatedAt = table.Column<DateTime>(nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MediaReferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MediaReferences_MediaResources_MediaResourceId",
                        column: x => x.MediaResourceId,
                        principalTable: "MediaResources",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_AvatarMediaId",
                table: "Users",
                column: "AvatarMediaId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaReferences_MediaResourceId",
                table: "MediaReferences",
                column: "MediaResourceId");

            migrationBuilder.CreateIndex(
                name: "IX_MediaReferences_ReferenceType_ReferenceKey",
                table: "MediaReferences",
                columns: new[] { "ReferenceType", "ReferenceKey" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MediaResources_PublicId",
                table: "MediaResources",
                column: "PublicId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Users_MediaResources_AvatarMediaId",
                table: "Users",
                column: "AvatarMediaId",
                principalTable: "MediaResources",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_MediaResources_AvatarMediaId",
                table: "Users");

            migrationBuilder.DropTable(
                name: "MediaReferences");

            migrationBuilder.DropTable(
                name: "MediaResources");

            migrationBuilder.DropIndex(
                name: "IX_Users_AvatarMediaId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "AvatarMediaId",
                table: "Users");
        }
    }
}
