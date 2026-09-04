using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Auth;

public class EfUserStore : IUserStore
{
    private readonly AdminDbContext _context;

    public EfUserStore(AdminDbContext context)
    {
        _context = context;
    }

    public async Task<bool> TryCreateUserAsync(string username, string passwordHash, CancellationToken ct = default)
    {
        if (await _context.Users.AnyAsync(u => u.Username == username, ct))
        {
            return false;
        }

        var user = new UserEntity
        {
            Username = username,
            PasswordHash = passwordHash,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);

        try
        {
            await _context.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException)
        {
            // Handle race condition where another request created the user
            _context.Entry(user).State = EntityState.Detached;
            return false;
        }
    }

    public async Task<bool> ValidateUserAsync(string username, string password, CancellationToken ct = default)
    {
        var storedHash = await GetPasswordHashAsync(username, ct);
        return storedHash is not null && PasswordHasher.Matches(storedHash, password);
    }

    public async Task<string?> GetPasswordHashAsync(string username, CancellationToken ct = default)
    {
        return await _context.Users
            .Where(u => u.Username == username)
            .Select(u => u.PasswordHash)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<bool> UpdatePasswordAsync(string username, string newPasswordHash, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username, ct);
        if (user is null)
        {
            return false;
        }

        user.PasswordHash = newPasswordHash;
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<bool> ExistsAsync(string username, CancellationToken ct = default)
    {
        return await _context.Users.AnyAsync(u => u.Username == username, ct);
    }

    public async Task<bool> GetTwoFactorEnabledAsync(string username, CancellationToken ct = default)
    {
        return await _context.Users
            .Where(u => u.Username == username)
            .Select(u => u.TwoFactorEnabled)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<bool> SetTwoFactorEnabledAsync(string username, bool enabled, CancellationToken ct = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username, ct);
        if (user is null)
        {
            return false;
        }

        user.TwoFactorEnabled = enabled;
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return true;
    }
}
