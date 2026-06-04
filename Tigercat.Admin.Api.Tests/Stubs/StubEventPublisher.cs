using System.Collections.Concurrent;
using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Tests.Stubs;

/// <summary>
/// Test event publisher — records events without requiring Redis.
/// </summary>
public sealed class StubEventPublisher : IEventPublisher
{
    public static ConcurrentQueue<(EventEnvelope Envelope, string StreamName)> PublishedEvents { get; } = new();

    public static void Clear()
    {
        while (PublishedEvents.TryDequeue(out _))
        {
        }
    }

    public Task PublishAsync(EventEnvelope envelope, string streamName, CancellationToken ct = default)
    {
        PublishedEvents.Enqueue((envelope, streamName));
        return Task.CompletedTask;
    }
}
