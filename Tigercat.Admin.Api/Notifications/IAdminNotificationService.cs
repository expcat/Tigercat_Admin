using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Notifications;

public interface IAdminNotificationService
{
    Task HandleEventAsync(EventEnvelope envelope, string streamName, CancellationToken ct = default);
}
