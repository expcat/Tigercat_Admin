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
    private const int DefaultSessionTimeoutMinutes = 1440;
    private const int DefaultMaxAttempts = 5;
    private const int DefaultLoginLockoutMinutes = 5;
    private const int DefaultPasswordMinLength = 6;

    public static async Task<AuthPolicySettings> LoadAsync(AdminDbContext db, CancellationToken ct)
    {
        var values = await db.SystemSettings
            .Where(s =>
                s.Key == "auth.sessionTimeout" ||
                s.Key == "auth.maxAttempts" ||
                s.Key == "auth.loginLockoutMinutes" ||
                s.Key == "auth.passwordMinLength" ||
                s.Key == "auth.requireComplexPassword")
            .Select(s => new { s.Key, s.Value })
            .ToListAsync(ct);

        var map = values.ToDictionary(s => s.Key, s => s.Value, StringComparer.OrdinalIgnoreCase);

        return new AuthPolicySettings(
            TimeSpan.FromMinutes(ParseInt(map, "auth.sessionTimeout", DefaultSessionTimeoutMinutes, 5, 60 * 24 * 30)),
            ParseInt(map, "auth.maxAttempts", DefaultMaxAttempts, 1, 20),
            TimeSpan.FromMinutes(ParseInt(map, "auth.loginLockoutMinutes", DefaultLoginLockoutMinutes, 1, 60 * 24)),
            ParseInt(map, "auth.passwordMinLength", DefaultPasswordMinLength, 6, 128),
            ParseBool(map, "auth.requireComplexPassword", false));
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
}
