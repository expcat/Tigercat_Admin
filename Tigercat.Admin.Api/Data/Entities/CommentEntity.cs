namespace Tigercat.Admin.Api.Data.Entities;

public class CommentEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
