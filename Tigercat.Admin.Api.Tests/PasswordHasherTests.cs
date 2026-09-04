using Tigercat.Admin.Api.Auth;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public class PasswordHasherTests
{
    [Fact]
    public void Hash_IsNotLegacySha256Hex()
    {
        var hash = PasswordHasher.Hash("admin123");

        Assert.False(PasswordHasher.IsLegacySha256(hash));
        Assert.InRange(hash.Length, 65, 128);
        Assert.True(PasswordHasher.Matches(hash, "admin123"));
        Assert.False(PasswordHasher.Matches(hash, "wrong"));
    }

    [Fact]
    public void Verify_LegacySha256_SucceedsAndNeedsRehash()
    {
        var legacy = PasswordHasher.HashLegacySha256("demo-pass");

        Assert.True(PasswordHasher.IsLegacySha256(legacy));
        Assert.True(PasswordHasher.Verify(legacy, "demo-pass", out var needsRehash));
        Assert.True(needsRehash);
        Assert.False(PasswordHasher.Verify(legacy, "other", out _));
    }

    [Fact]
    public void IsDefaultAdminPassword_DetectsIdentityAndLegacyHashes()
    {
        Assert.True(PasswordHasher.IsDefaultAdminPassword(PasswordHasher.Hash("admin123")));
        Assert.True(PasswordHasher.IsDefaultAdminPassword(PasswordHasher.HashLegacySha256("admin123")));
        Assert.False(PasswordHasher.IsDefaultAdminPassword(PasswordHasher.Hash("rotated-pass")));
        Assert.False(PasswordHasher.IsDefaultAdminPassword(null));
    }
}
