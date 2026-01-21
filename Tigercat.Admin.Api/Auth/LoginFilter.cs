using Microsoft.Extensions.Primitives;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Auth;

public class LoginFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        var httpContext = context.HttpContext;
        var token = GetToken(httpContext);
        if (string.IsNullOrWhiteSpace(token))
        {
            return Results.Json(ApiResult.Fail("Unauthorized", 401), AppJsonContext.Default.ApiResponseObject, statusCode: 401);
        }

        var sessionStore = httpContext.RequestServices.GetRequiredService<ISessionStore>();
        var session = sessionStore.ValidateSession(token);
        if (session is null)
        {
            return Results.Json(ApiResult.Fail("Unauthorized", 401), AppJsonContext.Default.ApiResponseObject, statusCode: 401);
        }

        httpContext.Items[AuthConstants.UsernameItemKey] = session.Username;
        return await next(context);
    }

    private static string? GetToken(HttpContext httpContext)
    {
        if (httpContext.Request.Headers.TryGetValue(AuthConstants.TokenHeader, out StringValues tokenHeader) &&
            !StringValues.IsNullOrEmpty(tokenHeader))
        {
            return tokenHeader.ToString();
        }

        if (httpContext.Request.Headers.TryGetValue(AuthConstants.AuthorizationHeader, out StringValues authHeader) &&
            !StringValues.IsNullOrEmpty(authHeader))
        {
            var value = authHeader.ToString();
            if (value.StartsWith(AuthConstants.BearerPrefix, StringComparison.OrdinalIgnoreCase))
            {
                return value.Substring(AuthConstants.BearerPrefix.Length).Trim();
            }
        }

        return null;
    }
}

public static class LoginExtensions
{
    public static RouteHandlerBuilder RequireLogin(this RouteHandlerBuilder builder)
    {
        return builder.AddEndpointFilter(new LoginFilter());
    }
}

public static class AuthConstants
{
    public const string TokenHeader = "X-Token";
    public const string AuthorizationHeader = "Authorization";
    public const string BearerPrefix = "Bearer ";
    public const string UsernameItemKey = "auth.username";
}
