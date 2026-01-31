using System.Buffers.Text;
using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace Tigercat.Admin.Api.Auth;

public class InMemorySessionStore : ISessionStore
{
    private readonly ConcurrentDictionary<string, SessionRecord> _sessions = new(StringComparer.Ordinal);

    public Task<SessionRecord> CreateSessionAsync(string username, TimeSpan ttl, CancellationToken ct = default)
    {
        var token = GenerateToken();
        var expiresAt = DateTime.UtcNow.Add(ttl);
        var record = new SessionRecord(token, username, expiresAt);
        _sessions[token] = record;
        return Task.FromResult(record);
    }

    public Task<SessionRecord?> ValidateSessionAsync(string token, CancellationToken ct = default)
    {
        if (!_sessions.TryGetValue(token, out var record))
        {
            return Task.FromResult<SessionRecord?>(null);
        }

        if (record.ExpiresAt <= DateTime.UtcNow)
        {
            _sessions.TryRemove(token, out _);
            return Task.FromResult<SessionRecord?>(null);
        }

        return Task.FromResult<SessionRecord?>(record);
    }

    public Task RevokeAsync(string token, CancellationToken ct = default)
    {
        _sessions.TryRemove(token, out _);
        return Task.CompletedTask;
    }

    private static string GenerateToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64Url.EncodeToString(bytes);
    }
}
