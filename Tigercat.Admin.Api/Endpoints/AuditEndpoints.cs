using System.Globalization;
using System.Text;
using System.Text.Json;
using FreeRedis;
using Microsoft.EntityFrameworkCore;
using StackExchange.Redis;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class AuditEndpoints : IEndpointDefinition
{
    private static readonly string[] AuditStreams = [EventBusConstants.AuthStream, EventBusConstants.AdminStream];
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();
    private const int DefaultPageSize = 30;
    private const int MaxPageSize = 100;
    private const int MaxSearchWindow = 1000;
    private const string RetentionSettingKey = "ops.auditRetentionDays";

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/audit-logs")
            .WithTags("Audit");

        group.MapGet("", GetAuditLogs)
            .RequirePermission("audit:view")
            .WithName("GetAuditLogs");

        group.MapGet("/{id}", GetAuditLog)
            .RequirePermission("audit:view")
            .WithName("GetAuditLog");

        group.MapGet("/export", ExportAuditLogs)
            .RequirePermission("audit:export")
            .WithName("ExportAuditLogs");

        group.MapGet("/retention-policy", GetRetentionPolicy)
            .RequirePermission("audit:view")
            .WithName("GetAuditRetentionPolicy");

        group.MapPut("/retention-policy", UpdateRetentionPolicy)
            .RequirePermission("setting:edit")
            .WithName("UpdateAuditRetentionPolicy");
    }

    private static Task<IResult> GetAuditLogs(
        int? page,
        int? pageSize,
        string? category,
        string? eventType,
        string? actor,
        string? keyword,
        DateTime? from,
        DateTime? to,
        IServiceProvider services,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize);
        var searchWindow = Math.Clamp(p * ps + ps, ps, MaxSearchWindow);

        var result = TryLoadAuditLogs(services, searchWindow, ct);
        if (result.Error is not null)
        {
            return Task.FromResult(result.Error);
        }

        var filtered = ApplyFilters(result.Items, category, eventType, actor, keyword, from, to).ToArray();
        var items = filtered
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToArray();

        return Task.FromResult<IResult>(Results.Json(
            ApiResult.Ok(new PagedResponse<AuditLogItemResponse>(items, filtered.Length, p, ps)),
            AppJsonContext.Default.ApiResponsePagedResponseAuditLogItemResponse));
    }

    private static Task<IResult> GetAuditLog(string id, IServiceProvider services, CancellationToken ct)
    {
        var result = TryLoadAuditLogs(services, MaxSearchWindow, ct);
        if (result.Error is not null)
        {
            return Task.FromResult(result.Error);
        }

        var item = result.Items.FirstOrDefault(item => item.Id == id);
        if (item is null)
        {
            return Task.FromResult<IResult>(Results.Json(
                ApiResult.Fail<AuditLogItemResponse>("审计日志不存在", 404),
                AppJsonContext.Default.ApiResponseAuditLogItemResponse,
                statusCode: 404));
        }

        return Task.FromResult<IResult>(Results.Json(
            ApiResult.Ok(item),
            AppJsonContext.Default.ApiResponseAuditLogItemResponse));
    }

    private static Task<IResult> ExportAuditLogs(
        string? category,
        string? eventType,
        string? actor,
        string? keyword,
        DateTime? from,
        DateTime? to,
        IServiceProvider services,
        CancellationToken ct)
    {
        var result = TryLoadAuditLogs(services, MaxSearchWindow, ct);
        if (result.Error is not null)
        {
            return Task.FromResult(result.Error);
        }

        var items = ApplyFilters(result.Items, category, eventType, actor, keyword, from, to)
            .Take(MaxSearchWindow)
            .ToArray();
        var csv = BuildCsv(items);
        var bytes = Encoding.UTF8.GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(csv))
            .ToArray();

        return Task.FromResult<IResult>(Results.File(
            bytes,
            "text/csv; charset=utf-8",
            $"audit-logs-{DateTime.UtcNow:yyyyMMddHHmmss}.csv"));
    }

    private static async Task<IResult> GetRetentionPolicy(AdminDbContext db, CancellationToken ct)
    {
        var retentionDays = await GetRetentionDaysAsync(db, ct);
        return Results.Json(
            ApiResult.Ok(new AuditRetentionPolicyResponse(retentionDays, DateTime.UtcNow)),
            AppJsonContext.Default.ApiResponseAuditRetentionPolicyResponse);
    }

    private static async Task<IResult> UpdateRetentionPolicy(
        UpdateAuditRetentionPolicyRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        if (request.RetentionDays is < 1 or > 3650)
        {
            return Results.Json(
                ApiResult.Fail<AuditRetentionPolicyResponse>("审计日志保留天数需在 1-3650 之间", 400),
                AppJsonContext.Default.ApiResponseAuditRetentionPolicyResponse,
                statusCode: 400);
        }

        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == RetentionSettingKey, ct);
        if (setting is null)
        {
            setting = new SystemSettingEntity
            {
                Key = RetentionSettingKey,
                Value = request.RetentionDays.ToString(CultureInfo.InvariantCulture),
                Description = "审计日志保留天数",
                CreatedAt = DateTime.UtcNow
            };
            db.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = request.RetentionDays.ToString(CultureInfo.InvariantCulture);
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(new AuditRetentionPolicyResponse(request.RetentionDays, DateTime.UtcNow)),
            AppJsonContext.Default.ApiResponseAuditRetentionPolicyResponse);
    }

    private static (AuditLogItemResponse[] Items, IResult? Error) TryLoadAuditLogs(
        IServiceProvider services,
        int take,
        CancellationToken ct)
    {
        try
        {
            var redis = services.GetService<IRedisClient>();
            if (redis is null)
            {
                return ([], Results.Json(
                    ApiResult.Fail<PagedResponse<AuditLogItemResponse>>("审计日志暂时不可用，请检查 Redis 连接状态", 503),
                    AppJsonContext.Default.ApiResponsePagedResponseAuditLogItemResponse,
                    statusCode: 503));
            }

            return (LoadAuditLogs(redis, take, ct), null);
        }
        catch (Exception ex) when (ex is RedisConnectionException or RedisTimeoutException or FreeRedis.RedisServerException or NotSupportedException)
        {
            return ([], Results.Json(
                ApiResult.Fail<PagedResponse<AuditLogItemResponse>>("审计日志暂时不可用，请检查 Redis 连接状态", 503),
                AppJsonContext.Default.ApiResponsePagedResponseAuditLogItemResponse,
                statusCode: 503));
        }
    }

    private static AuditLogItemResponse[] LoadAuditLogs(
        IRedisClient redis,
        int take,
        CancellationToken ct)
    {
        var items = new List<AuditLogItemResponse>();

        foreach (var stream in AuditStreams)
        {
            ct.ThrowIfCancellationRequested();

            var entries = redis.XRevRange(stream, "+", "-", take);
            if (entries is null || entries.Length == 0)
            {
                continue;
            }

            foreach (var entry in entries)
            {
                ct.ThrowIfCancellationRequested();

                var envelope = TryReadEnvelope(entry);
                if (envelope is null)
                {
                    continue;
                }

                items.Add(ToAuditLogItem(envelope, stream));
            }
        }

        return [.. items
            .OrderByDescending(item => item.OccurredAtUtc)
            .Take(take)];
    }

    private static IEnumerable<AuditLogItemResponse> ApplyFilters(
        IEnumerable<AuditLogItemResponse> items,
        string? category,
        string? eventType,
        string? actor,
        string? keyword,
        DateTime? from,
        DateTime? to)
    {
        var query = items;

        if (!string.IsNullOrWhiteSpace(category))
        {
            var value = category.Trim();
            query = query.Where(item => string.Equals(item.Category, value, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(eventType))
        {
            var value = eventType.Trim();
            query = query.Where(item => string.Equals(item.EventType, value, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(actor))
        {
            var value = actor.Trim();
            query = query.Where(item => item.Actor?.Contains(value, StringComparison.OrdinalIgnoreCase) == true);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var value = keyword.Trim();
            query = query.Where(item =>
                item.Title.Contains(value, StringComparison.OrdinalIgnoreCase) ||
                item.Description.Contains(value, StringComparison.OrdinalIgnoreCase) ||
                item.EventType.Contains(value, StringComparison.OrdinalIgnoreCase));
        }

        if (from.HasValue)
        {
            var value = from.Value.ToUniversalTime();
            query = query.Where(item => item.OccurredAtUtc >= value);
        }

        if (to.HasValue)
        {
            var value = to.Value.ToUniversalTime();
            query = query.Where(item => item.OccurredAtUtc <= value);
        }

        return query;
    }

    private static EventEnvelope? TryReadEnvelope(StreamsEntry entry)
    {
        var payload = GetField(entry, "payload");
        if (string.IsNullOrWhiteSpace(payload))
        {
            return null;
        }

        return JsonSerializer.Deserialize<EventEnvelope>(payload, SerializerOptions);
    }

    private static AuditLogItemResponse ToAuditLogItem(EventEnvelope envelope, string stream)
    {
        var data = envelope.Data.ToDictionary(static pair => pair.Key, static pair => FormatDataValue(pair.Value));
        var actor = data.GetValueOrDefault("operator") ?? data.GetValueOrDefault("username");
        var category = GetCategory(envelope.EventType);
        var (title, description) = BuildContent(envelope.EventType, data);

        return new AuditLogItemResponse(
            envelope.EventId,
            stream,
            category,
            envelope.EventType,
            envelope.OccurredAtUtc,
            envelope.TraceId,
            title,
            description,
            actor,
            data);
    }

    private static (string Title, string Description) BuildContent(
        string eventType,
        IReadOnlyDictionary<string, string?> data)
    {
        var username = data.GetValueOrDefault("username") ?? "未知用户";
        var targetUsername = data.GetValueOrDefault("targetUsername") ?? username;
        var operatorName = data.GetValueOrDefault("operator") ?? "系统";

        return eventType switch
        {
            "auth.user.registered" => ("用户注册", $"{username} 完成了后台账号注册。"),
            "auth.user.login" => ("用户登录", $"{username} 登录后台。"),
            "auth.user.password.changed" => ("修改密码", $"{username} 修改了自己的登录密码。"),
            "auth.user.logout" => ("用户退出", $"{username} 已退出当前登录会话。"),
            "admin.user.created" => ("创建用户", $"{operatorName} 创建了用户 {targetUsername}。"),
            "admin.user.updated" => ("更新用户", $"{operatorName} 更新了用户 {targetUsername} 的资料或角色配置。"),
            "admin.user.deleted" => ("删除用户", $"{operatorName} 删除了用户 {targetUsername}。"),
            "admin.user.batch.deleted" => (
                "批量删除用户",
                $"{operatorName} 批量删除了 {data.GetValueOrDefault("deletedCount") ?? "0"} 个用户。"),
            "admin.user.password.reset" => ("重置用户密码", $"{operatorName} 重置了用户 {targetUsername} 的登录密码。"),
            "admin.task.created" => ("创建运维任务", $"{operatorName} 创建了任务 {data.GetValueOrDefault("title") ?? "未命名任务"}。"),
            "admin.task.updated" => ("更新运维任务", $"{operatorName} 更新了任务 {data.GetValueOrDefault("title") ?? "未命名任务"}。"),
            "admin.task.moved" => ("流转运维任务", $"{operatorName} 将任务 {data.GetValueOrDefault("title") ?? "未命名任务"} 从 {data.GetValueOrDefault("fromStatus") ?? "-"} 移动到 {data.GetValueOrDefault("toStatus") ?? "-"}。"),
            _ => (eventType, BuildFallbackDescription(data)),
        };
    }

    private static string BuildFallbackDescription(IReadOnlyDictionary<string, string?> data)
    {
        var parts = data
            .Where(pair => !string.IsNullOrWhiteSpace(pair.Value))
            .Select(pair => $"{pair.Key}: {pair.Value}")
            .ToArray();

        return parts.Length == 0 ? "暂无附加上下文。" : string.Join("；", parts);
    }

    private static string GetCategory(string eventType)
    {
        if (eventType.StartsWith("auth.", StringComparison.OrdinalIgnoreCase))
        {
            return "auth";
        }

        if (eventType.StartsWith("admin.user.", StringComparison.OrdinalIgnoreCase))
        {
            return "user";
        }

        if (eventType.StartsWith("admin.task.", StringComparison.OrdinalIgnoreCase))
        {
            return "task";
        }

        return "system";
    }

    private static string BuildCsv(IEnumerable<AuditLogItemResponse> items)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Id,Stream,Category,EventType,OccurredAtUtc,TraceId,Title,Description,Actor");

        foreach (var item in items)
        {
            builder.AppendCsv(item.Id);
            builder.AppendCsv(item.Stream);
            builder.AppendCsv(item.Category);
            builder.AppendCsv(item.EventType);
            builder.AppendCsv(item.OccurredAtUtc.ToString("O"));
            builder.AppendCsv(item.TraceId);
            builder.AppendCsv(item.Title);
            builder.AppendCsv(item.Description);
            builder.AppendCsv(item.Actor, endOfLine: true);
        }

        return builder.ToString();
    }

    private static async Task<int> GetRetentionDaysAsync(AdminDbContext db, CancellationToken ct)
    {
        var value = await db.SystemSettings
            .Where(s => s.Key == RetentionSettingKey)
            .Select(s => s.Value)
            .FirstOrDefaultAsync(ct);

        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var days)
            ? days
            : 90;
    }

    private static string? FormatDataValue(object? value)
    {
        return value switch
        {
            null => null,
            JsonElement element => element.ToString(),
            DateTime dateTime => dateTime.ToString("O"),
            DateTimeOffset dateTimeOffset => dateTimeOffset.ToString("O"),
            _ => value.ToString(),
        };
    }

    private static string? GetField(StreamsEntry entry, string fieldName)
    {
        var values = entry.fieldValues;
        if (values is null)
        {
            return null;
        }

        for (var i = 0; i + 1 < values.Length; i += 2)
        {
            if (string.Equals(values[i]?.ToString(), fieldName, StringComparison.OrdinalIgnoreCase))
            {
                return values[i + 1]?.ToString();
            }
        }

        return null;
    }

    private static JsonSerializerOptions CreateSerializerOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.TypeInfoResolverChain.Insert(0, AppJsonContext.Default);
        return options;
    }
}

internal static class AuditCsvExtensions
{
    public static void AppendCsv(this StringBuilder builder, string? value, bool endOfLine = false)
    {
        builder.Append('"');
        builder.Append((value ?? string.Empty).Replace("\"", "\"\"", StringComparison.Ordinal));
        builder.Append('"');
        builder.Append(endOfLine ? Environment.NewLine : ',');
    }
}
