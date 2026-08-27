namespace Tigercat.Admin.Api.Data.Entities;

public class ChatMessageEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Direction { get; set; } = "other";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
