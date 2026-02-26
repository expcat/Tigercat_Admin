using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Tests.Stubs;

/// <summary>
/// No-op event publisher for tests — events are silently discarded.
/// </summary>
public sealed class StubEventPublisher : IEventPublisher
{
    public Task PublishAsync(EventEnvelope envelope, string streamName, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }
}
