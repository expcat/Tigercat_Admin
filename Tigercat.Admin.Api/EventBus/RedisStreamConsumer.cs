using System.Text.Json;
using FreeRedis;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.EventBus;

public sealed class RedisStreamConsumer : BackgroundService
{
    // Default window matches typical retry/backlog horizon for at-least-once delivery.
    private static readonly TimeSpan IdempotencyTtl = EventBusConstants.DefaultIdempotencyTtl;
    // Minimum idle time before reclaiming pending messages.
    private static readonly TimeSpan PendingIdle = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan ErrorRetryDelay = TimeSpan.FromSeconds(2);
    private const int ReadBatchSize = 10;
    private const int ReadBlockMilliseconds = 1000;
    private const int PendingBatchSize = 10;
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();
    private static readonly string[] StreamNames = EventBusConstants.Streams;
    private readonly IRedisClient _redis;
    private readonly IIdempotencyService _idempotency;
    private readonly ILogger<RedisStreamConsumer> _logger;
    private readonly string _groupName;
    private readonly string _consumerName;

    public RedisStreamConsumer(
        IRedisClient redis,
        IIdempotencyService idempotency,
        ILogger<RedisStreamConsumer> logger,
        IHostEnvironment environment)
    {
        _redis = redis;
        _idempotency = idempotency;
        _logger = logger;
        _groupName = $"tigercat-admin-{environment.EnvironmentName.ToLowerInvariant()}";
        _consumerName = $"{Environment.MachineName}-{Guid.NewGuid():N}";
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        stoppingToken.Register(() => _logger.LogInformation("Redis stream consumer stopping."));
        EnsureGroups();

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ReclaimPendingAsync(stoppingToken);

                foreach (var stream in StreamNames)
                {
                    // XReadGroup is synchronous; blocking is bounded by ReadBlockMilliseconds.
                    var entries = _redis.XReadGroup(
                        _groupName,
                        _consumerName,
                        ReadBatchSize,
                        ReadBlockMilliseconds,
                        false,
                        new Dictionary<string, string> { [stream] = ">" });
                    if (entries is null || entries.Length == 0)
                    {
                        continue;
                    }

                    foreach (var result in entries)
                    {
                        if (result.entries is null || result.entries.Length == 0)
                        {
                            continue;
                        }

                        foreach (var entry in result.entries)
                        {
                            await HandleEntryAsync(result.key, entry, stoppingToken);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis stream consumer loop failed.");
                await Task.Delay(ErrorRetryDelay, stoppingToken);
            }
        }
    }

    private void EnsureGroups()
    {
        foreach (var stream in StreamNames)
        {
            try
            {
                _redis.XGroupCreate(stream, _groupName, "0", true);
            }
            catch (RedisServerException ex) when (ex.Message.Contains("BUSYGROUP", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogDebug(ex, "Stream group already exists for {Stream}.", stream);
            }
            catch (RedisServerException ex)
            {
                _logger.LogError(ex, "Failed to ensure stream group for {Stream}.", stream);
                throw;
            }
        }
    }

    private async Task ReclaimPendingAsync(CancellationToken ct)
    {
        foreach (var stream in StreamNames)
        {
            try
            {
                var pendings = _redis.XPending(stream, _groupName, "-", "+", PendingBatchSize, null);
                if (pendings is null || pendings.Length == 0)
                {
                    continue;
                }

                var minIdleMs = (long)PendingIdle.TotalMilliseconds;
                var stalePendings = pendings
                    .Where(p => p.idle >= minIdleMs)
                    .ToArray();
                if (stalePendings.Length == 0)
                {
                    continue;
                }

                var ids = stalePendings.Select(p => p.id).ToArray();
                var claimed = _redis.XClaim(stream, _groupName, _consumerName, minIdleMs, ids);
                if (claimed is null || claimed.Length == 0)
                {
                    continue;
                }

                foreach (var entry in claimed)
                {
                    await HandleEntryAsync(stream, entry, ct);
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Pending reclaim failed for stream {Stream}.", stream);
            }
        }
    }

    private async Task HandleEntryAsync(string stream, StreamsEntry entry, CancellationToken ct)
    {
        try
        {
            var payload = GetField(entry, "payload");
            if (string.IsNullOrWhiteSpace(payload))
            {
                _redis.XAck(stream, _groupName, new[] { entry.id });
                return;
            }

            var envelope = JsonSerializer.Deserialize<EventEnvelope>(payload, SerializerOptions);
            if (envelope is null)
            {
                _logger.LogWarning("Failed to deserialize event payload for stream {Stream}.", stream);
                _redis.XAck(stream, _groupName, new[] { entry.id });
                return;
            }

            var acquired = await _idempotency.TryAcquireAsync(envelope.EventId, IdempotencyTtl, ct);
            if (!acquired)
            {
                _redis.XAck(stream, _groupName, new[] { entry.id });
                return;
            }

            _logger.LogInformation("Event {EventType} handled for stream {Stream}.", envelope.EventType, stream);
            _redis.XAck(stream, _groupName, new[] { entry.id });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Event handling failed for stream {Stream}.", stream);
        }
    }

    private static string? GetField(StreamsEntry entry, string fieldName)
    {
        var values = entry.fieldValues;
        if (values is null)
        {
            return null;
        }

        for (var i = 0; i + 1 < values.Length; i += 2)
        {
            if (string.Equals(values[i]?.ToString(), fieldName, StringComparison.OrdinalIgnoreCase))
            {
                return values[i + 1]?.ToString();
            }
        }

        return null;
    }

    private static JsonSerializerOptions CreateSerializerOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
        return options;
    }
}
