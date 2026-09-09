namespace Tigercat.Admin.Api.Endpoints;

internal static class MenusCatalog
{
    public static MenuSchemaResponse Schema { get; } = Create();

    private static MenuSchemaNodeResponse Page(
        string key,
        string label,
        string icon,
        string path,
        string? permission = null)
        => new()
        {
            Key = key,
            Label = label,
            Icon = icon,
            Path = path,
            Permission = permission,
        };

    private static MenuSchemaResponse Create()
    {
        var home = Page("home", "仪表盘", "dashboard", "/dashboard", "dashboard:view");
        var analytics = Page("analytics", "数据分析看板", "trendingUp", "/analytics");
        var monitor = Page("monitor", "实时监控", "monitor", "/monitor");
        var projects = Page("projects", "项目列表", "package", "/projects");
        var tickets = Page("tickets", "工单中心", "ticket", "/tickets");
        var approvals = Page("approvals", "审批中心", "checkCircle", "/approvals");
        var workflowDesigner = Page("workflowDesigner", "流程设计", "gitBranch", "/workflow-designer");
        var calendar = Page("calendar", "团队日历", "calendar", "/calendar");
        var content = Page("content", "内容编辑", "edit", "/content");
        var gallery = Page("gallery", "媒体图库", "image", "/gallery");
        var jobs = Page("jobs", "定时任务", "clock", "/jobs");
        var import = Page("import", "数据导入", "upload", "/import");
        var performance = Page("performance", "大数据演示", "zap", "/performance");
        var help = Page("help", "帮助中心", "help", "/help");
        var reports = Page("reports", "报表打印", "fileText", "/reports");
        var users = Page("users", "用户管理", "users", "/users", "user:view");
        var roles = Page("roles", "角色管理", "shield", "/roles", "role:view");
        var menus = Page("menus", "菜单管理", "menu", "/menus", "menu:view");
        var permissionDemo = Page("permissionDemo", "按钮权限", "lock", "/permission-demo");
        var settings = Page("settings", "系统设置", "settings", "/settings");
        var files = Page("files", "文件管理", "fileText", "/files", "media:view");
        var notifications = Page("notifications", "通知中心", "bell", "/notifications");
        var tasks = Page("tasks", "任务面板", "clipboard", "/tasks");
        var audit = Page("audit", "审计日志", "activity", "/audit-logs");
        var about = Page("about", "关于", "info", "/about");

        return new MenuSchemaResponse
        {
            Items =
            [
                home,
                new()
                {
                    Key = "analyticsGroup",
                    Label = "数据分析",
                    Icon = "trendingUp",
                    Children = [analytics, monitor],
                },
                new()
                {
                    Key = "collaborationGroup",
                    Label = "协作",
                    Icon = "message",
                    Children = [tickets, approvals, workflowDesigner, calendar],
                },
                new()
                {
                    Key = "contentGroup",
                    Label = "内容管理",
                    Icon = "palette",
                    Children = [content, gallery],
                },
                new()
                {
                    Key = "projectsGroup",
                    Label = "项目",
                    Icon = "package",
                    Children = [projects],
                },
                new()
                {
                    Key = "opsGroup",
                    Label = "运维",
                    Icon = "terminal",
                    Children = [jobs, import, performance],
                },
                new()
                {
                    Key = "helpGroup",
                    Label = "帮助支持",
                    Icon = "help",
                    Children = [help, reports],
                },
                new()
                {
                    Key = "system",
                    Label = "系统管理",
                    Icon = "server",
                    Children = [users, roles, menus, permissionDemo, settings, files, notifications, tasks, audit],
                },
            ],
            BottomItems = [about],
        };
    }
}
