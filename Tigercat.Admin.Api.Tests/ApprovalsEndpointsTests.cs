using System.Net;
using System.Net.Http.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class ApprovalsEndpointsTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;

    protected ApprovalsEndpointsTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetApprovals_WithoutToken_Returns401()
    {
        var response = await _client.GetAsync("/api/approvals?lane=todo");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetApprovals_InvalidLane_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/approvals?lane=inbox", token));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.ReadApiResponseAsync<PagedResponse<ApprovalListItemResponse>>();
        Assert.False(body?.Success);
        Assert.Equal(400, body?.Code);
    }

    [Fact]
    public async Task ListLanes_AsAdmin_ReturnSeededBuckets()
    {
        var token = await LoginAsAdminAsync();

        var todo = await ListAsync(token, "todo");
        Assert.Contains(todo.Items, item => item.Id == "AP-1001");
        Assert.DoesNotContain(todo.Items, item => item.Id == "AP-1004");

        var done = await ListAsync(token, "done");
        Assert.Contains(done.Items, item => item.Id == "AP-1002");
        Assert.Contains(done.Items, item => item.Id == "AP-1005");

        var cc = await ListAsync(token, "cc");
        Assert.Contains(cc.Items, item => item.Id == "AP-1003");
        Assert.Contains(cc.Items, item => item.Id == "AP-1005");

        var started = await ListAsync(token, "started");
        Assert.Contains(started.Items, item => item.Id == "AP-1001");
        Assert.Contains(started.Items, item => item.Id == "AP-1004");
    }

    [Fact]
    public async Task GetApproval_Missing_Returns404()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/approvals/AP-missing", token));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.False(body?.Success);
        Assert.Equal(404, body?.Code);
    }

    [Fact]
    public async Task ApproveRejectTransfer_WriteBackInstanceState()
    {
        var token = await LoginAsAdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new
            {
                title = $"状态机-{suffix}",
                category = "工单",
                reason = "测试同意/驳回/转交写回",
                assignee = "admin",
                cc = new[] { "demo" },
            }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.NotNull(createdBody?.Data);
        var id = createdBody.Data.Id;
        Assert.Equal("pending", createdBody.Data.Status);
        Assert.Equal("lead", createdBody.Data.CurrentStepKey);
        Assert.Contains(createdBody.Data.Steps, step => step.Key == "lead" && step.Status == "active");

        var transferred = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "transfer", transferTo = "demo", comment = "先交给 demo" }));
        transferred.EnsureSuccessStatusCode();
        var transferredBody = await transferred.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", transferredBody?.Data?.Status);
        Assert.Equal("demo", transferredBody?.Data?.Assignee);
        Assert.Contains(transferredBody!.Data!.ActedBy, actor => actor == "admin");
        var lead = transferredBody.Data.Steps.First(step => step.Key == "lead");
        Assert.Equal("active", lead.Status);
        Assert.Equal("demo", lead.Actor?.Name);
        Assert.Equal("transfer", lead.Action);

        var afterTransferTodo = await ListAsync(token, "todo");
        Assert.DoesNotContain(afterTransferTodo.Items, item => item.Id == id);
        var afterTransferDone = await ListAsync(token, "done");
        Assert.Contains(afterTransferDone.Items, item => item.Id == id);

        var rejected = await CreateAndActAsync(token, $"驳回-{suffix}", "reject", "资料不全");
        Assert.Equal("rejected", rejected.Status);
        var rejectedLead = rejected.Steps.First(step => step.Key == "lead");
        Assert.Equal("rejected", rejectedLead.Status);
        Assert.True(rejectedLead.RollbackPoint);
        Assert.Equal("reject", rejectedLead.Action);

        var approved = await CreateAndActAsync(token, $"通过-{suffix}", "approve", "同意");
        Assert.Equal("pending", approved.Status);
        Assert.Equal("manager", approved.CurrentStepKey);
        Assert.Equal("approved", approved.Steps.First(step => step.Key == "lead").Status);
        Assert.Equal("active", approved.Steps.First(step => step.Key == "manager").Status);

        var managerDone = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{approved.Id}/actions",
            token,
            new { action = "approve", comment = "经理同意" }));
        managerDone.EnsureSuccessStatusCode();
        var managerBody = await managerDone.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", managerBody?.Data?.Status);
        Assert.Equal("archive", managerBody?.Data?.CurrentStepKey);

        var finished = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{approved.Id}/actions",
            token,
            new { action = "approve", comment = "归档" }));
        finished.EnsureSuccessStatusCode();
        var finishedBody = await finished.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("approved", finishedBody?.Data?.Status);
        Assert.All(finishedBody!.Data!.Steps, step => Assert.Equal("approved", step.Status));

        var replay = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{approved.Id}/actions",
            token,
            new { action = "approve" }));
        Assert.Equal(HttpStatusCode.BadRequest, replay.StatusCode);
    }

    [Fact]
    public async Task ApproveLinkedTicket_UpdatesTicketStatus()
    {
        var token = await LoginAsAdminAsync();
        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new
            {
                title = "挂接工单演示",
                category = "工单",
                reason = "写回工单状态",
                assignee = "admin",
                ticketId = "TK-2050",
            }));
        created.EnsureSuccessStatusCode();
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        var id = createdBody!.Data!.Id;

        var approveLead = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "approve" }));
        approveLead.EnsureSuccessStatusCode();

        var ticket = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/tickets/TK-2050", token));
        ticket.EnsureSuccessStatusCode();
        var ticketBody = await ticket.ReadApiResponseAsync<TicketResponse>();
        Assert.Equal("progress", ticketBody?.Data?.Status);

        var approveManager = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "approve" }));
        approveManager.EnsureSuccessStatusCode();
        var approveArchive = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "approve" }));
        approveArchive.EnsureSuccessStatusCode();
        var done = await approveArchive.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("approved", done?.Data?.Status);

        var ticketAfter = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/tickets/TK-2050", token));
        var ticketAfterBody = await ticketAfter.ReadApiResponseAsync<TicketResponse>();
        Assert.Equal("resolved", ticketAfterBody?.Data?.Status);
    }

    [Fact]
    public async Task MenuSchema_IncludesApprovals()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/menus/schema", token));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MenuSchemaResponse>();
        var collaboration = body!.Data!.Items.First(item => item.Key == "collaborationGroup");
        Assert.Contains(collaboration.Children!, item => item.Key == "approvals" && item.Path == "/approvals");
    }

    private async Task<PagedResponse<ApprovalListItemResponse>> ListAsync(string token, string lane)
    {
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/approvals?lane={lane}&pageSize=50", token));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<ApprovalListItemResponse>>();
        Assert.NotNull(body?.Data);
        return body.Data;
    }

    private async Task<ApprovalDetailResponse> CreateAndActAsync(string token, string title, string action, string comment)
    {
        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new { title, category = "工单", reason = title, assignee = "admin" }));
        created.EnsureSuccessStatusCode();
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        var acted = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{createdBody!.Data!.Id}/actions",
            token,
            new { action, comment }));
        acted.EnsureSuccessStatusCode();
        var actedBody = await acted.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.NotNull(actedBody?.Data);
        return actedBody.Data;
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

    private static HttpRequestMessage AuthJson(HttpMethod method, string url, string token, object body)
    {
        var request = AuthRequest(method, url, token);
        request.Content = JsonContent.Create(body);
        return request;
    }
}

public class ApprovalsEndpointsTestsInMemory : ApprovalsEndpointsTests<InMemoryRedisStubApiFactory>
{
    public ApprovalsEndpointsTestsInMemory(InMemoryRedisStubApiFactory factory) : base(factory)
    {
    }
}

public class ApprovalsEndpointsTestsSqlite : ApprovalsEndpointsTests<SqliteRedisStubApiFactory>
{
    public ApprovalsEndpointsTestsSqlite(SqliteRedisStubApiFactory factory) : base(factory)
    {
    }
}
