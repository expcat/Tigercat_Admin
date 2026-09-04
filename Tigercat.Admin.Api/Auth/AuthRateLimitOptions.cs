namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// IP-partitioned fixed-window limiter for public auth endpoints.
/// Account lockout stays in <c>AuthEndpoints</c>; this limiter is per remote IP.
/// </summary>
public sealed class AuthRateLimitOptions
{
    public const string SectionName = "AuthRateLimit";
    public const string PolicyName = "auth";

    public const int DefaultPermitLimit = 120;
    public const int DefaultWindowSeconds = 60;
    public const int ProductionPermitLimit = 30;

    public int PermitLimit { get; set; } = DefaultPermitLimit;
    public int WindowSeconds { get; set; } = DefaultWindowSeconds;
}
