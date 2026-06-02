namespace Tigercat.Admin.Api.EventBus;

using System.Collections;

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

    private static Dictionary<string, object?> SanitizeData(IReadOnlyDictionary<string, object?> data)
    {
        return data
            .Where(entry => !IsSensitiveKey(entry.Key))
            .ToDictionary(entry => entry.Key, entry => SanitizeValue(entry.Value), StringComparer.Ordinal);
    }

    private static object? SanitizeValue(object? value)
    {
        return value switch
        {
            null => null,
            string => value,
            IReadOnlyDictionary<string, object?> dictionary => SanitizeData(dictionary),
            IDictionary<string, object?> dictionary => SanitizeData(new Dictionary<string, object?>(dictionary, StringComparer.Ordinal)),
            IEnumerable enumerable => SanitizeEnumerable(enumerable),
            _ => value,
        };
    }

    private static object?[] SanitizeEnumerable(IEnumerable values)
    {
        var sanitized = new List<object?>();

        foreach (var value in values)
        {
            sanitized.Add(SanitizeValue(value));
        }

        return [.. sanitized];
    }

    private static bool IsSensitiveKey(string key)
    {
        return SensitiveKeyParts.Any(part => key.Contains(part, StringComparison.OrdinalIgnoreCase));
    }
}
