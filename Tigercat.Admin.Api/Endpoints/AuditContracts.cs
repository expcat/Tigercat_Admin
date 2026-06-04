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

public record AuditRetentionPolicyResponse(int RetentionDays, DateTime UpdatedAtUtc);

public record UpdateAuditRetentionPolicyRequest(int RetentionDays);

public record AuditRetentionCleanupRequest(bool DryRun);

public record AuditRetentionCleanupResponse(
    bool DryRun,
    int RetentionDays,
    DateTime CutoffUtc,
    int MatchedCount,
    int DeletedCount);
