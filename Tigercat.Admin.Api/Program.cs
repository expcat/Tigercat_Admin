using System.Threading.RateLimiting;
using FreeRedis;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.StackExchangeRedis;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Scalar.AspNetCore;
using StackExchange.Redis;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Health;
using Tigercat.Admin.Api.Import;
using Tigercat.Admin.Api.Media;
using Tigercat.Admin.Api.Notifications;
using Tigercat.Admin.Api.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.Services.AddHealthChecks().AddAdminHealthChecks();

var useInMemoryInfrastructure = builder.Configuration.GetValue<bool>("Infrastructure:UseInMemory");

if (useInMemoryInfrastructure)
{
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
    builder.Services.AddStackExchangeRedisCache(_ => { });
    builder.Services.AddOptions<RedisCacheOptions>()
        .Configure<IConnectionMultiplexer>((options, multiplexer) =>
        {
            options.ConnectionMultiplexerFactory = () => Task.FromResult(multiplexer);
        });
    builder.Services.AddSingleton<IEventPublisher, RedisStreamPublisher>();
    builder.Services.AddSingleton<IIdempotencyService, RedisIdempotencyService>();
    builder.Services.AddHostedService<RedisStreamConsumer>();
}

// HybridCache is L1-only when Infrastructure:UseInMemory=true. With Redis, L2 uses the
// existing multiplexer via IDistributedCache. Do not add OutputCache: authenticated GETs
// would need VaryBy user/permission, and Monitor snapshots must stay uncached.
builder.Services.AddHybridCache();
builder.Services.AddSingleton<ICacheService, HybridCacheService>();
builder.Services.AddHostedService<ImportJobProgressService>();

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
builder.Services.AddSingleton<IMediaStorageProvider>(sp =>
{
    var options = sp.GetRequiredService<IOptions<MediaOptions>>().Value;
    var provider = MediaStorageProviderResolver.Resolve(options);
    return provider == MediaStorageProviderResolver.LocalProvider
        ? ActivatorUtilities.CreateInstance<LocalMediaStorageProvider>(sp)
        : throw new InvalidOperationException($"Media provider '{provider}' is not registered.");
});
builder.Services.AddScoped<IMediaReferenceService, MediaReferenceService>();
builder.Services.AddScoped<IAdminNotificationService, AdminNotificationService>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer(new OpenApiAuthDocumentTransformer());
});

builder.Services.Configure<AuthRateLimitOptions>(
    builder.Configuration.GetSection(AuthRateLimitOptions.SectionName));
builder.Services.AddRateLimiter(options =>
{
    var limitOptions = builder.Configuration
        .GetSection(AuthRateLimitOptions.SectionName)
        .Get<AuthRateLimitOptions>() ?? new AuthRateLimitOptions();
    var permitLimit = Math.Max(1, limitOptions.PermitLimit);
    var window = TimeSpan.FromSeconds(Math.Max(1, limitOptions.WindowSeconds));

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(
            ApiResult.Fail("请求过于频繁，请稍后再试", 429),
            AppJsonContext.Default.ApiResponseObject,
            cancellationToken: token);
    };

    options.AddPolicy(AuthRateLimitOptions.PolicyName, httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = permitLimit,
                QueueLimit = 0,
                Window = window
            }));
});

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

var openApiEnabled = app.Environment.IsDevelopment()
    || app.Configuration.GetValue("OpenApi:Enabled", false);

if (openApiEnabled)
{
    var openApi = app.MapOpenApi();
    var scalar = app.MapScalarApiReference();
    if (!app.Environment.IsDevelopment())
    {
        openApi.AddEndpointFilter(new LoginFilter());
        scalar.AddEndpointFilter(new LoginFilter());
    }
}

app.UseCors();
app.UseRateLimiter();
app.MapDefaultEndpoints();

// Seed database with default roles, permissions, and admin user
try
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
    await DbInitializer.InitializeAsync(dbContext, app.Configuration);

    var passwordHashes = await dbContext.Users.Select(u => u.PasswordHash).ToListAsync();
    var legacyCount = passwordHashes.Count(PasswordHasher.IsLegacySha256);
    if (legacyCount > 0)
    {
        app.Logger.LogWarning(
            "{LegacyCount} user password hash(es) are still SHA256 hex and will be upgraded on the next successful login.",
            legacyCount);
    }
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
app.MapEndpoint<TicketsEndpoints>();
app.MapEndpoint<ChatEndpoints>();
app.MapEndpoint<CommentsEndpoints>();
app.MapEndpoint<ProjectsEndpoints>();
app.MapEndpoint<CalendarEndpoints>();
app.MapEndpoint<ContentEndpoints>();
app.MapEndpoint<JobsEndpoints>();
app.MapEndpoint<ImportJobsEndpoints>();
app.MapEndpoint<MonitorEndpoints>();

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

static async Task<IResult> GetHealth(HealthCheckService healthChecks, CancellationToken ct)
{
    var report = await healthChecks.CheckHealthAsync(
        registration => registration.Tags.Contains(HealthCheckHelpers.ReadyTag),
        ct);

    var details = new Dictionary<string, HealthDependencyStatus>(StringComparer.OrdinalIgnoreCase);
    foreach (var (name, entry) in report.Entries)
    {
        details[name] = HealthCheckHelpers.ToDependencyStatus(entry);
    }

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

public record InfoResponse(string Name, string Version, string Description);

// Make the implicit Program class accessible to the integration test project.
public partial class Program { }
