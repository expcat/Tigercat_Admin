using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tigercat.Admin.Api.Data;

namespace Tigercat.Admin.Api.Health;

internal sealed class ConfigurationHealthCheck(
    IConfiguration configuration,
    IWebHostEnvironment environment) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

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

        var status = issues.Count == 0
            ? HealthDependencyStatus.Healthy(environment.EnvironmentName)
            : HealthDependencyStatus.Unhealthy(environment.EnvironmentName, string.Join(" ", issues));
        return Task.FromResult(HealthCheckHelpers.ToResult(status));
    }
}
