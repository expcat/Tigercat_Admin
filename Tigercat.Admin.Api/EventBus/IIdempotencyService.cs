namespace Tigercat.Admin.Api.EventBus;

public interface IIdempotencyService
{
    Task<bool> TryAcquireAsync(string eventId, TimeSpan ttl, CancellationToken ct = default);

    Task ReleaseAsync(string eventId, CancellationToken ct = default) => Task.CompletedTask;
}
