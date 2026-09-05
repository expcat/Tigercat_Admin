namespace Tigercat.Admin.Api.Cache;

public static class CacheKeys
{
    public static string UserProfile(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            throw new ArgumentException("User ID is required.", nameof(userId));
        }

        var safeUserId = Uri.EscapeDataString(userId);
        return $"cache:user:profile:{safeUserId}";
    }

    public static string UserPermissions(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            throw new ArgumentException("Username is required.", nameof(username));
        }

        var safeUsername = Uri.EscapeDataString(username);
        return $"cache:user:permissions:{safeUsername}";
    }

    public static string TwoFactorChallenge(string challengeId)
    {
        if (string.IsNullOrWhiteSpace(challengeId))
        {
            throw new ArgumentException("Challenge ID is required.", nameof(challengeId));
        }

        return $"cache:auth:2fa:challenge:{Uri.EscapeDataString(challengeId)}";
    }

    public static string TwoFactorUser(string username)
    {
        if (string.IsNullOrWhiteSpace(username))
        {
            throw new ArgumentException("Username is required.", nameof(username));
        }

        return $"cache:auth:2fa:user:{Uri.EscapeDataString(username)}";
    }

    public static string ForgotPasswordCode(string channel, string target)
    {
        if (string.IsNullOrWhiteSpace(channel))
        {
            throw new ArgumentException("Channel is required.", nameof(channel));
        }

        if (string.IsNullOrWhiteSpace(target))
        {
            throw new ArgumentException("Target is required.", nameof(target));
        }

        return $"cache:auth:forgot:{Uri.EscapeDataString(channel)}:{Uri.EscapeDataString(target)}";
    }

    public const string SettingsAll = "cache:settings:all";

    public static string Setting(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ArgumentException("Setting key is required.", nameof(key));
        }

        return $"cache:settings:item:{Uri.EscapeDataString(key)}";
    }
}

