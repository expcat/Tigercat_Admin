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

    private static readonly string[] SupportedFormats = ["csv", "json", "xlsx"];

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
            return Results.Json(
                ApiResult.Fail<object>($"不支持的格式，可选值：{string.Join(", ", SupportedFormats)}", 400),
                AppJsonContext.Default.ApiResponseObject,
                statusCode: 400);
        }

        var selectedFields = ParseFields(fields, ValidUserFields);

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
            return Results.Json(
                ApiResult.Fail<object>($"不支持的格式，可选值：{string.Join(", ", SupportedFormats)}", 400),
                AppJsonContext.Default.ApiResponseObject,
                statusCode: 400);
        }

        var selectedFields = ParseFields(fields, ValidRoleFields);

        IQueryable<RoleEntity> query = db.Roles;

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

    // --- Helpers ---

    private static string? NormalizeFormat(string? format)
    {
        var f = (format ?? "csv").Trim().ToLowerInvariant();
        return SupportedFormats.Contains(f) ? f : null;
    }

    private static HashSet<string> ParseFields(string? fields, HashSet<string> allFields)
    {
        if (string.IsNullOrWhiteSpace(fields))
            return allFields;

        var requested = fields.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(f => f.Trim())
            .Where(f => allFields.Contains(f, StringComparer.OrdinalIgnoreCase))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        return requested.Count > 0 ? requested : allFields;
    }

    private static IResult BuildExportResult<T>(
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
