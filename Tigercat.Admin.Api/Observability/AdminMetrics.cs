using System.Diagnostics.Metrics;

namespace Tigercat.Admin.Api.Observability;

public static class AdminMetrics
{
    public const string MeterName = "Tigercat.Admin.Api";

    public const string CacheEventsName = "tigercat.cache.events";
    public const string ImportJobsName = "tigercat.import_jobs";
    public const string JobsName = "tigercat.jobs";

    private static readonly Meter Meter = new(MeterName);
    private static readonly Counter<long> RedisStreamEvents = Meter.CreateCounter<long>("tigercat.redis_stream.events");
    private static readonly Counter<long> AuthEvents = Meter.CreateCounter<long>("tigercat.auth.events");
    private static readonly Counter<long> CacheEvents = Meter.CreateCounter<long>(CacheEventsName);
    private static readonly Counter<long> ImportJobs = Meter.CreateCounter<long>(ImportJobsName);
    private static readonly Counter<long> Jobs = Meter.CreateCounter<long>(JobsName);

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

    public static void RecordCacheEvent(string result)
    {
        CacheEvents.Add(1, new KeyValuePair<string, object?>("result", result));
    }

    public static void RecordImportJob(string operation)
    {
        ImportJobs.Add(1, new KeyValuePair<string, object?>("operation", operation));
    }

    public static void RecordJob(string operation)
    {
        Jobs.Add(1, new KeyValuePair<string, object?>("operation", operation));
    }
}
