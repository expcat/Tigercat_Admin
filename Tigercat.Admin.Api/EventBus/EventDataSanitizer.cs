using System.Collections;
using System.Text.Json;

namespace Tigercat.Admin.Api.EventBus;

public static class EventDataSanitizer
{
    private static readonly string[] SensitiveKeyParts =
    [
        "password",
        "passwd",
        "pwd",
        "token",
        "authorization",
        "secret",
        "credential",
        "apikey",
        "api-key",
        "privatekey",
        "private-key",
    ];

    public static Dictionary<string, object?> SanitizeData(IReadOnlyDictionary<string, object?> data)
    {
        return data
            .Where(entry => !IsSensitiveKey(entry.Key))
            .ToDictionary(entry => entry.Key, entry => SanitizeValue(entry.Value), StringComparer.Ordinal);
    }

    public static bool IsSensitiveKey(string key)
    {
        return SensitiveKeyParts.Any(part => key.Contains(part, StringComparison.OrdinalIgnoreCase));
    }

    private static object? SanitizeValue(object? value)
    {
        return value switch
        {
            null => null,
            string => value,
            JsonElement element => SanitizeJsonElement(element),
            IReadOnlyDictionary<string, object?> dictionary => SanitizeData(dictionary),
            IDictionary<string, object?> dictionary => SanitizeData(new Dictionary<string, object?>(dictionary, StringComparer.Ordinal)),
            IDictionary dictionary => SanitizeDictionary(dictionary),
            IEnumerable enumerable => SanitizeEnumerable(enumerable),
            _ => value,
        };
    }

    private static object? SanitizeJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.Object => SanitizeJsonObject(element),
            JsonValueKind.Array => element.EnumerateArray()
                .Select(static item => SanitizeValue(item))
                .ToArray(),
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.ToString(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null or JsonValueKind.Undefined => null,
            _ => element.ToString(),
        };
    }

    private static Dictionary<string, object?> SanitizeJsonObject(JsonElement element)
    {
        var sanitized = new Dictionary<string, object?>(StringComparer.Ordinal);

        foreach (var property in element.EnumerateObject())
        {
            if (!IsSensitiveKey(property.Name))
            {
                sanitized[property.Name] = SanitizeValue(property.Value);
            }
        }

        return sanitized;
    }

    private static Dictionary<string, object?> SanitizeDictionary(IDictionary dictionary)
    {
        var sanitized = new Dictionary<string, object?>(StringComparer.Ordinal);

        foreach (DictionaryEntry entry in dictionary)
        {
            var key = entry.Key?.ToString();
            if (!string.IsNullOrWhiteSpace(key) && !IsSensitiveKey(key))
            {
                sanitized[key] = SanitizeValue(entry.Value);
            }
        }

        return sanitized;
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
}
