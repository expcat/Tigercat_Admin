using Microsoft.Extensions.DependencyInjection;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public class CacheServiceTests : IClassFixture<InMemoryApiFactory>
{
    private readonly InMemoryApiFactory _factory;

    public CacheServiceTests(InMemoryApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HybridCacheService_GetSetRemove_RoundTrip()
    {
        var cache = _factory.Services.GetRequiredService<ICacheService>();
        var key = $"cache:test:{Guid.NewGuid():N}";

        Assert.Null(await cache.GetAsync<string>(key));

        await cache.SetAsync(key, "hello", TimeSpan.FromMinutes(1));
        Assert.Equal("hello", await cache.GetAsync<string>(key));

        var cached = await cache.GetOrSetAsync(
            key,
            _ => Task.FromResult("factory-should-not-run"),
            TimeSpan.FromMinutes(1));
        Assert.Equal("hello", cached);

        await cache.RemoveAsync(key);
        Assert.Null(await cache.GetAsync<string>(key));
    }

    [Fact]
    public async Task HybridCacheService_GetOrSet_ProtectsStampede()
    {
        var cache = _factory.Services.GetRequiredService<ICacheService>();
        var key = $"cache:test:stampede:{Guid.NewGuid():N}";
        var calls = 0;

        async Task<string> Factory(CancellationToken ct)
        {
            Interlocked.Increment(ref calls);
            await Task.Delay(50, ct);
            return "value";
        }

        var results = await Task.WhenAll(
            cache.GetOrSetAsync(key, Factory, TimeSpan.FromMinutes(1)),
            cache.GetOrSetAsync(key, Factory, TimeSpan.FromMinutes(1)),
            cache.GetOrSetAsync(key, Factory, TimeSpan.FromMinutes(1)));

        Assert.All(results, value => Assert.Equal("value", value));
        Assert.Equal(1, calls);
    }
}
