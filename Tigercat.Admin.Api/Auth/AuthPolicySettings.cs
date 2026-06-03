using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;

namespace Tigercat.Admin.Api.Auth;

public sealed record AuthPolicySettings(
    TimeSpan SessionTtl,
    int MaxLoginAttempts,
    TimeSpan LoginLockout,
    int PasswordMinLength,
    bool RequireComplexPassword)
{
    public const string SessionTimeoutKey = "auth.sessionTimeout";
    public const string MaxAttemptsKey = "auth.maxAttempts";
    public const string LoginLockoutMinutesKey = "auth.loginLockoutMinutes";
    public const string PasswordMinLengthKey = "auth.passwordMinLength";
    public const string RequireComplexPasswordKey = "auth.requireComplexPassword";

    public const int DefaultSessionTimeoutMinutes = 1440;
    public const int DefaultMaxAttempts = 5;
    public const int DefaultLoginLockoutMinutes = 5;
    public const int DefaultPasswordMinLength = 6;

    public const int MinSessionTimeoutMinutes = 5;
    public const int MaxSessionTimeoutMinutes = 60 * 24 * 30;
    public const int MinLoginAttempts = 1;
    public const int MaxLoginAttemptsLimit = 20;
    public const int MinLoginLockoutMinutes = 1;
    public const int MaxLoginLockoutMinutes = 60 * 24;
    public const int MinPasswordLength = 6;
    public const int MaxPasswordLength = 128;

    public static async Task<AuthPolicySettings> LoadAsync(AdminDbContext db, CancellationToken ct)
    {
        var values = await db.SystemSettings
            .Where(s =>
                s.Key == SessionTimeoutKey ||
                s.Key == MaxAttemptsKey ||
                s.Key == LoginLockoutMinutesKey ||
                s.Key == PasswordMinLengthKey ||
                s.Key == RequireComplexPasswordKey)
            .Select(s => new { s.Key, s.Value })
            .ToListAsync(ct);

        var map = values.ToDictionary(s => s.Key, s => s.Value, StringComparer.OrdinalIgnoreCase);

        return new AuthPolicySettings(
            TimeSpan.FromMinutes(ParseInt(map, SessionTimeoutKey, DefaultSessionTimeoutMinutes, MinSessionTimeoutMinutes, MaxSessionTimeoutMinutes)),
            ParseInt(map, MaxAttemptsKey, DefaultMaxAttempts, MinLoginAttempts, MaxLoginAttemptsLimit),
            TimeSpan.FromMinutes(ParseInt(map, LoginLockoutMinutesKey, DefaultLoginLockoutMinutes, MinLoginLockoutMinutes, MaxLoginLockoutMinutes)),
            ParseInt(map, PasswordMinLengthKey, DefaultPasswordMinLength, MinPasswordLength, MaxPasswordLength),
            ParseBool(map, RequireComplexPasswordKey, false));
    }

    public string? ValidatePassword(string password)
    {
        if (password.Length < PasswordMinLength)
        {
            return $"密码长度不能少于 {PasswordMinLength} 位";
        }

        if (RequireComplexPassword &&
            (!password.Any(char.IsLetter) || !password.Any(char.IsDigit)))
        {
            return "密码必须同时包含字母和数字";
        }

        return null;
    }

    public static string? ValidateSettingValue(string key, string value)
    {
        return key switch
        {
            SessionTimeoutKey => ValidateIntRange(value, key, MinSessionTimeoutMinutes, MaxSessionTimeoutMinutes),
            MaxAttemptsKey => ValidateIntRange(value, key, MinLoginAttempts, MaxLoginAttemptsLimit),
            LoginLockoutMinutesKey => ValidateIntRange(value, key, MinLoginLockoutMinutes, MaxLoginLockoutMinutes),
            PasswordMinLengthKey => ValidateIntRange(value, key, MinPasswordLength, MaxPasswordLength),
            RequireComplexPasswordKey => bool.TryParse(value, out _)
                ? null
                : $"{key} 只能为 true 或 false",
            _ => null,
        };
    }

    private static int ParseInt(
        IReadOnlyDictionary<string, string> values,
        string key,
        int fallback,
        int min,
        int max)
    {
        if (!values.TryGetValue(key, out var raw) || !int.TryParse(raw, out var value))
        {
            return fallback;
        }

        return Math.Clamp(value, min, max);
    }

    private static bool ParseBool(
        IReadOnlyDictionary<string, string> values,
        string key,
        bool fallback)
    {
        return values.TryGetValue(key, out var raw) && bool.TryParse(raw, out var value)
            ? value
            : fallback;
    }

    private static string? ValidateIntRange(string raw, string key, int min, int max)
    {
        if (!int.TryParse(raw, out var value))
        {
            return $"{key} 必须为整数";
        }

        return value < min || value > max
            ? $"{key} 需在 {min}-{max} 之间"
            : null;
    }
}
