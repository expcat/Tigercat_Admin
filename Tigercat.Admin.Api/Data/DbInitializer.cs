using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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
        ("Demo", "演示账号，只读浏览（无用户/角色管理，用于 403 演示）",
            ["dashboard:view", "setting:view", "media:view", "audit:view", "notification:view", "task:view"]),
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
    public static async Task InitializeAsync(
        AdminDbContext context,
        IConfiguration? configuration = null,
        CancellationToken ct = default)
    {
        // Keep schema history for relational providers. InMemory has no migrations.
        if (context.Database.IsRelational())
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

        await SeedCollaborationAsync(context, ct);
        await SeedProjectsAndCalendarAsync(context, ct);
        await SeedContentJobsAndImportAsync(context, ct);

        // --- Seed default admin user (idempotent: skip if username exists) ---
        var adminUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "admin", ct);

        if (adminUser is null)
        {
            var adminPassword = configuration?["BootstrapAdmin:Password"];
            if (string.IsNullOrWhiteSpace(adminPassword))
            {
                adminPassword = "admin123";
            }

            adminUser = new UserEntity
            {
                Username = "admin",
                PasswordHash = PasswordHasher.Hash(adminPassword),
                DisplayName = "管理员",
                Status = UserStatus.Active,
                TwoFactorEnabled = false,
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

        // --- Seed demo user (2FA on, read-only Demo role; matches MockApi 403 semantics) ---
        var demoUser = await context.Users.FirstOrDefaultAsync(u => u.Username == "demo", ct);
        if (demoUser is null)
        {
            demoUser = new UserEntity
            {
                Username = "demo",
                PasswordHash = PasswordHasher.Hash("demo"),
                DisplayName = "演示账号",
                Status = UserStatus.Active,
                TwoFactorEnabled = true,
                CreatedAt = DateTime.UtcNow
            };
            context.Users.Add(demoUser);
            await context.SaveChangesAsync(ct);
        }

        if (roleLookup.TryGetValue("Demo", out var demoRoleId))
        {
            var demoAssigned = await context.UserRoles
                .AnyAsync(ur => ur.UserId == demoUser.Id && ur.RoleId == demoRoleId, ct);

            if (!demoAssigned)
            {
                context.UserRoles.Add(new UserRoleEntity { UserId = demoUser.Id, RoleId = demoRoleId });
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

    private static async Task SeedCollaborationAsync(AdminDbContext context, CancellationToken ct)
    {
        var existingTicketIds = await context.Tickets.Select(t => t.PublicId).ToHashSetAsync(ct);
        var newTickets = SeedTickets
            .Where(t => !existingTicketIds.Contains(t.PublicId))
            .Select(t => new TicketEntity
            {
                PublicId = t.PublicId,
                Title = t.Title,
                Requester = t.Requester,
                Category = t.Category,
                Priority = t.Priority,
                Status = t.Status,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
                Satisfaction = t.Satisfaction,
                Description = t.Description,
                Messages = t.Messages.Select(m => new TicketMessageEntity
                {
                    PublicId = m.PublicId,
                    Content = m.Content,
                    Direction = m.Direction,
                    CreatedAt = m.CreatedAt
                }).ToList()
            })
            .ToList();

        if (newTickets.Count > 0)
        {
            context.Tickets.AddRange(newTickets);
            await context.SaveChangesAsync(ct);
        }

        if (!await context.ChatMessages.AnyAsync(ct))
        {
            context.ChatMessages.Add(new ChatMessageEntity
            {
                PublicId = "chat-welcome",
                Content = "你好，我是在线客服小虎，有任何关于后台的问题都可以问我～",
                Direction = "other",
                CreatedAt = new DateTime(2026, 6, 29, 9, 0, 0, DateTimeKind.Utc)
            });
            await context.SaveChangesAsync(ct);
        }

        var existingCommentIds = await context.Comments.Select(c => c.PublicId).ToHashSetAsync(ct);
        var newComments = SeedComments
            .Where(c => !existingCommentIds.Contains(c.PublicId))
            .Select(c => new CommentEntity
            {
                PublicId = c.PublicId,
                TargetType = c.TargetType,
                TargetId = c.TargetId,
                Body = c.Body,
                UserName = c.UserName,
                CreatedAt = c.CreatedAt
            })
            .ToList();

        if (newComments.Count > 0)
        {
            context.Comments.AddRange(newComments);
            await context.SaveChangesAsync(ct);
        }
    }

    private static readonly (
        string PublicId,
        string Title,
        string Requester,
        string Category,
        string Priority,
        string Status,
        DateTime CreatedAt,
        DateTime UpdatedAt,
        double Satisfaction,
        string Description,
        (string PublicId, string Content, string Direction, DateTime CreatedAt)[] Messages)[] SeedTickets =
    [
        (
            "TK-2048",
            "导出报表时偶发 500 错误",
            "赵敏",
            "缺陷",
            "high",
            "progress",
            new DateTime(2026, 6, 28, 10, 24, 0),
            new DateTime(2026, 6, 29, 9, 2, 0),
            0,
            "在数据分析页导出近 90 天报表时，约 1/5 概率返回 500，刷新后可恢复。",
            [
                ("m-2048-1", "你好，导出报表偶尔会失败，麻烦看下。", "other", new DateTime(2026, 6, 28, 10, 24, 0)),
                ("m-2048-2", "已收到，正在排查导出服务的超时配置。", "self", new DateTime(2026, 6, 28, 11, 10, 0)),
            ]
        ),
        (
            "TK-2050",
            "希望支持按部门筛选用户",
            "孙莉",
            "需求",
            "medium",
            "accepted",
            new DateTime(2026, 6, 27, 16, 40, 0),
            new DateTime(2026, 6, 28, 9, 15, 0),
            0,
            "用户管理列表希望增加“部门”筛选项，便于按团队管理成员。",
            [
                ("m-2050-1", "能否在用户列表加一个部门筛选？", "other", new DateTime(2026, 6, 27, 16, 40, 0)),
            ]
        ),
        (
            "TK-2041",
            "登录后偶尔跳回登录页",
            "周杰",
            "缺陷",
            "high",
            "resolved",
            new DateTime(2026, 6, 25, 8, 12, 0),
            new DateTime(2026, 6, 26, 17, 50, 0),
            4,
            "部分用户登录成功后数秒内被登出，疑似 token 续期问题。",
            [
                ("m-2041-1", "登录后过一会就被踢出来了。", "other", new DateTime(2026, 6, 25, 8, 12, 0)),
                ("m-2041-2", "已修复 token 续期逻辑，请再试试。", "self", new DateTime(2026, 6, 26, 17, 50, 0)),
                ("m-2041-3", "可以了，谢谢！", "other", new DateTime(2026, 6, 26, 18, 5, 0)),
            ]
        ),
    ];

    private static readonly (
        string PublicId,
        string TargetType,
        string TargetId,
        string Body,
        string UserName,
        DateTime CreatedAt)[] SeedComments =
    [
        ("n-2048-1", "ticket", "TK-2048", "初步定位为导出队列在高峰期超时，已 @张运维 调整 worker 并发。", "李工", new DateTime(2026, 6, 28, 14, 30, 0)),
        ("n-2041-1", "ticket", "TK-2041", "根因：刷新接口未带上最新 token，已修复并补充回归用例。", "王小虎", new DateTime(2026, 6, 26, 17, 40, 0)),
        ("c-p-1001-1", "project", "1001", "仪表盘空状态文案建议改成「暂无运营数据」。", "赵敏", new DateTime(2026, 8, 21, 11, 20, 0)),
        ("c-p-1001-2", "project", "1001", "权限码过滤菜单已经对上，demo 账号可用来演示 403。", "李工", new DateTime(2026, 8, 22, 9, 40, 0)),
    ];

    private static async Task SeedProjectsAndCalendarAsync(AdminDbContext context, CancellationToken ct)
    {
        var existingProjectIds = await context.Projects.Select(p => p.PublicId).ToHashSetAsync(ct);
        var newProjects = SeedProjects
            .Where(p => !existingProjectIds.Contains(p.PublicId))
            .Select(p => new ProjectEntity
            {
                PublicId = p.PublicId,
                Name = p.Name,
                Summary = p.Summary,
                Owner = p.Owner,
                Department = p.Department,
                Status = p.Status,
                Progress = p.Progress,
                Milestone = p.Milestone,
                Budget = p.Budget,
                StartAt = p.StartAt,
                EndAt = p.EndAt,
                Members = p.Members.Select((m, index) => new ProjectMemberEntity
                {
                    PublicId = m.PublicId,
                    Name = m.Name,
                    Role = m.Role,
                    Color = m.Color,
                    SortOrder = index
                }).ToList(),
                Activities = p.Activities.Select((a, index) => new ProjectActivityEntity
                {
                    PublicId = a.PublicId,
                    Label = a.Label,
                    Content = a.Content,
                    Color = a.Color,
                    SortOrder = index
                }).ToList()
            })
            .ToList();

        if (newProjects.Count > 0)
        {
            context.Projects.AddRange(newProjects);
            await context.SaveChangesAsync(ct);
        }

        var existingEventIds = await context.CalendarEvents.Select(e => e.PublicId).ToHashSetAsync(ct);
        var newEvents = SeedCalendarEvents
            .Where(e => !existingEventIds.Contains(e.PublicId))
            .Select(e => new CalendarEventEntity
            {
                PublicId = e.PublicId,
                Date = e.Date,
                Start = e.Start,
                End = e.End,
                Title = e.Title,
                Type = e.Type,
                Location = e.Location
            })
            .ToList();

        if (newEvents.Count > 0)
        {
            context.CalendarEvents.AddRange(newEvents);
            await context.SaveChangesAsync(ct);
        }
    }

    private static readonly (
        string PublicId,
        string Name,
        string Role,
        string Color) MemberWang = ("m-wang", "王小虎", "前端", "#3b82f6");
    private static readonly (
        string PublicId,
        string Name,
        string Role,
        string Color) MemberLi = ("m-li", "李工", "后端", "#22c55e");
    private static readonly (
        string PublicId,
        string Name,
        string Role,
        string Color) MemberZhang = ("m-zhang", "张运维", "运维", "#f59e0b");
    private static readonly (
        string PublicId,
        string Name,
        string Role,
        string Color) MemberChen = ("m-chen", "陈测试", "测试", "#a855f7");
    private static readonly (
        string PublicId,
        string Name,
        string Role,
        string Color) MemberZhao = ("m-zhao", "赵敏", "产品", "#ef4444");
    private static readonly (
        string PublicId,
        string Name,
        string Role,
        string Color) MemberSun = ("m-sun", "孙莉", "设计", "#14b8a6");

    private static readonly (
        string PublicId,
        string Name,
        string Summary,
        string Owner,
        string Department,
        string Status,
        int Progress,
        int Milestone,
        int Budget,
        string StartAt,
        string EndAt,
        (string PublicId, string Name, string Role, string Color)[] Members,
        (string PublicId, string Label, string Content, string Color)[] Activities)[] SeedProjects =
    [
        (
            "1001",
            "智能运营台",
            "统一仪表盘、快捷跳转与运营指标的卡片工作台。",
            "王小虎",
            "平台研发部",
            "active",
            68,
            2,
            86,
            "2026-03-12",
            "2026-09-30",
            [MemberWang, MemberLi, MemberZhao, MemberSun],
            [
                ("a1", "今天 09:20", "王小虎 更新了里程碑「联调验收」", "#3b82f6"),
                ("a2", "昨天 18:04", "李工 合并权限接口联调分支", "#22c55e"),
                ("a3", "08-21 11:12", "赵敏 补充运营指标口径说明", "#64748b"),
            ]
        ),
        (
            "1002",
            "权限治理升级",
            "梳理角色权限树、入口守卫与只读演示账号策略。",
            "李工",
            "安全治理组",
            "planning",
            18,
            0,
            42,
            "2026-08-04",
            "2026-11-15",
            [MemberLi, MemberChen, MemberZhang],
            [
                ("a1", "08-18 16:30", "李工 提交权限矩阵初稿", "#3b82f6"),
                ("a2", "08-16 10:05", "陈测试 列出回归用例范围", "#a855f7"),
            ]
        ),
        (
            "1003",
            "媒体资源中台",
            "图库、裁剪、标注与文件管理共用同一套媒体契约。",
            "孙莉",
            "内容中台",
            "active",
            54,
            1,
            63,
            "2026-05-08",
            "2026-10-20",
            [MemberSun, MemberWang, MemberZhang, MemberChen],
            [
                ("a1", "08-20 15:44", "孙莉 完成 16:9 裁剪交互", "#14b8a6"),
                ("a2", "08-19 09:18", "张运维 调整本地媒体存储配额", "#f59e0b"),
            ]
        ),
        (
            "1004",
            "工单协作 2.0",
            "主从分栏、生命周期步骤与内部备注讨论的协作模板。",
            "赵敏",
            "客户成功",
            "paused",
            41,
            1,
            55,
            "2026-04-22",
            "2026-12-01",
            [MemberZhao, MemberWang, MemberLi],
            [
                ("a1", "08-12 19:00", "赵敏 暂停迭代，等待客服排期", "#f59e0b"),
                ("a2", "08-08 11:26", "王小虎 完成 CommentThread 接入", "#3b82f6"),
            ]
        ),
        (
            "1005",
            "报表打印服务",
            "A4 打印布局、水印与渠道明细的导出演示。",
            "陈测试",
            "数据分析",
            "done",
            100,
            3,
            28,
            "2026-02-10",
            "2026-06-30",
            [MemberChen, MemberLi, MemberZhao],
            [
                ("a1", "06-30 17:40", "陈测试 关闭里程碑「发布上线」", "#22c55e"),
                ("a2", "06-28 10:16", "李工 补齐打印分页分隔", "#3b82f6"),
            ]
        ),
        (
            "1006",
            "监控可观测性",
            "资源水位、QPS/延迟滚动窗口与节点事件流。",
            "张运维",
            "基础设施",
            "active",
            72,
            2,
            91,
            "2026-06-01",
            "2026-09-15",
            [MemberZhang, MemberLi, MemberChen, MemberWang],
            [
                ("a1", "今天 08:11", "张运维 调整默认刷新间隔为 3 秒", "#f59e0b"),
                ("a2", "昨天 21:33", "李工 封顶事件流环形缓冲", "#22c55e"),
            ]
        ),
        (
            "1007",
            "导入向导优化",
            "字段映射、冲突策略与导入进度结果页的体验打磨。",
            "李工",
            "平台研发部",
            "planning",
            8,
            0,
            36,
            "2026-08-18",
            "2026-12-20",
            [MemberLi, MemberSun, MemberChen],
            [
                ("a1", "08-19 14:22", "李工 收集现有向导痛点", "#3b82f6"),
            ]
        ),
        (
            "1008",
            "帮助中心改版",
            "锚点目录、FAQ 手风琴与无限加载文章列表。",
            "王小虎",
            "体验设计",
            "done",
            100,
            3,
            19,
            "2026-01-15",
            "2026-05-20",
            [MemberWang, MemberSun, MemberZhao],
            [
                ("a1", "05-20 16:00", "王小虎 发布帮助中心改版", "#22c55e"),
                ("a2", "05-18 09:42", "孙莉 完成目录吸顶视觉", "#14b8a6"),
            ]
        ),
    ];

    private static readonly (
        string PublicId,
        string Date,
        string Start,
        string End,
        string Title,
        string Type,
        string Location)[] SeedCalendarEvents =
    [
        ("e1", "2026-06-29", "10:00", "11:00", "迭代站会", "meeting", "线上 · 腾讯会议"),
        ("e2", "2026-06-29", "14:30", "15:30", "组件库设计评审", "review", "会议室 A"),
        ("e3", "2026-06-30", "16:00", "17:00", "v1.6 发布窗口", "release", "生产环境"),
        ("e4", "2026-07-01", "09:30", "10:00", "季度 OKR 对齐", "meeting", "会议室 B"),
        ("e5", "2026-07-02", "15:00", "15:30", "安全合规提醒", "reminder", "—"),
    ];

    private static async Task SeedContentJobsAndImportAsync(AdminDbContext context, CancellationToken ct)
    {
        var existingArticleIds = await context.ContentArticles.Select(item => item.PublicId).ToHashSetAsync(ct);
        var newArticles = SeedArticles
            .Where(item => !existingArticleIds.Contains(item.PublicId))
            .Select(item => new ContentArticleEntity
            {
                PublicId = item.PublicId,
                Title = item.Title,
                EditorType = item.EditorType,
                Body = item.Body,
                TagsJson = JsonSerializer.Serialize(item.Tags),
                Category = item.Category,
                ColumnJson = JsonSerializer.Serialize(item.Column),
                Published = item.Published
            })
            .ToList();

        if (newArticles.Count > 0)
        {
            context.ContentArticles.AddRange(newArticles);
            await context.SaveChangesAsync(ct);
        }

        var existingJobIds = await context.Jobs.Select(item => item.PublicId).ToHashSetAsync(ct);
        var newJobs = SeedJobs
            .Where(item => !existingJobIds.Contains(item.PublicId))
            .Select(item => new JobEntity
            {
                PublicId = item.PublicId,
                Name = item.Name,
                Cron = item.Cron,
                Concurrency = item.Concurrency,
                Timeout = item.Timeout,
                BatchSize = item.BatchSize,
                Enabled = item.Enabled,
                Status = item.Status,
                LastRun = item.LastRun,
                NextRun = item.NextRun,
                Progress = item.Progress,
                Phase = item.Phase,
                Start = item.Start,
                End = item.End,
                Color = item.Color
            })
            .ToList();

        if (newJobs.Count > 0)
        {
            context.Jobs.AddRange(newJobs);
            await context.SaveChangesAsync(ct);
        }
    }

    private static readonly (
        string PublicId,
        string Title,
        string EditorType,
        string Body,
        string[] Tags,
        string Category,
        string[] Column,
        bool Published)[] SeedArticles =
    [
        (
            "a1",
            "组件库 v1.6 发布说明",
            "rich",
            "<h2>组件库 v1.6 发布说明</h2><p>本次更新带来内容编辑工作台，支持富文本 / Markdown / 代码三种模式互切。</p>",
            ["发布", "组件库"],
            "frontend",
            ["docs", "guide"],
            false
        )
    ];

    private static readonly (
        string PublicId,
        string Name,
        string Cron,
        int Concurrency,
        string Timeout,
        string BatchSize,
        bool Enabled,
        string Status,
        string LastRun,
        string NextRun,
        int Progress,
        int Phase,
        string Start,
        string End,
        string Color)[] SeedJobs =
    [
        ("JOB-1001", "每日对账批处理", "0 2 * * *", 4, "120", "2000", true, "running", "2026-07-01 02:00", "2026-07-02 02:00", 64, 1, "2026-06-30", "2026-07-02", "#22c55e"),
        ("JOB-1002", "订单数据归档", "0 3 * * 0", 2, "300", "5000", true, "running", "2026-06-29 03:00", "2026-07-06 03:00", 28, 1, "2026-06-29", "2026-07-01", "#3b82f6"),
        ("JOB-1003", "缓存预热", "*/30 * * * *", 8, "60", "500", false, "paused", "2026-06-30 23:30", "—", 100, 3, "2026-06-28", "2026-06-30", "#94a3b8"),
        ("JOB-1004", "报表快照生成", "0 6 * * *", 1, "180", "1000", true, "failed", "2026-07-01 06:00", "2026-07-02 06:00", 42, 2, "2026-07-01", "2026-07-03", "#ef4444")
    ];

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
