namespace Tigercat.Admin.Api.Endpoints;

// --- Request DTOs ---

public record CreateUserRequest(string Username, string Password, string? DisplayName, int[]? RoleIds);

public record UpdateUserRequest(string? DisplayName, int? Status, string? Password, int[]? RoleIds, int? AvatarMediaId);

public record BatchDeleteUsersRequest(int[] Ids);

public record BatchUpdateUserStatusRequest(int[] Ids, int Status);

// --- Response DTOs ---

public record UserItemResponse(
    int Id,
    string Username,
    string? DisplayName,
    int Status,
    int? AvatarMediaId,
    string? AvatarUrl,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    RoleInfoResponse[] Roles);

public record RoleInfoResponse(int Id, string Name);

public record PagedResponse<T>(T[] Items, int Total, int Page, int PageSize);
