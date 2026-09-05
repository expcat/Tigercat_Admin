using System.Collections.Concurrent;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Observability;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class AuthEndpoints : IEndpointDefinition
{
    private static readonly ConcurrentDictionary<string, LoginAttemptState> LoginAttempts = new(StringComparer.Ordinal);

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/register", Register)
            .RequireRateLimiting(AuthRateLimitOptions.PolicyName)
            .WithName("Register");

        group.MapPost("/login", Login)
            .RequireRateLimiting(AuthRateLimitOptions.PolicyName)
            .WithName("Login");

        group.MapPost("/two-factor/verify", VerifyTwoFactor)
            .RequireRateLimiting(AuthRateLimitOptions.PolicyName)
            .WithName("VerifyTwoFactor");

        group.MapGet("/two-factor", GetTwoFactor)
            .RequireLogin()
            .WithName("GetTwoFactor");

        group.MapPut("/two-factor", UpdateTwoFactor)
            .RequireLogin()
            .WithName("UpdateTwoFactor");

        group.MapPost("/forgot-password/code", SendForgotPasswordCode)
            .RequireRateLimiting(AuthRateLimitOptions.PolicyName)
            .WithName("SendForgotPasswordCode");

        group.MapPost("/forgot-password", ResetForgotPassword)
            .RequireRateLimiting(AuthRateLimitOptions.PolicyName)
            .WithName("ResetForgotPassword");

        group.MapPost("/change-password", ChangePassword)
            .RequireLogin()
            .WithName("ChangePassword");

        group.MapPost("/logout", Logout)
            .RequireLogin()
            .WithName("Logout");

        group.MapGet("/permissions", GetPermissions)
            .RequireLogin()
            .WithName("GetMyPermissions");
    }

    private static async Task<IResult> Register(
        RegisterRequest request,
        IUserStore userStore,
        IEventPublisher eventPublisher,
        AdminDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.Json(
                ApiResult.Fail<UserResponse>("用户名或密码不能为空", 400),
                AppJsonContext.Default.ApiResponseUserResponse,
                statusCode: 400);
        }

        var username = NormalizeUsername(request.Username);
        var policy = await AuthPolicySettings.LoadAsync(db, ct);
        var passwordError = policy.ValidatePassword(request.Password);
        if (passwordError is not null)
        {
            return Results.Json(
                ApiResult.Fail<UserResponse>(passwordError, 400),
                AppJsonContext.Default.ApiResponseUserResponse,
                statusCode: 400);
        }

        if (await userStore.ExistsAsync(username, ct))
        {
            return Results.Json(
                ApiResult.Fail<UserResponse>("用户已存在", 409),
                AppJsonContext.Default.ApiResponseUserResponse,
                statusCode: 409);
        }

        var passwordHash = PasswordHasher.Hash(request.Password);
        var created = await userStore.TryCreateUserAsync(username, passwordHash, ct);
        if (!created)
        {
            return Results.Json(
                ApiResult.Fail<UserResponse>("用户已存在", 409),
                AppJsonContext.Default.ApiResponseUserResponse,
                statusCode: 409);
        }
        var envelope = EventEnvelope.Create(
            "auth.user.registered",
            new Dictionary<string, object?>
            {
                ["username"] = username
            },
            httpContext.TraceIdentifier);

        await eventPublisher.PublishAsync(envelope, EventBusConstants.AuthStream, ct);

        return Results.Json(ApiResult.Ok(new UserResponse(username)), AppJsonContext.Default.ApiResponseUserResponse);
    }

    private static async Task<IResult> Login(
        LoginRequest request,
        IUserStore userStore,
        ISessionStore sessionStore,
        ICacheService cache,
        IEventPublisher eventPublisher,
        AdminDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.Json(
                ApiResult.Fail<LoginResponse>("用户名或密码不能为空", 401),
                AppJsonContext.Default.ApiResponseLoginResponse,
                statusCode: 401);
        }

        var username = NormalizeUsername(request.Username);
        var policy = await AuthPolicySettings.LoadAsync(db, ct);
        var attemptKey = GetLoginAttemptKey(username, httpContext);
        if (IsLockedOut(attemptKey, policy, out var retryAfter))
        {
            AdminMetrics.RecordAuthEvent("login_locked", false);
            return Results.Json(
                ApiResult.Fail<LoginResponse>($"登录失败次数过多，请 {Math.Max(1, (int)Math.Ceiling(retryAfter.TotalMinutes))} 分钟后再试", 429),
                AppJsonContext.Default.ApiResponseLoginResponse,
                statusCode: 429);
        }

        var storedHash = await userStore.GetPasswordHashAsync(username, ct);
        if (storedHash is null || !PasswordHasher.Verify(storedHash, request.Password, out var needsRehash))
        {
            RecordLoginFailure(attemptKey);
            AdminMetrics.RecordAuthEvent("login", false);
            return Results.Json(
                ApiResult.Fail<LoginResponse>("用户名或密码错误", 401),
                AppJsonContext.Default.ApiResponseLoginResponse,
                statusCode: 401);
        }

        ClearLoginFailures(attemptKey);

        if (needsRehash)
        {
            await userStore.UpdatePasswordAsync(username, PasswordHasher.Hash(request.Password), ct);
        }

        if (await userStore.GetTwoFactorEnabledAsync(username, ct))
        {
            var challengeId = Guid.NewGuid().ToString("N");
            await cache.SetAsync(CacheKeys.TwoFactorChallenge(challengeId), username, AuthDemoCodes.CodeTtl, ct);
            await cache.SetAsync(CacheKeys.TwoFactorUser(username), challengeId, AuthDemoCodes.CodeTtl, ct);
            AdminMetrics.RecordAuthEvent("login_2fa_challenge", true);
            return Results.Json(
                ApiResult.Ok(new LoginResponse(null, null, username, RequiresTwoFactor: true, ChallengeId: challengeId)),
                AppJsonContext.Default.ApiResponseLoginResponse);
        }

        return await IssueLoginSessionAsync(username, sessionStore, eventPublisher, httpContext, policy.SessionTtl, ct);
    }

    private static async Task<IResult> VerifyTwoFactor(
        TwoFactorVerifyRequest request,
        IUserStore userStore,
        ISessionStore sessionStore,
        ICacheService cache,
        IEventPublisher eventPublisher,
        AdminDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var username = NormalizeUsername(request.Username ?? string.Empty);
        var code = (request.Code ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(code))
        {
            return TwoFactorUnauthorized();
        }

        var pendingChallengeId = await cache.GetAsync<string>(CacheKeys.TwoFactorUser(username), ct);
        if (string.IsNullOrWhiteSpace(pendingChallengeId))
        {
            return TwoFactorUnauthorized();
        }

        if (!string.IsNullOrWhiteSpace(request.ChallengeId) &&
            !string.Equals(request.ChallengeId, pendingChallengeId, StringComparison.Ordinal))
        {
            return TwoFactorUnauthorized();
        }

        var challengeUser = await cache.GetAsync<string>(CacheKeys.TwoFactorChallenge(pendingChallengeId), ct);
        if (!string.Equals(challengeUser, username, StringComparison.Ordinal))
        {
            return TwoFactorUnauthorized();
        }

        if (!string.Equals(code, AuthDemoCodes.OtpCode, StringComparison.Ordinal))
        {
            AdminMetrics.RecordAuthEvent("login_2fa", false);
            return TwoFactorUnauthorized();
        }

        if (!await userStore.ExistsAsync(username, ct) ||
            !await userStore.GetTwoFactorEnabledAsync(username, ct))
        {
            return TwoFactorUnauthorized();
        }

        await cache.RemoveAsync(CacheKeys.TwoFactorUser(username), ct);
        await cache.RemoveAsync(CacheKeys.TwoFactorChallenge(pendingChallengeId), ct);

        var policy = await AuthPolicySettings.LoadAsync(db, ct);
        AdminMetrics.RecordAuthEvent("login_2fa", true);
        return await IssueLoginSessionAsync(username, sessionStore, eventPublisher, httpContext, policy.SessionTtl, ct);
    }

    private static async Task<IResult> GetTwoFactor(
        HttpContext httpContext,
        IUserStore userStore,
        CancellationToken ct)
    {
        if (!TryGetUsername(httpContext, out var username))
        {
            return Results.Json(
                ApiResult.Fail<TwoFactorStatusResponse>("未授权", 401),
                AppJsonContext.Default.ApiResponseTwoFactorStatusResponse,
                statusCode: 401);
        }

        var enabled = await userStore.GetTwoFactorEnabledAsync(username, ct);
        return Results.Json(
            ApiResult.Ok(new TwoFactorStatusResponse(enabled)),
            AppJsonContext.Default.ApiResponseTwoFactorStatusResponse);
    }

    private static async Task<IResult> UpdateTwoFactor(
        UpdateTwoFactorRequest request,
        HttpContext httpContext,
        IUserStore userStore,
        CancellationToken ct)
    {
        if (!TryGetUsername(httpContext, out var username))
        {
            return Results.Json(
                ApiResult.Fail<TwoFactorStatusResponse>("未授权", 401),
                AppJsonContext.Default.ApiResponseTwoFactorStatusResponse,
                statusCode: 401);
        }

        var updated = await userStore.SetTwoFactorEnabledAsync(username, request.Enabled, ct);
        if (!updated)
        {
            return Results.Json(
                ApiResult.Fail<TwoFactorStatusResponse>("更新失败", 500),
                AppJsonContext.Default.ApiResponseTwoFactorStatusResponse,
                statusCode: 500);
        }

        return Results.Json(
            ApiResult.Ok(new TwoFactorStatusResponse(request.Enabled)),
            AppJsonContext.Default.ApiResponseTwoFactorStatusResponse);
    }

    private static async Task<IResult> SendForgotPasswordCode(
        ForgotPasswordCodeRequest request,
        ICacheService cache,
        CancellationToken ct)
    {
        var target = (request.Target ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(target))
        {
            return Results.Json(
                ApiResult.Fail<ForgotPasswordCodeResponse>("请输入邮箱或手机号", 400),
                AppJsonContext.Default.ApiResponseForgotPasswordCodeResponse,
                statusCode: 400);
        }

        var channel = NormalizeForgotChannel(request.Channel, target);
        await cache.SetAsync(CacheKeys.ForgotPasswordCode(channel, NormalizeForgotTarget(target)), AuthDemoCodes.OtpCode, AuthDemoCodes.CodeTtl, ct);
        return Results.Json(
            ApiResult.Ok(new ForgotPasswordCodeResponse(target)),
            AppJsonContext.Default.ApiResponseForgotPasswordCodeResponse);
    }

    private static async Task<IResult> ResetForgotPassword(
        ForgotPasswordResetRequest request,
        IUserStore userStore,
        ICacheService cache,
        AdminDbContext db,
        CancellationToken ct)
    {
        var target = (request.Target ?? string.Empty).Trim();
        var code = (request.Code ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(target))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("请输入邮箱或手机号", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        var channel = NormalizeForgotChannel(request.Channel, target);
        var cacheKey = CacheKeys.ForgotPasswordCode(channel, NormalizeForgotTarget(target));
        var storedCode = await cache.GetAsync<string>(cacheKey, ct);
        if (string.IsNullOrWhiteSpace(storedCode) ||
            !string.Equals(code, storedCode, StringComparison.Ordinal) ||
            !string.Equals(code, AuthDemoCodes.OtpCode, StringComparison.Ordinal))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("验证码错误", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        var policy = await AuthPolicySettings.LoadAsync(db, ct);
        var passwordError = policy.ValidatePassword(request.Password ?? string.Empty);
        if (passwordError is not null)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>(passwordError, 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        var username = ResolveForgotPasswordUsername(channel, target);
        if (await userStore.ExistsAsync(username, ct))
        {
            var updated = await userStore.UpdatePasswordAsync(username, PasswordHasher.Hash(request.Password ?? string.Empty), ct);
            if (!updated)
            {
                return Results.Json(
                    ApiResult.Fail<MessageResponse>("密码重置失败", 500),
                    AppJsonContext.Default.ApiResponseMessageResponse,
                    statusCode: 500);
            }
        }

        await cache.RemoveAsync(cacheKey, ct);
        return Results.Json(
            ApiResult.Ok(new MessageResponse("密码重置成功")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    private static async Task<IResult> IssueLoginSessionAsync(
        string username,
        ISessionStore sessionStore,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        TimeSpan sessionTtl,
        CancellationToken ct)
    {
        var session = await sessionStore.CreateSessionAsync(username, sessionTtl, ct);
        var envelope = EventEnvelope.Create(
            "auth.user.login",
            new Dictionary<string, object?>
            {
                ["username"] = session.Username,
                ["expiresAt"] = session.ExpiresAt.ToString("O")
            },
            httpContext.TraceIdentifier);
        await eventPublisher.PublishAsync(envelope, EventBusConstants.AuthStream, ct);
        AdminMetrics.RecordAuthEvent("login", true);
        return Results.Json(
            ApiResult.Ok(new LoginResponse(session.Token, session.ExpiresAt, session.Username)),
            AppJsonContext.Default.ApiResponseLoginResponse);
    }

    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest request,
        HttpContext httpContext,
        IUserStore userStore,
        IEventPublisher eventPublisher,
        AdminDbContext db,
        CancellationToken ct)
    {
        if (!httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) || userObj is not string username)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("未授权", 401),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 401);
        }

        if (!await userStore.ValidateUserAsync(username, request.OldPassword, ct))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("旧密码错误", 401),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 401);
        }

        var policy = await AuthPolicySettings.LoadAsync(db, ct);
        var passwordError = policy.ValidatePassword(request.NewPassword);
        if (passwordError is not null)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>(passwordError, 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        var newHash = PasswordHasher.Hash(request.NewPassword);
        var updated = await userStore.UpdatePasswordAsync(username, newHash, ct);
        if (!updated)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("密码修改失败", 500),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 500);
        }

        var envelope = EventEnvelope.Create(
            "auth.user.password.changed",
            new Dictionary<string, object?>
            {
                ["username"] = username
            },
            httpContext.TraceIdentifier);
        await eventPublisher.PublishAsync(envelope, EventBusConstants.AuthStream, ct);
        AdminMetrics.RecordAuthEvent("password_changed", true);

        return Results.Json(ApiResult.Ok(new MessageResponse("密码修改成功")), AppJsonContext.Default.ApiResponseMessageResponse);
    }

    private static async Task<IResult> Logout(
        HttpContext httpContext,
        ISessionStore sessionStore,
        IEventPublisher eventPublisher,
        CancellationToken ct)
    {
        if (httpContext.Items.TryGetValue(AuthConstants.TokenItemKey, out var tokenObj) && tokenObj is string token)
        {
            await sessionStore.RevokeAsync(token, ct);
        }

        if (httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) && userObj is string username)
        {
            var envelope = EventEnvelope.Create(
                "auth.user.logout",
                new Dictionary<string, object?>
                {
                    ["username"] = username
                },
                httpContext.TraceIdentifier);
            await eventPublisher.PublishAsync(envelope, EventBusConstants.AuthStream, ct);
        }

        AdminMetrics.RecordAuthEvent("logout", true);
        return Results.Json(ApiResult.Ok(new MessageResponse("退出成功")), AppJsonContext.Default.ApiResponseMessageResponse);
    }

    // GET /api/auth/permissions
    private static async Task<IResult> GetPermissions(
        HttpContext httpContext,
        AdminDbContext db,
        IPermissionService permissionService,
        CancellationToken ct)
    {
        // Defensive check: RequireLogin() guarantees auth.username is set,
        // but we guard against possible future misconfiguration.
        if (!httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) ||
            userObj is not string username)
        {
            return Results.Json(
                ApiResult.Fail<UserPermissionsResponse>("未授权", 401),
                AppJsonContext.Default.ApiResponseUserPermissionsResponse,
                statusCode: 401);
        }

        var cachedCodes = await permissionService.GetUserPermissionCodesAsync(username, ct);

        // Load full permission details by the resolved codes
        var permissions = cachedCodes is { Length: > 0 }
            ? await db.Permissions
                .AsNoTracking()
                .Where(p => cachedCodes.Contains(p.Code))
                .OrderBy(p => p.Id)
                .Select(p => new PermissionInfoResponse(p.Id, p.Code, p.Description))
                .ToArrayAsync(ct)
            : [];

        var response = new UserPermissionsResponse(username, permissions);
        return Results.Json(
            ApiResult.Ok(response),
            AppJsonContext.Default.ApiResponseUserPermissionsResponse);
    }

    private static string NormalizeUsername(string username)
    {
        return username.Trim().ToLowerInvariant();
    }

    private static bool TryGetUsername(HttpContext httpContext, out string username)
    {
        if (httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) &&
            userObj is string value &&
            !string.IsNullOrWhiteSpace(value))
        {
            username = value;
            return true;
        }

        username = string.Empty;
        return false;
    }

    private static IResult TwoFactorUnauthorized()
    {
        return Results.Json(
            ApiResult.Fail<LoginResponse>("验证码错误", 401),
            AppJsonContext.Default.ApiResponseLoginResponse,
            statusCode: 401);
    }

    private static string NormalizeForgotChannel(string? channel, string target)
    {
        if (string.Equals(channel, "email", StringComparison.OrdinalIgnoreCase))
        {
            return "email";
        }

        if (string.Equals(channel, "phone", StringComparison.OrdinalIgnoreCase))
        {
            return "phone";
        }

        return target.Contains('@', StringComparison.Ordinal) ? "email" : "phone";
    }

    private static string NormalizeForgotTarget(string target)
    {
        return target.Trim().ToLowerInvariant();
    }

    private static string ResolveForgotPasswordUsername(string channel, string target)
    {
        var value = target.Trim();
        if (string.Equals(channel, "email", StringComparison.Ordinal) || value.Contains('@', StringComparison.Ordinal))
        {
            var at = value.IndexOf('@');
            if (at > 0)
            {
                return NormalizeUsername(value[..at]);
            }
        }

        return NormalizeUsername(value);
    }

    private static string GetLoginAttemptKey(string username, HttpContext httpContext)
    {
        var ip = httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        return $"{username}@{ip}";
    }

    private static bool IsLockedOut(string key, AuthPolicySettings policy, out TimeSpan retryAfter)
    {
        retryAfter = TimeSpan.Zero;

        if (!LoginAttempts.TryGetValue(key, out var state) ||
            state.FailureCount < policy.MaxLoginAttempts)
        {
            return false;
        }

        var elapsed = DateTimeOffset.UtcNow - state.LastFailureAt;
        if (elapsed >= policy.LoginLockout)
        {
            LoginAttempts.TryRemove(key, out _);
            return false;
        }

        retryAfter = policy.LoginLockout - elapsed;
        return true;
    }

    private static void RecordLoginFailure(string key)
    {
        LoginAttempts.AddOrUpdate(
            key,
            _ => new LoginAttemptState(1, DateTimeOffset.UtcNow),
            (_, current) => new LoginAttemptState(current.FailureCount + 1, DateTimeOffset.UtcNow));
    }

    private static void ClearLoginFailures(string key)
    {
        LoginAttempts.TryRemove(key, out _);
    }

    private sealed record LoginAttemptState(int FailureCount, DateTimeOffset LastFailureAt);
}
