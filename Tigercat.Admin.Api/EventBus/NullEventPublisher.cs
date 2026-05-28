namespace Tigercat.Admin.Api.EventBus;

public sealed class NullEventPublisher : IEventPublisher
{
    public Task PublishAsync(EventEnvelope envelope, string streamName, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();
        return Task.CompletedTask;
    }
}