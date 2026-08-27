using Tigercat.Admin.Api.Common;

namespace Tigercat.Admin.Api.Auth;

public record RegisterRequest(string Username, string Password);
public record LoginRequest(string Username, string Password);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
public record TwoFactorVerifyRequest(string Username, string Code, string? ChallengeId = null);
public record ForgotPasswordCodeRequest(string Channel, string Target);
public record ForgotPasswordResetRequest(string Channel, string Target, string Code, string Password);
public record UpdateTwoFactorRequest(bool Enabled);

public record UserResponse(string Username);
public record LoginResponse(
    string? Token,
    DateTime? ExpiresAt,
    string Username,
    bool RequiresTwoFactor = false,
    string? ChallengeId = null);
public record MessageResponse(string Message);
public record ForgotPasswordCodeResponse(string SentTo);
public record TwoFactorStatusResponse(bool Enabled);
public record UserPermissionsResponse(string Username, PermissionInfoResponse[] Permissions);

public static class AuthDemoCodes
{
    public const string OtpCode = "123456";
    public static readonly TimeSpan CodeTtl = TimeSpan.FromMinutes(5);
}
