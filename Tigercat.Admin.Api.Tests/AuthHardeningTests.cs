using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Health;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class AuthHashUpgradeTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly TFixture _factory;
    private readonly HttpClient _client;

    protected AuthHashUpgradeTests(TFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_WithLegacySha256Hash_UpgradesToIdentityHash()
    {
        var username = $"sha-{Guid.NewGuid():N}"[..20];
        var password = "upgrade-pass-1";
        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(username, password));
        register.EnsureSuccessStatusCode();

        using (var scope = _factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<IUserStore>();
            var updated = await users.UpdatePasswordAsync(username, PasswordHasher.HashLegacySha256(password));
            Assert.True(updated);
            var before = await users.GetPasswordHashAsync(username);
            Assert.True(PasswordHasher.IsLegacySha256(before));
        }

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        login.EnsureSuccessStatusCode();
        var body = await login.ReadApiResponseAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body?.Data?.Token));

        using (var scope = _factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<IUserStore>();
            var after = await users.GetPasswordHashAsync(username);
            Assert.False(string.IsNullOrWhiteSpace(after));
            Assert.False(PasswordHasher.IsLegacySha256(after));
            Assert.True(PasswordHasher.Matches(after!, password));
        }

        var second = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        second.EnsureSuccessStatusCode();
    }
}

public class AuthHashUpgradeTestsInMemory : AuthHashUpgradeTests<InMemoryApiFactory>
{
    public AuthHashUpgradeTestsInMemory(InMemoryApiFactory factory) : base(factory)
    {
    }
}

public class AuthHashUpgradeTestsSqlite : AuthHashUpgradeTests<SqliteApiFactory>
{
    public AuthHashUpgradeTestsSqlite(SqliteApiFactory factory) : base(factory)
    {
    }
}

public class AuthRateLimitTests
{
    [Fact]
    public async Task AuthIpLimiter_ReturnsApiResponse429()
    {
        await using var factory = new StrictAuthRateLimitApiFactory();
        var client = factory.CreateClient();

        HttpResponseMessage? last = null;
        for (var i = 0; i < 5; i++)
        {
            last = await client.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest($"lim-{i}-{Guid.NewGuid():N}"[..20], "wrong-password"));
            Assert.Equal(HttpStatusCode.Unauthorized, last.StatusCode);
        }

        last = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest($"lim-x-{Guid.NewGuid():N}"[..20], "wrong-password"));

        Assert.Equal(HttpStatusCode.TooManyRequests, last.StatusCode);
        var body = await last.ReadApiResponseAsync<object>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(429, body.Code);
        Assert.Contains("请求过于频繁", body.Message);
    }

    [Fact]
    public async Task LockoutAndLimiter_BothReturnApiResponse429()
    {
        await using var factory = new LockoutAndLimiterApiFactory();
        var client = factory.CreateClient();
        var lockedUser = $"lock-{Guid.NewGuid():N}"[..20];

        for (var i = 0; i < 5; i++)
        {
            var failed = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(lockedUser, "wrong-password"));
            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        var lockout = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(lockedUser, "wrong-password"));
        Assert.Equal(HttpStatusCode.TooManyRequests, lockout.StatusCode);
        var lockoutBody = await lockout.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(lockoutBody);
        Assert.Equal(429, lockoutBody.Code);
        Assert.Contains("登录失败次数过多", lockoutBody.Message);

        for (var i = 0; i < 2; i++)
        {
            var other = await client.PostAsJsonAsync(
                "/api/auth/login",
                new LoginRequest($"other-{i}-{Guid.NewGuid():N}"[..20], "wrong-password"));
            Assert.Equal(HttpStatusCode.Unauthorized, other.StatusCode);
        }

        var limited = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest($"burst-{Guid.NewGuid():N}"[..20], "wrong-password"));
        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        var limitedBody = await limited.ReadApiResponseAsync<object>();
        Assert.NotNull(limitedBody);
        Assert.Equal(429, limitedBody.Code);
        Assert.Contains("请求过于频繁", limitedBody.Message);
    }
}

public class OpenApiAuthTests : IClassFixture<InMemoryApiFactory>
{
    private readonly HttpClient _client;

    public OpenApiAuthTests(InMemoryApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task DevelopmentOpenApi_DocumentsSessionTokenSchemes()
    {
        var response = await _client.GetAsync("/openapi/v1.json");
        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync();
        Assert.Contains("X-Token", json, StringComparison.Ordinal);
        Assert.Contains("bearer", json, StringComparison.OrdinalIgnoreCase);
    }
}

public class ProductionOpenApiDisabledTests : IClassFixture<ProductionSecurityApiFactory>
{
    private readonly HttpClient _client;

    public ProductionOpenApiDisabledTests(ProductionSecurityApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ProductionOpenApi_IsDisabledByDefault()
    {
        var response = await _client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}

public class ProductionOpenApiEnabledTests : IClassFixture<ProductionOpenApiApiFactory>
{
    private readonly HttpClient _client;

    public ProductionOpenApiEnabledTests(ProductionOpenApiApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ProductionOpenApi_RequiresLoginAndDocumentsSchemes()
    {
        var anonymous = await _client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin", "admin123"));
        login.EnsureSuccessStatusCode();
        var session = await login.ReadApiResponseAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(session?.Data?.Token));

        var request = new HttpRequestMessage(HttpMethod.Get, "/openapi/v1.json");
        request.Headers.Add("X-Token", session!.Data!.Token);
        var authed = await _client.SendAsync(request);
        authed.EnsureSuccessStatusCode();
        var json = await authed.Content.ReadAsStringAsync();
        Assert.Contains("X-Token", json, StringComparison.Ordinal);
        Assert.Contains("bearer", json, StringComparison.OrdinalIgnoreCase);
    }
}

public class ProductionHealthPasswordTests : IClassFixture<ProductionSecurityApiFactory>
{
    private readonly ProductionSecurityApiFactory _factory;
    private readonly HttpClient _client;

    public ProductionHealthPasswordTests(ProductionSecurityApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HealthCheck_DetectsLegacySha256DefaultAdminPassword()
    {
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var admin = await db.Users.SingleAsync(u => u.Username == "admin");
            admin.PasswordHash = PasswordHasher.HashLegacySha256(PasswordHasher.DefaultAdminPassword);
            await db.SaveChangesAsync();
        }

        var response = await _client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.ReadApiResponseAsync<HealthResponse>();
        Assert.NotNull(body?.Data?.Details);
        Assert.Equal("unhealthy", body.Data.Details["security"].Status);
        Assert.Contains("Default admin password", body.Data.Details["security"].Message);
    }
}
