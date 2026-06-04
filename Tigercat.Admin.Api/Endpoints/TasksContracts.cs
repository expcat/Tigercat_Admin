namespace Tigercat.Admin.Api.Endpoints;

public record AdminTaskResponse(
    string Id,
    string Title,
    string? Description,
    string Assignee,
    string Priority,
    string Status,
    DateTime DueAt,
    double EstimateHours,
    bool Blocked,
    string? BlockedReason,
    string? CompletionNote,
    string? CreatedBy,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    DateTime? CompletedAt);

public record CreateAdminTaskRequest(
    string Title,
    string? Description,
    string? Assignee,
    string? Priority,
    string? Status,
    DateTime? DueAt,
    double? EstimateHours,
    bool? Blocked,
    string? BlockedReason);

public record UpdateAdminTaskRequest(
    string? Title,
    string? Description,
    string? Assignee,
    string? Priority,
    string? Status,
    DateTime? DueAt,
    double? EstimateHours,
    bool? Blocked,
    string? BlockedReason);

public record MoveAdminTaskRequest(string Status);

public record CompleteAdminTaskRequest(bool Confirm, string? CompletionNote);
