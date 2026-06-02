using System.Text.Json;
using FreeRedis;
using StackExchange.Redis;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class AuditEndpoints : IEndpointDefinition
{
    private static readonly string[] AuditStreams = [EventBusConstants.AuthStream, EventBusConstants.AdminStream];
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();
    private const int DefaultLimit = 30;
    private const int MaxLimit = 100;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/audit-logs")
            .WithTags("Audit");

        group.MapGet("", GetAuditLogs)
            .RequireLogin()
            .WithName("GetAuditLogs");
    }

    private static Task<IResult> GetAuditLogs(
        int? limit,
        IRedisClient redis,
        CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        var take = Math.Clamp(limit ?? DefaultLimit, 1, MaxLimit);

        try
        {
            var items = LoadAuditLogs(redis, take, ct);
            return Task.FromResult<IResult>(Results.Json(
                ApiResult.Ok(items),
                AppJsonContext.Default.ApiResponseAuditLogItemResponseArray));
        }
        catch (Exception ex) when (ex is RedisConnectionException or RedisTimeoutException or FreeRedis.RedisServerException)
        {
            return Task.FromResult<IResult>(Results.Json(
                ApiResult.Fail<AuditLogItemResponse[]>("审计日志暂时不可用，请检查 Redis 连接状态", 503),
                AppJsonContext.Default.ApiResponseAuditLogItemResponseArray,
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

        return "system";
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