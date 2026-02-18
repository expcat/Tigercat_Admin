using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class UsersEndpoints : IEndpointDefinition
{
    private const int UsernameMinLength = 2;
    private const int UsernameMaxLength = 50;
    private const int PasswordMinLength = 6;
    private const int DisplayNameMaxLength = 100;
    private const string AdminRoleName = "Admin";

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
                u.Username.ToLower().Contains(kw) ||
                (u.DisplayName != null && u.DisplayName.ToLower().Contains(kw)));
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
        var user = await ProjectUser(db, id, ct);

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
        IEventPublisher eventPublisher,
        HttpContext httpContext,
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

        // Validate username format & length
        if (username.Length < UsernameMinLength || username.Length > UsernameMaxLength)
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>($"用户名长度需在 {UsernameMinLength}-{UsernameMaxLength} 之间", 400),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 400);
        }

        if (!username.All(c => char.IsLetterOrDigit(c) || c is '_' or '-' or '.'))
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>("用户名只能包含字母、数字、下划线、短横线和点", 400),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 400);
        }

        // Validate password length
        if (request.Password.Length < PasswordMinLength)
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>($"密码长度不能少于 {PasswordMinLength} 位", 400),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 400);
        }

        // Validate displayName length
        if (request.DisplayName is { Length: > DisplayNameMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>($"显示名称长度不能超过 {DisplayNameMaxLength}", 400),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 400);
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

        // Validate and assign roles before saving so everything is in one transaction
        if (request.RoleIds is { Length: > 0 })
        {
            var validRoleIds = await db.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(ct);

            if (validRoleIds.Count != request.RoleIds.Length)
            {
                var invalidIds = request.RoleIds.Except(validRoleIds);
                return Results.Json(
                    ApiResult.Fail<UserItemResponse>($"以下角色 ID 不存在: {string.Join(", ", invalidIds)}", 400),
                    AppJsonContext.Default.ApiResponseUserItemResponse,
                    statusCode: 400);
            }

            foreach (var roleId in validRoleIds)
            {
                db.UserRoles.Add(new UserRoleEntity { UserId = 0, RoleId = roleId, User = user });
            }
        }

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

        var response = await ProjectUser(db, user.Id, ct);

        return Results.Json(
            ApiResult.Ok(response!),
            AppJsonContext.Default.ApiResponseUserItemResponse,
            statusCode: 201);
    }

    // PUT /api/users/{id}
    private static async Task<IResult> UpdateUser(
        int id,
        UpdateUserRequest request,
        AdminDbContext db,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
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

        // Validate displayName length
        if (request.DisplayName is { Length: > DisplayNameMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>($"显示名称长度不能超过 {DisplayNameMaxLength}", 400),
                AppJsonContext.Default.ApiResponseUserItemResponse,
                statusCode: 400);
        }

        if (request.DisplayName is not null)
        {
            user.DisplayName = request.DisplayName;
        }

        // Validate status enum value
        if (request.Status.HasValue)
        {
            if (!Enum.IsDefined(typeof(UserStatus), request.Status.Value))
            {
                return Results.Json(
                    ApiResult.Fail<UserItemResponse>("无效的用户状态", 400),
                    AppJsonContext.Default.ApiResponseUserItemResponse,
                    statusCode: 400);
            }

            user.Status = (UserStatus)request.Status.Value;
        }

        // Validate password length and publish audit event for admin password reset
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            if (request.Password.Length < PasswordMinLength)
            {
                return Results.Json(
                    ApiResult.Fail<UserItemResponse>($"密码长度不能少于 {PasswordMinLength} 位", 400),
                    AppJsonContext.Default.ApiResponseUserItemResponse,
                    statusCode: 400);
            }

            user.PasswordHash = PasswordHasher.Hash(request.Password);

            // Audit: admin reset password via UpdateUser endpoint
            var envelope = EventEnvelope.Create(
                "admin.user.password.reset",
                new Dictionary<string, object?>
                {
                    ["targetUserId"] = user.Id,
                    ["targetUsername"] = user.Username,
                    ["operator"] = httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var op) ? op : "unknown"
                },
                httpContext.TraceIdentifier);
            await eventPublisher.PublishAsync(envelope, EventBusConstants.AuthStream, ct);
        }

        user.UpdatedAt = DateTime.UtcNow;

        // Update roles if provided — validate all IDs exist before removing old roles
        if (request.RoleIds is not null)
        {
            var validRoleIds = await db.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(ct);

            if (validRoleIds.Count != request.RoleIds.Length)
            {
                var invalidIds = request.RoleIds.Except(validRoleIds);
                return Results.Json(
                    ApiResult.Fail<UserItemResponse>($"以下角色 ID 不存在: {string.Join(", ", invalidIds)}", 400),
                    AppJsonContext.Default.ApiResponseUserItemResponse,
                    statusCode: 400);
            }

            db.UserRoles.RemoveRange(user.UserRoles);

            foreach (var roleId in validRoleIds)
            {
                db.UserRoles.Add(new UserRoleEntity { UserId = user.Id, RoleId = roleId });
            }
        }

        await db.SaveChangesAsync(ct);

        var response = await ProjectUser(db, id, ct);

        return Results.Json(
            ApiResult.Ok(response!),
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

        // Prevent deleting the last admin user
        var isAdmin = user.UserRoles.Any(ur => db.Roles.Any(r => r.Id == ur.RoleId && r.Name == AdminRoleName));
        if (isAdmin)
        {
            var adminCount = await db.Users
                .Where(u => u.UserRoles.Any(ur => ur.Role.Name == AdminRoleName))
                .CountAsync(ct);

            if (adminCount <= 1)
            {
                return Results.Json(
                    ApiResult.Fail<MessageResponse>("不能删除最后一个管理员用户", 400),
                    AppJsonContext.Default.ApiResponseMessageResponse,
                    statusCode: 400);
            }
        }

        db.UserRoles.RemoveRange(user.UserRoles);
        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse("删除成功")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    /// <summary>
    /// Shared projection helper to load a UserItemResponse by user ID.
    /// </summary>
    private static Task<UserItemResponse?> ProjectUser(AdminDbContext db, int userId, CancellationToken ct)
    {
        return db.Users
            .Where(u => u.Id == userId)
            .Select(u => new UserItemResponse(
                u.Id,
                u.Username,
                u.DisplayName,
                (int)u.Status,
                u.CreatedAt,
                u.UpdatedAt,
                u.UserRoles.Select(ur => new RoleInfoResponse(ur.Role.Id, ur.Role.Name)).ToArray()))
            .FirstOrDefaultAsync(ct);
    }
}
