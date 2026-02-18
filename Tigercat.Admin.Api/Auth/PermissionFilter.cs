using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Endpoint filter that requires the current user to have a specific permission code.
/// Must be applied AFTER <see cref="LoginFilter"/> so that the username is available.
/// </summary>
public class PermissionFilter(string requiredPermission) : IEndpointFilter
{
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

        var dbContext = httpContext.RequestServices.GetRequiredService<AdminDbContext>();

        var hasPermission = await dbContext.Users
            .Where(u => u.Username == username)
            .SelectMany(u => u.UserRoles)
            .SelectMany(ur => ur.Role.RolePermissions)
            .AnyAsync(rp => rp.Permission.Code == requiredPermission, httpContext.RequestAborted);

        if (!hasPermission)
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
