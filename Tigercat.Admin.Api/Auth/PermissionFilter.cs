using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Endpoint filter that requires the current user to have a specific permission code.
/// Must be applied AFTER <see cref="LoginFilter"/> so that the username is available.
/// Uses distributed cache to reduce database load on repeated requests.
/// </summary>
public class PermissionFilter(string requiredPermission) : IEndpointFilter
{
    private static readonly TimeSpan PermissionCacheTtl = TimeSpan.FromMinutes(5);

    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;

        if (!httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) ||
            userObj is not string username)
        {
            return Results.Json(
                ApiResult.Fail("未授权", 401),
                AppJsonContext.Default.ApiResponseObject,
                statusCode: 401);
        }

        var cacheService = httpContext.RequestServices.GetRequiredService<ICacheService>();
        var cacheKey = CacheKeys.UserPermissions(username);

        // Try to load cached permission codes; fall back to DB on cache miss
        var permissions = await cacheService.GetOrSetAsync(
            cacheKey,
            async ct =>
            {
                var dbContext = httpContext.RequestServices.GetRequiredService<AdminDbContext>();
                return await dbContext.Users
                    .Where(u => u.Username == username)
                    .SelectMany(u => u.UserRoles)
                    .SelectMany(ur => ur.Role.RolePermissions)
                    .Select(rp => rp.Permission.Code)
                    .Distinct()
                    .ToArrayAsync(ct);
            },
            PermissionCacheTtl,
            httpContext.RequestAborted);

        if (permissions is null || !permissions.Contains(requiredPermission))
        {
            return Results.Json(
                ApiResult.Fail("权限不足", 403),
                AppJsonContext.Default.ApiResponseObject,
                statusCode: 403);
        }

        return await next(context);
    }
}

public static class PermissionExtensions
{
    /// <summary>
    /// Requires login AND the specified permission code.
    /// </summary>
    public static RouteHandlerBuilder RequirePermission(this RouteHandlerBuilder builder, string permissionCode)
    {
        return builder
            .AddEndpointFilter(new LoginFilter())
            .AddEndpointFilter(new PermissionFilter(permissionCode));
    }
}
