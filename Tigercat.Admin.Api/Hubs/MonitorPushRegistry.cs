using System.Collections.Concurrent;

namespace Tigercat.Admin.Api.Hubs;

public sealed class MonitorPushRegistry
{
    public static readonly int[] AllowedIntervals = [2, 3, 5];

    private readonly ConcurrentDictionary<string, MonitorPushClient> _clients = new(StringComparer.Ordinal);

    public static bool IsAllowedInterval(int intervalSeconds) =>
        Array.IndexOf(AllowedIntervals, intervalSeconds) >= 0;

    public void Upsert(string connectionId, int intervalSeconds, DateTime lastSentUtc)
    {
        _clients[connectionId] = new MonitorPushClient(connectionId, intervalSeconds, lastSentUtc);
    }

    public void Remove(string connectionId) => _clients.TryRemove(connectionId, out _);

    public IReadOnlyList<MonitorPushClient> TakeDue(DateTime nowUtc)
    {
        var due = new List<MonitorPushClient>();
        foreach (var pair in _clients)
        {
            var client = pair.Value;
            if (nowUtc - client.LastSentUtc < TimeSpan.FromSeconds(client.IntervalSeconds))
            {
                continue;
            }

            client.LastSentUtc = nowUtc;
            due.Add(client);
        }

        return due;
    }
}

public sealed class MonitorPushClient(string connectionId, int intervalSeconds, DateTime lastSentUtc)
{
    public string ConnectionId { get; } = connectionId;
    public int IntervalSeconds { get; } = intervalSeconds;
    public DateTime LastSentUtc { get; set; } = lastSentUtc;
}
