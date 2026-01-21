namespace Tigercat.Admin.Api.Auth;

public interface ISessionStore
{
    SessionRecord CreateSession(string username, TimeSpan ttl);
    SessionRecord? ValidateSession(string token);
    void Revoke(string token);
}

public record SessionRecord(string Token, string Username, DateTime ExpiresAt);
