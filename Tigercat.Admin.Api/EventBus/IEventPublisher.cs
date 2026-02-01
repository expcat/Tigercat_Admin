namespace Tigercat.Admin.Api.EventBus;

public interface IEventPublisher
{
    Task PublishAsync(EventEnvelope envelope, string streamName, CancellationToken ct = default);
}
