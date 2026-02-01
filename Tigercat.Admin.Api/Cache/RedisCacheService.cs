using System.Text.Json;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Cache;

public class RedisCacheService : ICacheService
{
    private const int LockAcquisitionTimeoutSeconds = 5;
    private const int LockRetryDelayMilliseconds = 100;
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();

    private readonly IConnectionMultiplexer _multiplexer;
    private readonly ILogger<RedisCacheService> _logger;

    public RedisCacheService(IConnectionMultiplexer multiplexer, ILogger<RedisCacheService> logger)
    {
        _multiplexer = multiplexer;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var (_, value) = await TryGetAsync<T>(key, ct);
        return value;
    }

    private async Task<(bool found, T? value)> TryGetAsync<T>(string key, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        try
        {
            var database = _multiplexer.GetDatabase();
            var value = await database.StringGetAsync(key).WaitAsync(ct);
            if (!value.HasValue)
            {
                return (false, default);
            }

            return (true, JsonSerializer.Deserialize<T>(value.ToString(), SerializerOptions));
        }
        catch (RedisConnectionException ex)
        {
            _logger.LogWarning(ex, "Redis cache get failed for key {CacheKey}.", key);
            return (false, default);
        }
        catch (RedisTimeoutException ex)
        {
            _logger.LogWarning(ex, "Redis cache get timed out for key {CacheKey}.", key);
            return (false, default);
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? ttl = null, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        if (value is null)
        {
            await RemoveAsync(key, ct);
            return;
        }
        try
        {
            var database = _multiplexer.GetDatabase();
            var payload = JsonSerializer.Serialize(value, SerializerOptions);
            await database.StringSetAsync(key, payload, ttl).WaitAsync(ct);
        }
        catch (RedisConnectionException ex)
        {
            _logger.LogWarning(ex, "Redis cache set failed for key {CacheKey}.", key);
        }
        catch (RedisTimeoutException ex)
        {
            _logger.LogWarning(ex, "Redis cache set timed out for key {CacheKey}.", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        try
        {
            var database = _multiplexer.GetDatabase();
            await database.KeyDeleteAsync(key).WaitAsync(ct);
        }
        catch (RedisConnectionException ex)
        {
            _logger.LogWarning(ex, "Redis cache remove failed for key {CacheKey}.", key);
        }
        catch (RedisTimeoutException ex)
        {
            _logger.LogWarning(ex, "Redis cache remove timed out for key {CacheKey}.", key);
        }
    }

    public async Task<T?> GetOrSetAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var (found, cached) = await TryGetAsync<T>(key, ct);
        if (found)
        {
            return cached;
        }

        try
        {
            var database = _multiplexer.GetDatabase();
            var lockKey = $"{key}:lock";
            var lockValue = Guid.NewGuid().ToString("N");
            var lockExpiry = ttl is { } cacheTtl
                ? TimeSpan.FromSeconds(Math.Min(cacheTtl.TotalSeconds, 30))
                : TimeSpan.FromSeconds(30);

            var deadline = DateTime.UtcNow.AddSeconds(LockAcquisitionTimeoutSeconds);
            while (DateTime.UtcNow < deadline)
            {
                ct.ThrowIfCancellationRequested();

                var acquired = await database
                    .StringSetAsync(lockKey, lockValue, lockExpiry, When.NotExists)
                    .WaitAsync(ct);

                if (acquired)
                {
                    try
                    {
                        var (foundAfterLock, cachedAfterLock) = await TryGetAsync<T>(key, ct);
                        if (foundAfterLock)
                        {
                            return cachedAfterLock;
                        }

                        var value = await factory(ct);
                        await SetAsync(key, value, ttl, ct);
                        return value;
                    }
                    finally
                    {
                        try
                        {
                            var currentValue = await database.StringGetAsync(lockKey).WaitAsync(ct);
                            if (currentValue.HasValue && currentValue.ToString() == lockValue)
                            {
                                await database.KeyDeleteAsync(lockKey).WaitAsync(ct);
                            }
                        }
                        catch (RedisConnectionException ex)
                        {
                            _logger.LogDebug(ex, "Redis cache lock release failed for key {CacheKey}.", key);
                        }
                        catch (RedisTimeoutException ex)
                        {
                            _logger.LogDebug(ex, "Redis cache lock release timed out for key {CacheKey}.", key);
                        }
                    }
                }

                var (foundWhileWaiting, cachedWhileWaiting) = await TryGetAsync<T>(key, ct);
                if (foundWhileWaiting)
                {
                    return cachedWhileWaiting;
                }

                await Task.Delay(TimeSpan.FromMilliseconds(LockRetryDelayMilliseconds), ct);
            }

            var fallbackValue = await factory(ct);
            await SetAsync(key, fallbackValue, ttl, ct);
            return fallbackValue;
        }
        catch (RedisConnectionException)
        {
            return await factory(ct);
        }
        catch (RedisTimeoutException)
        {
            return await factory(ct);
        }
    }

    private static JsonSerializerOptions CreateSerializerOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
        return options;
    }
}
