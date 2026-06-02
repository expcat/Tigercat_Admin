using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class NotificationsEndpoints : IEndpointDefinition
{
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 100;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/notifications")
            .WithTags("Notifications");

        group.MapGet("", GetNotifications)
            .RequirePermission("notification:view")
            .WithName("GetNotifications");

        group.MapPut("/{id}/read", UpdateReadState)
            .RequirePermission("notification:edit")
            .WithName("UpdateNotificationReadState");

        group.MapPost("/mark-read", MarkRead)
            .RequirePermission("notification:edit")
            .WithName("MarkNotificationsRead");
    }

    private static async Task<IResult> GetNotifications(
        int? page,
        int? pageSize,
        string? groupKey,
        bool? unread,
        AdminDbContext db,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize);

        IQueryable<AdminNotificationEntity> query = db.AdminNotifications;

        if (!string.IsNullOrWhiteSpace(groupKey))
        {
            var group = groupKey.Trim().ToLowerInvariant();
            query = query.Where(n => n.GroupKey == group);
        }

        if (unread.HasValue)
        {
            query = query.Where(n => n.Read != unread.Value);
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(n => n.Read)
            .ThenByDescending(n => n.CreatedAt)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(n => ToResponse(n))
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(new PagedResponse<NotificationItemResponse>(items, total, p, ps)),
            AppJsonContext.Default.ApiResponsePagedResponseNotificationItemResponse);
    }

    private static async Task<IResult> UpdateReadState(
        string id,
        UpdateNotificationReadRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var notification = await db.AdminNotifications.FirstOrDefaultAsync(n => n.PublicId == id, ct);

        if (notification is null)
        {
            return Results.Json(
                ApiResult.Fail<NotificationItemResponse>("通知不存在", 404),
                AppJsonContext.Default.ApiResponseNotificationItemResponse,
                statusCode: 404);
        }

        SetReadState(notification, request.Read);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(notification)),
            AppJsonContext.Default.ApiResponseNotificationItemResponse);
    }

    private static async Task<IResult> MarkRead(
        MarkNotificationsReadRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        IQueryable<AdminNotificationEntity> query = db.AdminNotifications.Where(n => !n.Read);

        if (!string.IsNullOrWhiteSpace(request.GroupKey))
        {
            var group = request.GroupKey.Trim().ToLowerInvariant();
            query = query.Where(n => n.GroupKey == group);
        }

        var notifications = await query.ToListAsync(ct);

        foreach (var notification in notifications)
        {
            SetReadState(notification, true);
        }

        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse($"已标记 {notifications.Count} 条通知为已读")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    private static void SetReadState(AdminNotificationEntity notification, bool read)
    {
        notification.Read = read;
        notification.ReadAt = read ? DateTime.UtcNow : null;
        notification.UpdatedAt = DateTime.UtcNow;
    }

    private static NotificationItemResponse ToResponse(AdminNotificationEntity notification)
    {
        return new NotificationItemResponse(
            notification.PublicId,
            notification.GroupKey,
            notification.Title,
            notification.Description,
            notification.CreatedAt.ToString("O"),
            notification.Read,
            notification.ToastType,
            ParseMetadata(notification.MetadataJson),
            notification.LinkUrl,
            notification.CreatedAt,
            notification.ReadAt,
            notification.UpdatedAt);
    }

    private static Dictionary<string, string> ParseMetadata(string metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, string>>(metadataJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }
}
