using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class UsersEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users");

        group.MapGet("", GetUsers)
            .RequirePermission("user:view")
            .WithName("GetUsers");

        group.MapGet("/{id:int}", GetUser)
            .RequirePermission("user:view")
            .WithName("GetUser");

        group.MapPost("", CreateUser)
            .RequirePermission("user:create")
            .WithName("CreateUser");

        group.MapPut("/{id:int}", UpdateUser)
            .RequirePermission("user:edit")
            .WithName("UpdateUser");

        group.MapDelete("/{id:int}", DeleteUser)
            .RequirePermission("user:delete")
            .WithName("DeleteUser");
    }

    // GET /api/users?page=1&pageSize=10&keyword=xxx
    private static async Task<IResult> GetUsers(
        int? page,
        int? pageSize,
        string? keyword,
        AdminDbContext db,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? 10, 1, 100);

        IQueryable<UserEntity> query = db.Users;

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            query = query.Where(u =>
                u.Username.Contains(kw) ||
                (u.DisplayName != null && u.DisplayName.Contains(kw)));
        }

        var total = await query.CountAsync(ct);

        var users = await query
            .OrderBy(u => u.Id)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(u => new UserItemResponse(
                u.Id,
                u.Username,
                u.DisplayName,
                (int)u.Status,
                u.CreatedAt,
                u.UpdatedAt,
                u.UserRoles.Select(ur => new RoleInfoResponse(ur.Role.Id, ur.Role.Name)).ToArray()))
            .ToListAsync(ct);

        var result = new PagedResponse<UserItemResponse>([.. users], total, p, ps);
        return Results.Json(
            ApiResult.Ok(result),
            AppJsonContext.Default.ApiResponsePagedResponseUserItemResponse);
    }

    // GET /api/users/{id}
    private static async Task<IResult> GetUser(
        int id,
        AdminDbContext db,
        CancellationToken ct)
    {
        var user = await db.Users
            .Where(u => u.Id == id)
            .Select(u => new UserItemResponse(
                u.Id,
                u.Username,
                u.DisplayName,
                (int)u.Status,
                u.CreatedAt,
                u.UpdatedAt,
                u.UserRoles.Select(ur => new RoleInfoResponse(ur.Role.Id, ur.Role.Name)).ToArray()))
            .FirstOrDefaultAsync(ct);

        if (user is null)
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>("用户不存在", 404),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 404);
        }

        return Results.Json(
            ApiResult.Ok(user),
            AppJsonContext.Default.ApiResponseUserItemResponse);
    }

    // POST /api/users
    private static async Task<IResult> CreateUser(
        CreateUserRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>("用户名或密码不能为空", 400),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 400);
        }

        var username = request.Username.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Username == username, ct))
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>("用户已存在", 409),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 409);
        }

        var user = new UserEntity
        {
            Username = username,
            PasswordHash = PasswordHasher.Hash(request.Password),
            DisplayName = request.DisplayName,
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>("用户已存在", 409),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 409);
        }

        // Assign roles if provided
        if (request.RoleIds is { Length: > 0 })
        {
            var validRoleIds = await db.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(ct);

            foreach (var roleId in validRoleIds)
            {
                db.UserRoles.Add(new UserRoleEntity { UserId = user.Id, RoleId = roleId });
            }

            await db.SaveChangesAsync(ct);
        }

        // Reload with roles
        var response = await db.Users
            .Where(u => u.Id == user.Id)
            .Select(u => new UserItemResponse(
                u.Id,
                u.Username,
                u.DisplayName,
                (int)u.Status,
                u.CreatedAt,
                u.UpdatedAt,
                u.UserRoles.Select(ur => new RoleInfoResponse(ur.Role.Id, ur.Role.Name)).ToArray()))
            .FirstAsync(ct);

        return Results.Json(
            ApiResult.Ok(response),
            AppJsonContext.Default.ApiResponseUserItemResponse,
            statusCode: 201);
    }

    // PUT /api/users/{id}
    private static async Task<IResult> UpdateUser(
        int id,
        UpdateUserRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null)
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>("用户不存在", 404),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 404);
        }

        if (request.DisplayName is not null)
        {
            user.DisplayName = request.DisplayName;
        }

        if (request.Status.HasValue)
        {
            user.Status = (UserStatus)request.Status.Value;
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            user.PasswordHash = PasswordHasher.Hash(request.Password);
        }

        user.UpdatedAt = DateTime.UtcNow;

        // Update roles if provided
        if (request.RoleIds is not null)
        {
            db.UserRoles.RemoveRange(user.UserRoles);

            var validRoleIds = await db.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(ct);

            foreach (var roleId in validRoleIds)
            {
                db.UserRoles.Add(new UserRoleEntity { UserId = user.Id, RoleId = roleId });
            }
        }

        await db.SaveChangesAsync(ct);

        // Reload with roles
        var response = await db.Users
            .Where(u => u.Id == id)
            .Select(u => new UserItemResponse(
                u.Id,
                u.Username,
                u.DisplayName,
                (int)u.Status,
                u.CreatedAt,
                u.UpdatedAt,
                u.UserRoles.Select(ur => new RoleInfoResponse(ur.Role.Id, ur.Role.Name)).ToArray()))
            .FirstAsync(ct);

        return Results.Json(
            ApiResult.Ok(response),
            AppJsonContext.Default.ApiResponseUserItemResponse);
    }

    // DELETE /api/users/{id}
    private static async Task<IResult> DeleteUser(
        int id,
        AdminDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var user = await db.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, ct);

        if (user is null)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("用户不存在", 404),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 404);
        }

        // Prevent self-deletion
        if (httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var usernameObj) &&
            usernameObj is string currentUsername &&
            string.Equals(user.Username, currentUsername, StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("不能删除自己", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        db.UserRoles.RemoveRange(user.UserRoles);
        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse("删除成功")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }
}
