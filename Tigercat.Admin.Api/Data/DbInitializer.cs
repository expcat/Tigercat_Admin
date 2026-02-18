using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(AdminDbContext context, CancellationToken ct = default)
    {
        await context.Database.EnsureCreatedAsync(ct);

        // Skip seeding if users already exist
        if (await context.Users.AnyAsync(ct))
        {
            return;
        }

        // --- Seed permissions ---
        var permDashboardView = new PermissionEntity { Code = "dashboard:view", Description = "查看仪表盘" };
        var permUserView = new PermissionEntity { Code = "user:view", Description = "查看用户列表" };
        var permUserCreate = new PermissionEntity { Code = "user:create", Description = "创建用户" };
        var permUserEdit = new PermissionEntity { Code = "user:edit", Description = "编辑用户" };
        var permUserDelete = new PermissionEntity { Code = "user:delete", Description = "删除用户" };
        var permRoleView = new PermissionEntity { Code = "role:view", Description = "查看角色列表" };
        var permRoleCreate = new PermissionEntity { Code = "role:create", Description = "创建角色" };
        var permRoleEdit = new PermissionEntity { Code = "role:edit", Description = "编辑角色" };
        var permRoleDelete = new PermissionEntity { Code = "role:delete", Description = "删除角色" };

        var allPermissions = new[]
        {
            permDashboardView,
            permUserView, permUserCreate, permUserEdit, permUserDelete,
            permRoleView, permRoleCreate, permRoleEdit, permRoleDelete
        };
        context.Permissions.AddRange(allPermissions);

        // --- Seed roles ---
        var adminRole = new RoleEntity { Name = "Admin", Description = "超级管理员，拥有所有权限" };
        var editorRole = new RoleEntity { Name = "Editor", Description = "编辑员，可查看和编辑" };
        var viewerRole = new RoleEntity { Name = "Viewer", Description = "只读用户，仅可查看" };

        context.Roles.AddRange(adminRole, editorRole, viewerRole);

        // Flush to generate IDs
        await context.SaveChangesAsync(ct);

        // --- Seed role-permission mappings ---
        // Admin gets all permissions
        foreach (var perm in allPermissions)
        {
            context.RolePermissions.Add(new RolePermissionEntity { RoleId = adminRole.Id, PermissionId = perm.Id });
        }

        // Editor gets view + edit permissions
        var editorPermissions = new[] { permDashboardView, permUserView, permUserEdit, permRoleView };
        foreach (var perm in editorPermissions)
        {
            context.RolePermissions.Add(new RolePermissionEntity { RoleId = editorRole.Id, PermissionId = perm.Id });
        }

        // Viewer gets view-only permissions
        var viewerPermissions = new[] { permDashboardView, permUserView, permRoleView };
        foreach (var perm in viewerPermissions)
        {
            context.RolePermissions.Add(new RolePermissionEntity { RoleId = viewerRole.Id, PermissionId = perm.Id });
        }

        // --- Seed default admin user ---
        var user = new UserEntity
        {
            Username = "admin",
            PasswordHash = PasswordHasher.Hash("admin123"),
            DisplayName = "管理员",
            Status = UserStatus.Active,
            CreatedAt = DateTime.UtcNow
        };
        context.Users.Add(user);
        await context.SaveChangesAsync(ct);

        // Assign admin role to the default user
        context.UserRoles.Add(new UserRoleEntity { UserId = user.Id, RoleId = adminRole.Id });

        await context.SaveChangesAsync(ct);
    }
}
