namespace Tigercat.Admin.Api.Media;

public class MediaOptions
{
    public string Provider { get; set; } = "Local";
    public string? LocalRoot { get; set; }
    public long MaxBytes { get; set; } = 10 * 1024 * 1024;
}
