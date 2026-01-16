var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

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

app.UseCors();
app.MapDefaultEndpoints();

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck");

app.MapGet("/api/info", () => Results.Ok(new 
{ 
    name = "Tigercat Admin API", 
    version = "1.0.0",
    description = "Tigercat Admin Backend API"
}))
    .WithName("GetInfo");

app.MapGet("/api/hi", () => Results.Ok("Hello world!"))
    .WithName("SayHi");

app.Run();
