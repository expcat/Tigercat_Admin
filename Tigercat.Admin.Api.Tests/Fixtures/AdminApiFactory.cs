using FreeRedis;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using StackExchange.Redis;
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
            var overrides = new Dictionary<string, string?>(ConfigurationOverrides);
            overrides.TryAdd("AuthRateLimit:PermitLimit", "1000");
            overrides.TryAdd("AuthRateLimit:WindowSeconds", "60");
            overrides.TryAdd("ImportJobs:ProgressIntervalMilliseconds", "50");
            config.AddInMemoryCollection(overrides);
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

            // HybridCache is L1-only in tests. Drop Redis IDistributedCache so HybridCache
            // does not construct RedisCache against the throwing multiplexer stub.
            services.RemoveAll<IDistributedCache>();

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

/// <summary>
/// Production host with OpenAPI explicitly enabled so tests can assert
/// that the document is login-gated.
/// </summary>
public class ProductionOpenApiApiFactory : InMemoryApiFactory
{
    protected override string EnvironmentName => Environments.Production;

    protected override Dictionary<string, string?> ConfigurationOverrides
    {
        get
        {
            var map = base.ConfigurationOverrides;
            map["OpenApi:Enabled"] = "true";
            return map;
        }
    }
}

/// <summary>
/// Tight IP limiter so auth-endpoint 429 tests do not share quota with
/// the default 1000-permit test host.
/// </summary>
public class StrictAuthRateLimitApiFactory : InMemoryApiFactory
{
    protected override Dictionary<string, string?> ConfigurationOverrides
    {
        get
        {
            var map = base.ConfigurationOverrides;
            map["AuthRateLimit:PermitLimit"] = "5";
            map["AuthRateLimit:WindowSeconds"] = "60";
            return map;
        }
    }
}

/// <summary>
/// Permit window large enough for account lockout to fire first, then
/// the IP limiter.
/// </summary>
public class LockoutAndLimiterApiFactory : InMemoryApiFactory
{
    protected override Dictionary<string, string?> ConfigurationOverrides
    {
        get
        {
            var map = base.ConfigurationOverrides;
            map["AuthRateLimit:PermitLimit"] = "8";
            map["AuthRateLimit:WindowSeconds"] = "60";
            return map;
        }
    }
}

/// <summary>
/// In-memory factory that replaces the throwing Redis client with an empty-stream stub
/// so audit export can return 200 in tests.
/// </summary>
public class InMemoryRedisStubApiFactory : InMemoryApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IRedisClient>();
            services.AddSingleton(StubRedisClient.Create());
        });
    }
}

/// <summary>
/// SQLite factory with the same empty-stream Redis stub as
/// <see cref="InMemoryRedisStubApiFactory"/>.
/// </summary>
public class SqliteRedisStubApiFactory : SqliteApiFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IRedisClient>();
            services.AddSingleton(StubRedisClient.Create());
        });
    }
}
