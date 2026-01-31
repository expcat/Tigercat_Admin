using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;

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

    private static async Task<ApiResponse<UserResponse>> Register(
        RegisterRequest request, 
        IUserStore userStore, 
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiResult.Fail<UserResponse>("用户名或密码不能为空", 400);
        }

        if (await userStore.ExistsAsync(request.Username, ct))
        {
            return ApiResult.Fail<UserResponse>("用户已存在", 409);
        }

        var passwordHash = PasswordHasher.Hash(request.Password);
        await userStore.TryCreateUserAsync(request.Username, passwordHash, ct);
        return ApiResult.Ok(new UserResponse(request.Username));
    }

    private static async Task<ApiResponse<LoginResponse>> Login(
        LoginRequest request, 
        IUserStore userStore, 
        ISessionStore sessionStore, 
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiResult.Fail<LoginResponse>("用户名或密码不能为空", 401);
        }

        var passwordHash = PasswordHasher.Hash(request.Password);
        if (!await userStore.ValidateUserAsync(request.Username, passwordHash, ct))
        {
            return ApiResult.Fail<LoginResponse>("用户名或密码错误", 401);
        }

        var session = await sessionStore.CreateSessionAsync(request.Username, SessionTtl, ct);
        return ApiResult.Ok(new LoginResponse(session.Token, session.ExpiresAt, session.Username));
    }

    private static async Task<ApiResponse<MessageResponse>> ChangePassword(
        ChangePasswordRequest request, 
        HttpContext httpContext, 
        IUserStore userStore, 
        CancellationToken ct)
    {
        if (!httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) || userObj is not string username)
        {
            return ApiResult.Fail<MessageResponse>("未授权", 401);
        }

        var oldHash = PasswordHasher.Hash(request.OldPassword);
        if (!await userStore.ValidateUserAsync(username, oldHash, ct))
        {
            return ApiResult.Fail<MessageResponse>("旧密码错误", 401);
        }

        var newHash = PasswordHasher.Hash(request.NewPassword);
        await userStore.UpdatePasswordAsync(username, newHash, ct);

        return ApiResult.Ok(new MessageResponse("密码修改成功"));
    }

    private static async Task<ApiResponse<MessageResponse>> Logout(
        HttpContext httpContext,
        ISessionStore sessionStore,
        CancellationToken ct)
    {
        var token = GetToken(httpContext);
        if (!string.IsNullOrWhiteSpace(token))
        {
            await sessionStore.RevokeAsync(token, ct);
        }

        return ApiResult.Ok(new MessageResponse("退出成功"));
    }

    private static string? GetToken(HttpContext httpContext)
    {
        if (httpContext.Request.Headers.TryGetValue(AuthConstants.TokenHeader, out var tokenHeader) &&
            !string.IsNullOrEmpty(tokenHeader))
        {
            return tokenHeader.ToString();
        }

        if (httpContext.Request.Headers.TryGetValue(AuthConstants.AuthorizationHeader, out var authHeader) &&
            !string.IsNullOrEmpty(authHeader))
        {
            var value = authHeader.ToString();
            if (value.StartsWith(AuthConstants.BearerPrefix, StringComparison.OrdinalIgnoreCase))
            {
            return value[AuthConstants.BearerPrefix.Length..].Trim();
            }
        }

        return null;
    }
}
