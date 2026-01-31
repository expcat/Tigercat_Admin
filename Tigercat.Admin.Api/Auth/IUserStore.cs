namespace Tigercat.Admin.Api.Auth;

public interface IUserStore
{
    Task<bool> TryCreateUserAsync(string username, string passwordHash, CancellationToken ct = default);
    Task<bool> ValidateUserAsync(string username, string passwordHash, CancellationToken ct = default);
    Task<bool> UpdatePasswordAsync(string username, string newPasswordHash, CancellationToken ct = default);
    Task<bool> ExistsAsync(string username, CancellationToken ct = default);
}
