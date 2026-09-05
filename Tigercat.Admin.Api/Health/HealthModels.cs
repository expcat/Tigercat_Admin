namespace Tigercat.Admin.Api.Health;

public record HealthDependencyStatus(string Status, string Target, string? Message)
{
    public static HealthDependencyStatus Healthy(string target) => new("healthy", target, null);

    public static HealthDependencyStatus Unhealthy(string target, string message) => new("unhealthy", target, message);
}

public record HealthResponse(
    string Status,
    DateTime Timestamp,
    Dictionary<string, HealthDependencyStatus>? Details = null);
