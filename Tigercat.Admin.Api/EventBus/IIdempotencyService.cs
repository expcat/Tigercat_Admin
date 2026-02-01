namespace Tigercat.Admin.Api.EventBus;

public interface IIdempotencyService
{
    Task<bool> TryAcquireAsync(string eventId, TimeSpan ttl, CancellationToken ct = default);
}
