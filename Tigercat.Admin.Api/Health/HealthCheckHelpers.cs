using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Tigercat.Admin.Api.Health;

internal static class HealthCheckHelpers
{
    public const string ReadyTag = "ready";
    public const string TargetKey = "target";

    public static HealthCheckResult ToResult(HealthDependencyStatus status)
    {
        var data = new Dictionary<string, object> { [TargetKey] = status.Target };
        return status.Status == "healthy"
            ? HealthCheckResult.Healthy(data: data)
            : HealthCheckResult.Unhealthy(status.Message, data: data);
    }

    public static HealthDependencyStatus ToDependencyStatus(HealthReportEntry entry)
    {
        var target = "unknown";
        if (entry.Data.TryGetValue(TargetKey, out var value) &&
            value is string text &&
            !string.IsNullOrWhiteSpace(text))
        {
            target = text;
        }

        var status = entry.Status == HealthStatus.Healthy ? "healthy" : "unhealthy";
        return new HealthDependencyStatus(status, target, entry.Description);
    }

    public static bool HasPostgreSqlTls(string? connectionString)
    {
        var values = ParseConnectionString(connectionString, ';');
        return values.TryGetValue("SSL Mode", out var sslMode) &&
            (sslMode.Equals("Require", StringComparison.OrdinalIgnoreCase) ||
             sslMode.Equals("VerifyCA", StringComparison.OrdinalIgnoreCase) ||
             sslMode.Equals("VerifyFull", StringComparison.OrdinalIgnoreCase));
    }

    public static bool HasRedisTls(string? connectionString)
    {
        var values = ParseConnectionString(connectionString, ',');
        return values.TryGetValue("ssl", out var ssl) &&
            bool.TryParse(ssl, out var enabled) &&
            enabled;
    }

    public static Dictionary<string, string> ParseConnectionString(string? connectionString, char separator)
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            return values;
        }

        foreach (var part in connectionString.Split(separator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var index = part.IndexOf('=');
            if (index <= 0 || index == part.Length - 1)
            {
                continue;
            }

            values[part[..index].Trim()] = part[(index + 1)..].Trim();
        }

        return values;
    }
}
