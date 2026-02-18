namespace Tigercat.Admin.Api.Common;

/// <summary>
/// Shared permission DTO used by both Auth and Roles endpoints.
/// </summary>
public record PermissionInfoResponse(int Id, string Code, string? Description);
