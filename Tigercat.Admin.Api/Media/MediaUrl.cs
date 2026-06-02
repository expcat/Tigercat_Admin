namespace Tigercat.Admin.Api.Media;

public static class MediaUrl
{
    public static string Content(string publicId) => $"/api/media/{publicId}/content";

    public static string? TryGetPublicId(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        const string marker = "/api/media/";
        var markerIndex = url.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
        {
            return null;
        }

        var start = markerIndex + marker.Length;
        var end = url.IndexOf("/content", start, StringComparison.OrdinalIgnoreCase);
        if (end <= start)
        {
            return null;
        }

        return url[start..end];
    }
}
