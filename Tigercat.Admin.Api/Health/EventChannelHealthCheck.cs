using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Health;

internal sealed class EventChannelHealthCheck(
    IConfiguration configuration,
    IServiceProvider services) : IHealthCheck
{
    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (configuration.GetValue<bool>("Infrastructure:UseInMemory"))
        {
            return Task.FromResult(HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy("in-memory")));
        }

        if (services.GetService<IEventPublisher>() is null)
        {
            return Task.FromResult(HealthCheckHelpers.ToResult(
                HealthDependencyStatus.Unhealthy("redis-stream", "Event publisher is not registered.")));
        }

        var connectionString = configuration.GetConnectionString("Redis");
        var status = string.IsNullOrWhiteSpace(connectionString)
            ? HealthDependencyStatus.Unhealthy("redis-stream", "ConnectionStrings:Redis is required for Redis Stream events.")
            : HealthDependencyStatus.Healthy($"streams:{string.Join(",", EventBusConstants.Streams)}");
        return Task.FromResult(HealthCheckHelpers.ToResult(status));
    }
}
