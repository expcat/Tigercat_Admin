namespace Tigercat.Admin.Api.Auth;

public interface ISessionStore
{
    Task<SessionRecord> CreateSessionAsync(string username, TimeSpan ttl, CancellationToken ct = default);
    Task<SessionRecord?> ValidateSessionAsync(string token, CancellationToken ct = default);
    Task RevokeAsync(string token, CancellationToken ct = default);
}

public record SessionRecord(string Token, string Username, DateTime ExpiresAt);
