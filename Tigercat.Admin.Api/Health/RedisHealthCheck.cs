using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;

namespace Tigercat.Admin.Api.Health;

internal sealed class RedisHealthCheck(
    IConfiguration configuration,
    IServiceProvider services) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (configuration.GetValue<bool>("Infrastructure:UseInMemory"))
        {
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy("in-memory"));
        }

        var connectionString = configuration.GetConnectionString("Redis");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return HealthCheckHelpers.ToResult(
                HealthDependencyStatus.Unhealthy("redis", "ConnectionStrings:Redis is not configured."));
        }

        var multiplexer = services.GetService<IConnectionMultiplexer>();
        if (multiplexer is null)
        {
            return HealthCheckHelpers.ToResult(
                HealthDependencyStatus.Unhealthy("redis", "Redis multiplexer is not registered."));
        }

        try
        {
            await multiplexer.GetDatabase().PingAsync().WaitAsync(cancellationToken);
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy("redis"));
        }
        catch (Exception ex) when (ex is RedisConnectionException or RedisTimeoutException or ObjectDisposedException or NotSupportedException)
        {
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Unhealthy("redis", "Redis unavailable."));
        }
    }
}
