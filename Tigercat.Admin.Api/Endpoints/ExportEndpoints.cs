using System.Collections.Concurrent;
using System.Linq.Expressions;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MiniExcelLibs;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class ExportEndpoints : IEndpointDefinition
{
    private static readonly HashSet<string> ValidUserFields =
        ["id", "username", "displayName", "status", "createdAt", "updatedAt", "roles"];

    private static readonly HashSet<string> ValidRoleFields =
        ["id", "name", "description", "createdAt", "permissions", "userCount"];

    private static readonly HashSet<string> ValidReportFields =
    [
        "section",
        "visits",
        "orders",
        "conversionRate",
        "revenue",
        "channel",
        "channelVisits",
        "channelOrders",
        "channelRate",
        "channelAmount"
    ];

    private static readonly HashSet<string> ValidOverviewFields =
        ["section", "key", "label", "value"];

    private static readonly HashSet<string> ReportKpiFields =
        ["visits", "orders", "conversionRate", "revenue"];

    private static readonly HashSet<string> ReportChannelFields =
        ["channel", "channelVisits", "channelOrders", "channelRate", "channelAmount"];

    private static readonly string[] ValidReportTypes = ["daily", "weekly", "monthly"];

    internal static readonly string[] SupportedFormats = ["csv", "json", "xlsx"];

    private const int DefaultTrendDays = 7;
    private const int MaxTrendDays = 90;

    /// <summary>Maximum number of rows allowed per export to prevent OOM on large tables.</summary>
    private const int MaxExportRows = 10_000;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/export")
            .WithTags("Export");

        group.MapGet("/users", ExportUsers)
            .RequirePermission("user:view")
            .WithName("ExportUsers");

        group.MapGet("/roles", ExportRoles)
            .RequirePermission("role:view")
            .WithName("ExportRoles");

        group.MapGet("/reports", ExportReports)
            .RequireLogin()
            .WithName("ExportReports");

        group.MapGet("/overview", ExportOverview)
            .RequireLogin()
            .WithName("ExportOverview");
    }

    // GET /api/export/users?format=csv|json|xlsx&fields=id,username,...
    private static async Task<IResult> ExportUsers(
        string? format,
        string? fields,
        string? keyword,
        int? status,
        string? sortBy,
        string? sortOrder,
        AdminDbContext db,
        CancellationToken ct)
    {
        var fmt = NormalizeFormat(format);
        if (fmt is null)
        {
            return InvalidFormatResult();
        }

        var selectedFields = ParseFields(fields, ValidUserFields);

        IQueryable<UserEntity> query = db.Users.AsNoTracking();

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
                    ApiResult.Fail<object>("Invalid 'status' query parameter value. Allowed values are 0 and 1.", 400),
                    AppJsonContext.Default.ApiResponseObject,
                    statusCode: 400);
            }

            query = query.Where(u => (int)u.Status == status.Value);
        }

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
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .Take(MaxExportRows)
            .ToListAsync(ct);

        var rows = users.Select(u => new ExportUserRow(
            u.Id,
            u.Username,
            u.DisplayName,
            u.Status.ToString(),
            u.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
            u.UpdatedAt?.ToString("yyyy-MM-dd HH:mm:ss"),
            string.Join("; ", u.UserRoles.Select(ur => ur.Role.Name))
        )).ToList();

        return BuildExportResult(rows, selectedFields, fmt, "users");
    }

    // GET /api/export/roles?format=csv|json|xlsx&fields=id,name,...
    private static async Task<IResult> ExportRoles(
        string? format,
        string? fields,
        string? keyword,
        string? sortBy,
        string? sortOrder,
        AdminDbContext db,
        CancellationToken ct)
    {
        var fmt = NormalizeFormat(format);
        if (fmt is null)
        {
            return InvalidFormatResult();
        }

        var selectedFields = ParseFields(fields, ValidRoleFields);

        IQueryable<RoleEntity> query = db.Roles.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            query = query.Where(r =>
                r.Name.ToLower().Contains(kw) ||
                (r.Description != null && r.Description.ToLower().Contains(kw)));
        }

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
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .Include(r => r.UserRoles)
            .Take(MaxExportRows)
            .ToListAsync(ct);

        var rows = roles.Select(r => new ExportRoleRow(
            r.Id,
            r.Name,
            r.Description,
            r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
            string.Join("; ", r.RolePermissions.Select(rp => rp.Permission.Code)),
            r.UserRoles.Count
        )).ToList();

        return BuildExportResult(rows, selectedFields, fmt, "roles");
    }

    // GET /api/export/reports?type=daily|weekly|monthly&format=csv|json|xlsx&fields=
    private static Task<IResult> ExportReports(
        string? type,
        string? format,
        string? fields)
    {
        var reportType = (type ?? "").Trim().ToLowerInvariant();
        if (!ValidReportTypes.Contains(reportType))
        {
            return Task.FromResult<IResult>(Results.Json(
                ApiResult.Fail<object>($"不支持的报表类型，可选值：{string.Join(", ", ValidReportTypes)}", 400),
                AppJsonContext.Default.ApiResponseObject,
                statusCode: 400));
        }

        var fmt = NormalizeFormat(format);
        if (fmt is null)
        {
            return Task.FromResult(InvalidFormatResult());
        }

        var selectedFields = ParseFields(fields, ValidReportFields);
        var rows = BuildReportRows(reportType, selectedFields);
        return Task.FromResult(BuildExportResult(rows, selectedFields, fmt, "reports"));
    }

    // GET /api/export/overview?format=csv|json|xlsx&days=
    private static async Task<IResult> ExportOverview(
        string? format,
        int? days,
        AdminDbContext db,
        CancellationToken ct)
    {
        var fmt = NormalizeFormat(format);
        if (fmt is null)
        {
            return InvalidFormatResult();
        }

        var selectedFields = ParseFields(null, ValidOverviewFields);
        var d = Math.Clamp(days ?? DefaultTrendDays, 1, MaxTrendDays);

        var totalUsers = await db.Users.CountAsync(ct);
        var activeUsers = await db.Users.CountAsync(u => u.Status == UserStatus.Active, ct);
        var disabledUsers = totalUsers - activeUsers;
        var totalRoles = await db.Roles.CountAsync(ct);
        var totalPermissions = await db.Permissions.CountAsync(ct);

        var startDate = DateTime.UtcNow.Date.AddDays(-d + 1);
        var endDateExclusive = startDate.AddDays(d);
        var grouped = await db.Users
            .Where(u => u.CreatedAt >= startDate && u.CreatedAt < endDateExclusive)
            .GroupBy(u => u.CreatedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Date, x => x.Count, ct);

        var rows = new List<ExportOverviewRow>
        {
            new("overview", "totalUsers", "总用户数", totalUsers.ToString()),
            new("overview", "activeUsers", "活跃用户", activeUsers.ToString()),
            new("overview", "disabledUsers", "禁用用户", disabledUsers.ToString()),
            new("overview", "totalRoles", "总角色数", totalRoles.ToString()),
            new("overview", "totalPermissions", "总权限数", totalPermissions.ToString()),
        };

        for (var i = 0; i < d; i++)
        {
            var date = startDate.AddDays(i);
            grouped.TryGetValue(date, out var count);
            var dateKey = date.ToString("yyyy-MM-dd");
            rows.Add(new ExportOverviewRow("trend", dateKey, dateKey, count.ToString()));
        }

        return BuildExportResult(rows, selectedFields, fmt, "overview");
    }

    // --- Helpers ---

    internal static IResult InvalidFormatResult() =>
        Results.Json(
            ApiResult.Fail<object>($"不支持的格式，可选值：{string.Join(", ", SupportedFormats)}", 400),
            AppJsonContext.Default.ApiResponseObject,
            statusCode: 400);

    internal static string? NormalizeFormat(string? format)
    {
        var f = (format ?? "csv").Trim().ToLowerInvariant();
        return SupportedFormats.Contains(f) ? f : null;
    }

    internal static HashSet<string> ParseFields(string? fields, HashSet<string> allFields)
    {
        if (string.IsNullOrWhiteSpace(fields))
            return allFields;

        var requested = fields.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(f => f.Trim())
            .Where(f => allFields.Contains(f, StringComparer.OrdinalIgnoreCase))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return requested.Count > 0 ? requested : allFields;
    }

    internal static readonly HashSet<string> ValidAuditFields =
        ["id", "stream", "category", "eventType", "occurredAtUtc", "traceId", "title", "description", "actor"];

    private static List<ExportReportRow> BuildReportRows(string reportType, HashSet<string> selectedFields)
    {
        var includeKpi = ContainsAny(selectedFields, ReportKpiFields);
        var includeChannel = ContainsAny(selectedFields, ReportChannelFields);
        if (!includeKpi && !includeChannel)
        {
            includeKpi = true;
            includeChannel = true;
        }

        var rows = new List<ExportReportRow>();
        if (includeKpi)
        {
            var kpi = ReportDemoData.Kpis[reportType];
            rows.Add(new ExportReportRow(
                "kpi",
                kpi.Visits,
                kpi.Orders,
                kpi.ConversionRate,
                kpi.Revenue,
                "",
                "",
                "",
                "",
                ""));
        }

        if (includeChannel)
        {
            foreach (var channel in ReportDemoData.Channels)
            {
                rows.Add(new ExportReportRow(
                    "channel",
                    "",
                    "",
                    "",
                    "",
                    channel.Channel,
                    channel.Visits,
                    channel.Orders,
                    channel.Rate,
                    channel.Amount));
            }
        }

        return rows;
    }

    private static bool ContainsAny(HashSet<string> selected, HashSet<string> candidates)
    {
        foreach (var field in candidates)
        {
            if (selected.Contains(field))
            {
                return true;
            }
        }

        return false;
    }

    internal static IResult BuildExportResult<T>(
        List<T> rows,
        HashSet<string> selectedFields,
        string format,
        string entityName) where T : class
    {
        var accessors = PropertyAccessorCache<T>.GetAccessors(selectedFields);

        return format switch
        {
            "csv" => BuildCsvResult(rows, accessors, entityName),
            "json" => BuildJsonResult(rows, accessors, entityName),
            "xlsx" => BuildXlsxResult(rows, accessors, entityName),
            _ => Results.BadRequest()
        };
    }

    private static IResult BuildCsvResult<T>(
        List<T> rows,
        PropertyAccessor[] accessors,
        string entityName) where T : class
    {
        var sb = new StringBuilder();

        // Header
        sb.AppendLine(string.Join(",", accessors.Select(a => a.Name)));

        // Rows
        foreach (var row in rows)
        {
            var values = accessors.Select(a =>
            {
                var val = a.GetValue(row)?.ToString() ?? "";
                // Escape CSV fields that contain commas, quotes, or newlines
                if (val.Contains(',') || val.Contains('"') || val.Contains('\n'))
                    return $"\"{val.Replace("\"", "\"\"")}\"";
                return val;
            });
            sb.AppendLine(string.Join(",", values));
        }

        // Add UTF-8 BOM for Excel compatibility
        var bom = Encoding.UTF8.GetPreamble();
        var csvBytes = Encoding.UTF8.GetBytes(sb.ToString());
        var result = new byte[bom.Length + csvBytes.Length];
        bom.CopyTo(result, 0);
        csvBytes.CopyTo(result, bom.Length);

        return Results.File(
            result,
            contentType: "text/csv; charset=utf-8",
            fileDownloadName: $"{entityName}.csv");
    }

    private static IResult BuildJsonResult<T>(
        List<T> rows,
        PropertyAccessor[] accessors,
        string entityName) where T : class
    {
        // Build filtered objects as dictionaries
        var filtered = rows.Select(row =>
        {
            var dict = new Dictionary<string, object?>();
            foreach (var accessor in accessors)
            {
                dict[accessor.CamelCaseName] = accessor.GetValue(row);
            }
            return dict;
        }).ToList();

        var jsonBytes = JsonSerializer.SerializeToUtf8Bytes(filtered, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = true
        });

        return Results.File(
            jsonBytes,
            contentType: "application/json; charset=utf-8",
            fileDownloadName: $"{entityName}.json");
    }

    private static IResult BuildXlsxResult<T>(
        List<T> rows,
        PropertyAccessor[] accessors,
        string entityName) where T : class
    {
        // Build data as list of dictionaries for MiniExcel
        var data = rows.Select(row =>
        {
            var dict = new Dictionary<string, object?>();
            foreach (var accessor in accessors)
            {
                dict[accessor.Name] = accessor.GetValue(row);
            }
            return dict;
        }).ToList();

        using var stream = new MemoryStream();
        stream.SaveAs(data);
        var bytes = stream.ToArray();

        return Results.File(
            bytes,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileDownloadName: $"{entityName}.xlsx");
    }

    private static class ReportDemoData
    {
        internal sealed record KpiValues(string Visits, string Orders, string ConversionRate, string Revenue);

        internal sealed record ChannelValues(string Channel, string Visits, string Orders, string Rate, string Amount);

        internal static readonly Dictionary<string, KpiValues> Kpis = new(StringComparer.OrdinalIgnoreCase)
        {
            ["daily"] = new("18420", "642", "3.5%", "128600 元"),
            ["weekly"] = new("126800", "4380", "3.4%", "892400 元"),
            ["monthly"] = new("542000", "18960", "3.6%", "3846200 元"),
        };

        internal static readonly ChannelValues[] Channels =
        [
            new("自然搜索", "6820", "248", "3.6%", "¥ 48,200"),
            new("付费广告", "5140", "196", "3.8%", "¥ 39,600"),
            new("社交媒体", "3260", "108", "3.3%", "¥ 21,400"),
            new("直接访问", "3200", "90", "2.8%", "¥ 19,400"),
        ];
    }

    // --- Cached compiled property accessors to avoid per-row reflection ---

    private sealed record PropertyAccessor(string Name, string CamelCaseName, Func<object, object?> GetValue);

    private static class PropertyAccessorCache<T> where T : class
    {
        private static readonly ConcurrentDictionary<string, PropertyAccessor> Cache = new(StringComparer.OrdinalIgnoreCase);

        static PropertyAccessorCache()
        {
            foreach (var prop in typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance))
            {
                var param = Expression.Parameter(typeof(object), "obj");
                var cast = Expression.Convert(param, typeof(T));
                var access = Expression.Property(cast, prop);
                var boxed = Expression.Convert(access, typeof(object));
                var lambda = Expression.Lambda<Func<object, object?>>(boxed, param).Compile();

                var camelCase = JsonNamingPolicy.CamelCase.ConvertName(prop.Name);
                Cache[prop.Name] = new PropertyAccessor(prop.Name, camelCase, lambda);
            }
        }

        public static PropertyAccessor[] GetAccessors(HashSet<string> selectedFields)
        {
            return typeof(T).GetProperties(BindingFlags.Public | BindingFlags.Instance)
                .Where(p => selectedFields.Contains(p.Name, StringComparer.OrdinalIgnoreCase))
                .Select(p => Cache[p.Name])
                .ToArray();
        }
    }
}
