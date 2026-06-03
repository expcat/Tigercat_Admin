using FreeRedis;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using StackExchange.Redis;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Media;
using Tigercat.Admin.Api.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var useInMemoryInfrastructure = builder.Configuration.GetValue<bool>("Infrastructure:UseInMemory");

if (useInMemoryInfrastructure)
{
    builder.Services.AddMemoryCache();
    builder.Services.AddSingleton<ICacheService, InMemoryCacheService>();
    builder.Services.AddSingleton<IEventPublisher, NullEventPublisher>();
    builder.Services.AddSingleton<IIdempotencyService, InMemoryIdempotencyService>();
}
else
{
    var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
        ?? throw new InvalidOperationException("Redis connection string is not configured.");

    // Redis clients: StackExchange.Redis for general cache operations, FreeRedis for stream-style workloads and blocking commands.
    builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
    {
        var options = ConfigurationOptions.Parse(redisConnectionString);
        options.AbortOnConnectFail = false;
        return ConnectionMultiplexer.Connect(options);
    });

    builder.Services.AddSingleton<IRedisClient>(_ => new RedisClient(redisConnectionString));
    builder.Services.AddSingleton<ICacheService, RedisCacheService>();
    builder.Services.AddSingleton<IEventPublisher, RedisStreamPublisher>();
    builder.Services.AddSingleton<IIdempotencyService, RedisIdempotencyService>();
    builder.Services.AddHostedService<RedisStreamConsumer>();
}

// Database provider selection is explicit via Database:Provider when configured.
// If omitted, the app keeps backward-compatible behavior: SQLite when a
// DefaultConnection exists, otherwise EF Core InMemory.
// Configuration is resolved at service-resolution time so that test hosts can
// override provider and connection string independently.
builder.Services.AddDbContext<AdminDbContext>((sp, options) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var databaseOptions = DatabaseProviderResolver.Resolve(config);

    switch (databaseOptions.Provider)
    {
        case AdminDatabaseProvider.Sqlite:
            options.UseSqlite(databaseOptions.ConnectionString);
            break;
        case AdminDatabaseProvider.PostgreSql:
            options.UseNpgsql(databaseOptions.ConnectionString);
            break;
        default:
            options.UseInMemoryDatabase(config["Database:InMemoryName"] ?? "TigercatAdmin");
            break;
    }
});

// When a relational provider is configured, use the EF-backed stores so that auth
// operations share the same database as the rest of the application. For the
// InMemory provider (CI / isolated tests) the lightweight in-memory stores are used.
builder.Services.AddSingleton<InMemoryUserStore>();
builder.Services.AddSingleton<InMemorySessionStore>();
builder.Services.AddScoped<EfUserStore>();
builder.Services.AddScoped<EfSessionStore>();

builder.Services.AddScoped<IUserStore>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var databaseOptions = DatabaseProviderResolver.Resolve(config);
    return databaseOptions.UsesRelationalStores
        ? sp.GetRequiredService<EfUserStore>()
        : sp.GetRequiredService<InMemoryUserStore>();
});

builder.Services.AddScoped<ISessionStore>(sp =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var databaseOptions = DatabaseProviderResolver.Resolve(config);
    return databaseOptions.UsesRelationalStores
        ? sp.GetRequiredService<EfSessionStore>()
        : sp.GetRequiredService<InMemorySessionStore>();
});

builder.Services.AddScoped<IPermissionService, PermissionService>();
builder.Services.Configure<MediaOptions>(builder.Configuration.GetSection("Media"));
builder.Services.AddSingleton<IMediaStorageProvider, LocalMediaStorageProvider>();
builder.Services.AddScoped<IMediaReferenceService, MediaReferenceService>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>()
            ?.Where(origin => !string.IsNullOrWhiteSpace(origin))
            .Select(origin => origin.Trim())
            .ToArray() ?? [];

        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        }
        else
        {
            policy.AllowAnyMethod()
                  .AllowAnyHeader();
        }
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors();
app.MapDefaultEndpoints();

// Seed database with default roles, permissions, and admin user
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
    await DbInitializer.InitializeAsync(dbContext);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Database initialization failed");
    throw;
}

// Map Endpoints Explicitly (AOT compatible)
app.MapEndpoint<AuthEndpoints>();
app.MapEndpoint<AuditEndpoints>();
app.MapEndpoint<HomeEndpoints>();
app.MapEndpoint<UsersEndpoints>();
app.MapEndpoint<RolesEndpoints>();
app.MapEndpoint<StatsEndpoints>();
app.MapEndpoint<ExportEndpoints>();
app.MapEndpoint<SettingsEndpoints>();
app.MapEndpoint<MediaEndpoints>();
app.MapEndpoint<NotificationsEndpoints>();
app.MapEndpoint<TasksEndpoints>();

app.MapGet("/api/health", GetHealth)
    .WithName("HealthCheck");

app.MapGet("/api/info", GetInfo)
    .WithName("GetInfo");

if (!useInMemoryInfrastructure)
{
    app.MapGet("/api/health/redis", GetRedisHealth)
        .WithName("RedisHealthCheck");
}

await app.RunAsync();

static async Task<IResult> GetHealth(
    AdminDbContext dbContext,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    IServiceProvider services,
    CancellationToken ct)
{
    ct.ThrowIfCancellationRequested();

    var details = new Dictionary<string, HealthDependencyStatus>(StringComparer.OrdinalIgnoreCase)
    {
        ["database"] = await CheckDatabaseAsync(dbContext, configuration, ct),
        ["redis"] = await CheckRedisAsync(configuration, services, ct),
        ["eventChannel"] = CheckEventChannel(configuration, services),
        ["configuration"] = CheckConfiguration(configuration, environment),
    };

    var status = details.Values.Any(item => item.Status == "unhealthy")
        ? "unhealthy"
        : "healthy";

    var response = new HealthResponse(status, DateTime.UtcNow, details);
    if (status == "healthy")
    {
        return Results.Json(
            ApiResult.Ok(response),
            AppJsonContext.Default.ApiResponseHealthResponse);
    }

    return Results.Json(
        new ApiResponse<HealthResponse>(response, "Health check failed", 503, false),
        AppJsonContext.Default.ApiResponseHealthResponse,
        statusCode: 503);
}

static async Task<IResult> GetRedisHealth(IConnectionMultiplexer multiplexer, CancellationToken ct)
{
    ct.ThrowIfCancellationRequested();
    var database = multiplexer.GetDatabase();
    try
    {
        await database.PingAsync().WaitAsync(ct);
        return Results.Json(
            ApiResult.Ok(new HealthResponse("healthy", DateTime.UtcNow)),
            AppJsonContext.Default.ApiResponseHealthResponse);
    }
    catch (Exception ex) when (ex is RedisConnectionException or RedisTimeoutException)
    {
        return Results.Json(
            new ApiResponse<HealthResponse>(
                new HealthResponse("unhealthy", DateTime.UtcNow),
                "Redis unavailable",
                503,
                false),
            AppJsonContext.Default.ApiResponseHealthResponse,
            statusCode: 503);
    }
}

static Task<IResult> GetInfo(CancellationToken ct)
{
    ct.ThrowIfCancellationRequested();
    return Task.FromResult<IResult>(Results.Json(
        ApiResult.Ok(new InfoResponse(
            "Tigercat Admin API",
            "1.0.0",
            "Tigercat Admin Backend API"
        )),
        AppJsonContext.Default.ApiResponseInfoResponse));
}

static async Task<HealthDependencyStatus> CheckDatabaseAsync(
    AdminDbContext dbContext,
    IConfiguration configuration,
    CancellationToken ct)
{
    try
    {
        var databaseOptions = DatabaseProviderResolver.Resolve(configuration);
        var reachable = databaseOptions.Provider == AdminDatabaseProvider.InMemory
            || await dbContext.Database.CanConnectAsync(ct);

        return reachable
            ? HealthDependencyStatus.Healthy(databaseOptions.Provider.ToString())
            : HealthDependencyStatus.Unhealthy(databaseOptions.Provider.ToString(), "Database connection failed.");
    }
    catch (Exception ex)
    {
        return HealthDependencyStatus.Unhealthy("unknown", ex.Message);
    }
}

static async Task<HealthDependencyStatus> CheckRedisAsync(
    IConfiguration configuration,
    IServiceProvider services,
    CancellationToken ct)
{
    if (configuration.GetValue<bool>("Infrastructure:UseInMemory"))
    {
        return HealthDependencyStatus.Healthy("in-memory");
    }

    var connectionString = configuration.GetConnectionString("Redis");
    if (string.IsNullOrWhiteSpace(connectionString))
    {
        return HealthDependencyStatus.Unhealthy("redis", "ConnectionStrings:Redis is not configured.");
    }

    var multiplexer = services.GetService<IConnectionMultiplexer>();
    if (multiplexer is null)
    {
        return HealthDependencyStatus.Unhealthy("redis", "Redis multiplexer is not registered.");
    }

    try
    {
        await multiplexer.GetDatabase().PingAsync().WaitAsync(ct);
        return HealthDependencyStatus.Healthy("redis");
    }
    catch (Exception ex) when (ex is RedisConnectionException or RedisTimeoutException or ObjectDisposedException or NotSupportedException)
    {
        return HealthDependencyStatus.Unhealthy("redis", "Redis unavailable.");
    }
}

static HealthDependencyStatus CheckEventChannel(IConfiguration configuration, IServiceProvider services)
{
    if (configuration.GetValue<bool>("Infrastructure:UseInMemory"))
    {
        return HealthDependencyStatus.Healthy("in-memory");
    }

    if (services.GetService<IEventPublisher>() is null)
    {
        return HealthDependencyStatus.Unhealthy("redis-stream", "Event publisher is not registered.");
    }

    var connectionString = configuration.GetConnectionString("Redis");
    return string.IsNullOrWhiteSpace(connectionString)
        ? HealthDependencyStatus.Unhealthy("redis-stream", "ConnectionStrings:Redis is required for Redis Stream events.")
        : HealthDependencyStatus.Healthy(string.Join(",", EventBusConstants.Streams));
}

static HealthDependencyStatus CheckConfiguration(IConfiguration configuration, IWebHostEnvironment environment)
{
    var issues = new List<string>();

    try
    {
        _ = DatabaseProviderResolver.Resolve(configuration);
    }
    catch (Exception ex)
    {
        issues.Add(ex.Message);
    }

    if (!configuration.GetValue<bool>("Infrastructure:UseInMemory") &&
        string.IsNullOrWhiteSpace(configuration.GetConnectionString("Redis")))
    {
        issues.Add("ConnectionStrings:Redis is required unless Infrastructure:UseInMemory=true.");
    }

    var allowedOrigins = configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>() ?? [];

    if (!environment.IsDevelopment() && allowedOrigins.Length == 0)
    {
        issues.Add("Cors:AllowedOrigins should be configured explicitly outside Development.");
    }

    return issues.Count == 0
        ? HealthDependencyStatus.Healthy(environment.EnvironmentName)
        : HealthDependencyStatus.Unhealthy(environment.EnvironmentName, string.Join(" ", issues));
}

public record HealthDependencyStatus(string Status, string Target, string? Message)
{
    public static HealthDependencyStatus Healthy(string target) => new("healthy", target, null);

    public static HealthDependencyStatus Unhealthy(string target, string message) => new("unhealthy", target, message);
}

public record HealthResponse(
    string Status,
    DateTime Timestamp,
    Dictionary<string, HealthDependencyStatus>? Details = null);
public record InfoResponse(string Name, string Version, string Description);

// Make the implicit Program class accessible to the integration test project.
public partial class Program { }
