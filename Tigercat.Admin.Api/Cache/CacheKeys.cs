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
}
