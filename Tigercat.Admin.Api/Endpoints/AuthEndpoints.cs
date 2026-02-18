using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class AuthEndpoints : IEndpointDefinition
{
    private static readonly TimeSpan SessionTtl = TimeSpan.FromHours(2);
    private static readonly TimeSpan PermissionCacheTtl = TimeSpan.FromMinutes(5);

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/register", Register)
            .WithName("Register");

        group.MapPost("/login", Login)
            .WithName("Login");

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
        IEventPublisher eventPublisher,
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
        var passwordHash = PasswordHasher.Hash(request.Password);
        if (!await userStore.ValidateUserAsync(username, passwordHash, ct))
        {
            return Results.Json(
                ApiResult.Fail<LoginResponse>("用户名或密码错误", 401),
                AppJsonContext.Default.ApiResponseLoginResponse,
                statusCode: 401);
        }

        var session = await sessionStore.CreateSessionAsync(username, SessionTtl, ct);
        var envelope = EventEnvelope.Create(
            "auth.user.login",
            new Dictionary<string, object?>
            {
                ["username"] = session.Username,
                ["expiresAt"] = session.ExpiresAt.ToString("O")
            },
            httpContext.TraceIdentifier);
        await eventPublisher.PublishAsync(envelope, EventBusConstants.AuthStream, ct);
        return Results.Json(ApiResult.Ok(new LoginResponse(session.Token, session.ExpiresAt, session.Username)), AppJsonContext.Default.ApiResponseLoginResponse);
    }

    private static async Task<IResult> ChangePassword(
        ChangePasswordRequest request,
        HttpContext httpContext,
        IUserStore userStore,
        IEventPublisher eventPublisher,
        CancellationToken ct)
    {
        if (!httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) || userObj is not string username)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("未授权", 401),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 401);
        }

        var oldHash = PasswordHasher.Hash(request.OldPassword);
        if (!await userStore.ValidateUserAsync(username, oldHash, ct))
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("旧密码错误", 401),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 401);
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

        return Results.Json(ApiResult.Ok(new MessageResponse("退出成功")), AppJsonContext.Default.ApiResponseMessageResponse);
    }

    // GET /api/auth/permissions
    private static async Task<IResult> GetPermissions(
        HttpContext httpContext,
        AdminDbContext db,
        ICacheService cacheService,
        CancellationToken ct)
    {
        if (!httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) ||
            userObj is not string username)
        {
            return Results.Json(
                ApiResult.Fail<UserPermissionsResponse>("未授权", 401),
                AppJsonContext.Default.ApiResponseUserPermissionsResponse,
                statusCode: 401);
        }

        var cacheKey = CacheKeys.UserPermissions(username);

        // Try cached permission codes first
        var cachedCodes = await cacheService.GetOrSetAsync(
            cacheKey,
            async token =>
            {
                return await db.Users
                    .Where(u => u.Username == username)
                    .SelectMany(u => u.UserRoles)
                    .SelectMany(ur => ur.Role.RolePermissions)
                    .Select(rp => rp.Permission.Code)
                    .Distinct()
                    .ToArrayAsync(token);
            },
            PermissionCacheTtl,
            ct);

        // Load full permission details by the resolved codes
        var permissions = cachedCodes is { Length: > 0 }
            ? await db.Permissions
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
}
