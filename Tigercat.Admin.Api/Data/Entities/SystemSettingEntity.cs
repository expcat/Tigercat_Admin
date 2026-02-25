namespace Tigercat.Admin.Api.Data.Entities;

public class SystemSettingEntity
{
    public int Id { get; set; }
    public required string Key { get; set; }
    public required string Value { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
