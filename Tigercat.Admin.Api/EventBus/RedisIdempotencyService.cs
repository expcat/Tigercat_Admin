using FreeRedis;
namespace Tigercat.Admin.Api.EventBus;

public sealed class RedisIdempotencyService : IIdempotencyService
{
    private const int MaxTtlSeconds = EventBusConstants.MaxIdempotencyTtlSeconds;
    private readonly IRedisClient _redis;

    public RedisIdempotencyService(IRedisClient redis)
    {
        _redis = redis;
    }

    public Task<bool> TryAcquireAsync(string eventId, TimeSpan ttl, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        var seconds = (int)Math.Clamp(ttl.TotalSeconds, 1, MaxTtlSeconds);
        return Task.FromResult(_redis.SetNx(GetKey(eventId), "1", seconds));
    }

    public Task ReleaseAsync(string eventId, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        _redis.Del(GetKey(eventId));
        return Task.CompletedTask;
    }

    private static string GetKey(string eventId) => $"eventbus:dedup:{eventId}";
}
