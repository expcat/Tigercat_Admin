namespace Tigercat.Admin.Api.Data.Entities;

public class MediaResourceEntity
{
    public int Id { get; set; }
    public required string PublicId { get; set; }
    public required string OriginalFileName { get; set; }
    public required string StoredFileName { get; set; }
    public string? StorageProvider { get; set; }
    public string? StorageKey { get; set; }
    public required string ContentType { get; set; }
    public string? Extension { get; set; }
    public long SizeBytes { get; set; }
    public string? Sha256Hash { get; set; }
    public int? Width { get; set; }
    public int? Height { get; set; }
    public string? UploadedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<MediaReferenceEntity> References { get; set; } = [];
}
