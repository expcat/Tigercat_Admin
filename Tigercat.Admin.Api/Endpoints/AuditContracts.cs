namespace Tigercat.Admin.Api.Endpoints;

public record AuditLogItemResponse(
    string Id,
    string Stream,
    string Category,
    string EventType,
    DateTime OccurredAtUtc,
    string? TraceId,
    string Title,
    string Description,
    string? Actor,
    Dictionary<string, string?> Data);