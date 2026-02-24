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
