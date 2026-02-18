namespace Tigercat.Admin.Api.Data.Entities;

public enum UserStatus
{
    Active = 0,
    Disabled = 1
}

public class UserEntity
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public UserStatus Status { get; set; } = UserStatus.Active;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    public ICollection<UserRoleEntity> UserRoles { get; set; } = [];
}
