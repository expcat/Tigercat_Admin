namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Provides current user permission codes.
/// Shared between <see cref="PermissionFilter"/> and the permissions endpoint
/// to ensure consistent grant queries.
/// </summary>
public interface IPermissionService
{
    /// <summary>
    /// Returns the distinct permission codes for the given user.
    /// Authorization queries reflect committed role changes on the next request.
    /// </summary>
    Task<string[]?> GetUserPermissionCodesAsync(string username, CancellationToken ct = default);
}
