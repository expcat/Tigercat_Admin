namespace Tigercat.Admin.Api.EventBus;

public record EventEnvelope(
    string EventId,
    string EventType,
    string SchemaVersion,
    DateTime OccurredAtUtc,
    string? TraceId,
    Dictionary<string, object?> Data)
{
    private static readonly string[] SensitiveKeyParts =
    [
        "password",
        "token",
        "authorization",
        "secret",
    ];

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
            SanitizeData(data));
    }

    private static Dictionary<string, object?> SanitizeData(Dictionary<string, object?> data)
    {
        return data
            .Where(entry => !SensitiveKeyParts.Any(part =>
                entry.Key.Contains(part, StringComparison.OrdinalIgnoreCase)))
            .ToDictionary(entry => entry.Key, entry => entry.Value, StringComparer.Ordinal);
    }
}
