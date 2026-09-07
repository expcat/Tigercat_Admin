using System.Net;
using System.Net.Http.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class MenusEndpointsTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;

    protected MenusEndpointsTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMenuSchema_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/menus/schema");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetMenuSchema_AsAdmin_ReturnsSidebarTree()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/menus/schema", token));

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MenuSchemaResponse>();
        Assert.NotNull(body?.Data);
        Assert.True(body.Success);
        Assert.Equal(200, body.Code);
        Assert.Contains(body.Data.Items, item => item.Key == "home");
        Assert.Contains(body.Data.Items, item => item.Key == "system");
        Assert.Contains(body.Data.BottomItems, item => item.Key == "about");

        var system = body.Data.Items.First(item => item.Key == "system");
        Assert.NotNull(system.Children);
        var users = system.Children.First(item => item.Key == "users");
        Assert.Equal("user:view", users.Permission);
        Assert.Equal("/users", users.Path);
    }

    private async Task<string> LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin", "admin123"));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data?.Token);
        return body.Data.Token;
    }

    private static HttpRequestMessage AuthRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Token", token);
        return request;
    }
}

public class MenusEndpointsTestsInMemory : MenusEndpointsTests<InMemoryRedisStubApiFactory>
{
    public MenusEndpointsTestsInMemory(InMemoryRedisStubApiFactory factory) : base(factory)
    {
    }
}

public class MenusEndpointsTestsSqlite : MenusEndpointsTests<SqliteRedisStubApiFactory>
{
    public MenusEndpointsTestsSqlite(SqliteRedisStubApiFactory factory) : base(factory)
    {
    }
}
