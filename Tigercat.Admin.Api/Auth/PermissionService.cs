using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Resolve current grants from the same user/role records as administration.
/// Authorization reads stay uncached so revocation takes effect on the next request.
/// </summary>
public class PermissionService(AdminDbContext db) : IPermissionService
{
    public async Task<string[]?> GetUserPermissionCodesAsync(string username, CancellationToken ct = default)
    {
        return await db.Users
            .AsNoTracking()
            .Where(u => u.Username == username && u.Status == UserStatus.Active)
            .SelectMany(u => u.UserRoles)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Code)
            .Distinct()
            .ToArrayAsync(ct);
    }
}
