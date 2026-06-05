using FreeRedis;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using StackExchange.Redis;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Tests.Stubs;

namespace Tigercat.Admin.Api.Tests.Fixtures;

/// <summary>
/// Base <see cref="WebApplicationFactory{TEntryPoint}"/> that replaces all Redis-dependent
/// services with lightweight stubs so that integration tests can run without external
/// infrastructure.  Subclasses supply different configuration to select InMemory or SQLite.
/// </summary>
public abstract class AdminApiFactory : WebApplicationFactory<Program>
{
    private readonly string _mediaRoot = Path.Combine(
        Path.GetTempPath(),
        $"tigercat_media_{Guid.NewGuid():N}");

    /// <summary>
    /// Connection-string overrides applied via in-memory configuration so that they
    /// supersede any values from appsettings.json.
    /// </summary>
    protected abstract Dictionary<string, string?> ConfigurationOverrides { get; }

    protected virtual string EnvironmentName => Environments.Development;

    protected string MediaRoot => _mediaRoot;

    public string MediaRootPath => _mediaRoot;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(EnvironmentName);

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(ConfigurationOverrides);
        });

        builder.ConfigureServices(services =>
        {
            // ── Remove Redis-dependent registrations ──
            // A placeholder IConnectionMultiplexer must remain so that the
            // /api/health/redis endpoint binds correctly at startup.
            services.RemoveAll<IConnectionMultiplexer>();
            services.AddSingleton<IConnectionMultiplexer>(_ =>
                throw new NotSupportedException("Redis is not available during tests."));

            services.RemoveAll<IRedisClient>();
            services.AddSingleton<IRedisClient>(_ =>
                throw new NotSupportedException("Redis is not available during tests."));

            // Replace infrastructure services with stubs
            services.RemoveAll<ICacheService>();
            services.AddSingleton<ICacheService, StubCacheService>();

            services.RemoveAll<IEventPublisher>();
            services.AddSingleton<IEventPublisher, StubEventPublisher>();

            services.RemoveAll<IIdempotencyService>();
            services.AddSingleton<IIdempotencyService, StubIdempotencyService>();

            // Remove the Redis stream consumer background service
            var consumerDescriptors = services
                .Where(d => d.ServiceType == typeof(IHostedService) &&
                            d.ImplementationType == typeof(RedisStreamConsumer))
                .ToList();

            foreach (var d in consumerDescriptors)
            {
                services.Remove(d);
            }
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (Directory.Exists(_mediaRoot))
        {
            try { Directory.Delete(_mediaRoot, recursive: true); } catch { /* best effort */ }
        }
    }
}

/// <summary>
/// Factory that uses the EF Core <b>InMemory</b> provider.
/// <c>Database:Provider</c> is explicitly set to <c>InMemory</c> and
/// <c>DefaultConnection</c> is cleared so that the API keeps all state in process.
/// </summary>
public class InMemoryApiFactory : AdminApiFactory
{
    protected override Dictionary<string, string?> ConfigurationOverrides => new()
    {
        ["Infrastructure:UseInMemory"] = "true",
        ["Database:Provider"] = "InMemory",
        ["Database:InMemoryName"] = $"TigercatAdminTests_{Guid.NewGuid():N}",
        ["ConnectionStrings:Redis"] = "localhost:1",
        ["ConnectionStrings:DefaultConnection"] = "",
        ["Media:LocalRoot"] = MediaRoot,
    };
}

/// <summary>
/// Factory that uses the EF Core <b>SQLite</b> provider with a temporary database file.
/// <c>Database:Provider</c> is set to <c>Sqlite</c> so that the API uses
/// the relational EF-backed stores and applies SQLite migrations.
/// </summary>
public class SqliteApiFactory : AdminApiFactory
{
    private readonly string _dbPath = Path.Combine(
        Path.GetTempPath(),
        $"tigercat_test_{Guid.NewGuid():N}.db");

    protected override Dictionary<string, string?> ConfigurationOverrides => new()
    {
        ["Infrastructure:UseInMemory"] = "true",
        ["Database:Provider"] = "Sqlite",
        ["ConnectionStrings:Redis"] = "localhost:1",
        ["ConnectionStrings:DefaultConnection"] = $"Data Source={_dbPath}",
        ["Media:LocalRoot"] = MediaRoot,
    };

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (File.Exists(_dbPath))
        {
            try { File.Delete(_dbPath); } catch { /* best effort */ }
        }
    }
}

public class ProductionSecurityApiFactory : InMemoryApiFactory
{
    protected override string EnvironmentName => Environments.Production;
}
