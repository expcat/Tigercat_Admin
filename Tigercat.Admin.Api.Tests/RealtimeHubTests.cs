using System.Net.Http.Json;
using System.Net;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.AspNetCore.Http.Connections;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Hubs;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class RealtimeHubTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly TFixture _factory;
    private readonly HttpClient _client;

    protected RealtimeHubTests(TFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetMonitorSnapshot_StillWorksWithoutHub()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/monitor/snapshot", token));

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MonitorSnapshotResponse>();
        Assert.NotNull(body?.Data);
        Assert.True(body.Success);
        Assert.Contains(body.Data.Nodes, node => node.Id == "api-hz-1");
    }

    [Fact]
    public async Task MonitorHub_RequiresLogin()
    {
        await using var connection = CreateHubConnection(RealtimeHubs.MonitorPath, token: null);
        var error = await Record.ExceptionAsync(() => connection.StartAsync());
        Assert.NotNull(error);
        Assert.Equal(HubConnectionState.Disconnected, connection.State);
    }

    [Fact]
    public async Task MonitorHub_StartPushesSnapshot_StopStopsPushing()
    {
        var token = await LoginAsAdminAsync();
        await using var connection = CreateHubConnection(RealtimeHubs.MonitorPath, token);
        var snapshots = new List<MonitorSnapshotResponse>();
        var first = new TaskCompletionSource<MonitorSnapshotResponse>(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.On<MonitorSnapshotResponse>(RealtimeHubs.SnapshotEvent, snapshot =>
        {
            snapshots.Add(snapshot);
            first.TrySetResult(snapshot);
        });

        await connection.StartAsync();
        await connection.InvokeAsync("Start", 2);
        var received = await first.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.False(string.IsNullOrWhiteSpace(received.ServerTime));
        Assert.Contains(received.Nodes, node => node.Id == "cache-hz-1");

        await connection.InvokeAsync("Stop");
        var countAfterStop = snapshots.Count;
        await Task.Delay(TimeSpan.FromSeconds(3));
        Assert.Equal(countAfterStop, snapshots.Count);
    }

    [Fact]
    public async Task MonitorHub_StartRejectsInvalidInterval()
    {
        var token = await LoginAsAdminAsync();
        await using var connection = CreateHubConnection(RealtimeHubs.MonitorPath, token);
        await connection.StartAsync();

        var error = await Assert.ThrowsAsync<HubException>(() => connection.InvokeAsync("Start", 1));
        Assert.Contains("2、3 或 5", error.Message);
    }

    [Fact]
    public async Task ChatRest_GetAndPost_StillWork()
    {
        var token = await LoginAsAdminAsync();
        var listResponse = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/chat/messages", token));
        listResponse.EnsureSuccessStatusCode();
        var listed = await listResponse.ReadApiResponseAsync<ChatMessageResponse[]>();
        Assert.NotNull(listed?.Data);
        Assert.Contains(listed.Data, item => item.Direction == "other");

        var create = AuthRequest(HttpMethod.Post, "/api/chat/messages", token);
        create.Content = JsonContent.Create(new { content = "实时通道验收" });
        var createResponse = await _client.SendAsync(create);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.ReadApiResponseAsync<ChatMessageResponse[]>();
        Assert.NotNull(created?.Data);
        Assert.Contains(created.Data, item => item.Content == "实时通道验收" && item.Direction == "self");
        Assert.Contains(created.Data, item => item.Content.Contains("已收到你的消息") && item.Direction == "other");
    }

    [Fact]
    public async Task ChatHub_PostFansOutToConnectedClients()
    {
        var token = await LoginAsAdminAsync();
        await using var first = CreateHubConnection(RealtimeHubs.ChatPath, token);
        await using var second = CreateHubConnection(RealtimeHubs.ChatPath, token);
        var firstReceived = new TaskCompletionSource<ChatMessageResponse[]>(TaskCreationOptions.RunContinuationsAsynchronously);
        var secondReceived = new TaskCompletionSource<ChatMessageResponse[]>(TaskCreationOptions.RunContinuationsAsynchronously);
        first.On<ChatMessageResponse[]>(RealtimeHubs.MessagesEvent, messages => firstReceived.TrySetResult(messages));
        second.On<ChatMessageResponse[]>(RealtimeHubs.MessagesEvent, messages => secondReceived.TrySetResult(messages));

        await first.StartAsync();
        await second.StartAsync();

        var create = AuthRequest(HttpMethod.Post, "/api/chat/messages", token);
        create.Content = JsonContent.Create(new { content = "双端可见" });
        var createResponse = await _client.SendAsync(create);
        createResponse.EnsureSuccessStatusCode();

        var fromFirst = await firstReceived.Task.WaitAsync(TimeSpan.FromSeconds(5));
        var fromSecond = await secondReceived.Task.WaitAsync(TimeSpan.FromSeconds(5));
        Assert.Contains(fromFirst, item => item.Content == "双端可见" && item.Direction == "self");
        Assert.Contains(fromSecond, item => item.Content.Contains("已收到你的消息") && item.Direction == "other");
    }

    [Fact]
    public async Task ChatHub_RequiresLogin()
    {
        await using var connection = CreateHubConnection(RealtimeHubs.ChatPath, token: null);
        var error = await Record.ExceptionAsync(() => connection.StartAsync());
        Assert.NotNull(error);
        Assert.Equal(HubConnectionState.Disconnected, connection.State);
    }

    [Fact]
    public async Task PasswordChangeAndReset_RevokeAllHttpSessionsAndDisconnectHubs()
    {
        var username = $"session-{Guid.NewGuid():N}"[..24];
        const string oldPassword = "old-pass-123";
        const string newPassword = "new-pass-456";
        const string resetPassword = "reset-pass-789";
        (await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(username, oldPassword))).EnsureSuccessStatusCode();

        var firstToken = await LoginAsync(username, oldPassword);
        var secondToken = await LoginAsync(username, oldPassword);
        await using var monitor = CreateHubConnection(RealtimeHubs.MonitorPath, firstToken);
        await using var chat = CreateHubConnection(RealtimeHubs.ChatPath, secondToken);
        var monitorClosed = TrackClosed(monitor);
        var chatClosed = TrackClosed(chat);
        await monitor.StartAsync();
        await chat.StartAsync();
        await monitor.InvokeAsync("Start", 2);

        var change = AuthRequest(HttpMethod.Post, "/api/auth/change-password", firstToken);
        change.Content = JsonContent.Create(new ChangePasswordRequest(oldPassword, newPassword));
        (await _client.SendAsync(change)).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/home", firstToken))).StatusCode);
        var sendWithOldToken = AuthRequest(HttpMethod.Post, "/api/chat/messages", secondToken);
        sendWithOldToken.Content = JsonContent.Create(new { content = "撤销后不能发送" });
        Assert.Equal(HttpStatusCode.Unauthorized, (await _client.SendAsync(sendWithOldToken)).StatusCode);
        await Task.WhenAll(monitorClosed, chatClosed).WaitAsync(TimeSpan.FromSeconds(5));

        await using var staleMonitor = CreateHubConnection(RealtimeHubs.MonitorPath, firstToken);
        await using var staleChat = CreateHubConnection(RealtimeHubs.ChatPath, secondToken);
        Assert.NotNull(await Record.ExceptionAsync(() => staleMonitor.StartAsync()));
        Assert.NotNull(await Record.ExceptionAsync(() => staleChat.StartAsync()));

        firstToken = await LoginAsync(username, newPassword);
        secondToken = await LoginAsync(username, newPassword);
        await using var resetMonitor = CreateHubConnection(RealtimeHubs.MonitorPath, firstToken);
        await using var resetChat = CreateHubConnection(RealtimeHubs.ChatPath, secondToken);
        monitorClosed = TrackClosed(resetMonitor);
        chatClosed = TrackClosed(resetChat);
        await resetMonitor.StartAsync();
        await resetChat.StartAsync();
        await resetMonitor.InvokeAsync("Start", 2);

        var target = $"{username}@tigercat.local";
        (await _client.PostAsJsonAsync(
            "/api/auth/forgot-password/code",
            new ForgotPasswordCodeRequest("email", target))).EnsureSuccessStatusCode();
        (await _client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordResetRequest("email", target, AuthDemoCodes.OtpCode, resetPassword))).EnsureSuccessStatusCode();

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/home", firstToken))).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,
            (await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/home", secondToken))).StatusCode);
        await Task.WhenAll(monitorClosed, chatClosed).WaitAsync(TimeSpan.FromSeconds(5));
        await using var staleResetMonitor = CreateHubConnection(RealtimeHubs.MonitorPath, firstToken);
        await using var staleResetChat = CreateHubConnection(RealtimeHubs.ChatPath, secondToken);
        Assert.NotNull(await Record.ExceptionAsync(() => staleResetMonitor.StartAsync()));
        Assert.NotNull(await Record.ExceptionAsync(() => staleResetChat.StartAsync()));
        await LoginAsync(username, resetPassword);
    }

    private static Task TrackClosed(HubConnection connection)
    {
        var closed = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        connection.Closed += _ =>
        {
            closed.TrySetResult();
            return Task.CompletedTask;
        };
        return closed.Task;
    }

    private async Task<string> LoginAsync(string username, string password)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        response.EnsureSuccessStatusCode();
        return (await response.ReadApiResponseAsync<LoginResponse>())!.Data!.Token!;
    }

    private HubConnection CreateHubConnection(string path, string? token)
    {
        return new HubConnectionBuilder()
            .WithUrl(new Uri(_factory.Server.BaseAddress!, path.TrimStart('/')), options =>
            {
                options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
                options.Transports = HttpTransportType.WebSockets;
                options.WebSocketFactory = async (context, cancellationToken) =>
                {
                    var client = _factory.Server.CreateWebSocketClient();
                    if (!string.IsNullOrWhiteSpace(token))
                    {
                        client.ConfigureRequest = request => request.Headers[AuthConstants.TokenHeader] = token;
                    }
                    return await client.ConnectAsync(context.Uri, cancellationToken);
                };
                if (!string.IsNullOrWhiteSpace(token))
                {
                    options.AccessTokenProvider = () => Task.FromResult<string?>(token);
                    options.Headers[AuthConstants.TokenHeader] = token;
                }
            })
            .Build();
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

public class RealtimeHubTestsInMemory : RealtimeHubTests<InMemoryApiFactory>
{
    public RealtimeHubTestsInMemory(InMemoryApiFactory factory) : base(factory)
    {
    }
}

public class RealtimeHubTestsSqlite : RealtimeHubTests<SqliteApiFactory>
{
    public RealtimeHubTestsSqlite(SqliteApiFactory factory) : base(factory)
    {
    }
}
