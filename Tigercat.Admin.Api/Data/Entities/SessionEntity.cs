namespace Tigercat.Admin.Api.Data.Entities;

public class SessionEntity
{
    public int Id { get; set; }
    public required string Token { get; set; }
    public required string Username { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
