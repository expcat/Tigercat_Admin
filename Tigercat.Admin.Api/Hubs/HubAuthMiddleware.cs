using Tigercat.Admin.Api.Auth;

namespace Tigercat.Admin.Api.Hubs;

public sealed class HubAuthMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ISessionStore sessionStore)
    {
        if (context.Request.Path.StartsWithSegments(RealtimeHubs.PathPrefix, StringComparison.OrdinalIgnoreCase)
            && !HttpMethods.IsOptions(context.Request.Method))
        {
            var token = AuthToken.Get(context);
            if (string.IsNullOrWhiteSpace(token))
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            var session = await sessionStore.ValidateSessionAsync(token, context.RequestAborted);
            if (session is null)
            {
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                return;
            }

            context.Items[AuthConstants.UsernameItemKey] = session.Username;
            context.Items[AuthConstants.TokenItemKey] = token;
        }

        await next(context);
    }
}
