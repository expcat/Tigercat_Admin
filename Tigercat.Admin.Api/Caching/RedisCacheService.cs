using System.Text.Json;
using StackExchange.Redis;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Caching;

public class RedisCacheService : ICacheService
{
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();

    private readonly IConnectionMultiplexer _multiplexer;

    public RedisCacheService(IConnectionMultiplexer multiplexer)
    {
        _multiplexer = multiplexer;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var database = _multiplexer.GetDatabase();
        var value = await database.StringGetAsync(key).WaitAsync(ct);
        if (!value.HasValue)
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(value.ToString(), SerializerOptions);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var database = _multiplexer.GetDatabase();
        var payload = JsonSerializer.Serialize(value, SerializerOptions);
        await database.StringSetAsync(key, payload, ttl).WaitAsync(ct);
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var database = _multiplexer.GetDatabase();
        await database.KeyDeleteAsync(key).WaitAsync(ct);
    }

    public async Task<T> GetOrSetAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default)
    {
        var cached = await GetAsync<T>(key, ct);
        if (cached is not null)
        {
            return cached;
        }

        var value = await factory(ct);
        await SetAsync(key, value, ttl, ct);
        return value;
    }

    private static JsonSerializerOptions CreateSerializerOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
        return options;
    }
}
