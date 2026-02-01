namespace Tigercat.Admin.Api.Caching;

public static class CacheKeys
{
    public static string UserProfile(string userId) => $"cache:user:profile:{userId}";
}
