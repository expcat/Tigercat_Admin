namespace Tigercat.Admin.Api.EventBus;

public record EventEnvelope(
    string EventId,
    string EventType,
    string SchemaVersion,
    DateTime OccurredAtUtc,
    string? TraceId,
    Dictionary<string, object?> Data)
{
    public static EventEnvelope Create(
        string eventType,
        Dictionary<string, object?> data,
        string? traceId = null,
        string schemaVersion = "1.0")
    {
        return new EventEnvelope(
            Guid.NewGuid().ToString("N"),
            eventType,
            schemaVersion,
            DateTime.UtcNow,
            traceId,
            EventDataSanitizer.SanitizeData(data));
    }
}
