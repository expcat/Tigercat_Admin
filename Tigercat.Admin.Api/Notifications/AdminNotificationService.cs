using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Notifications;

public sealed class AdminNotificationService : IAdminNotificationService
{
    private const int MetadataValueMaxLength = 160;
    private const int MetadataJsonMaxLength = 2000;
    private readonly AdminDbContext _db;

    public AdminNotificationService(AdminDbContext db)
    {
        _db = db;
    }

    public async Task HandleEventAsync(EventEnvelope envelope, string streamName, CancellationToken ct = default)
    {
        var notification = BuildNotification(envelope, streamName);
        if (notification is null)
        {
            return;
        }

        var exists = await _db.AdminNotifications
            .AnyAsync(n => n.PublicId == notification.PublicId, ct);
        if (exists)
        {
            return;
        }

        _db.AdminNotifications.Add(notification);
        await _db.SaveChangesAsync(ct);
    }

    private static AdminNotificationEntity? BuildNotification(EventEnvelope envelope, string streamName)
    {
        var data = EventDataSanitizer.SanitizeData(envelope.Data);
        var eventType = envelope.EventType;
        var title = GetString(data, "title") ?? "未命名任务";
        var taskId = GetString(data, "taskId");
        var operatorName = GetString(data, "operator") ?? GetString(data, "username") ?? "系统";

        return eventType switch
        {
            "admin.task.created" => Create(
                envelope,
                "ops",
                "新增运维任务",
                $"{operatorName} 创建了任务 {title}。",
                "info",
                BuildTaskLink(taskId),
                BuildMetadata(streamName, eventType, "task", "low", data)),
            "admin.task.updated" => Create(
                envelope,
                "ops",
                "运维任务已更新",
                $"{operatorName} 更新了任务 {title}。",
                "info",
                BuildTaskLink(taskId),
                BuildMetadata(streamName, eventType, "task", GetBool(data, "blocked") ? "high" : "low", data)),
            "admin.task.moved" => Create(
                envelope,
                "ops",
                "运维任务已流转",
                $"{operatorName} 将任务 {title} 从 {GetString(data, "fromStatus") ?? "-"} 移动到 {GetString(data, "toStatus") ?? "-"}。",
                "info",
                BuildTaskLink(taskId),
                BuildMetadata(streamName, eventType, "task", "medium", data)),
            "admin.task.completed" => Create(
                envelope,
                "ops",
                "运维任务已完成",
                $"{operatorName} 完成了任务 {title}。",
                "success",
                BuildTaskLink(taskId),
                BuildMetadata(streamName, eventType, "task", "low", data)),
            "admin.setting.updated" => Create(
                envelope,
                IsSecuritySetting(data) ? "security" : "ops",
                "系统设置已更新",
                $"{operatorName} 更新了 {GetChangedKeysText(data)}。",
                IsSecuritySetting(data) ? "warning" : "info",
                BuildSettingsLink(GetFirstChangedKey(data)),
                BuildMetadata(streamName, eventType, "settings", IsSecuritySetting(data) ? "medium" : "low", data)),
            "admin.media.delete.failed" => Create(
                envelope,
                "ops",
                "媒体删除失败",
                $"{operatorName} 删除媒体资源失败：{GetString(data, "reason") ?? "存在引用或存储异常"}。",
                "error",
                "/files",
                BuildMetadata(streamName, eventType, "media", "high", data)),
            "admin.audit.retention.cleaned" => Create(
                envelope,
                "ops",
                "审计日志清理完成",
                $"{operatorName} 清理了 {GetString(data, "deletedCount") ?? "0"} 条过期审计日志。",
                "success",
                BuildAuditLogLink(envelope.EventId),
                BuildMetadata(streamName, eventType, "audit", "low", data)),
            var userEvent when userEvent.StartsWith("admin.user.", StringComparison.OrdinalIgnoreCase) => Create(
                envelope,
                "security",
                "用户治理事件",
                $"{operatorName} 执行了用户治理操作：{userEvent}。",
                "warning",
                "/users",
                BuildMetadata(streamName, eventType, "user", "medium", data)),
            _ => null,
        };
    }

    private static AdminNotificationEntity Create(
        EventEnvelope envelope,
        string groupKey,
        string title,
        string description,
        string toastType,
        string? linkUrl,
        Dictionary<string, string> metadata)
    {
        return new AdminNotificationEntity
        {
            PublicId = $"notif-{envelope.EventId}",
            GroupKey = groupKey,
            Title = title,
            Description = description,
            ToastType = toastType,
            LinkUrl = linkUrl,
            MetadataJson = SerializeMetadata(metadata),
            CreatedAt = envelope.OccurredAtUtc
        };
    }

    private static Dictionary<string, string> BuildMetadata(
        string streamName,
        string eventType,
        string source,
        string severity,
        IReadOnlyDictionary<string, object?> data)
    {
        var metadata = new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["stream"] = streamName,
            ["eventType"] = eventType,
            ["source"] = source,
            ["severity"] = severity,
        };

        foreach (var (key, value) in data)
        {
            if (EventDataSanitizer.IsSensitiveKey(key) || metadata.ContainsKey(key))
            {
                continue;
            }

            var formatted = FormatValue(value);
            if (!string.IsNullOrWhiteSpace(formatted))
            {
                metadata[key] = Trim(formatted, MetadataValueMaxLength);
            }
        }

        return metadata;
    }

    private static string SerializeMetadata(Dictionary<string, string> metadata)
    {
        while (metadata.Count > 4)
        {
            var json = JsonSerializer.Serialize(metadata);
            if (json.Length <= MetadataJsonMaxLength)
            {
                return json;
            }

            metadata.Remove(metadata.Keys.Last());
        }

        return JsonSerializer.Serialize(metadata);
    }

    private static string? BuildTaskLink(string? taskId)
    {
        return string.IsNullOrWhiteSpace(taskId)
            ? "/tasks"
            : $"/tasks?taskId={Uri.EscapeDataString(taskId)}";
    }

    private static string? BuildSettingsLink(string? key)
    {
        return string.IsNullOrWhiteSpace(key)
            ? "/settings"
            : $"/settings?key={Uri.EscapeDataString(key)}";
    }

    private static string BuildAuditLogLink(string eventId)
    {
        return $"/audit-logs?eventId={Uri.EscapeDataString(eventId)}";
    }

    private static bool IsSecuritySetting(IReadOnlyDictionary<string, object?> data)
    {
        return GetChangedKeys(data).Any(key => key.StartsWith("auth.", StringComparison.OrdinalIgnoreCase));
    }

    private static string GetChangedKeysText(IReadOnlyDictionary<string, object?> data)
    {
        var keys = GetChangedKeys(data).ToArray();
        return keys.Length == 0 ? "系统设置" : string.Join(", ", keys);
    }

    private static string? GetFirstChangedKey(IReadOnlyDictionary<string, object?> data)
    {
        return GetChangedKeys(data).FirstOrDefault();
    }

    private static IEnumerable<string> GetChangedKeys(IReadOnlyDictionary<string, object?> data)
    {
        var changedKeys = data.GetValueOrDefault("changedKeys");
        if (changedKeys is null)
        {
            yield break;
        }

        if (changedKeys is IEnumerable<object?> values)
        {
            foreach (var value in values)
            {
                var key = value?.ToString();
                if (!string.IsNullOrWhiteSpace(key))
                {
                    yield return key;
                }
            }

            yield break;
        }

        var single = changedKeys.ToString();
        if (!string.IsNullOrWhiteSpace(single))
        {
            foreach (var key in single.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            {
                yield return key;
            }
        }
    }

    private static string? GetString(IReadOnlyDictionary<string, object?> data, string key)
    {
        return data.TryGetValue(key, out var value) ? FormatValue(value) : null;
    }

    private static bool GetBool(IReadOnlyDictionary<string, object?> data, string key)
    {
        return data.TryGetValue(key, out var value) && value switch
        {
            bool boolValue => boolValue,
            string stringValue => bool.TryParse(stringValue, out var parsed) && parsed,
            _ => bool.TryParse(value?.ToString(), out var parsed) && parsed,
        };
    }

    private static string? FormatValue(object? value)
    {
        return value switch
        {
            null => null,
            string stringValue => stringValue,
            DateTime dateTime => dateTime.ToString("O"),
            DateTimeOffset dateTimeOffset => dateTimeOffset.ToString("O"),
            System.Collections.IEnumerable enumerable and not string => JsonSerializer.Serialize(enumerable),
            _ => value.ToString(),
        };
    }

    private static string Trim(string value, int maxLength)
    {
        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
