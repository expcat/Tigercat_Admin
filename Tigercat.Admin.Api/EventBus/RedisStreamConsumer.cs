using System.Collections.Concurrent;
using System.Text.Json;
using System.Linq;
using System.Collections.Generic;
using FreeRedis;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.EventBus;

public sealed class RedisStreamConsumer : BackgroundService
{
    private static readonly TimeSpan IdempotencyTtl = TimeSpan.FromHours(6);
    private static readonly TimeSpan PendingIdle = TimeSpan.FromMinutes(1);
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();
    private static readonly string[] StreamNames = { "stream:auth", "stream:admin", "stream:system" };
    private static readonly ConcurrentDictionary<string, string> StreamOffsets = new();

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
                ReclaimPending(stoppingToken);

                foreach (var stream in StreamNames)
                {
                    var lastId = StreamOffsets.TryGetValue(stream, out var offset) ? offset : ">";
                    var entries = _redis.XReadGroup(
                        _groupName,
                        _consumerName,
                        10,
                        1000,
                        false,
                        new Dictionary<string, string> { [stream] = lastId });
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
                            StreamOffsets[result.key] = entry.id;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Redis stream consumer loop failed.");
                await Task.Delay(TimeSpan.FromSeconds(2), stoppingToken);
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
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Stream group already exists for {Stream}.", stream);
            }
        }
    }

    private void ReclaimPending(CancellationToken ct)
    {
        foreach (var stream in StreamNames)
        {
            try
            {
                var pendings = _redis.XPending(stream, _groupName, "-", "+", 10, _consumerName);
                if (pendings is null || pendings.Length == 0)
                {
                    continue;
                }

                var ids = pendings.Select(p => p.id).ToArray();
                if (ids.Length == 0)
                {
                    continue;
                }

                _redis.XClaim(stream, _groupName, _consumerName, (long)PendingIdle.TotalMilliseconds, ids);
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
                _redis.XAck(stream, _groupName, new[] { entry.id });
                return;
            }

            var acquired = await _idempotency.TryAcquireAsync(envelope.EventId, IdempotencyTtl, ct);
            if (!acquired)
            {
                _redis.XAck(stream, _groupName, new[] { entry.id });
                return;
            }

            _logger.LogInformation("Event {EventType} received from {Stream}.", envelope.EventType, stream);
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
