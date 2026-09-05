using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Data;

namespace Tigercat.Admin.Api.Health;

internal sealed class SecurityHealthCheck(
    AdminDbContext dbContext,
    IConfiguration configuration,
    IWebHostEnvironment environment) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (!environment.IsProduction())
        {
            return HealthCheckHelpers.ToResult(HealthDependencyStatus.Healthy(environment.EnvironmentName));
        }

        var issues = new List<string>();

        try
        {
            var databaseOptions = DatabaseProviderResolver.Resolve(configuration);
            if (databaseOptions.Provider == AdminDatabaseProvider.PostgreSql &&
                !HealthCheckHelpers.HasPostgreSqlTls(databaseOptions.ConnectionString))
            {
                issues.Add("PostgreSQL connection should require TLS.");
            }
        }
        catch (Exception ex)
        {
            issues.Add(ex.Message);
        }

        if (!configuration.GetValue<bool>("Infrastructure:UseInMemory") &&
            !HealthCheckHelpers.HasRedisTls(configuration.GetConnectionString("Redis")))
        {
            issues.Add("Redis connection should enable TLS.");
        }

        var allowedOrigins = configuration
            .GetSection("Cors:AllowedOrigins")
            .Get<string[]>() ?? [];

        if (allowedOrigins.Length == 0)
        {
            issues.Add("Cors:AllowedOrigins must be configured.");
        }

        var allowedHosts = configuration["AllowedHosts"];
        if (string.IsNullOrWhiteSpace(allowedHosts) || allowedHosts.Trim() == "*")
        {
            issues.Add("AllowedHosts should be restricted in Production.");
        }

        var adminHash = await dbContext.Users
            .Where(u => u.Username == "admin")
            .Select(u => u.PasswordHash)
            .FirstOrDefaultAsync(cancellationToken);

        if (PasswordHasher.IsDefaultAdminPassword(adminHash))
        {
            issues.Add("Default admin password must be rotated.");
        }

        if (string.IsNullOrWhiteSpace(configuration["BootstrapAdmin:Password"]))
        {
            issues.Add("BootstrapAdmin:Password should be injected before first production startup.");
        }

        try
        {
            var policy = await AuthPolicySettings.LoadAsync(dbContext, cancellationToken);
            if (policy.SessionTtl == TimeSpan.FromMinutes(AuthPolicySettings.DefaultSessionTimeoutMinutes))
            {
                issues.Add("auth.sessionTimeout is still at the default value.");
            }

            if (policy.MaxLoginAttempts == AuthPolicySettings.DefaultMaxAttempts)
            {
                issues.Add("auth.maxAttempts is still at the default value.");
            }

            if (policy.LoginLockout == TimeSpan.FromMinutes(AuthPolicySettings.DefaultLoginLockoutMinutes))
            {
                issues.Add("auth.loginLockoutMinutes is still at the default value.");
            }

            if (policy.PasswordMinLength == AuthPolicySettings.DefaultPasswordMinLength)
            {
                issues.Add("auth.passwordMinLength is still at the default value.");
            }

            if (!policy.RequireComplexPassword)
            {
                issues.Add("auth.requireComplexPassword should be enabled in Production.");
            }
        }
        catch (Exception ex)
        {
            issues.Add($"Auth policy check failed: {ex.Message}");
        }

        var status = issues.Count == 0
            ? HealthDependencyStatus.Healthy("production")
            : HealthDependencyStatus.Unhealthy("production", string.Join(" ", issues));
        return HealthCheckHelpers.ToResult(status);
    }
}
