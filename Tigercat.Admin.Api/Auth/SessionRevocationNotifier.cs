namespace Tigercat.Admin.Api.Auth;

public sealed class SessionRevocationNotifier
{
    private event Action<string, string?>? Revoked;

    public IDisposable Subscribe(string username, string token, Action abort)
    {
        void Handler(string revokedUsername, string? revokedToken)
        {
            if ((revokedToken is null && string.Equals(username, revokedUsername, StringComparison.Ordinal)) ||
                string.Equals(token, revokedToken, StringComparison.Ordinal))
            {
                abort();
            }
        }

        Revoked += Handler;
        return new Subscription(this, Handler);
    }

    public void Publish(string username, string? token = null) => Revoked?.Invoke(username, token);

    private sealed class Subscription(SessionRevocationNotifier owner, Action<string, string?> handler) : IDisposable
    {
        public void Dispose() => owner.Revoked -= handler;
    }
}
