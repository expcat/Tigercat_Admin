using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tigercat.Admin.Api.Data;

namespace Tigercat.Admin.Api.Health;

internal sealed class DatabaseHealthCheck(
    AdminDbContext dbContext,
    IConfiguration configuration) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var databaseOptions = DatabaseProviderResolver.Resolve(configuration);
            var reachable = databaseOptions.Provider == AdminDatabaseProvider.InMemory
                || await dbContext.Database.CanConnectAsync(cancellationToken);

            var status = reachable
                ? HealthDependencyStatus.Healthy(databaseOptions.Provider.ToString())
                : HealthDependencyStatus.Unhealthy(databaseOptions.Provider.ToString(), "Database connection failed.");
            return HealthCheckHelpers.ToResult(status);
        }
        catch (Exception ex)
        {
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Unhealthy("unknown", ex.Message));
        }
    }
}
