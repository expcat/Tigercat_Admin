using Microsoft.AspNetCore.SignalR;
using Tigercat.Admin.Api.Auth;

namespace Tigercat.Admin.Api.Hubs;

public abstract class SessionBoundHub(SessionRevocationNotifier revocationNotifier) : Hub
{
    private static readonly object RevocationSubscriptionKey = new();

    public override async Task OnConnectedAsync()
    {
        var httpContext = Context.GetHttpContext();
        if (httpContext is null ||
            !httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var usernameValue) ||
            usernameValue is not string username ||
            !httpContext.Items.TryGetValue(AuthConstants.TokenItemKey, out var tokenValue) ||
            tokenValue is not string token)
        {
            Context.Abort();
            return;
        }

        // Hub instances are transient; connection items survive through disconnection.
        var subscription = revocationNotifier.Subscribe(username, token, Context.Abort);
        Context.Items[RevocationSubscriptionKey] = subscription;
        try
        {
            var sessionStore = httpContext.RequestServices.GetRequiredService<ISessionStore>();
            if (await sessionStore.ValidateSessionAsync(token, Context.ConnectionAborted) is null)
            {
                Context.Abort();
                DisposeRevocationSubscription();
                return;
            }

            await base.OnConnectedAsync();
        }
        catch
        {
            DisposeRevocationSubscription();
            throw;
        }
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        DisposeRevocationSubscription();
        return base.OnDisconnectedAsync(exception);
    }

    private void DisposeRevocationSubscription()
    {
        if (Context.Items.Remove(RevocationSubscriptionKey, out var value) && value is IDisposable subscription)
        {
            subscription.Dispose();
        }
    }
}
