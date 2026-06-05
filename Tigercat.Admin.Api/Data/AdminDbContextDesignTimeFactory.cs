using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Tigercat.Admin.Api.Data;

public sealed class AdminDbContextDesignTimeFactory : IDesignTimeDbContextFactory<AdminDbContext>
{
    public AdminDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var databaseOptions = DatabaseProviderResolver.Resolve(configuration);
        var options = new DbContextOptionsBuilder<AdminDbContext>();

        switch (databaseOptions.Provider)
        {
            case AdminDatabaseProvider.Sqlite:
                options.UseSqlite(databaseOptions.ConnectionString);
                break;
            case AdminDatabaseProvider.PostgreSql:
                options.UseNpgsql(databaseOptions.ConnectionString);
                break;
            default:
                options.UseInMemoryDatabase(configuration["Database:InMemoryName"] ?? "TigercatAdminDesignTime");
                break;
        }

        return new AdminDbContext(options.Options);
    }
}
