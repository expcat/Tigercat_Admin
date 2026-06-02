namespace Tigercat.Admin.Api.Data.Entities;

public class AdminNotificationEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = Guid.NewGuid().ToString("N");
    public string GroupKey { get; set; } = "ops";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ToastType { get; set; } = "info";
    public bool Read { get; set; }
    public string? LinkUrl { get; set; }
    public string MetadataJson { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
