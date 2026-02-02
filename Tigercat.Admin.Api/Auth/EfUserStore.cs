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

    public async Task<bool> ValidateUserAsync(string username, string passwordHash, CancellationToken ct = default)
    {
        return await _context.Users.AnyAsync(
            u => u.Username == username && u.PasswordHash == passwordHash, ct);
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
}
