using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Media;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class UsersEndpoints : IEndpointDefinition
{
    private const int UsernameMinLength = 2;
    private const int UsernameMaxLength = 50;
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

        group.MapPost("/batch-delete", BatchDeleteUsers)
            .RequirePermission("user:delete")
            .WithName("BatchDeleteUsers");

        group.MapPost("/batch-status", BatchUpdateUserStatus)
            .RequirePermission("user:edit")
            .WithName("BatchUpdateUserStatus");
    }

    // GET /api/users?page=1&pageSize=10&keyword=xxx&sortBy=id&sortOrder=asc&status=0
    private static async Task<IResult> GetUsers(
        int? page,
        int? pageSize,
        string? keyword,
        string? sortBy,
        string? sortOrder,
        int? status,
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

        if (status.HasValue)
        {
            if (status.Value != 0 && status.Value != 1)
            {
                return Results.Json(
                    ApiResult.Fail("Invalid 'status' query parameter value. Allowed values are 0 and 1.", 400),
                    AppJsonContext.Default.ApiResponseObject,
                    statusCode: 400);
            }
            query = query.Where(u => (int)u.Status == status.Value);
        }

        var total = await query.CountAsync(ct);

        var desc = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<UserEntity> ordered = sortBy?.ToLowerInvariant() switch
        {
            "username" => desc
                ? query.OrderByDescending(u => u.Username).ThenByDescending(u => u.Id)
                : query.OrderBy(u => u.Username).ThenBy(u => u.Id),
            "displayname" => desc
                ? query.OrderByDescending(u => u.DisplayName).ThenByDescending(u => u.Id)
                : query.OrderBy(u => u.DisplayName).ThenBy(u => u.Id),
            "status" => desc
                ? query.OrderByDescending(u => u.Status).ThenByDescending(u => u.Id)
                : query.OrderBy(u => u.Status).ThenBy(u => u.Id),
            "createdat" => desc
                ? query.OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id)
                : query.OrderBy(u => u.CreatedAt).ThenBy(u => u.Id),
            _ => desc ? query.OrderByDescending(u => u.Id) : query.OrderBy(u => u.Id),
        };

        var users = await ordered
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(u => new UserItemResponse(
                u.Id,
                u.Username,
                u.DisplayName,
                (int)u.Status,
                u.AvatarMediaId,
                u.AvatarMedia == null ? null : MediaUrl.Content(u.AvatarMedia.PublicId),
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
        IMediaReferenceService mediaReferenceService,
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

        var policy = await AuthPolicySettings.LoadAsync(db, ct);
        var passwordError = policy.ValidatePassword(request.Password);
        if (passwordError is not null)
        {
            return Results.Json(
                ApiResult.Fail<UserItemResponse>(passwordError, 400),
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

        await eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.user.created",
                new Dictionary<string, object?>
                {
                    ["targetUserId"] = user.Id,
                    ["targetUsername"] = user.Username,
                    ["operator"] = GetOperatorUsername(httpContext),
                    ["roleCount"] = request.RoleIds?.Length ?? 0
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);

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
        IMediaReferenceService mediaReferenceService,
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

        // Validate password policy and publish audit event for admin password reset
        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            var policy = await AuthPolicySettings.LoadAsync(db, ct);
            var passwordError = policy.ValidatePassword(request.Password);
            if (passwordError is not null)
            {
                return Results.Json(
                    ApiResult.Fail<UserItemResponse>(passwordError, 400),
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

        if (request.AvatarMediaId.HasValue)
        {
            if (request.AvatarMediaId.Value <= 0)
            {
                user.AvatarMediaId = null;
            }
            else
            {
                var media = await db.MediaResources
                    .FirstOrDefaultAsync(m => m.Id == request.AvatarMediaId.Value, ct);

                if (media is null)
                {
                    return Results.Json(
                        ApiResult.Fail<UserItemResponse>("头像媒体资源不存在", 400),
                        AppJsonContext.Default.ApiResponseUserItemResponse,
                        statusCode: 400);
                }

                if (!MediaFileRules.IsImageContentType(media.ContentType))
                {
                    return Results.Json(
                        ApiResult.Fail<UserItemResponse>("头像只能使用图片媒体资源", 400),
                        AppJsonContext.Default.ApiResponseUserItemResponse,
                        statusCode: 400);
                }

                user.AvatarMediaId = media.Id;
            }
        }

        var hasUserChanges = request.DisplayName is not null || request.Status.HasValue || request.RoleIds is not null || request.AvatarMediaId.HasValue;

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

        if (request.AvatarMediaId.HasValue)
        {
            await mediaReferenceService.SyncUserAvatarReferenceAsync(
                user.Id,
                user.Username,
                user.AvatarMediaId,
                ct);
        }

        if (hasUserChanges)
        {
            await eventPublisher.PublishAsync(
                EventEnvelope.Create(
                    "admin.user.updated",
                    new Dictionary<string, object?>
                    {
                        ["targetUserId"] = user.Id,
                        ["targetUsername"] = user.Username,
                        ["operator"] = GetOperatorUsername(httpContext),
                        ["status"] = (int)user.Status,
                        ["roleCount"] = request.RoleIds?.Length ?? user.UserRoles.Count,
                        ["avatarMediaId"] = user.AvatarMediaId
                    },
                    httpContext.TraceIdentifier),
                EventBusConstants.AdminStream,
                ct);
        }

        var response = await ProjectUser(db, id, ct);

        return Results.Json(
            ApiResult.Ok(response!),
            AppJsonContext.Default.ApiResponseUserItemResponse);
    }

    // DELETE /api/users/{id}
    private static async Task<IResult> DeleteUser(
        int id,
        AdminDbContext db,
        IMediaReferenceService mediaReferenceService,
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

        var deletedUserId = user.Id;
        var deletedUsername = user.Username;

        await mediaReferenceService.SyncUserAvatarReferenceAsync(user.Id, user.Username, null, ct);
        db.UserRoles.RemoveRange(user.UserRoles);
        db.Users.Remove(user);
        await db.SaveChangesAsync(ct);

        await eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.user.deleted",
                new Dictionary<string, object?>
                {
                    ["targetUserId"] = deletedUserId,
                    ["targetUsername"] = deletedUsername,
                    ["operator"] = GetOperatorUsername(httpContext)
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse("删除成功")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    // POST /api/users/batch-delete
    private static async Task<IResult> BatchDeleteUsers(
        BatchDeleteUsersRequest request,
        AdminDbContext db,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (request.Ids is not { Length: > 0 })
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("请选择要删除的用户", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        var currentUsername = httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var usernameObj) && usernameObj is string un
            ? un : null;

        var users = await db.Users
            .Include(u => u.UserRoles)
            .Where(u => request.Ids.Contains(u.Id))
            .ToListAsync(ct);

        if (users.Count == 0)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("未找到任何要删除的用户", 404),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 404);
        }

        // Prevent self-deletion
        if (currentUsername is not null && users.Any(u =>
            string.Equals(u.Username, currentUsername, StringComparison.OrdinalIgnoreCase)))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("不能删除当前登录用户", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        // Prevent deleting the last admin
        var adminRoleUserIds = await db.Users
            .Where(u => u.UserRoles.Any(ur => ur.Role.Name == AdminRoleName))
            .Select(u => u.Id)
            .ToListAsync(ct);

        var remainingAdmins = adminRoleUserIds.Except(request.Ids).Count();
        if (remainingAdmins < 1 && adminRoleUserIds.Intersect(request.Ids).Any())
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("不能删除最后一个管理员用户", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        foreach (var u in users)
        {
            db.UserRoles.RemoveRange(u.UserRoles);
        }

        var deletedIds = users.Select(static user => user.Id).ToArray();
        var deletedUsernames = users.Select(static user => user.Username).ToArray();
        var deletedAvatarKeys = deletedIds.Select(MediaReferences.UserAvatarKey).ToArray();
        var avatarReferences = await db.MediaReferences
            .Where(r => r.ReferenceType == MediaReferences.UserAvatarType && deletedAvatarKeys.Contains(r.ReferenceKey))
            .ToListAsync(ct);

        db.MediaReferences.RemoveRange(avatarReferences);
        db.Users.RemoveRange(users);
        await db.SaveChangesAsync(ct);

        await eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.user.batch.deleted",
                new Dictionary<string, object?>
                {
                    ["deletedCount"] = users.Count,
                    ["deletedIds"] = string.Join(",", deletedIds),
                    ["targetUsernames"] = string.Join(",", deletedUsernames),
                    ["operator"] = GetOperatorUsername(httpContext)
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse($"成功删除 {users.Count} 个用户")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    // POST /api/users/batch-status
    private static async Task<IResult> BatchUpdateUserStatus(
        BatchUpdateUserStatusRequest request,
        AdminDbContext db,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (request.Ids is not { Length: > 0 })
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("请选择要更新状态的用户", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        if (!Enum.IsDefined(typeof(UserStatus), request.Status))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("无效的用户状态", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        var distinctIds = request.Ids.Distinct().ToArray();
        var users = await db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Where(u => distinctIds.Contains(u.Id))
            .ToListAsync(ct);

        var missingIds = distinctIds.Except(users.Select(static user => user.Id)).ToArray();
        if (missingIds.Length > 0)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>($"以下用户 ID 不存在: {string.Join(", ", missingIds)}", 404),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 404);
        }

        var nextStatus = (UserStatus)request.Status;
        var currentUsername = httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var usernameObj) && usernameObj is string un
            ? un
            : null;

        if (nextStatus == UserStatus.Disabled &&
            currentUsername is not null &&
            users.Any(u => string.Equals(u.Username, currentUsername, StringComparison.OrdinalIgnoreCase)))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("不能禁用当前登录用户", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        if (nextStatus == UserStatus.Disabled)
        {
            var remainingActiveAdmins = await db.Users
                .Where(u => !distinctIds.Contains(u.Id))
                .Where(u => u.Status == UserStatus.Active)
                .Where(u => u.UserRoles.Any(ur => ur.Role.Name == AdminRoleName))
                .CountAsync(ct);

            if (remainingActiveAdmins < 1 && users.Any(u => u.UserRoles.Any(ur => ur.Role.Name == AdminRoleName)))
            {
                return Results.Json(
                    ApiResult.Fail<MessageResponse>("不能禁用最后一个可用管理员用户", 400),
                    AppJsonContext.Default.ApiResponseMessageResponse,
                    statusCode: 400);
            }
        }

        foreach (var user in users)
        {
            user.Status = nextStatus;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        await eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.user.batch.status.updated",
                new Dictionary<string, object?>
                {
                    ["updatedCount"] = users.Count,
                    ["updatedIds"] = string.Join(",", users.Select(static user => user.Id)),
                    ["targetUsernames"] = string.Join(",", users.Select(static user => user.Username)),
                    ["operator"] = GetOperatorUsername(httpContext),
                    ["status"] = request.Status
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse($"成功更新 {users.Count} 个用户状态")),
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
                u.AvatarMediaId,
                u.AvatarMedia == null ? null : MediaUrl.Content(u.AvatarMedia.PublicId),
                u.CreatedAt,
                u.UpdatedAt,
                u.UserRoles.Select(ur => new RoleInfoResponse(ur.Role.Id, ur.Role.Name)).ToArray()))
            .FirstOrDefaultAsync(ct);
    }

    private static string GetOperatorUsername(HttpContext httpContext)
    {
        return httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var operatorObj) &&
            operatorObj is string operatorName
            ? operatorName
            : "unknown";
    }
}
