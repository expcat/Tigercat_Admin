using System.Security.Cryptography;
using System.Text;
using IdentityPasswordHasher = Microsoft.AspNetCore.Identity.PasswordHasher<object>;
using IdentityVerifyResult = Microsoft.AspNetCore.Identity.PasswordVerificationResult;

namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Password hashing for stored user credentials.
/// New hashes use ASP.NET Identity PBKDF2 (<see cref="IdentityPasswordHasher"/>).
/// Existing SHA256 hex hashes are still verified and rehashed on a successful login.
/// Identity Cookie/JWT UI is not used.
/// </summary>
public static class PasswordHasher
{
    public const string DefaultAdminPassword = "admin123";
    private const int LegacySha256HexLength = 64;

    private static readonly IdentityPasswordHasher IdentityHasher = new();
    private static readonly object HasherUser = new();

    public static string Hash(string password)
    {
        ArgumentNullException.ThrowIfNull(password);
        return IdentityHasher.HashPassword(HasherUser, password);
    }

    /// <summary>
    /// SHA256 hex used by the previous hasher. Kept so tests and login can
    /// recognize and upgrade existing rows.
    /// </summary>
    public static string HashLegacySha256(string password)
    {
        ArgumentNullException.ThrowIfNull(password);
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(password)));
    }

    public static bool IsLegacySha256(string? storedHash)
    {
        if (storedHash is null || storedHash.Length != LegacySha256HexLength)
        {
            return false;
        }

        foreach (var c in storedHash)
        {
            var isHex = (c >= '0' && c <= '9') ||
                        (c >= 'A' && c <= 'F') ||
                        (c >= 'a' && c <= 'f');
            if (!isHex)
            {
                return false;
            }
        }

        return true;
    }

    public static bool Verify(string storedHash, string password, out bool needsRehash)
    {
        needsRehash = false;
        if (string.IsNullOrEmpty(storedHash) || password is null)
        {
            return false;
        }

        if (IsLegacySha256(storedHash))
        {
            var legacy = HashLegacySha256(password);
            var storedBytes = Encoding.ASCII.GetBytes(storedHash.ToUpperInvariant());
            var computedBytes = Encoding.ASCII.GetBytes(legacy);
            if (storedBytes.Length != computedBytes.Length ||
                !CryptographicOperations.FixedTimeEquals(storedBytes, computedBytes))
            {
                return false;
            }

            needsRehash = true;
            return true;
        }

        try
        {
            var result = IdentityHasher.VerifyHashedPassword(HasherUser, storedHash, password);
            if (result == IdentityVerifyResult.Failed)
            {
                return false;
            }

            needsRehash = result == IdentityVerifyResult.SuccessRehashNeeded;
            return true;
        }
        catch (Exception ex) when (ex is FormatException or ArgumentException)
        {
            return false;
        }
    }

    public static bool Matches(string storedHash, string password)
        => Verify(storedHash, password, out _);

    public static bool IsDefaultAdminPassword(string? storedHash)
        => !string.IsNullOrWhiteSpace(storedHash) &&
           Matches(storedHash, DefaultAdminPassword);
}
