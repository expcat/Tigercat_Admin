namespace Tigercat.Admin.Api.Endpoints;

public record NotificationItemResponse(
    string Id,
    string GroupKey,
    string Title,
    string Description,
    string Time,
    bool Read,
    string ToastType,
    Dictionary<string, string> Meta,
    string? LinkUrl,
    DateTime CreatedAt,
    DateTime? ReadAt,
    DateTime? UpdatedAt);

public record UpdateNotificationReadRequest(bool Read);

public record MarkNotificationsReadRequest(string? GroupKey);
