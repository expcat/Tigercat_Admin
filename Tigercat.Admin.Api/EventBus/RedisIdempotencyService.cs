using FreeRedis;
using Microsoft.Extensions.Logging;

namespace Tigercat.Admin.Api.EventBus;

public sealed class RedisIdempotencyService : IIdempotencyService
{
    // Cap TTL to avoid excessively long locks while still covering retry windows.
    private const int MaxTtlSeconds = EventBusConstants.MaxIdempotencyTtlSeconds;
    private readonly IRedisClient _redis;
    private readonly ILogger<RedisIdempotencyService> _logger;

    public RedisIdempotencyService(IRedisClient redis, ILogger<RedisIdempotencyService> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public Task<bool> TryAcquireAsync(string eventId, TimeSpan ttl, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        try
        {
            var key = $"eventbus:dedup:{eventId}";
            var seconds = (int)Math.Clamp(ttl.TotalSeconds, 1, MaxTtlSeconds);
            var acquired = _redis.SetNx(key, "1", seconds);
            return Task.FromResult(acquired);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Idempotency lock failed for event {EventId}.", eventId);
            return Task.FromResult(false);
        }
    }
}
