using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public class DatabaseProviderResolverTests
{
    [Theory]
    [InlineData("InMemory", AdminDatabaseProvider.InMemory)]
    [InlineData("in-memory", AdminDatabaseProvider.InMemory)]
    [InlineData("Sqlite", AdminDatabaseProvider.Sqlite)]
    [InlineData("postgres", AdminDatabaseProvider.PostgreSql)]
    [InlineData("PostgreSql", AdminDatabaseProvider.PostgreSql)]
    public void ParseProvider_SupportsExpectedAliases(string value, AdminDatabaseProvider expected)
    {
        var provider = DatabaseProviderResolver.ParseProvider(value);

        Assert.Equal(expected, provider);
    }

    [Fact]
    public void Resolve_WithoutProviderAndWithoutConnection_UsesInMemory()
    {
        var configuration = BuildConfiguration([]);

        var options = DatabaseProviderResolver.Resolve(configuration);

        Assert.Equal(AdminDatabaseProvider.InMemory, options.Provider);
        Assert.Null(options.ConnectionString);
        Assert.False(options.UsesRelationalStores);
    }

    [Fact]
    public void Resolve_WithoutProviderAndWithConnection_UsesSqliteFallback()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Data Source=tigercat_admin.db",
        });

        var options = DatabaseProviderResolver.Resolve(configuration);

        Assert.Equal(AdminDatabaseProvider.Sqlite, options.Provider);
        Assert.Equal("Data Source=tigercat_admin.db", options.ConnectionString);
        Assert.True(options.UsesRelationalStores);
    }

    [Fact]
    public void Resolve_WithPostgreSqlProvider_ReturnsPostgreSqlOptions()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["Database:Provider"] = "PostgreSql",
            ["ConnectionStrings:DefaultConnection"] = "Host=db;Port=5432;Database=tigercat_admin;Username=postgres;Password=postgres",
        });

        var options = DatabaseProviderResolver.Resolve(configuration);

        Assert.Equal(AdminDatabaseProvider.PostgreSql, options.Provider);
        Assert.Contains("Host=db", options.ConnectionString);
        Assert.True(options.UsesRelationalStores);
    }

    [Fact]
    public void DesignTimeFactory_CreatesPostgreSqlContextFromEnvironment()
    {
        using var _ = new EnvironmentVariableScope(new Dictionary<string, string?>
        {
            ["Database__Provider"] = "PostgreSql",
            ["ConnectionStrings__DefaultConnection"] = "Host=db;Port=5432;Database=tigercat_admin;Username=postgres;Password=postgres;SSL Mode=Require;Trust Server Certificate=false",
        });

        using var context = new AdminDbContextDesignTimeFactory().CreateDbContext([]);

        Assert.Contains("Npgsql", context.Database.ProviderName);
    }

    [Theory]
    [InlineData("Sqlite")]
    [InlineData("PostgreSql")]
    public void Resolve_WithRelationalProviderAndMissingConnection_Throws(string provider)
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["Database:Provider"] = provider,
            ["ConnectionStrings:DefaultConnection"] = "",
        });

        var ex = Assert.Throws<InvalidOperationException>(() => DatabaseProviderResolver.Resolve(configuration));

        Assert.Contains("ConnectionStrings:DefaultConnection", ex.Message);
    }

    private static IConfiguration BuildConfiguration(Dictionary<string, string?> values)
    {
        return new ConfigurationBuilder()
            .AddInMemoryCollection(values)
            .Build();
    }

    private sealed class EnvironmentVariableScope : IDisposable
    {
        private readonly Dictionary<string, string?> _previousValues;

        public EnvironmentVariableScope(Dictionary<string, string?> values)
        {
            _previousValues = values.ToDictionary(
                item => item.Key,
                item => Environment.GetEnvironmentVariable(item.Key));

            foreach (var (key, value) in values)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }

        public void Dispose()
        {
            foreach (var (key, value) in _previousValues)
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
}
