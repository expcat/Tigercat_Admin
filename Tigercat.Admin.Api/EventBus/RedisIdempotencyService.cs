using FreeRedis;
using Microsoft.Extensions.Logging;

namespace Tigercat.Admin.Api.EventBus;

public sealed class RedisIdempotencyService : IIdempotencyService
{
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
            var acquired = _redis.SetNx(key, "1", ttl);
            return Task.FromResult(acquired);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Idempotency lock failed for event {EventId}.", eventId);
            return Task.FromResult(false);
        }
    }
}
