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
        var menus = system.Children.First(item => item.Key == "menus");
        Assert.Equal("menu:view", menus.Permission);
        Assert.Equal("/menus", menus.Path);
    }

    [Fact]
    public async Task CreateMenuNode_WithoutToken_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/menus/nodes", new { key = "x", label = "X" });
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MenuNodeCrud_AsAdmin_PersistsInSchema()
    {
        var token = await LoginAsAdminAsync();
        var key = UniqueKey("node");

        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/menus/nodes",
            token,
            new
            {
                key,
                label = "演示节点",
                icon = "menu",
                path = "/help",
                permission = "dashboard:view",
                parentKey = "system",
                hideInMenu = false,
                hideInBreadcrumb = true,
                flatMenu = false,
            }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var createdBody = await created.ReadApiResponseAsync<MenuSchemaNodeResponse>();
        Assert.NotNull(createdBody?.Data);
        Assert.Equal(key, createdBody.Data.Key);
        Assert.Equal("演示节点", createdBody.Data.Label);
        Assert.True(createdBody.Data.HideInBreadcrumb);

        var schemaAfterCreate = await GetSchemaAsync(token);
        var system = schemaAfterCreate.Items.First(item => item.Key == "system");
        Assert.Contains(system.Children!, item => item.Key == key);

        var updated = await _client.SendAsync(AuthJson(
            HttpMethod.Put,
            $"/api/menus/nodes/{key}",
            token,
            new { label = "演示节点已改", permission = "menu:view" }));
        updated.EnsureSuccessStatusCode();
        var updatedBody = await updated.ReadApiResponseAsync<MenuSchemaNodeResponse>();
        Assert.Equal("演示节点已改", updatedBody!.Data!.Label);
        Assert.Equal("menu:view", updatedBody.Data.Permission);

        var deleted = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/menus/nodes/{key}", token));
        deleted.EnsureSuccessStatusCode();
        var schemaAfterDelete = await GetSchemaAsync(token);
        var systemAfterDelete = schemaAfterDelete.Items.First(item => item.Key == "system");
        Assert.DoesNotContain(systemAfterDelete.Children!, item => item.Key == key);
    }

    [Fact]
    public async Task CreateMenuNode_DuplicateKey_Returns409()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/menus/nodes",
            token,
            new { key = "home", label = "重复" }));
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMenuNode_Home_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Delete, "/api/menus/nodes/home", token));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteMenuNode_WithChildren_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Delete, "/api/menus/nodes/system", token));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UpdateMenuNode_UnknownKey_Returns404()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthJson(
            HttpMethod.Put,
            "/api/menus/nodes/missing-node",
            token,
            new { label = "不存在" }));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private async Task<MenuSchemaResponse> GetSchemaAsync(string token)
    {
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/menus/schema", token));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MenuSchemaResponse>();
        Assert.NotNull(body?.Data);
        return body.Data;
    }

    private async Task<string> LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin", "admin123"));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data?.Token);
        return body.Data.Token;
    }

    private static string UniqueKey(string prefix)
        => $"{prefix}{Guid.NewGuid():N}"[..16];

    private static HttpRequestMessage AuthRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Token", token);
        return request;
    }

    private static HttpRequestMessage AuthJson(HttpMethod method, string url, string token, object body)
    {
        var request = AuthRequest(method, url, token);
        request.Content = JsonContent.Create(body);
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
