using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class RolesEndpoints : IEndpointDefinition
{
    private const int NameMinLength = 2;
    private const int NameMaxLength = 50;
    private const int DescriptionMaxLength = 200;
    private const string AdminRoleName = "Admin";

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/roles")
            .WithTags("Roles");

        group.MapGet("", GetRoles)
            .RequirePermission("role:view")
            .WithName("GetRoles");

        group.MapGet("/{id:int}", GetRole)
            .RequirePermission("role:view")
            .WithName("GetRole");

        group.MapPost("", CreateRole)
            .RequirePermission("role:create")
            .WithName("CreateRole");

        group.MapPut("/{id:int}", UpdateRole)
            .RequirePermission("role:edit")
            .WithName("UpdateRole");

        group.MapDelete("/{id:int}", DeleteRole)
            .RequirePermission("role:delete")
            .WithName("DeleteRole");

        group.MapPut("/{id:int}/permissions", SetRolePermissions)
            .RequirePermission("role:edit")
            .WithName("SetRolePermissions");

        group.MapPut("/{id:int}/users", SetRoleUsers)
            .RequirePermission("role:edit")
            .WithName("SetRoleUsers");

        group.MapGet("/permissions", GetAllPermissions)
            .RequirePermission("role:view")
            .WithName("GetAllPermissions");
    }

    // GET /api/roles/permissions
    private static async Task<IResult> GetAllPermissions(
        AdminDbContext db,
        CancellationToken ct)
    {
        var permissions = await db.Permissions
            .OrderBy(p => p.Id)
            .Select(p => new PermissionInfoResponse(p.Id, p.Code, p.Description))
            .ToListAsync(ct);

        return Results.Json(
            ApiResult.Ok(permissions.ToArray()),
            AppJsonContext.Default.ApiResponsePermissionInfoResponseArray);
    }

    // GET /api/roles?page=1&pageSize=10&keyword=xxx&sortBy=id&sortOrder=asc
    private static async Task<IResult> GetRoles(
        int? page,
        int? pageSize,
        string? keyword,
        string? sortBy,
        string? sortOrder,
        AdminDbContext db,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? 10, 1, 100);

        IQueryable<RoleEntity> query = db.Roles;

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            query = query.Where(r =>
                r.Name.ToLower().Contains(kw) ||
                (r.Description != null && r.Description.ToLower().Contains(kw)));
        }

        var total = await query.CountAsync(ct);

        var desc = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);
        IOrderedQueryable<RoleEntity> ordered = sortBy?.ToLowerInvariant() switch
        {
            "name" => desc
                ? query.OrderByDescending(r => r.Name).ThenByDescending(r => r.Id)
                : query.OrderBy(r => r.Name).ThenBy(r => r.Id),
            "createdat" => desc
                ? query.OrderByDescending(r => r.CreatedAt).ThenByDescending(r => r.Id)
                : query.OrderBy(r => r.CreatedAt).ThenBy(r => r.Id),
            _ => desc ? query.OrderByDescending(r => r.Id) : query.OrderBy(r => r.Id),
        };

        var roles = await ordered
            .AsNoTracking()
            .AsSplitQuery()
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(r => new RoleDetailResponse(
                r.Id,
                r.Name,
                r.Description,
                r.CreatedAt,
                r.RolePermissions.Select(rp => new PermissionInfoResponse(
                    rp.Permission.Id, rp.Permission.Code, rp.Permission.Description)).ToArray(),
                r.UserRoles.Select(ur => new RoleUserInfoResponse(
                    ur.User.Id, ur.User.Username, ur.User.DisplayName)).ToArray()))
            .ToListAsync(ct);

        var result = new PagedResponse<RoleDetailResponse>([.. roles], total, p, ps);
        return Results.Json(
            ApiResult.Ok(result),
            AppJsonContext.Default.ApiResponsePagedResponseRoleDetailResponse);
    }

    // GET /api/roles/{id}
    private static async Task<IResult> GetRole(
        int id,
        AdminDbContext db,
        CancellationToken ct)
    {
        var role = await ProjectRole(db, id, ct);

        if (role is null)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色不存在", 404),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 404);
        }

        return Results.Json(
            ApiResult.Ok(role),
            AppJsonContext.Default.ApiResponseRoleDetailResponse);
    }

    // POST /api/roles
    private static async Task<IResult> CreateRole(
        CreateRoleRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色名称不能为空", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        var name = request.Name.Trim();

        if (name.Length < NameMinLength || name.Length > NameMaxLength)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>($"角色名称长度需在 {NameMinLength}-{NameMaxLength} 之间", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        if (string.Equals(name, AdminRoleName, StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色名称为系统保留，不能使用 Admin", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        if (request.Description is { Length: > DescriptionMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>($"描述长度不能超过 {DescriptionMaxLength}", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        var role = new RoleEntity
        {
            Name = name,
            Description = request.Description,
            CreatedAt = DateTime.UtcNow
        };

        db.Roles.Add(role);

        if (request.PermissionIds is { Length: > 0 })
        {
            var distinctPermIds = request.PermissionIds.Distinct().ToArray();

            var validPermIds = await db.Permissions
                .Where(p => distinctPermIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync(ct);

            if (validPermIds.Count != distinctPermIds.Length)
            {
                var invalidIds = distinctPermIds.Except(validPermIds);
                return Results.Json(
                    ApiResult.Fail<RoleDetailResponse>($"以下权限 ID 不存在: {string.Join(", ", invalidIds)}", 400),
                    AppJsonContext.Default.ApiResponseRoleDetailResponse,
                    statusCode: 400);
            }

            foreach (var permId in validPermIds)
            {
                db.RolePermissions.Add(new RolePermissionEntity { RoleId = 0, PermissionId = permId, Role = role });
            }
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色名称已存在", 409),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 409);
        }

        var response = await ProjectRole(db, role.Id, ct);

        return Results.Json(
            ApiResult.Ok(response!),
            AppJsonContext.Default.ApiResponseRoleDetailResponse,
            statusCode: 201);
    }

    // PUT /api/roles/{id}
    private static async Task<IResult> UpdateRole(
        int id,
        UpdateRoleRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var role = await db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (role is null)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色不存在", 404),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 404);
        }

        if (request.Name is not null)
        {
            var name = request.Name.Trim();

            if (name.Length < NameMinLength || name.Length > NameMaxLength)
            {
                return Results.Json(
                    ApiResult.Fail<RoleDetailResponse>($"角色名称长度需在 {NameMinLength}-{NameMaxLength} 之间", 400),
                    AppJsonContext.Default.ApiResponseRoleDetailResponse,
                    statusCode: 400);
            }

            // 不允许通过更新将角色重命名为 Admin 保留名称（除非它本身就是 Admin）
            if (string.Equals(name, AdminRoleName, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(role.Name, AdminRoleName, StringComparison.OrdinalIgnoreCase))
            {
                return Results.Json(
                    ApiResult.Fail<RoleDetailResponse>("不能使用保留的角色名称", 400),
                    AppJsonContext.Default.ApiResponseRoleDetailResponse,
                    statusCode: 400);
            }

            role.Name = name;
        }

        if (request.Description is not null)
        {
            if (request.Description.Length > DescriptionMaxLength)
            {
                return Results.Json(
                    ApiResult.Fail<RoleDetailResponse>($"描述长度不能超过 {DescriptionMaxLength}", 400),
                    AppJsonContext.Default.ApiResponseRoleDetailResponse,
                    statusCode: 400);
            }

            role.Description = request.Description;
        }

        if (request.PermissionIds is not null)
        {
            var distinctPermissionIds = request.PermissionIds.Distinct().ToArray();

            var validPermIds = await db.Permissions
                .Where(p => distinctPermissionIds.Contains(p.Id))
                .Select(p => p.Id)
                .ToListAsync(ct);

            if (validPermIds.Count != distinctPermissionIds.Length)
            {
                var invalidIds = distinctPermissionIds.Except(validPermIds);
                return Results.Json(
                    ApiResult.Fail<RoleDetailResponse>($"以下权限 ID 不存在: {string.Join(", ", invalidIds)}", 400),
                    AppJsonContext.Default.ApiResponseRoleDetailResponse,
                    statusCode: 400);
            }

            db.RolePermissions.RemoveRange(role.RolePermissions);

            foreach (var permId in validPermIds)
            {
                db.RolePermissions.Add(new RolePermissionEntity { RoleId = role.Id, PermissionId = permId });
            }
        }

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色名称已存在", 409),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 409);
        }

        var response = await ProjectRole(db, id, ct);

        return Results.Json(
            ApiResult.Ok(response!),
            AppJsonContext.Default.ApiResponseRoleDetailResponse);
    }

    // DELETE /api/roles/{id}
    private static async Task<IResult> DeleteRole(
        int id,
        AdminDbContext db,
        CancellationToken ct)
    {
        var role = await db.Roles
            .Include(r => r.UserRoles)
            .Include(r => r.RolePermissions)
            .AsSplitQuery()
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (role is null)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("角色不存在", 404),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 404);
        }

        if (string.Equals(role.Name, AdminRoleName, StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("不能删除管理员角色", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        db.RolePermissions.RemoveRange(role.RolePermissions);
        db.UserRoles.RemoveRange(role.UserRoles);
        db.Roles.Remove(role);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse("删除成功")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    // PUT /api/roles/{id}/permissions
    private static async Task<IResult> SetRolePermissions(
        int id,
        SetRolePermissionsRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var role = await db.Roles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (role is null)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色不存在", 404),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 404);
        }

        // 禁止修改 Admin 角色的权限，Admin 始终拥有所有权限
        if (string.Equals(role.Name, AdminRoleName, StringComparison.OrdinalIgnoreCase))
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("不能修改管理员角色的权限", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        var distinctPermIds = request.PermissionIds.Distinct().ToArray();

        var validPermIds = await db.Permissions
            .Where(p => distinctPermIds.Contains(p.Id))
            .Select(p => p.Id)
            .ToListAsync(ct);

        if (validPermIds.Count != distinctPermIds.Length)
        {
            var invalidIds = distinctPermIds.Except(validPermIds);
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>($"以下权限 ID 不存在: {string.Join(", ", invalidIds)}", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        db.RolePermissions.RemoveRange(role.RolePermissions);

        foreach (var permId in validPermIds)
        {
            db.RolePermissions.Add(new RolePermissionEntity { RoleId = role.Id, PermissionId = permId });
        }

        await db.SaveChangesAsync(ct);

        var response = await ProjectRole(db, id, ct);

        return Results.Json(
            ApiResult.Ok(response!),
            AppJsonContext.Default.ApiResponseRoleDetailResponse);
    }

    // PUT /api/roles/{id}/users
    private static async Task<IResult> SetRoleUsers(
        int id,
        SetRoleUsersRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var role = await db.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (role is null)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("角色不存在", 404),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 404);
        }

        var distinctUserIds = request.UserIds.Distinct().ToArray();

        // 如果是 Admin 角色，不允许将用户清空（防止系统锁死）
        if (string.Equals(role.Name, AdminRoleName, StringComparison.OrdinalIgnoreCase) &&
            distinctUserIds.Length == 0)
        {
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>("管理员角色必须至少有一个用户", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        var validUserIds = await db.Users
            .Where(u => distinctUserIds.Contains(u.Id))
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (validUserIds.Count != distinctUserIds.Length)
        {
            var invalidIds = distinctUserIds.Except(validUserIds);
            return Results.Json(
                ApiResult.Fail<RoleDetailResponse>($"以下用户 ID 不存在: {string.Join(", ", invalidIds)}", 400),
                AppJsonContext.Default.ApiResponseRoleDetailResponse,
                statusCode: 400);
        }

        db.UserRoles.RemoveRange(role.UserRoles);

        foreach (var userId in validUserIds)
        {
            db.UserRoles.Add(new UserRoleEntity { UserId = userId, RoleId = role.Id });
        }

        await db.SaveChangesAsync(ct);

        var response = await ProjectRole(db, id, ct);

        return Results.Json(
            ApiResult.Ok(response!),
            AppJsonContext.Default.ApiResponseRoleDetailResponse);
    }

    private static Task<RoleDetailResponse?> ProjectRole(AdminDbContext db, int roleId, CancellationToken ct)
    {
        return db.Roles
            .AsNoTracking()
            .AsSplitQuery()
            .Where(r => r.Id == roleId)
            .Select(r => new RoleDetailResponse(
                r.Id,
                r.Name,
                r.Description,
                r.CreatedAt,
                r.RolePermissions.Select(rp => new PermissionInfoResponse(
                    rp.Permission.Id, rp.Permission.Code, rp.Permission.Description)).ToArray(),
                r.UserRoles.Select(ur => new RoleUserInfoResponse(
                    ur.User.Id, ur.User.Username, ur.User.DisplayName)).ToArray()))
            .FirstOrDefaultAsync(ct);
    }
}
