using Microsoft.Extensions.Caching.Hybrid;

namespace Tigercat.Admin.Api.Cache;

/// <summary>
/// <see cref="ICacheService"/> backed by HybridCache. In-memory hosts use L1 only;
/// Redis hosts also use the existing multiplexer as L2 via <c>IDistributedCache</c>.
/// <see cref="GetOrSetAsync{T}"/> uses HybridCache stampede protection.
/// </summary>
public sealed class HybridCacheService(HybridCache cache) : ICacheService
{
    private static readonly HybridCacheEntryOptions ReadOptions = new()
    {
        Flags = HybridCacheEntryFlags.DisableUnderlyingData
    };

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return await cache.GetOrCreateAsync(
            key,
            static _ => new ValueTask<T>(default(T)!),
            ReadOptions,
            cancellationToken: ct);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        if (value is null)
        {
            await RemoveAsync(key, ct);
            return;
        }

        await cache.SetAsync(key, value, ToOptions(ttl), cancellationToken: ct);
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        await cache.RemoveAsync(key, ct);
    }

    public async Task<T?> GetOrSetAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return await cache.GetOrCreateAsync(
            key,
            token => new ValueTask<T>(factory(token)!),
            ToOptions(ttl),
            cancellationToken: ct);
    }

    private static HybridCacheEntryOptions? ToOptions(TimeSpan? ttl)
    {
        if (ttl is null)
        {
            return null;
        }

        return new HybridCacheEntryOptions
        {
            Expiration = ttl,
            LocalCacheExpiration = ttl
        };
    }
}
