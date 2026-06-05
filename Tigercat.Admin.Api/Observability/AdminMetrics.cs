using System.Diagnostics.Metrics;

namespace Tigercat.Admin.Api.Observability;

public static class AdminMetrics
{
    public const string MeterName = "Tigercat.Admin.Api";

    private static readonly Meter Meter = new(MeterName);
    private static readonly Counter<long> RedisStreamEvents = Meter.CreateCounter<long>("tigercat.redis_stream.events");
    private static readonly Counter<long> AuthEvents = Meter.CreateCounter<long>("tigercat.auth.events");

    public static void RecordRedisStreamEvent(string operation, string stream, string eventType, bool success)
    {
        RedisStreamEvents.Add(
            1,
            new KeyValuePair<string, object?>("operation", operation),
            new KeyValuePair<string, object?>("stream", stream),
            new KeyValuePair<string, object?>("event_type", eventType),
            new KeyValuePair<string, object?>("success", success));
    }

    public static void RecordAuthEvent(string operation, bool success)
    {
        AuthEvents.Add(
            1,
            new KeyValuePair<string, object?>("operation", operation),
            new KeyValuePair<string, object?>("success", success));
    }
}
