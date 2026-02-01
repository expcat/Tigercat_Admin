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
}
