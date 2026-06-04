using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Data;

public static class DbInitializer
{
    public const string PermissionSeedVersion = "2026.06.02.1";
    public const string PermissionSeedVersionKey = "security.permissionSeedVersion";
    public const string PermissionSeedChecksumKey = "security.permissionSeedChecksum";

    /// <summary>
    /// Seed system setting definitions. Each entry: (Key, Value, Description).
    /// </summary>
    private static readonly (string Key, string Value, string Description)[] SeedSettings =
    [
        ("site.name",           "Tigercat Admin",  "站点名称"),
        ("site.logo",           "",                 "站点 Logo URL"),
        ("auth.sessionTimeout", "1440",             "会话超时时间（分钟）"),
        ("auth.maxAttempts",    "5",                "最大登录失败次数"),
        ("auth.loginLockoutMinutes", "5",            "登录失败锁定时长（分钟）"),
        ("auth.passwordMinLength", "6",              "密码最小长度"),
        ("auth.requireComplexPassword", "false",     "是否要求密码同时包含字母和数字"),
        ("theme.mode",          "system",            "默认主题模式（light / dark / system）"),
        ("theme.primaryColor",  "#2563eb",           "默认主色调"),
        ("theme.compactMode",   "false",             "紧凑模式（侧边栏默认折叠）"),
        ("ops.auditRetentionDays", "90",              "审计日志保留天数"),
        (PermissionSeedVersionKey, PermissionSeedVersion, "权限种子数据版本"),
        (PermissionSeedChecksumKey, "", "权限种子数据摘要"),
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
        ("setting:view",   "查看系统设置"),
        ("setting:edit",   "编辑系统设置"),
        ("media:view",     "查看媒体资源"),
        ("media:upload",   "上传媒体资源"),
        ("media:delete",   "删除媒体资源"),
        ("audit:view",     "查看审计日志"),
        ("audit:export",   "导出审计日志"),
        ("notification:view", "查看通知中心"),
        ("notification:edit", "更新通知状态"),
        ("task:view",      "查看任务面板"),
        ("task:create",    "创建运维任务"),
        ("task:edit",      "编辑运维任务"),
    ];

    public static string PermissionSeedChecksum { get; } = BuildPermissionSeedChecksum();

    public static IReadOnlyDictionary<string, string> DefaultSettingValues { get; } =
        BuildDefaultSettingValues();

    /// <summary>
    /// Seed role definitions. Each entry: (Name, Description, PermissionCodes).
    /// </summary>
    private static readonly (string Name, string Description, string[] PermissionCodes)[] SeedRoles =
    [
        ("Admin",  "超级管理员，拥有所有权限", SeedPermissions.Select(p => p.Code).ToArray()),
        ("Editor", "编辑员，可查看和编辑",
            ["dashboard:view", "user:view", "user:edit", "role:view", "role:edit", "setting:view", "setting:edit", "media:view", "media:upload", "audit:view", "notification:view", "notification:edit", "task:view", "task:create", "task:edit"]),
        ("Viewer", "只读用户，仅可查看",
            ["dashboard:view", "user:view", "role:view", "setting:view", "media:view", "audit:view", "notification:view", "task:view"]),
    ];

    private static readonly (string PublicId, string GroupKey, string Title, string Description, string ToastType, bool Read, string? LinkUrl, string MetadataJson)[] SeedNotifications =
    [
        ("release-window", "ops", "发布窗口确认", "今晚 20:00 的发布窗口已创建，请确认导出任务与健康检查状态。", "warning", false, "/tasks", """{"source":"deployment","severity":"medium"}"""),
        ("security-session-review", "security", "会话策略复核", "检测到会话超时时间仍为默认值，建议在生产前完成安全策略确认。", "info", false, "/settings", """{"source":"security","severity":"low"}"""),
        ("release-audit-ready", "release", "审计日志已接入", "后台审计日志支持分页、筛选、详情和导出，可进入审计页继续核对。", "success", true, "/audit-logs", """{"source":"audit","severity":"low"}"""),
    ];

    private static readonly (string PublicId, string Title, string Description, string Assignee, string Priority, string Status, DateTime DueAt, double EstimateHours, bool Blocked, string? BlockedReason)[] SeedTasks =
    [
        ("task-asset-review", "补齐媒体资源持久化方案", "为 Logo 与头像预留真实存储方案，明确对象存储与权限校验边界。", "王一哲", "high", "backlog", new DateTime(2026, 6, 3, 10, 0, 0, DateTimeKind.Utc), 6, false, null),
        ("task-e2e-plan", "梳理用户与设置核心流程 E2E 用例", "覆盖登录、用户 CRUD、设置保存与权限保护的最小回归集合。", "平台测试", "medium", "backlog", new DateTime(2026, 6, 5, 4, 0, 0, DateTimeKind.Utc), 4, false, null),
        ("task-postgres-docs", "整理 PostgreSQL 生产配置文档", "补齐连接串、迁移、备份策略与 Aspire 环境变量示例。", "后端组", "high", "todo", new DateTime(2026, 5, 30, 10, 0, 0, DateTimeKind.Utc), 5, false, null),
        ("task-cache-observe", "定位导出缓存命中率下降原因", "需要结合 Redis 指标与导出模板变更记录继续排查。", "平台运维", "high", "doing", new DateTime(2026, 5, 28, 9, 30, 0, DateTimeKind.Utc), 4, true, "等待 Redis 指标与导出模板变更记录交叉确认。"),
        ("task-notification-review", "通知中心交互复核", "确认分组筛选、已读切换与浮层反馈在双端一致。", "产品验收", "medium", "review", new DateTime(2026, 5, 29, 7, 0, 0, DateTimeKind.Utc), 2, false, null),
        ("task-audit-page", "审计日志页联调完成", "后端聚合 Redis Streams，双端页面已完成 ActivityFeed 与 Timeline 验证。", "管理后台", "medium", "done", new DateTime(2026, 5, 28, 6, 0, 0, DateTimeKind.Utc), 3, false, null),
    ];

    /// <summary>
    /// Idempotent seed: each table is checked independently — safe to re-run after partial
    /// failures and also works with the InMemory provider (which lacks transaction support).
    /// </summary>
    public static async Task InitializeAsync(AdminDbContext context, CancellationToken ct = default)
    {
        // Use migrations for SQLite so local development keeps schema history.
        // Other providers in this sample use EnsureCreated to avoid coupling
        // startup to provider-specific migration artifacts.
        if (context.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) == true)
        {
            await context.Database.MigrateAsync(ct);
        }
        else
        {
            await context.Database.EnsureCreatedAsync(ct);
        }

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
        var permLookup = (await context.Permissions
            .Select(p => new { p.Code, p.Id })
            .ToListAsync(ct))
            .GroupBy(p => p.Code)
            .ToDictionary(g => g.Key, g => g.First().Id);

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
        var roleLookup = (await context.Roles
            .Select(r => new { r.Name, r.Id })
            .ToListAsync(ct))
            .GroupBy(r => r.Name)
            .ToDictionary(g => g.Key, g => g.First().Id);

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

        // --- Seed system settings (idempotent: skip existing by Key, case-insensitive) ---
        var existingSettingKeys = (await context.SystemSettings
            .Select(s => s.Key)
            .ToListAsync(ct))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var newSettings = SeedSettings
            .Where(s => !existingSettingKeys.Contains(s.Key))
            .Select(s => new SystemSettingEntity
            {
                Key = s.Key,
                Value = s.Key == PermissionSeedChecksumKey ? PermissionSeedChecksum : s.Value,
                Description = s.Description
            })
            .ToList();

        if (newSettings.Count > 0)
        {
            context.SystemSettings.AddRange(newSettings);
            await context.SaveChangesAsync(ct);
        }

        await UpsertPermissionSeedMetadataAsync(context, ct);

        var existingNotificationIds = await context.AdminNotifications
            .Select(n => n.PublicId)
            .ToHashSetAsync(ct);

        var newNotifications = SeedNotifications
            .Where(n => !existingNotificationIds.Contains(n.PublicId))
            .Select(n => new AdminNotificationEntity
            {
                PublicId = n.PublicId,
                GroupKey = n.GroupKey,
                Title = n.Title,
                Description = n.Description,
                ToastType = n.ToastType,
                Read = n.Read,
                ReadAt = n.Read ? DateTime.UtcNow : null,
                LinkUrl = n.LinkUrl,
                MetadataJson = n.MetadataJson,
                CreatedAt = DateTime.UtcNow.AddHours(-SeedNotifications.Length + Array.FindIndex(SeedNotifications, item => item.PublicId == n.PublicId))
            })
            .ToList();

        if (newNotifications.Count > 0)
        {
            context.AdminNotifications.AddRange(newNotifications);
            await context.SaveChangesAsync(ct);
        }

        await SyncSeedNotificationLinksAsync(context, ct);

        var existingTaskIds = await context.AdminTasks
            .Select(t => t.PublicId)
            .ToHashSetAsync(ct);

        var newTasks = SeedTasks
            .Where(t => !existingTaskIds.Contains(t.PublicId))
            .Select(t => new AdminTaskEntity
            {
                PublicId = t.PublicId,
                Title = t.Title,
                Description = t.Description,
                Assignee = t.Assignee,
                Priority = t.Priority,
                Status = t.Status,
                DueAt = t.DueAt,
                EstimateHours = t.EstimateHours,
                Blocked = t.Blocked,
                BlockedReason = t.BlockedReason,
                CreatedBy = "system",
                CreatedAt = DateTime.UtcNow,
                CompletedAt = t.Status == "done" ? DateTime.UtcNow : null
            })
            .ToList();

        if (newTasks.Count > 0)
        {
            context.AdminTasks.AddRange(newTasks);
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

    private static async Task SyncSeedNotificationLinksAsync(AdminDbContext context, CancellationToken ct)
    {
        var seedLinkMap = SeedNotifications
            .Where(n => n.LinkUrl is not null)
            .ToDictionary(n => n.PublicId, n => n.LinkUrl, StringComparer.Ordinal);

        var existingSeeds = await context.AdminNotifications
            .Where(n => seedLinkMap.Keys.Contains(n.PublicId))
            .ToListAsync(ct);

        var changed = false;
        foreach (var notification in existingSeeds)
        {
            if (seedLinkMap.TryGetValue(notification.PublicId, out var linkUrl) &&
                string.IsNullOrWhiteSpace(notification.LinkUrl))
            {
                notification.LinkUrl = linkUrl;
                notification.UpdatedAt = DateTime.UtcNow;
                changed = true;
            }
        }

        if (changed)
        {
            await context.SaveChangesAsync(ct);
        }
    }

    private static async Task UpsertPermissionSeedMetadataAsync(AdminDbContext context, CancellationToken ct)
    {
        var metadata = await context.SystemSettings
            .Where(s => s.Key == PermissionSeedVersionKey || s.Key == PermissionSeedChecksumKey)
            .ToDictionaryAsync(s => s.Key, StringComparer.OrdinalIgnoreCase, ct);

        UpsertMetadataValue(
            context,
            metadata,
            PermissionSeedVersionKey,
            PermissionSeedVersion,
            "权限种子数据版本");

        UpsertMetadataValue(
            context,
            metadata,
            PermissionSeedChecksumKey,
            PermissionSeedChecksum,
            "权限种子数据摘要");

        await context.SaveChangesAsync(ct);
    }

    private static void UpsertMetadataValue(
        AdminDbContext context,
        IReadOnlyDictionary<string, SystemSettingEntity> metadata,
        string key,
        string value,
        string description)
    {
        if (metadata.TryGetValue(key, out var setting))
        {
            if (!string.Equals(setting.Value, value, StringComparison.Ordinal) ||
                setting.Description != description)
            {
                setting.Value = value;
                setting.Description = description;
                setting.UpdatedAt = DateTime.UtcNow;
            }

            return;
        }

        context.SystemSettings.Add(new SystemSettingEntity
        {
            Key = key,
            Value = value,
            Description = description
        });
    }

    private static string BuildPermissionSeedChecksum()
    {
        var catalog = string.Join(
            '\n',
            SeedPermissions
                .OrderBy(p => p.Code, StringComparer.Ordinal)
                .Select(p => $"{p.Code}:{p.Description}"));

        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(catalog));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static IReadOnlyDictionary<string, string> BuildDefaultSettingValues()
    {
        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (var setting in SeedSettings)
        {
            values[setting.Key] = setting.Key == PermissionSeedChecksumKey
                ? PermissionSeedChecksum
                : setting.Value;
        }

        return values;
    }
}
