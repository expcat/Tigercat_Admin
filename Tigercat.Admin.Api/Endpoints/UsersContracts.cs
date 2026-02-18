namespace Tigercat.Admin.Api.Endpoints;

// --- Request DTOs ---

public record CreateUserRequest(string Username, string Password, string? DisplayName, int[]? RoleIds);

public record UpdateUserRequest(string? DisplayName, int? Status, string? Password, int[]? RoleIds);

// --- Response DTOs ---

public record UserItemResponse(
    int Id,
    string Username,
    string? DisplayName,
    int Status,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    RoleInfoResponse[] Roles);

public record RoleInfoResponse(int Id, string Name);

public record PagedResponse<T>(T[] Items, int Total, int Page, int PageSize);
