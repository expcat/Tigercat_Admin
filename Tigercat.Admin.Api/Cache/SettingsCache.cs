namespace Tigercat.Admin.Api.Cache;

internal static class SettingsCache
{
    public static readonly TimeSpan Ttl = TimeSpan.FromMinutes(5);

    public static async Task InvalidateAsync(
        ICacheService cache,
        IEnumerable<string> keys,
        CancellationToken ct = default)
    {
        await cache.RemoveAsync(CacheKeys.SettingsAll, ct);
        foreach (var key in keys)
        {
            if (!string.IsNullOrWhiteSpace(key))
            {
                await cache.RemoveAsync(CacheKeys.Setting(key), ct);
            }
        }
    }
}
