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
    bool? Blocked);

public record UpdateAdminTaskRequest(
    string? Title,
    string? Description,
    string? Assignee,
    string? Priority,
    string? Status,
    DateTime? DueAt,
    double? EstimateHours,
    bool? Blocked);

public record MoveAdminTaskRequest(string Status);
