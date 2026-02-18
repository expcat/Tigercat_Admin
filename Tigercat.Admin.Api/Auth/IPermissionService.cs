namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Provides cached access to user permission codes.
/// Shared between <see cref="PermissionFilter"/> and the permissions endpoint
/// to ensure consistent query logic, cache keys, and TTL.
/// </summary>
public interface IPermissionService
{
    /// <summary>
    /// Returns the distinct permission codes for the given user.
    /// Results are cached with a fixed TTL to reduce database load.
    /// </summary>
    Task<string[]?> GetUserPermissionCodesAsync(string username, CancellationToken ct = default);
}
