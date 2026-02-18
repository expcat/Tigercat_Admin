namespace Tigercat.Admin.Api.Data.Entities;

public class PermissionEntity
{
    public int Id { get; set; }
    public required string Code { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<RolePermissionEntity> RolePermissions { get; set; } = [];
}
