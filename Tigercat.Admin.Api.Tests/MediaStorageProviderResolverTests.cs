using Tigercat.Admin.Api.Media;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public class MediaStorageProviderResolverTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Local")]
    [InlineData("local")]
    public void Resolve_WithLocalProvider_ReturnsLocal(string? provider)
    {
        var options = new MediaOptions { Provider = provider ?? string.Empty };

        var resolved = MediaStorageProviderResolver.Resolve(options);

        Assert.Equal("Local", resolved);
    }

    [Fact]
    public void Resolve_WithUnknownProvider_Throws()
    {
        var options = new MediaOptions { Provider = "S3" };

        var ex = Assert.Throws<InvalidOperationException>(() => MediaStorageProviderResolver.Resolve(options));

        Assert.Contains("not registered", ex.Message);
    }
}
