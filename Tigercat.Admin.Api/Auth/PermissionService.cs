using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Data;

namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Default implementation that loads permission codes via EF Core
/// and caches them in the distributed cache.
/// </summary>
public class PermissionService(AdminDbContext db, ICacheService cacheService) : IPermissionService
{
    /// <summary>
    /// Shared TTL for the user-permissions cache entry.
    /// Referenced by both the permission filter and the permissions endpoint.
    /// </summary>
    public static readonly TimeSpan CacheTtl = TimeSpan.FromMinutes(5);

    public async Task<string[]?> GetUserPermissionCodesAsync(string username, CancellationToken ct = default)
    {
        var cacheKey = CacheKeys.UserPermissions(username);

        return await cacheService.GetOrSetAsync(
            cacheKey,
            async token =>
            {
                return await db.Users
                    .Where(u => u.Username == username)
                    .SelectMany(u => u.UserRoles)
                    .SelectMany(ur => ur.Role.RolePermissions)
                    .Select(rp => rp.Permission.Code)
                    .Distinct()
                    .ToArrayAsync(token);
            },
            CacheTtl,
            ct);
    }
}
