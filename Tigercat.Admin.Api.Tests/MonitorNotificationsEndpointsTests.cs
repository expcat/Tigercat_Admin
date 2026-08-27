using System.Net;
using System.Net.Http.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class MonitorNotificationsEndpointsTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;

    protected MonitorNotificationsEndpointsTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMonitorSnapshot_AsAdmin_Returns200WithMetrics()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/monitor/snapshot", token));

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MonitorSnapshotResponse>();
        Assert.NotNull(body?.Data);
        Assert.True(body.Success);
        Assert.Equal(200, body.Code);
        Assert.InRange(body.Data.Cpu, 0, 100);
        Assert.InRange(body.Data.Memory, 0, 100);
        Assert.InRange(body.Data.Disk, 0, 100);
        Assert.True(body.Data.Qps >= 0);
        Assert.True(body.Data.Latency >= 0);
        Assert.NotEmpty(body.Data.Nodes);
        Assert.Contains(body.Data.Nodes, node => node.Id == "api-hz-1");
        Assert.Contains(body.Data.Nodes, node => node.Id == "api-bj-1");
        Assert.Contains(body.Data.Nodes, node => node.Id == "worker-hz-1");
        Assert.Contains(body.Data.Nodes, node => node.Id == "cache-hz-1");
        Assert.All(body.Data.Nodes, node =>
            Assert.Contains(node.Status, (string[])["healthy", "warning", "critical"]));
        Assert.NotEmpty(body.Data.Events);
        Assert.All(body.Data.Events, item =>
        {
            Assert.False(string.IsNullOrWhiteSpace(item.Id));
            Assert.False(string.IsNullOrWhiteSpace(item.Title));
            Assert.False(string.IsNullOrWhiteSpace(item.Status.Label));
            Assert.False(string.IsNullOrWhiteSpace(item.Status.Variant));
        });
        Assert.False(string.IsNullOrWhiteSpace(body.Data.ServerTime));
        Assert.True(DateTime.TryParse(body.Data.ServerTime, out _));
    }

    [Fact]
    public async Task CreateNotification_AsAdmin_Returns200AndAppearsOnList()
    {
        var token = await LoginAsAdminAsync();
        var title = $"R8 广播 {Guid.NewGuid():N}";
        var create = AuthRequest(HttpMethod.Post, "/api/notifications", token);
        create.Content = JsonContent.Create(new
        {
            groupKey = "ops",
            title,
            description = "监控快照与通知广播验收",
            toastType = "info",
            linkUrl = "/monitor",
            meta = new Dictionary<string, string> { ["source"] = "r8-test" }
        });

        var createResponse = await _client.SendAsync(create);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.ReadApiResponseAsync<NotificationItemResponse>();
        Assert.NotNull(created?.Data);
        Assert.True(created.Success);
        Assert.Equal(200, created.Code);
        Assert.False(string.IsNullOrWhiteSpace(created.Data.Id));
        Assert.Equal("ops", created.Data.GroupKey);
        Assert.Equal(title, created.Data.Title);
        Assert.Equal("监控快照与通知广播验收", created.Data.Description);
        Assert.Equal("info", created.Data.ToastType);
        Assert.Equal("/monitor", created.Data.LinkUrl);
        Assert.False(created.Data.Read);
        Assert.Equal("r8-test", created.Data.Meta["source"]);

        var listResponse = await _client.SendAsync(
            AuthRequest(HttpMethod.Get, "/api/notifications?page=1&pageSize=100", token));
        listResponse.EnsureSuccessStatusCode();
        var listed = await listResponse.ReadApiResponseAsync<PagedResponse<NotificationItemResponse>>();
        Assert.NotNull(listed?.Data);
        Assert.Contains(listed.Data.Items, item => item.Id == created.Data.Id && item.Title == title && !item.Read);
    }

    [Fact]
    public async Task CreateNotification_DemoWithoutCreatePermission_Returns403()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("demo", "demo"));
        login.EnsureSuccessStatusCode();
        var challenge = await login.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(challenge?.Data?.ChallengeId);

        var verify = await _client.PostAsJsonAsync(
            "/api/auth/two-factor/verify",
            new TwoFactorVerifyRequest("demo", AuthDemoCodes.OtpCode, challenge.Data.ChallengeId));
        verify.EnsureSuccessStatusCode();
        var session = await verify.ReadApiResponseAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(session?.Data?.Token));

        var create = AuthRequest(HttpMethod.Post, "/api/notifications", session!.Data!.Token);
        create.Content = JsonContent.Create(new
        {
            groupKey = "ops",
            title = "演示账号不应创建通知",
            description = "403",
            toastType = "info"
        });

        var response = await _client.SendAsync(create);
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.ReadApiResponseAsync<NotificationItemResponse>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(403, body.Code);
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

public class MonitorNotificationsEndpointsTestsInMemory : MonitorNotificationsEndpointsTests<InMemoryRedisStubApiFactory>
{
    public MonitorNotificationsEndpointsTestsInMemory(InMemoryRedisStubApiFactory factory) : base(factory)
    {
    }
}

public class MonitorNotificationsEndpointsTestsSqlite : MonitorNotificationsEndpointsTests<SqliteRedisStubApiFactory>
{
    public MonitorNotificationsEndpointsTestsSqlite(SqliteRedisStubApiFactory factory) : base(factory)
    {
    }
}
