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

        var users = await db.Users
            .Include(u => u.UserRoles)
            .ThenInclude(ur => ur.Role)
            .OrderBy(u => u.Id)
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

        return BuildExportResult(rows, selectedFields, ValidUserFields, fmt, "users");
    }

    // GET /api/export/roles?format=csv|json|xlsx&fields=id,name,...
    private static async Task<IResult> ExportRoles(
        string? format,
        string? fields,
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

        var roles = await db.Roles
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .Include(r => r.UserRoles)
            .OrderBy(r => r.Id)
            .ToListAsync(ct);

        var rows = roles.Select(r => new ExportRoleRow(
            r.Id,
            r.Name,
            r.Description,
            r.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
            string.Join("; ", r.RolePermissions.Select(rp => rp.Permission.Code)),
            r.UserRoles.Count
        )).ToList();

        return BuildExportResult(rows, selectedFields, ValidRoleFields, fmt, "roles");
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
        HashSet<string> allFields,
        string format,
        string entityName) where T : class
    {
        var properties = typeof(T).GetProperties()
            .Where(p => selectedFields.Contains(p.Name, StringComparer.OrdinalIgnoreCase))
            .ToArray();

        return format switch
        {
            "csv" => BuildCsvResult(rows, properties, entityName),
            "json" => BuildJsonResult(rows, properties, entityName),
            "xlsx" => BuildXlsxResult(rows, properties, entityName),
            _ => Results.BadRequest()
        };
    }

    private static IResult BuildCsvResult<T>(
        List<T> rows,
        System.Reflection.PropertyInfo[] properties,
        string entityName) where T : class
    {
        var sb = new StringBuilder();

        // Header
        sb.AppendLine(string.Join(",", properties.Select(p => p.Name)));

        // Rows
        foreach (var row in rows)
        {
            var values = properties.Select(p =>
            {
                var val = p.GetValue(row)?.ToString() ?? "";
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
        System.Reflection.PropertyInfo[] properties,
        string entityName) where T : class
    {
        // Build filtered objects as dictionaries
        var filtered = rows.Select(row =>
        {
            var dict = new Dictionary<string, object?>();
            foreach (var prop in properties)
            {
                // Use camelCase key names
                var key = char.ToLowerInvariant(prop.Name[0]) + prop.Name[1..];
                dict[key] = prop.GetValue(row);
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
        System.Reflection.PropertyInfo[] properties,
        string entityName) where T : class
    {
        // Build data as list of dictionaries for MiniExcel
        var data = rows.Select(row =>
        {
            var dict = new Dictionary<string, object?>();
            foreach (var prop in properties)
            {
                dict[prop.Name] = prop.GetValue(row);
            }
            return dict;
        }).ToList();

        var stream = new MemoryStream();
        stream.SaveAs(data);
        stream.Position = 0;

        return Results.File(
            stream,
            contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileDownloadName: $"{entityName}.xlsx");
    }
}
