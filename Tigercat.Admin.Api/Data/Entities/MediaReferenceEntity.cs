namespace Tigercat.Admin.Api.Data.Entities;

public class MediaReferenceEntity
{
    public int Id { get; set; }
    public int MediaResourceId { get; set; }
    public required string ReferenceType { get; set; }
    public required string ReferenceKey { get; set; }
    public string? DisplayName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public MediaResourceEntity MediaResource { get; set; } = null!;
}
