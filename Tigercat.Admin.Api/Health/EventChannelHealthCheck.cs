using Microsoft.Extensions.Diagnostics.HealthChecks;
using StackExchange.Redis;
using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Health;

internal sealed class EventChannelHealthCheck(
    IConfiguration configuration,
    IServiceProvider services,
    IHostEnvironment environment) : IHealthCheck
{
    private static readonly TimeSpan MaxConsumerIdle = TimeSpan.FromSeconds(30);

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (configuration.GetValue<bool>("Infrastructure:UseInMemory"))
        {
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy("in-memory"));
        }

        if (services.GetService<IEventPublisher>() is null)
        {
            return HealthCheckHelpers.ToResult(
                HealthDependencyStatus.Unhealthy("redis-stream", "Event publisher is not registered."));
        }

        if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Redis")))
        {
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Unhealthy(
                "redis-stream",
                "ConnectionStrings:Redis is required for Redis Stream events."));
        }

        var multiplexer = services.GetService<IConnectionMultiplexer>();
        if (multiplexer is null)
        {
            return HealthCheckHelpers.ToResult(
                HealthDependencyStatus.Unhealthy("redis-stream", "Redis multiplexer is not registered."));
        }

        try
        {
            var database = multiplexer.GetDatabase();
            await database.PingAsync().WaitAsync(cancellationToken);
            var groupName = $"tigercat-admin-{environment.EnvironmentName.ToLowerInvariant()}";

            foreach (var stream in EventBusConstants.Streams)
            {
                var groups = await database.StreamGroupInfoAsync(stream).WaitAsync(cancellationToken);
                if (!groups.Any(group => group.Name == groupName && group.ConsumerCount > 0))
                {
                    return HealthCheckHelpers.ToResult(HealthDependencyStatus.Unhealthy(
                        "redis-stream",
                        "Redis stream consumer group is not active."));
                }

                var consumers = await database.StreamConsumerInfoAsync(stream, groupName).WaitAsync(cancellationToken);
                if (!consumers.Any(consumer => consumer.IdleTimeInMilliseconds <= MaxConsumerIdle.TotalMilliseconds))
                {
                    return HealthCheckHelpers.ToResult(HealthDependencyStatus.Unhealthy(
                        "redis-stream",
                        "Redis stream consumer has not been active recently."));
                }
            }

            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy("redis-stream"));
        }
        catch (Exception ex) when (ex is RedisException or ObjectDisposedException or NotSupportedException)
        {
            return HealthCheckHelpers.ToResult(
                HealthDependencyStatus.Unhealthy("redis-stream", "Redis stream event channel is unavailable."));
        }
    }
}
