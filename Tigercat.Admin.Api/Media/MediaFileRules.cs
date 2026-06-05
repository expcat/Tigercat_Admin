namespace Tigercat.Admin.Api.Media;

public static class MediaFileRules
{
    public static readonly string[] DefaultAllowedContentTypes =
    [
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        "image/svg+xml",
        "application/pdf",
        "text/plain",
        "text/csv",
        "application/json",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    public static readonly string[] DefaultAllowedExtensions =
    [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".webp",
        ".svg",
        ".pdf",
        ".txt",
        ".csv",
        ".json",
        ".xls",
        ".xlsx",
    ];

    private static readonly Dictionary<string, string[]> ContentTypeExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/png"] = [".png"],
        ["image/jpeg"] = [".jpg", ".jpeg"],
        ["image/gif"] = [".gif"],
        ["image/webp"] = [".webp"],
        ["image/svg+xml"] = [".svg"],
        ["application/pdf"] = [".pdf"],
        ["text/plain"] = [".txt"],
        ["text/csv"] = [".csv"],
        ["application/json"] = [".json"],
        ["application/vnd.ms-excel"] = [".xls"],
        ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = [".xlsx"],
    };

    public static bool IsAllowedContentType(string contentType, MediaOptions? options = null)
    {
        var allowed = options?.AllowedContentTypes is { Length: > 0 }
            ? options.AllowedContentTypes
            : DefaultAllowedContentTypes;

        return allowed.Any(type => string.Equals(type, contentType, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsAllowedExtension(string extension, MediaOptions? options = null)
    {
        if (string.IsNullOrWhiteSpace(extension))
        {
            return false;
        }

        var allowed = options?.AllowedExtensions is { Length: > 0 }
            ? options.AllowedExtensions
            : DefaultAllowedExtensions;

        return allowed.Any(value =>
            string.Equals(NormalizeExtension(value), extension, StringComparison.OrdinalIgnoreCase));
    }

    public static bool IsExtensionAllowedForContentType(string contentType, string extension)
    {
        return ContentTypeExtensions.TryGetValue(contentType, out var extensions) &&
            extensions.Contains(extension, StringComparer.OrdinalIgnoreCase);
    }

    public static bool IsImageContentType(string contentType)
    {
        return contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
    }

    public static string NormalizeExtension(string? extension)
    {
        if (string.IsNullOrWhiteSpace(extension))
        {
            return string.Empty;
        }

        var value = extension.Trim().ToLowerInvariant();
        if (!value.StartsWith('.'))
        {
            value = $".{value}";
        }

        return value.Length <= 20 && value.All(c => char.IsLetterOrDigit(c) || c == '.')
            ? value
            : string.Empty;
    }
}
