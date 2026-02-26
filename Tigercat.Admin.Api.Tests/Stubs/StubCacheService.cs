using System.Collections.Concurrent;
using Tigercat.Admin.Api.Cache;

namespace Tigercat.Admin.Api.Tests.Stubs;

/// <summary>
/// In-memory cache used during integration tests so that no Redis instance is required.
/// </summary>
public sealed class StubCacheService : ICacheService
{
    private readonly ConcurrentDictionary<string, object?> _store = new();

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        if (_store.TryGetValue(key, out var value) && value is T typed)
        {
            return Task.FromResult<T?>(typed);
        }

        return Task.FromResult<T?>(default);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        _store[key] = value;
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        _store.TryRemove(key, out _);
        return Task.CompletedTask;
    }

    public async Task<T?> GetOrSetAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default)
    {
        if (_store.TryGetValue(key, out var existing) && existing is T typed)
        {
            return typed;
        }

        var value = await factory(ct);
        _store[key] = value;
        return value;
    }
}
