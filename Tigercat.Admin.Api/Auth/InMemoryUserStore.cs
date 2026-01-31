using System.Collections.Concurrent;

namespace Tigercat.Admin.Api.Auth;

public class InMemoryUserStore : IUserStore
{
    private readonly ConcurrentDictionary<string, UserRecord> _users = new(StringComparer.OrdinalIgnoreCase);

    public InMemoryUserStore()
    {
        SeedDefaultUsers();
    }

    public Task<bool> TryCreateUserAsync(string username, string passwordHash, CancellationToken ct = default)
    {
        var record = new UserRecord(username, passwordHash);
        return Task.FromResult(_users.TryAdd(username, record));
    }

    public Task<bool> ValidateUserAsync(string username, string passwordHash, CancellationToken ct = default)
    {
        var result = _users.TryGetValue(username, out var record) && record.PasswordHash == passwordHash;
        return Task.FromResult(result);
    }

    public Task<bool> UpdatePasswordAsync(string username, string newPasswordHash, CancellationToken ct = default)
    {
        if (!_users.TryGetValue(username, out var record))
        {
            return Task.FromResult(false);
        }

        var updated = record with { PasswordHash = newPasswordHash };
        return Task.FromResult(_users.TryUpdate(username, updated, record));
    }

    public Task<bool> ExistsAsync(string username, CancellationToken ct = default)
    {
        return Task.FromResult(_users.ContainsKey(username));
    }

    private void SeedDefaultUsers()
    {
        var defaults = new (string Username, string Password)[]
        {
            ("admin", "admin"),
            ("Admin", "Admin"),
            ("test", "test")
        };

        foreach (var (username, password) in defaults)
        {
            var hash = PasswordHasher.Hash(password);
            _users.TryAdd(username, new UserRecord(username, hash));
        }
    }

    private record UserRecord(string Username, string PasswordHash);
}
