namespace Tigercat.Admin.Api.Media;

public class MediaOptions
{
    public string Provider { get; set; } = "Local";
    public string? LocalRoot { get; set; }
    public string? PublicBaseUrl { get; set; }
    public long MaxBytes { get; set; } = 10 * 1024 * 1024;
    public int PublicCacheSeconds { get; set; } = 3600;
    public string[] AllowedContentTypes { get; set; } = [];
    public string[] AllowedExtensions { get; set; } = [];
    public int? MaxImageWidth { get; set; }
    public int? MaxImageHeight { get; set; }
}
