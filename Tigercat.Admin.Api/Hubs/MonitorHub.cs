using Microsoft.AspNetCore.SignalR;

namespace Tigercat.Admin.Api.Hubs;

public sealed class MonitorHub(MonitorPushRegistry registry, MonitorSnapshotSource snapshots) : Hub
{
    public async Task Start(int intervalSeconds)
    {
        if (!MonitorPushRegistry.IsAllowedInterval(intervalSeconds))
        {
            throw new HubException("刷新间隔必须是 2、3 或 5 秒");
        }

        var snapshot = snapshots.Next();
        registry.Upsert(Context.ConnectionId, intervalSeconds, DateTime.UtcNow);
        await Clients.Caller.SendAsync(RealtimeHubs.SnapshotEvent, snapshot);
    }

    public Task Stop()
    {
        registry.Remove(Context.ConnectionId);
        return Task.CompletedTask;
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        registry.Remove(Context.ConnectionId);
        return base.OnDisconnectedAsync(exception);
    }
}
