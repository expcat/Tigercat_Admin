using System.Net.Http.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.SignalR.Client;
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

    private HubConnection CreateHubConnection(string path, string? token)
    {
        return new HubConnectionBuilder()
            .WithUrl(new Uri(_factory.Server.BaseAddress!, path.TrimStart('/')), options =>
            {
                options.HttpMessageHandlerFactory = _ => _factory.Server.CreateHandler();
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
