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
    /// <summary>
    /// Connection-string overrides applied via in-memory configuration so that they
    /// supersede any values from appsettings.json.
    /// </summary>
    protected abstract Dictionary<string, string?> ConfigurationOverrides { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
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
}

/// <summary>
/// Factory that uses the EF Core <b>InMemory</b> provider.
/// <c>DefaultConnection</c> is explicitly empty so that <c>Program.cs</c> selects
/// <c>UseInMemoryDatabase</c>.  Auth stores always use the EF-backed implementations.
/// </summary>
public class InMemoryApiFactory : AdminApiFactory
{
    protected override Dictionary<string, string?> ConfigurationOverrides => new()
    {
        ["ConnectionStrings:Redis"] = "localhost:1",
        ["ConnectionStrings:DefaultConnection"] = "",
    };
}

/// <summary>
/// Factory that uses the EF Core <b>SQLite</b> provider with a temporary database file.
/// <c>DefaultConnection</c> is set so that <c>Program.cs</c> chooses <c>UseSqlite</c>
/// and registers <c>EfUserStore / EfSessionStore</c>.
/// </summary>
public class SqliteApiFactory : AdminApiFactory
{
    private readonly string _dbPath = Path.Combine(
        Path.GetTempPath(),
        $"tigercat_test_{Guid.NewGuid():N}.db");

    protected override Dictionary<string, string?> ConfigurationOverrides => new()
    {
        ["ConnectionStrings:Redis"] = "localhost:1",
        ["ConnectionStrings:DefaultConnection"] = $"Data Source={_dbPath}",
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
