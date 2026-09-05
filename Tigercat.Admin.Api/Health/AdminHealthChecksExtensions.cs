using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Tigercat.Admin.Api.Health;

internal static class AdminHealthChecksExtensions
{
    public static IHealthChecksBuilder AddAdminHealthChecks(this IHealthChecksBuilder builder)
    {
        builder.Add(Create<DatabaseHealthCheck>("database"));
        builder.Add(Create<RedisHealthCheck>("redis"));
        builder.Add(Create<EventChannelHealthCheck>("eventChannel"));
        builder.Add(Create<MediaStorageHealthCheck>("mediaStorage"));
        builder.Add(Create<ConfigurationHealthCheck>("configuration"));
        builder.Add(Create<SecurityHealthCheck>("security"));
        return builder;
    }

    private static HealthCheckRegistration Create<T>(string name) where T : class, IHealthCheck
        => new(
            name,
            sp => ActivatorUtilities.CreateInstance<T>(sp),
            failureStatus: HealthStatus.Unhealthy,
            tags: [HealthCheckHelpers.ReadyTag]);
}
