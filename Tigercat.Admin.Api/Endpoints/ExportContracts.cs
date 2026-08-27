namespace Tigercat.Admin.Api.Endpoints;

// --- Export Response DTOs ---

public record ExportUserRow(
    int Id,
    string Username,
    string? DisplayName,
    string Status,
    string CreatedAt,
    string? UpdatedAt,
    string Roles);

public record ExportRoleRow(
    int Id,
    string Name,
    string? Description,
    string CreatedAt,
    string Permissions,
    int UserCount);

public record ExportReportRow(
    string Section,
    string Visits,
    string Orders,
    string ConversionRate,
    string Revenue,
    string Channel,
    string ChannelVisits,
    string ChannelOrders,
    string ChannelRate,
    string ChannelAmount);

public record ExportOverviewRow(
    string Section,
    string Key,
    string Label,
    string Value);

public record ExportAuditLogRow(
    string Id,
    string Stream,
    string Category,
    string EventType,
    string OccurredAtUtc,
    string? TraceId,
    string Title,
    string Description,
    string? Actor);
