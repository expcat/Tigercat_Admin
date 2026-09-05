using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tigercat.Admin.Api.Media;

namespace Tigercat.Admin.Api.Health;

internal sealed class MediaStorageHealthCheck(IConfiguration configuration) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            var options = configuration.GetSection("Media").Get<MediaOptions>() ?? new MediaOptions();
            var provider = MediaStorageProviderResolver.Resolve(options);
            return Task.FromResult(HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy(provider)));
        }
        catch (Exception ex)
        {
            return Task.FromResult(HealthCheckHelpers.ToResult(HealthDependencyStatus.Unhealthy("media", ex.Message)));
        }
    }
}
