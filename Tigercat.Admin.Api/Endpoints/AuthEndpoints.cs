using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class AuthEndpoints : IEndpointDefinition
{
    private static readonly TimeSpan SessionTtl = TimeSpan.FromHours(2);

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

        if (await userStore.ExistsAsync(request.Username, ct))
        {
            return Results.Json(
                ApiResult.Fail<UserResponse>("用户已存在", 409),
                AppJsonContext.Default.ApiResponseUserResponse,
                statusCode: 409);
        }

        var passwordHash = PasswordHasher.Hash(request.Password);
        var created = await userStore.TryCreateUserAsync(request.Username, passwordHash, ct);
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
                ["username"] = request.Username
            },
            httpContext.TraceIdentifier);

        await eventPublisher.PublishAsync(envelope, EventBusConstants.AuthStream, ct);

        return Results.Json(ApiResult.Ok(new UserResponse(request.Username)), AppJsonContext.Default.ApiResponseUserResponse);
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

        var passwordHash = PasswordHasher.Hash(request.Password);
        if (!await userStore.ValidateUserAsync(request.Username, passwordHash, ct))
        {
            return Results.Json(
                ApiResult.Fail<LoginResponse>("用户名或密码错误", 401),
                AppJsonContext.Default.ApiResponseLoginResponse,
                statusCode: 401);
        }

        var session = await sessionStore.CreateSessionAsync(request.Username, SessionTtl, ct);
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
            "auth.user.password_changed",
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
}
