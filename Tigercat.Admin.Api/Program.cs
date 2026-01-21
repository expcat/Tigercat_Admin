using Scalar.AspNetCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Serialization;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddSingleton<IUserStore, InMemoryUserStore>();
builder.Services.AddSingleton<ISessionStore, InMemorySessionStore>();

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

app.MapGet("/api/health", () => ApiResult.Ok(new HealthResponse("healthy", DateTime.UtcNow)))
    .WithName("HealthCheck");

app.MapGet("/api/info", () => ApiResult.Ok(new InfoResponse(
    "Tigercat Admin API",
    "1.0.0",
    "Tigercat Admin Backend API"
)))
    .WithName("GetInfo");

app.Run();

public record HealthResponse(string Status, DateTime Timestamp);
public record InfoResponse(string Name, string Version, string Description);
