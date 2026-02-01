namespace Tigercat.Admin.Api.Cache;

public static class CacheKeys
{
    public static string UserProfile(string userId) => $"cache:user:profile:{userId}";
}
