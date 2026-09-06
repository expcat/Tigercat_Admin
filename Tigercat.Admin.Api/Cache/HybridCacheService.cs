using Microsoft.Extensions.Caching.Hybrid;
using Tigercat.Admin.Api.Observability;

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
        // DisableUnderlyingData is a try-get: the factory is skipped on miss and
        // GetOrCreateAsync returns default(T) without writing. SetAsync never stores
        // null, so a default value is a miss for the payloads this cache holds.
        var value = await cache.GetOrCreateAsync(
            key,
            static _ => new ValueTask<T>(default(T)!),
            ReadOptions,
            cancellationToken: ct);
        if (IsAbsent(value))
        {
            AdminMetrics.RecordCacheEvent("miss");
            return default;
        }

        AdminMetrics.RecordCacheEvent("hit");
        return value;
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
        var miss = false;
        var value = await cache.GetOrCreateAsync(
            key,
            token =>
            {
                miss = true;
                return new ValueTask<T>(factory(token)!);
            },
            ToOptions(ttl),
            cancellationToken: ct);
        AdminMetrics.RecordCacheEvent(miss ? "miss" : "hit");
        return value;
    }

    private static bool IsAbsent<T>(T? value)
    {
        return value is null || EqualityComparer<T>.Default.Equals(value, default);
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
