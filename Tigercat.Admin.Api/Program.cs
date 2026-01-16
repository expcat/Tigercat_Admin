var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();

// Add CORS for frontend
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

// Configure the HTTP request pipeline.
app.UseCors();

app.MapDefaultEndpoints();

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithOpenApi();

app.MapGet("/api/info", () => Results.Ok(new 
{ 
    name = "Tigercat Admin API", 
    version = "1.0.0",
    description = "Tigercat Admin Backend API"
}))
    .WithName("GetInfo")
    .WithOpenApi();

app.Run();
