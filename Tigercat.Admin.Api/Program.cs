using FreeRedis;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;
using StackExchange.Redis;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var redisConnectionString = builder.Configuration.GetConnectionString("Redis")
    ?? throw new InvalidOperationException("Redis connection string is not configured.");

// Register EF Core DbContext with InMemory provider
builder.Services.AddDbContext<AdminDbContext>(options =>
    options.UseInMemoryDatabase("TigercatAdminDb"));

// Redis clients: StackExchange.Redis for cache operations, FreeRedis for streams.
builder.Services.AddSingleton<IConnectionMultiplexer>(sp =>
{
    var options = ConfigurationOptions.Parse(redisConnectionString);
    options.AbortOnConnectFail = false;
    return ConnectionMultiplexer.Connect(options);
});

builder.Services.AddSingleton<IRedisClient>(_ => new RedisClient(redisConnectionString));

// Register EF Core stores
builder.Services.AddScoped<IUserStore, EfUserStore>();
builder.Services.AddScoped<ISessionStore, EfSessionStore>();

builder.Services.ConfigureHttpJsonOptions(options =>
{
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

// Initialize database with seed data
try
{
    using var scope = app.Services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    await DbInitializer.InitializeAsync(context);
    logger.LogInformation("Database initialized successfully");
}
catch (Exception ex)
{
    var logger = app.Services.GetRequiredService<ILogger<Program>>();
    logger.LogError(ex, "An error occurred while initializing the database");
    throw; // Re-throw to prevent app from starting with uninitialized database
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseCors();
app.MapDefaultEndpoints();

// Map Endpoints Explicitly (AOT compatible)
app.MapEndpoint<AuthEndpoints>();
app.MapEndpoint<HomeEndpoints>();

app.MapGet("/api/health", GetHealth)
    .WithName("HealthCheck");

app.MapGet("/api/info", GetInfo)
    .WithName("GetInfo");

app.MapGet("/api/health/redis", GetRedisHealth)
    .WithName("RedisHealthCheck");

app.Run();

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
    await database.PingAsync();
    return Results.Json(
        ApiResult.Ok(new HealthResponse("healthy", DateTime.UtcNow)),
        AppJsonContext.Default.ApiResponseHealthResponse);
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
