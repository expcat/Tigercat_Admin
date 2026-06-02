namespace Tigercat.Admin.Api.Media;

public static class MediaFileRules
{
    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
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
    };

    public static bool IsAllowedContentType(string contentType)
    {
        return AllowedContentTypes.Contains(contentType);
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
