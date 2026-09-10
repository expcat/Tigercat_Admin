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
    public async Task GetApproval_SeedIncludesCountersignActors()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/approvals/AP-1001", token));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.NotNull(body?.Data);
        var manager = body.Data.Steps.First(step => step.Key == "manager");
        Assert.Equal("pending", manager.Status);
        Assert.Equal("countersign", manager.SignMode);
        Assert.NotNull(manager.Actors);
        Assert.Equal(2, manager.Actors.Length);
        Assert.Contains(manager.Actors, actor => actor.Name == "王经理" && actor.Status == "approved");
        Assert.Contains(manager.Actors, actor => actor.Name == "李总监" && actor.Status == "pending");
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
        Assert.Equal("demo", lead.Actor?.Id);
        Assert.Equal("演示用户", lead.Actor?.Name);
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
    public async Task TransferLinkedProgressTicket_DoesNotRegressStatus()
    {
        var token = await LoginAsAdminAsync();
        var before = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/tickets/TK-2048", token));
        before.EnsureSuccessStatusCode();
        var beforeBody = await before.ReadApiResponseAsync<TicketResponse>();
        Assert.Equal("progress", beforeBody?.Data?.Status);

        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new
            {
                title = "转交不回退工单",
                category = "工单",
                reason = "挂接进行中工单后转交",
                assignee = "admin",
                ticketId = "TK-2048",
            }));
        created.EnsureSuccessStatusCode();
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        var id = createdBody!.Data!.Id;

        var transferred = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "transfer", transferTo = "demo" }));
        transferred.EnsureSuccessStatusCode();

        var afterTransfer = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/tickets/TK-2048", token));
        afterTransfer.EnsureSuccessStatusCode();
        var afterTransferBody = await afterTransfer.ReadApiResponseAsync<TicketResponse>();
        Assert.Equal("progress", afterTransferBody?.Data?.Status);

        var approved = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "approve" }));
        approved.EnsureSuccessStatusCode();

        var afterApprove = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/tickets/TK-2048", token));
        var afterApproveBody = await afterApprove.ReadApiResponseAsync<TicketResponse>();
        Assert.Equal("progress", afterApproveBody?.Data?.Status);
    }

    [Fact]
    public async Task RejectLinkedTicket_ClosesTicket()
    {
        var token = await LoginAsAdminAsync();
        var ticketCreated = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/tickets",
            token,
            new
            {
                title = "驳回关闭工单",
                category = "需求",
                priority = "low",
                description = "独立工单，避免污染种子 TK-2050",
            }));
        ticketCreated.EnsureSuccessStatusCode();
        var ticketCreatedBody = await ticketCreated.ReadApiResponseAsync<TicketResponse>();
        var ticketId = ticketCreatedBody!.Data!.Id;

        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new
            {
                title = "驳回关闭工单",
                category = "工单",
                reason = "驳回后工单应关闭",
                assignee = "admin",
                ticketId,
            }));
        created.EnsureSuccessStatusCode();
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        var id = createdBody!.Data!.Id;

        var rejected = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "reject", comment = "不排期" }));
        rejected.EnsureSuccessStatusCode();

        var ticket = await _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/tickets/{ticketId}", token));
        ticket.EnsureSuccessStatusCode();
        var ticketBody = await ticket.ReadApiResponseAsync<TicketResponse>();
        Assert.Equal("closed", ticketBody?.Data?.Status);
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
    public async Task ContactsAndResolveApprovers_CoverAllSourceKinds()
    {
        var token = await LoginAsAdminAsync();
        var contacts = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/approvals/contacts", token));
        contacts.EnsureSuccessStatusCode();
        var contactsBody = await contacts.ReadApiResponseAsync<ApprovalContactsResponse>();
        Assert.NotNull(contactsBody?.Data);
        Assert.Contains(contactsBody.Data.Users, user => user.Id == "wang" && user.Name == "王经理");
        Assert.Contains(contactsBody.Data.Depts, dept => dept.Id == "ops" && dept.LeaderId == "li");
        Assert.Contains(contactsBody.Data.Roles, role => role.Key == "manager");
        Assert.Contains(contactsBody.Data.Groups, group => group.Key == "finance");

        async Task<ApprovalActorResponse[]> ResolveAsync(object body)
        {
            var response = await _client.SendAsync(AuthJson(HttpMethod.Post, "/api/approvals/resolve", token, body));
            response.EnsureSuccessStatusCode();
            var payload = await response.ReadApiResponseAsync<ResolveApproversResponse>();
            Assert.NotNull(payload?.Data?.Actors);
            return payload.Data.Actors;
        }

        var fixedActors = await ResolveAsync(new { source = new { type = "fixed", actors = new[] { new { id = "wang" } } } });
        Assert.Contains(fixedActors, actor => actor.Id == "wang" && actor.Name == "王经理");

        var self = await ResolveAsync(new { source = new { type = "self" }, starter = "admin" });
        Assert.Contains(self, actor => actor.Id == "admin");

        var pick = await ResolveAsync(new { source = new { type = "starter_pick" }, starterPick = new[] { "chen", "fang" } });
        Assert.Equal(2, pick.Length);
        Assert.Contains(pick, actor => actor.Id == "chen");
        Assert.Contains(pick, actor => actor.Id == "fang");

        var role = await ResolveAsync(new { source = new { type = "role", key = "manager" } });
        Assert.Contains(role, actor => actor.Id == "wang");
        Assert.Contains(role, actor => actor.Id == "zhao");

        var group = await ResolveAsync(new { source = new { type = "group", key = "finance" } });
        Assert.Contains(group, actor => actor.Id == "chen");
        Assert.Contains(group, actor => actor.Id == "zhao");

        var leader = await ResolveAsync(new { source = new { type = "dept_leader" }, starter = "admin" });
        Assert.Contains(leader, actor => actor.Id == "li");

        var chain = await ResolveAsync(new { source = new { type = "manager_chain", upTo = 2 }, starter = "admin" });
        Assert.Equal(new[] { "wang", "li" }, chain.Select(actor => actor.Id).ToArray());
    }

    [Fact]
    public async Task SeedCountersign_ExposesPerActorTasks()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/approvals/AP-1006", token));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.NotNull(body?.Data?.Tasks);
        Assert.Equal(3, body.Data.Tasks.Length);
        Assert.Contains(body.Data.Tasks, task => task.Assignee.Id == "admin" && task.Status == "approved");
        Assert.Contains(body.Data.Tasks, task => task.Assignee.Id == "demo" && task.Status == "pending");
        Assert.Contains(body.Data.Tasks, task => task.Assignee.Id == "wang" && task.Status == "pending");
        Assert.NotEmpty(body.Data.History ?? []);
        var countersign = body.Data.Steps.First(step => step.Key == "countersign");
        Assert.Equal("countersign", countersign.SignMode);
        Assert.Equal("active", countersign.Status);
    }

    [Fact]
    public async Task CountersignTasks_RequireEachActorAndCompleteAtThree()
    {
        var token = await LoginAsAdminAsync();
        var second = await RegisterAndLoginAsync("cs2");
        var third = await RegisterAndLoginAsync("cs3");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new
            {
                title = $"会签-{suffix}",
                category = "采购",
                reason = "按人会签 2/3",
                template = "countersign",
                useTasks = true,
                starterPick = new[] { "admin", second.Username, third.Username },
            }));
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        var id = createdBody!.Data!.Id;
        Assert.Equal(3, createdBody.Data.Tasks!.Length);
        Assert.Equal("countersign", createdBody.Data.CurrentStepKey);

        var one = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "approve", comment = "admin 同意" }));
        one.EnsureSuccessStatusCode();
        var oneBody = await one.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", oneBody!.Data!.Status);
        Assert.Equal("countersign", oneBody.Data.CurrentStepKey);
        Assert.Equal(1, oneBody.Data.Tasks!.Count(task => task.Status == "approved"));

        var two = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            second.Token,
            new { action = "approve", comment = "第二人" }));
        two.EnsureSuccessStatusCode();
        var twoBody = await two.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", twoBody!.Data!.Status);
        Assert.Equal(2, twoBody.Data.Tasks!.Count(task => task.Status == "approved"));

        var three = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            third.Token,
            new { action = "approve", comment = "第三人" }));
        three.EnsureSuccessStatusCode();
        var threeBody = await three.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("approved", threeBody!.Data!.Status);
        Assert.Equal(3, threeBody.Data.Tasks!.Count(task => task.Status == "approved"));
        Assert.Contains(threeBody.Data.History!, entry => entry.Action == "approve" && entry.TaskId != null);
    }

    [Fact]
    public async Task AddsignBeforeAfter_InsertsTemporaryNodes()
    {
        var token = await LoginAsAdminAsync();
        var expert = await RegisterAndLoginAsync("expert");
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var beforeCreated = await CreateTicketAsync(token, $"前加签-{suffix}");
        var before = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{beforeCreated}/actions",
            token,
            new { action = "addsign", position = "before", addsignTo = new[] { expert.Username }, comment = "请专家先看" }));
        before.EnsureSuccessStatusCode();
        var beforeBody = await before.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", beforeBody!.Data!.Status);
        Assert.Contains(beforeBody.Data.Steps, step => step.Temporary && step.Origin?.Position == "before" && step.Status == "active");
        Assert.DoesNotContain(beforeBody.Data.Steps, step => step.Key == "lead" && step.Status == "active");

        var restored = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{beforeCreated}/actions",
            expert.Token,
            new { action = "approve", comment = "专家同意" }));
        restored.EnsureSuccessStatusCode();
        var restoredBody = await restored.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("lead", restoredBody!.Data!.CurrentStepKey);
        Assert.Equal("active", restoredBody.Data.Steps.First(step => step.Key == "lead").Status);

        var afterCreated = await CreateTicketAsync(token, $"后加签-{suffix}");
        var after = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{afterCreated}/actions",
            token,
            new { action = "addsign", position = "after", addsignTo = new[] { expert.Username }, comment = "通过后请专家复核" }));
        after.EnsureSuccessStatusCode();
        var afterBody = await after.ReadApiResponseAsync<ApprovalDetailResponse>();
        var temp = afterBody!.Data!.Steps.First(step => step.Temporary && step.Origin?.Position == "after");
        Assert.Equal("active", temp.Status);
        Assert.Equal("approved", afterBody.Data.Steps.First(step => step.Key == "lead").Status);
        Assert.Equal(temp.Key, afterBody.Data.CurrentStepKey);
    }

    [Fact]
    public async Task ReturnResequenceAndDirect_AndRequestChanges()
    {
        var token = await LoginAsAdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var resequenceId = await CreateTicketAsync(token, $"退回重走-{suffix}");
        var toManager = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{resequenceId}/actions",
            token,
            new { action = "approve", comment = "组长过" }));
        toManager.EnsureSuccessStatusCode();
        var returned = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{resequenceId}/actions",
            token,
            new { action = "return", targetNodeKey = "start", resume = "resequence", comment = "退回重填" }));
        returned.EnsureSuccessStatusCode();
        var returnedBody = await returned.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", returnedBody!.Data!.Status);
        Assert.Equal("start", returnedBody.Data.CurrentStepKey);
        Assert.Equal("active", returnedBody.Data.Steps.First(step => step.Key == "start").Status);
        Assert.Equal("pending", returnedBody.Data.Steps.First(step => step.Key == "lead").Status);
        Assert.Contains(returnedBody.Data.History!, entry => entry.Action == "return");

        var resubmit = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{resequenceId}/actions",
            token,
            new { action = "approve", comment = "再提交" }));
        resubmit.EnsureSuccessStatusCode();
        var resubmitBody = await resubmit.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("lead", resubmitBody!.Data!.CurrentStepKey);

        var directId = await CreateTicketAsync(token, $"直达退回-{suffix}");
        await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{directId}/actions",
            token,
            new { action = "approve" }));
        var direct = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{directId}/actions",
            token,
            new { action = "return", targetNodeKey = "lead", resume = "direct", comment = "只改组长" }));
        direct.EnsureSuccessStatusCode();
        var directBody = await direct.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("lead", directBody!.Data!.CurrentStepKey);
        Assert.Equal("manager", directBody.Data.ResumeToNodeKey);

        var changesId = await CreateTicketAsync(token, $"退回修改-{suffix}");
        await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{changesId}/actions",
            token,
            new { action = "approve" }));
        var changes = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{changesId}/actions",
            token,
            new { action = "request_changes", comment = "金额不对" }));
        changes.EnsureSuccessStatusCode();
        var changesBody = await changes.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("start", changesBody!.Data!.CurrentStepKey);
        Assert.Equal("manager", changesBody.Data.ResumeToNodeKey);
        Assert.Contains(changesBody.Data.History!, entry => entry.Action == "request_changes");
    }

    [Fact]
    public async Task CancelWithdrawComment_WriteHistoryWithoutFakeButtons()
    {
        var token = await LoginAsAdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..8];

        var commentId = await CreateTicketAsync(token, $"评论-{suffix}");
        var commented = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{commentId}/actions",
            token,
            new { action = "comment", comment = "先记一笔" }));
        commented.EnsureSuccessStatusCode();
        var commentedBody = await commented.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", commentedBody!.Data!.Status);
        Assert.Equal("lead", commentedBody.Data.CurrentStepKey);
        Assert.Contains(commentedBody.Data.History!, entry => entry.Action == "comment" && entry.Comment == "先记一笔");
        Assert.Contains("先记一笔", commentedBody.Data.Steps.First(step => step.Key == "lead").Comment ?? "");

        var cancelId = await CreateTicketAsync(token, $"撤回-{suffix}");
        var canceled = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{cancelId}/actions",
            token,
            new { action = "cancel", comment = "不走了" }));
        canceled.EnsureSuccessStatusCode();
        var canceledBody = await canceled.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("canceled", canceledBody!.Data!.Status);
        Assert.Contains(canceledBody.Data.History!, entry => entry.Action == "cancel");

        var replay = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{cancelId}/actions",
            token,
            new { action = "approve" }));
        Assert.Equal(HttpStatusCode.BadRequest, replay.StatusCode);

        var withdrawId = await CreateTicketAsync(token, $"撤销-{suffix}");
        var withdrawn = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{withdrawId}/actions",
            token,
            new { action = "withdraw" }));
        withdrawn.EnsureSuccessStatusCode();
        var withdrawnBody = await withdrawn.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("canceled", withdrawnBody!.Data!.Status);
    }

    [Fact]
    public async Task TaskTransfer_ChangesAssigneeAndKeepsNode()
    {
        var token = await LoginAsAdminAsync();
        var target = await RegisterAndLoginAsync("xfer");
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new { title = $"转交任务-{suffix}", category = "工单", reason = "按人转交", useTasks = true, assignee = "admin" }));
        created.EnsureSuccessStatusCode();
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        var id = createdBody!.Data!.Id;
        Assert.NotEmpty(createdBody.Data.Tasks ?? []);

        var transferred = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            $"/api/approvals/{id}/actions",
            token,
            new { action = "transfer", transferTo = target.Username, comment = "请你批" }));
        transferred.EnsureSuccessStatusCode();
        var transferredBody = await transferred.ReadApiResponseAsync<ApprovalDetailResponse>();
        Assert.Equal("pending", transferredBody!.Data!.Status);
        Assert.Equal("lead", transferredBody.Data.CurrentStepKey);
        Assert.Equal(target.Username, transferredBody.Data.Assignee);
        Assert.Contains(transferredBody.Data.Tasks!, task => task.Assignee.Id == target.Username && task.Origin == "transfer");

        var todo = await ListAsync(target.Token, "todo");
        Assert.Contains(todo.Items, item => item.Id == id);
        var adminTodo = await ListAsync(token, "todo");
        Assert.DoesNotContain(adminTodo.Items, item => item.Id == id);
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
        Assert.Contains(collaboration.Children!, item => item.Key == "workflowDesigner" && item.Path == "/workflow-designer");
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

    private async Task<string> CreateTicketAsync(string token, string title)
    {
        var created = await _client.SendAsync(AuthJson(
            HttpMethod.Post,
            "/api/approvals",
            token,
            new { title, category = "工单", reason = title, assignee = "admin" }));
        created.EnsureSuccessStatusCode();
        var createdBody = await created.ReadApiResponseAsync<ApprovalDetailResponse>();
        return createdBody!.Data!.Id;
    }

    private async Task<(string Username, string Token)> RegisterAndLoginAsync(string prefix)
    {
        var username = $"{prefix}-{Guid.NewGuid():N}"[..18];
        var password = "Passw0rd!";
        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(username, password));
        register.EnsureSuccessStatusCode();
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        login.EnsureSuccessStatusCode();
        var body = await login.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data?.Token);
        return (username, body.Data.Token);
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
