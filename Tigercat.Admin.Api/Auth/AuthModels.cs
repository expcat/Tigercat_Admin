using Tigercat.Admin.Api.Common;

namespace Tigercat.Admin.Api.Auth;

public record RegisterRequest(string Username, string Password);
public record LoginRequest(string Username, string Password);
public record ChangePasswordRequest(string OldPassword, string NewPassword);

public record UserResponse(string Username);
public record LoginResponse(string Token, DateTime ExpiresAt, string Username);
public record MessageResponse(string Message);
public record UserPermissionsResponse(string Username, PermissionInfoResponse[] Permissions);
