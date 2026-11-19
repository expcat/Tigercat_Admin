using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tigercat.Admin.Api.Media;

namespace Tigercat.Admin.Api.Health;

internal sealed class MediaStorageHealthCheck(IMediaStorageProvider storage) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        try
        {
            await using var content = new MemoryStream([0]);
            var probe = await storage.SaveAsync(content, $"health-{Guid.NewGuid():N}", ".tmp", cancellationToken);
            await storage.DeleteAsync(probe.StoredFileName, cancellationToken);
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy(storage.ProviderName));
        }
        catch (Exception)
        {
            return HealthCheckHelpers.ToResult(
                HealthDependencyStatus.Unhealthy("media", "Media storage write probe failed."));
        }
    }
}
