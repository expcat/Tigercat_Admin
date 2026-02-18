namespace Tigercat.Admin.Api.Endpoints;

// --- Request DTOs ---

public record CreateRoleRequest(string Name, string? Description, int[]? PermissionIds);

public record UpdateRoleRequest(string? Name, string? Description, int[]? PermissionIds);

public record SetRolePermissionsRequest(int[] PermissionIds);

public record SetRoleUsersRequest(int[] UserIds);

// --- Response DTOs ---

public record RoleDetailResponse(
    int Id,
    string Name,
    string? Description,
    DateTime CreatedAt,
    PermissionInfoResponse[] Permissions,
    RoleUserInfoResponse[] Users);

public record PermissionInfoResponse(int Id, string Code, string? Description);

public record RoleUserInfoResponse(int Id, string Username, string? DisplayName);
