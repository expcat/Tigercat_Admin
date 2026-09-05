using Microsoft.Extensions.Primitives;

namespace Tigercat.Admin.Api.Auth;

public static class AuthToken
{
    public static string? Get(HttpContext httpContext)
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
                return value[AuthConstants.BearerPrefix.Length..].Trim();
            }
        }

        var accessToken = httpContext.Request.Query["access_token"].ToString();
        return string.IsNullOrWhiteSpace(accessToken) ? null : accessToken;
    }
}
