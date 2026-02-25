using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Data;

public static class DbInitializer
{
    /// <summary>
    /// Seed system setting definitions. Each entry: (Key, Value, Description).
    /// </summary>
    private static readonly (string Key, string Value, string Description)[] SeedSettings =
    [
        ("site.name",           "Tigercat Admin",  "站点名称"),
        ("site.logo",           "",                 "站点 Logo URL"),
        ("auth.sessionTimeout", "1440",             "会话超时时间（分钟）"),
        ("auth.maxAttempts",    "5",                "最大登录失败次数"),
    ];

    /// <summary>
    /// Seed permission definitions. Each entry: (Code, Description).
    /// </summary>
    private static readonly (string Code, string Description)[] SeedPermissions =
    [
        ("dashboard:view", "查看仪表盘"),
        ("user:view",      "查看用户列表"),
        ("user:create",    "创建用户"),
        ("user:edit",      "编辑用户"),
        ("user:delete",    "删除用户"),
        ("role:view",      "查看角色列表"),
        ("role:create",    "创建角色"),
        ("role:edit",      "编辑角色"),
        ("role:delete",    "删除角色"),
    ];

    /// <summary>
    /// Seed role definitions. Each entry: (Name, Description, PermissionCodes).
    /// </summary>
    private static readonly (string Name, string Description, string[] PermissionCodes)[] SeedRoles =
    [
        ("Admin",  "超级管理员，拥有所有权限", SeedPermissions.Select(p => p.Code).ToArray()),
        ("Editor", "编辑员，可查看和编辑",
            ["dashboard:view", "user:view", "user:edit", "role:view", "role:edit"]),
        ("Viewer", "只读用户，仅可查看",
            ["dashboard:view", "user:view", "role:view"]),
    ];

    /// <summary>
    /// Idempotent seed: each table is checked independently — safe to re-run after partial
    /// failures and also works with the InMemory provider (which lacks transaction support).
    /// </summary>
    public static async Task InitializeAsync(AdminDbContext context, CancellationToken ct = default)
    {
        await context.Database.EnsureCreatedAsync(ct);

        // --- Seed permissions (idempotent: skip existing by Code) ---
        var existingPermCodes = await context.Permissions
            .Select(p => p.Code)
            .ToHashSetAsync(ct);

        var newPermissions = SeedPermissions
            .Where(p => !existingPermCodes.Contains(p.Code))
            .Select(p => new PermissionEntity { Code = p.Code, Description = p.Description })
            .ToList();

        if (newPermissions.Count > 0)
        {
            context.Permissions.AddRange(newPermissions);
            await context.SaveChangesAsync(ct);
        }

        // Build a lookup of all permissions by Code (including pre-existing ones)
        var permLookup = await context.Permissions
            .ToDictionaryAsync(p => p.Code, p => p.Id, ct);

        // --- Seed roles (idempotent: skip existing by Name) ---
        var existingRoleNames = await context.Roles
            .Select(r => r.Name)
            .ToHashSetAsync(ct);

        var newRoles = SeedRoles
            .Where(r => !existingRoleNames.Contains(r.Name))
            .Select(r => new RoleEntity { Name = r.Name, Description = r.Description })
            .ToList();

        if (newRoles.Count > 0)
        {
            context.Roles.AddRange(newRoles);
            await context.SaveChangesAsync(ct);
        }

        // Build a lookup of all roles by Name
        var roleLookup = await context.Roles
            .ToDictionaryAsync(r => r.Name, r => r.Id, ct);

        // --- Seed role-permission mappings (idempotent: skip existing pairs) ---
        var existingRolePermSet = (await context.RolePermissions
            .Select(rp => new { rp.RoleId, rp.PermissionId })
            .ToListAsync(ct))
            .Select(rp => (rp.RoleId, rp.PermissionId))
            .ToHashSet();

        var newRolePermissions = new List<RolePermissionEntity>();

        foreach (var (name, _, permCodes) in SeedRoles)
        {
            if (!roleLookup.TryGetValue(name, out var roleId))
                continue;

            foreach (var code in permCodes)
            {
                if (!permLookup.TryGetValue(code, out var permId))
                    continue;

                if (!existingRolePermSet.Contains((roleId, permId)))
                {
                    newRolePermissions.Add(new RolePermissionEntity { RoleId = roleId, PermissionId = permId });
                }
            }
        }

        if (newRolePermissions.Count > 0)
        {
            context.RolePermissions.AddRange(newRolePermissions);
            await context.SaveChangesAsync(ct);
        }

        // --- Seed system settings (idempotent: skip existing by Key) ---
        var existingSettingKeys = await context.SystemSettings
            .Select(s => s.Key)
            .ToHashSetAsync(ct);

        var newSettings = SeedSettings
            .Where(s => !existingSettingKeys.Contains(s.Key))
            .Select(s => new SystemSettingEntity { Key = s.Key, Value = s.Value, Description = s.Description })
            .ToList();

        if (newSettings.Count > 0)
        {
            context.SystemSettings.AddRange(newSettings);
            await context.SaveChangesAsync(ct);
        }

        // --- Seed default admin user (idempotent: skip if username exists) ---
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "admin", ct);

        if (adminUser is null)
        {
            adminUser = new UserEntity
            {
                Username = "admin",
                PasswordHash = PasswordHasher.Hash("admin123"),
                DisplayName = "管理员",
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(adminUser);
            await context.SaveChangesAsync(ct);
        }

        // Assign Admin role to the default user if not already assigned
        if (roleLookup.TryGetValue("Admin", out var adminRoleId))
        {
            var alreadyAssigned = await context.UserRoles
                .AnyAsync(ur => ur.UserId == adminUser.Id && ur.RoleId == adminRoleId, ct);

            if (!alreadyAssigned)
            {
                context.UserRoles.Add(new UserRoleEntity { UserId = adminUser.Id, RoleId = adminRoleId });
                await context.SaveChangesAsync(ct);
            }
        }
    }
}
