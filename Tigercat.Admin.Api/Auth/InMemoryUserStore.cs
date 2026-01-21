using System.Collections.Concurrent;

namespace Tigercat.Admin.Api.Auth;

public class InMemoryUserStore : IUserStore
{
    private readonly ConcurrentDictionary<string, UserRecord> _users = new(StringComparer.OrdinalIgnoreCase);

    public bool TryCreateUser(string username, string passwordHash)
    {
        var record = new UserRecord(username, passwordHash);
        return _users.TryAdd(username, record);
    }

    public bool ValidateUser(string username, string passwordHash)
    {
        return _users.TryGetValue(username, out var record) && record.PasswordHash == passwordHash;
    }

    public bool UpdatePassword(string username, string newPasswordHash)
    {
        if (!_users.TryGetValue(username, out var record))
        {
            return false;
        }

        var updated = record with { PasswordHash = newPasswordHash };
        return _users.TryUpdate(username, updated, record);
    }

    public bool Exists(string username)
    {
        return _users.ContainsKey(username);
    }

    private record UserRecord(string Username, string PasswordHash);
}
