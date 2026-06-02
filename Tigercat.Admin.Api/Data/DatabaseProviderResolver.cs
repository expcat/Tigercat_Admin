using Microsoft.Extensions.Configuration;

namespace Tigercat.Admin.Api.Data;

public enum AdminDatabaseProvider
{
    InMemory,
    Sqlite,
    PostgreSql,
}

public sealed record DatabaseRuntimeOptions(
    AdminDatabaseProvider Provider,
    string? ConnectionString)
{
    public bool UsesRelationalStores => Provider != AdminDatabaseProvider.InMemory;
}

public static class DatabaseProviderResolver
{
    private const string ProviderConfigKey = "Database:Provider";

    public static DatabaseRuntimeOptions Resolve(IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        var configuredProvider = configuration[ProviderConfigKey];

        if (string.IsNullOrWhiteSpace(configuredProvider))
        {
            return string.IsNullOrWhiteSpace(connectionString)
                ? new DatabaseRuntimeOptions(AdminDatabaseProvider.InMemory, null)
                : new DatabaseRuntimeOptions(AdminDatabaseProvider.Sqlite, connectionString);
        }

        var provider = ParseProvider(configuredProvider);
        if (provider != AdminDatabaseProvider.InMemory && string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                $"ConnectionStrings:DefaultConnection must be configured when Database:Provider is '{configuredProvider}'.");
        }

        return new DatabaseRuntimeOptions(provider, connectionString);
    }

    public static AdminDatabaseProvider ParseProvider(string provider)
    {
        var normalized = provider.Trim().Replace("-", string.Empty, StringComparison.OrdinalIgnoreCase);

        return normalized.ToLowerInvariant() switch
        {
            "inmemory" => AdminDatabaseProvider.InMemory,
            "sqlite" => AdminDatabaseProvider.Sqlite,
            "postgres" or "postgresql" or "npgsql" => AdminDatabaseProvider.PostgreSql,
            _ => throw new InvalidOperationException(
                $"Unsupported database provider '{provider}'. Expected InMemory, Sqlite, or PostgreSql."),
        };
    }
}