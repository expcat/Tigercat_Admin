using System.Text.Json;
using FreeRedis;
using Microsoft.Extensions.Logging;
using Tigercat.Admin.Api.Observability;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.EventBus;

public sealed class RedisStreamPublisher : IEventPublisher
{
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();
    private readonly IRedisClient _redis;
    private readonly ILogger<RedisStreamPublisher> _logger;

    public RedisStreamPublisher(IRedisClient redis, ILogger<RedisStreamPublisher> logger)
    {
        _redis = redis;
        _logger = logger;
    }

    public Task PublishAsync(EventEnvelope envelope, string streamName, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        try
        {
            var payload = JsonSerializer.Serialize(envelope, SerializerOptions);
            _redis.XAdd(streamName, new Dictionary<string, object?>
            {
                ["eventId"] = envelope.EventId,
                ["eventType"] = envelope.EventType,
                ["schemaVersion"] = envelope.SchemaVersion,
                ["occurredAtUtc"] = envelope.OccurredAtUtc.ToString("O"),
                ["traceId"] = envelope.TraceId ?? string.Empty,
                ["payload"] = payload
            });
            AdminMetrics.RecordRedisStreamEvent("publish", streamName, envelope.EventType, true);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to publish event {EventId} to stream {StreamName}; fire-and-forget publish not retried.", envelope.EventId, streamName);
            AdminMetrics.RecordRedisStreamEvent("publish", streamName, envelope.EventType, false);
        }

        return Task.CompletedTask;
    }

    private static JsonSerializerOptions CreateSerializerOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
        return options;
    }
}
