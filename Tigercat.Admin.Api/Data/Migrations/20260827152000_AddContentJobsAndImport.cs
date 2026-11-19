using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tigercat.Admin.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddContentJobsAndImport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ContentArticles",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    PublicId = table.Column<string>(maxLength: 32, nullable: false),
                    Title = table.Column<string>(maxLength: 120, nullable: false),
                    EditorType = table.Column<string>(maxLength: 20, nullable: false),
                    Body = table.Column<string>(maxLength: 20000, nullable: false),
                    TagsJson = table.Column<string>(maxLength: 1000, nullable: false),
                    Category = table.Column<string>(maxLength: 40, nullable: false),
                    ColumnJson = table.Column<string>(maxLength: 500, nullable: false),
                    Published = table.Column<bool>(nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ContentArticles", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Jobs",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    PublicId = table.Column<string>(maxLength: 32, nullable: false),
                    Name = table.Column<string>(maxLength: 120, nullable: false),
                    Cron = table.Column<string>(maxLength: 64, nullable: false),
                    Concurrency = table.Column<int>(nullable: false),
                    Timeout = table.Column<string>(maxLength: 16, nullable: false),
                    BatchSize = table.Column<string>(maxLength: 16, nullable: false),
                    Enabled = table.Column<bool>(nullable: false),
                    Status = table.Column<string>(maxLength: 20, nullable: false),
                    LastRun = table.Column<string>(maxLength: 40, nullable: false),
                    NextRun = table.Column<string>(maxLength: 40, nullable: false),
                    Progress = table.Column<int>(nullable: false),
                    Phase = table.Column<int>(nullable: false),
                    Start = table.Column<string>(maxLength: 10, nullable: false),
                    End = table.Column<string>(maxLength: 10, nullable: false),
                    Color = table.Column<string>(maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jobs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "ImportJobs",
                columns: table => new
                {
                    Id = table.Column<int>(nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", Npgsql.EntityFrameworkCore.PostgreSQL.Metadata.NpgsqlValueGenerationStrategy.IdentityByDefaultColumn)
                        .Annotation("Sqlite:Autoincrement", true),
                    PublicId = table.Column<string>(maxLength: 32, nullable: false),
                    Source = table.Column<string>(maxLength: 500, nullable: false),
                    TargetJson = table.Column<string>(maxLength: 500, nullable: false),
                    MappingsJson = table.Column<string>(maxLength: 2000, nullable: false),
                    Mode = table.Column<string>(maxLength: 20, nullable: false),
                    Conflict = table.Column<string>(maxLength: 20, nullable: false),
                    BatchSize = table.Column<int>(nullable: false),
                    Status = table.Column<string>(maxLength: 20, nullable: false),
                    Progress = table.Column<int>(nullable: false),
                    Imported = table.Column<int>(nullable: true),
                    Skipped = table.Column<int>(nullable: true),
                    ResultMessage = table.Column<string>(maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportJobs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ContentArticles_PublicId",
                table: "ContentArticles",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_PublicId",
                table: "Jobs",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_Status",
                table: "Jobs",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ImportJobs_PublicId",
                table: "ImportJobs",
                column: "PublicId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ImportJobs_Status",
                table: "ImportJobs",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ContentArticles");

            migrationBuilder.DropTable(
                name: "Jobs");

            migrationBuilder.DropTable(
                name: "ImportJobs");
        }
    }
}
