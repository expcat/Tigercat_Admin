using System.Net;
using System.Net.Http.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class CollaborationEndpointsTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;

    protected CollaborationEndpointsTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ListTickets_Returns200WithSeededItems()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/tickets?page=1&pageSize=50", token));

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<TicketResponse>>();
        Assert.NotNull(body);
        Assert.True(body.Success);
        Assert.Equal(200, body.Code);
        Assert.NotNull(body.Data);
        Assert.True(body.Data.Total >= 3);
        Assert.Contains(body.Data.Items, item => item.Id == "TK-2048");
        Assert.Contains(body.Data.Items, item => item.Id == "TK-2050");
        Assert.Contains(body.Data.Items, item => item.Id == "TK-2041");
        var seeded = body.Data.Items.First(item => item.Id == "TK-2048");
        Assert.Equal("progress", seeded.Status);
        Assert.NotEmpty(seeded.Messages);
    }

    [Fact]
    public async Task CreateTicket_Returns200()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Post, "/api/tickets", token);
        request.Content = JsonContent.Create(new
        {
            title = "协作接口创建工单",
            category = "咨询",
            priority = "low",
            description = "来自 Api.Tests 的创建用例。"
        });

        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.ReadApiResponseAsync<TicketResponse>();
        Assert.NotNull(body?.Data);
        Assert.True(body.Success);
        Assert.Equal(200, body.Code);
        Assert.StartsWith("TK-", body.Data.Id);
        Assert.Equal("协作接口创建工单", body.Data.Title);
        Assert.Equal("open", body.Data.Status);
        Assert.Equal("low", body.Data.Priority);
        Assert.False(string.IsNullOrWhiteSpace(body.Data.Requester));
    }

    [Fact]
    public async Task SendTicketMessage_Returns200WithSelfAndReply()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Post, "/api/tickets/TK-2050/messages", token);
        request.Content = JsonContent.Create(new { content = "请继续跟进部门筛选。" });

        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<TicketResponse>();
        Assert.NotNull(body?.Data);
        Assert.Equal(200, body.Code);
        Assert.Contains(body.Data.Messages, item => item.Direction == "self" && item.Content == "请继续跟进部门筛选。");
        Assert.Contains(body.Data.Messages, item => item.Direction == "other" && item.Content.Contains("演示自动回复"));
    }

    [Fact]
    public async Task PostComment_Returns200()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Post, "/api/comments", token);
        request.Content = JsonContent.Create(new
        {
            targetType = "ticket",
            targetId = "TK-2050",
            body = "内部备注：已排进下个迭代。"
        });

        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<CommentResponse>();
        Assert.NotNull(body?.Data);
        Assert.Equal(200, body.Code);
        Assert.Equal("内部备注：已排进下个迭代。", body.Data.Content);
        Assert.False(string.IsNullOrWhiteSpace(body.Data.User.Name));

        var listRequest = AuthRequest(HttpMethod.Get, "/api/comments?targetType=ticket&targetId=TK-2050", token);
        var listResponse = await _client.SendAsync(listRequest);
        listResponse.EnsureSuccessStatusCode();
        var listBody = await listResponse.ReadApiResponseAsync<CommentResponse[]>();
        Assert.NotNull(listBody?.Data);
        Assert.Contains(listBody.Data, item => item.Content == "内部备注：已排进下个迭代。");
    }

    [Fact]
    public async Task MissingTicket_Returns404()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/tickets/TK-missing", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.ReadApiResponseAsync<TicketResponse>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(404, body.Code);
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

public class CollaborationEndpointsTestsInMemory : CollaborationEndpointsTests<InMemoryRedisStubApiFactory>
{
    public CollaborationEndpointsTestsInMemory(InMemoryRedisStubApiFactory factory) : base(factory)
    {
    }
}

public class CollaborationEndpointsTestsSqlite : CollaborationEndpointsTests<SqliteRedisStubApiFactory>
{
    public CollaborationEndpointsTestsSqlite(SqliteRedisStubApiFactory factory) : base(factory)
    {
    }
}
