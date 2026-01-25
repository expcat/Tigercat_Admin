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
    }

    private static ApiResponse<UserResponse> Register(RegisterRequest request, IUserStore userStore)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiResult.Fail<UserResponse>("用户名或密码不能为空", 400);
        }

        if (userStore.Exists(request.Username))
        {
            return ApiResult.Fail<UserResponse>("用户已存在", 409);
        }

        var passwordHash = PasswordHasher.Hash(request.Password);
        userStore.TryCreateUser(request.Username, passwordHash);
        return ApiResult.Ok(new UserResponse(request.Username));
    }

    private static ApiResponse<LoginResponse> Login(LoginRequest request, IUserStore userStore, ISessionStore sessionStore)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return ApiResult.Fail<LoginResponse>("用户名或密码不能为空", 401);
        }

        var passwordHash = PasswordHasher.Hash(request.Password);
        if (!userStore.ValidateUser(request.Username, passwordHash))
        {
            return ApiResult.Fail<LoginResponse>("用户名或密码错误", 401);
        }

        var session = sessionStore.CreateSession(request.Username, SessionTtl);
        return ApiResult.Ok(new LoginResponse(session.Token, session.ExpiresAt, session.Username));
    }

    private static ApiResponse<MessageResponse> ChangePassword(ChangePasswordRequest request, HttpContext httpContext, IUserStore userStore)
    {
        if (!httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var userObj) || userObj is not string username)
        {
            return ApiResult.Fail<MessageResponse>("未授权", 401);
        }

        var oldHash = PasswordHasher.Hash(request.OldPassword);
        if (!userStore.ValidateUser(username, oldHash))
        {
            return ApiResult.Fail<MessageResponse>("旧密码错误", 401);
        }

        var newHash = PasswordHasher.Hash(request.NewPassword);
        userStore.UpdatePassword(username, newHash);

        return ApiResult.Ok(new MessageResponse("密码修改成功"));
    }
}
