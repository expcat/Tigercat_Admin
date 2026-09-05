using Microsoft.AspNetCore.SignalR;

namespace Tigercat.Admin.Api.Hubs;

public sealed class MonitorPushService(
    MonitorPushRegistry registry,
    MonitorSnapshotSource snapshots,
    IHubContext<MonitorHub> hub,
    ILogger<MonitorPushService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(1), stoppingToken);
                var due = registry.TakeDue(DateTime.UtcNow);
                if (due.Count == 0)
                {
                    continue;
                }

                var snapshot = snapshots.Next();
                foreach (var client in due)
                {
                    await hub.Clients.Client(client.ConnectionId)
                        .SendAsync(RealtimeHubs.SnapshotEvent, snapshot, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Monitor hub push loop failed.");
            }
        }
    }
}
