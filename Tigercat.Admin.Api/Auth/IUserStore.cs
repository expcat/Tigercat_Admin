namespace Tigercat.Admin.Api.Auth;

public interface IUserStore
{
    bool TryCreateUser(string username, string passwordHash);
    bool ValidateUser(string username, string passwordHash);
    bool UpdatePassword(string username, string newPasswordHash);
    bool Exists(string username);
}
