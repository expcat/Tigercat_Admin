using System.Buffers.Text;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Auth;

public class EfSessionStore : ISessionStore
{
    private readonly AdminDbContext _context;

    public EfSessionStore(AdminDbContext context)
    {
        _context = context;
    }

    public async Task<SessionRecord> CreateSessionAsync(string username, TimeSpan ttl, CancellationToken ct = default)
    {
        var expiresAt = DateTime.UtcNow.Add(ttl);
        const int maxRetries = 5;

        for (var attempt = 0; attempt < maxRetries; attempt++)
        {
            ct.ThrowIfCancellationRequested();

            var token = GenerateToken();

            var session = new SessionEntity
            {
                Token = token,
                Username = username,
                ExpiresAt = expiresAt,
                CreatedAt = DateTime.UtcNow
            };

            _context.Sessions.Add(session);

            try
            {
                await _context.SaveChangesAsync(ct);
                return new SessionRecord(token, username, expiresAt);
            }
            catch (DbUpdateException)
            {
                // Potential token collision or other transient insert issue; clean up and retry.
                _context.Entry(session).State = EntityState.Detached;

                if (attempt == maxRetries - 1)
                {
                    throw;
                }
            }
        }

        // This should be unreachable, but keeps the compiler satisfied.
        throw new InvalidOperationException("Unable to create session after multiple attempts.");
    }

    public async Task<SessionRecord?> ValidateSessionAsync(string token, CancellationToken ct = default)
    {
        var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Token == token, ct);

        if (session is null)
        {
            return null;
        }

        if (session.ExpiresAt <= DateTime.UtcNow)
        {
            _context.Sessions.Remove(session);
            await _context.SaveChangesAsync(ct);
            return null;
        }

        return new SessionRecord(session.Token, session.Username, session.ExpiresAt);
    }

    public async Task RevokeAsync(string token, CancellationToken ct = default)
    {
        var session = await _context.Sessions.FirstOrDefaultAsync(s => s.Token == token, ct);
        if (session is not null)
        {
            _context.Sessions.Remove(session);
            await _context.SaveChangesAsync(ct);
        }
    }

    private static string GenerateToken()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64Url.EncodeToString(bytes);
    }
}
