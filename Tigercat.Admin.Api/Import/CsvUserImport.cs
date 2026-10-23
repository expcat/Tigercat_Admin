using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Import;

// Only password hashes enter durable job state. Public responses explicitly project safe fields.
public sealed class ImportUserRow
{
    public int RowNumber { get; set; }
    public string Username { get; set; } = "";
    public string? DisplayName { get; set; }
    public string RoleIds { get; set; } = "";
    public int[] Roles { get; set; } = [];
    public string? PasswordHash { get; set; }
    public string Status { get; set; } = "pending";
    public string Message { get; set; } = "";
    public int? UserId { get; set; }

    public ImportRowResponse ToResponse() => new(RowNumber, Username, DisplayName, RoleIds, Status, Message, UserId);
}

internal static class CsvUserImport
{
    internal const int MaxBytes = 1_048_576;
    internal const int MaxRows = 1000;

    internal static List<ImportUserRow> ReadRows(string json) =>
        JsonSerializer.Deserialize(json, AppJsonContext.Default.ListImportUserRow) ?? [];
    internal static string WriteRows(List<ImportUserRow> rows) =>
        JsonSerializer.Serialize(rows, AppJsonContext.Default.ListImportUserRow);

    internal static async Task<(ImportPreviewResponse Preview, List<ImportUserRow> Rows)> PrepareAsync(
        CreateImportJobRequest request, AdminDbContext db, bool hashPasswords, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Source) || request.Source.Length > 500 ||
            !request.Source.EndsWith(".csv", StringComparison.OrdinalIgnoreCase))
            throw new FormatException("请选择 UTF-8 CSV 文件（文件名最多 500 字符）");
        if ((request.Mode ?? "append") != "append" || (request.Conflict ?? "skip") != "skip")
            throw new FormatException("用户导入仅支持追加和重复用户名跳过");
        if (string.IsNullOrEmpty(request.Csv) || Encoding.UTF8.GetByteCount(request.Csv) > MaxBytes)
            throw new FormatException("CSV 不能为空且不能超过 1 MiB");
        var records = Parse(request.Csv);
        if (records.Count < 2) throw new FormatException("CSV 需包含表头和至少一行数据");
        if (records.Count - 1 > MaxRows) throw new FormatException("每次最多导入 1000 行");
        var headers = records[0].Cells.Select(value => value.Trim()).ToArray();
        if (headers.Length > 50 || headers.Any(string.IsNullOrEmpty) || headers.Distinct(StringComparer.OrdinalIgnoreCase).Count() != headers.Length)
            throw new FormatException("表头不能为空或重复，最多 50 列");
        int? Find(params string[] aliases)
        {
            var index = Array.FindIndex(headers, header => aliases.Contains(header, StringComparer.OrdinalIgnoreCase));
            return index < 0 ? null : index;
        }
        var mappings = request.Mappings ?? new ImportMappings(Find("username", "用户名"), Find("password", "密码"),
            Find("displayName", "显示名称"), Find("roleIds", "角色ID"));
        var indexes = new[] { mappings.Username, mappings.Password, mappings.DisplayName, mappings.RoleIds }.Where(i => i.HasValue).Select(i => i!.Value).ToArray();
        if (indexes.Any(i => i < 0 || i >= headers.Length) || indexes.Distinct().Count() != indexes.Length)
            throw new FormatException("映射列无效或重复");
        if (hashPasswords && (!mappings.Username.HasValue || !mappings.Password.HasValue))
            throw new FormatException("请映射用户名和密码必填列");
        var policy = await AuthPolicySettings.LoadAsync(db, ct);
        var validRoles = (await db.Roles.AsNoTracking().Select(role => role.Id).ToArrayAsync(ct)).ToHashSet();
        var seen = (await db.Users.AsNoTracking().Select(user => user.Username).ToArrayAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var rows = new List<ImportUserRow>();
        foreach (var record in records.Skip(1))
        {
            string Value(int? index) => index.HasValue && index.Value < record.Cells.Length ? record.Cells[index.Value] : "";
            var password = Value(mappings.Password);
            var roleText = Value(mappings.RoleIds).Trim();
            var row = new ImportUserRow { RowNumber = record.Line, Username = Value(mappings.Username).Trim().ToLowerInvariant(),
                DisplayName = mappings.DisplayName.HasValue ? Value(mappings.DisplayName) : null, RoleIds = roleText };
            var error = record.Cells.Length != headers.Length ? "列数与表头不一致" :
                !mappings.Username.HasValue || !mappings.Password.HasValue ? "请映射用户名和密码必填列" :
                UsersEndpoints.ValidateNewUser(new CreateUserRequest(row.Username, password, row.DisplayName, null), policy);
            if (error is null && roleText.Length > 0)
            {
                var parts = roleText.Split(';');
                var roles = parts.Select(part => int.TryParse(part.Trim(), out var id) ? id : 0).ToArray();
                if (roles.Any(id => id <= 0 || !validRoles.Contains(id)) || roles.Distinct().Count() != roles.Length)
                    error = "角色 ID 无效或重复；多个角色用分号分隔";
                else row.Roles = roles;
            }
            row.Message = error ?? (seen.Add(row.Username) ? "校验通过" : "用户名已存在，跳过");
            row.Status = error is not null ? "failed" : row.Message == "校验通过" ? "ready" : "skipped";
            if (hashPasswords && row.Status == "ready") row.PasswordHash = PasswordHasher.Hash(password);
            rows.Add(row);
        }
        var preview = new ImportPreviewResponse(headers, mappings, rows.Count, rows.Count(row => row.Status == "ready"),
            rows.Count(row => row.Status == "skipped"), rows.Count(row => row.Status == "failed"),
            $"密码至少 {policy.PasswordMinLength} 位" + (policy.RequireComplexPassword ? "，且同时包含字母和数字" : ""),
            rows.Select(row => row.ToResponse()).ToArray());
        return (preview, rows);
    }

    private sealed record CsvRecord(int Line, string[] Cells);
    private static List<CsvRecord> Parse(string text)
    {
        var records = new List<CsvRecord>();
        var cells = new List<string>();
        var value = new StringBuilder();
        var quoted = false;
        var closedQuote = false;
        var line = 1;
        var startLine = 1;
        void EndRecord()
        {
            cells.Add(value.ToString()); value.Clear();
            if (cells.Count != 1 || cells[0].Length != 0) records.Add(new CsvRecord(startLine, cells.ToArray()));
            cells.Clear(); closedQuote = false;
        }
        for (var i = text[0] == '\uFEFF' ? 1 : 0; i < text.Length; i++)
        {
            var c = text[i];
            if (quoted)
            {
                if (c == '"')
                {
                    if (i + 1 < text.Length && text[i + 1] == '"') { value.Append('"'); i++; }
                    else { quoted = false; closedQuote = true; }
                }
                else
                {
                    value.Append(c);
                    if (c == '\n' || c == '\r' && (i + 1 == text.Length || text[i + 1] != '\n')) line++;
                }
                continue;
            }
            if (c == ',') { cells.Add(value.ToString()); value.Clear(); closedQuote = false; }
            else if (c is '\r' or '\n')
            {
                EndRecord();
                if (c == '\r' && i + 1 < text.Length && text[i + 1] == '\n') i++;
                line++; startLine = line;
            }
            else if (c == '"' && value.Length == 0 && !closedQuote) quoted = true;
            else if (c == '"' || closedQuote) throw new FormatException($"第 {startLine} 行 CSV 引号格式无效");
            else value.Append(c);
        }
        if (quoted) throw new FormatException($"第 {startLine} 行 CSV 引号未闭合");
        if (value.Length > 0 || cells.Count > 0 || closedQuote) EndRecord();
        return records;
    }
}
