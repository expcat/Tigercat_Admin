using System.Buffers.Text;
using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace Tigercat.Admin.Api.Auth;

public class InMemorySessionStore : ISessionStore
{
    private readonly ConcurrentDictionary<string, SessionRecord> _sessions = new(StringComparer.Ordinal);

    public SessionRecord CreateSession(string username, TimeSpan ttl)
    {
        var token = GenerateToken();
        var expiresAt = DateTime.UtcNow.Add(ttl);
        var record = new SessionRecord(token, username, expiresAt);
        _sessions[token] = record;
        return record;
    }

    public SessionRecord? ValidateSession(string token)
    {
        if (!_sessions.TryGetValue(token, out var record))
        {
            return null;
        }

        if (record.ExpiresAt <= DateTime.UtcNow)
        {
            _sessions.TryRemove(token, out _);
            return null;
        }

        return record;
    }

    public void Revoke(string token)
    {
        _sessions.TryRemove(token, out _);
    }

    private static string GenerateToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64Url.EncodeToString(bytes);
    }
}
