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
using Tigercat.Admin.Api.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

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

// Database provider: when a "DefaultConnection" connection string is configured the app
// uses SQLite (recommended for production); otherwise it falls back to the EF Core
// InMemory provider (development / CI only — data is lost on restart).
// Configuration is read at service-resolution time so that test hosts can override it.
builder.Services.AddDbContext<AdminDbContext>((sp, options) =>
{
    var config = sp.GetRequiredService<IConfiguration>();
    var connStr = config.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrEmpty(connStr))
    {
        options.UseSqlite(connStr);
    }
    else
    {
        options.UseInMemoryDatabase("TigercatAdmin");
    }
});

// Auth/user/session stores: always use EF-backed stores so that authentication,
// registration and user-management endpoints all share the same AdminDbContext,
// regardless of whether SQLite or the EF InMemory provider is used.
builder.Services.AddScoped<IUserStore, EfUserStore>();
builder.Services.AddScoped<ISessionStore, EfSessionStore>();

builder.Services.AddScoped<IPermissionService, PermissionService>();

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
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
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
app.MapEndpoint<HomeEndpoints>();
app.MapEndpoint<UsersEndpoints>();
app.MapEndpoint<RolesEndpoints>();
app.MapEndpoint<StatsEndpoints>();
app.MapEndpoint<ExportEndpoints>();
app.MapEndpoint<SettingsEndpoints>();

app.MapGet("/api/health", GetHealth)
    .WithName("HealthCheck");

app.MapGet("/api/info", GetInfo)
    .WithName("GetInfo");

app.MapGet("/api/health/redis", GetRedisHealth)
    .WithName("RedisHealthCheck");

await app.RunAsync();

static Task<IResult> GetHealth(CancellationToken ct)
{
    ct.ThrowIfCancellationRequested();
    return Task.FromResult<IResult>(Results.Json(
        ApiResult.Ok(new HealthResponse("healthy", DateTime.UtcNow)),
        AppJsonContext.Default.ApiResponseHealthResponse));
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

public record HealthResponse(string Status, DateTime Timestamp);
public record InfoResponse(string Name, string Version, string Description);

// Make the implicit Program class accessible to the integration test project.
public partial class Program { }
