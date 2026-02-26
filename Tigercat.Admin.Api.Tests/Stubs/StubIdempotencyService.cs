using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Tests.Stubs;

/// <summary>
/// Stub idempotency service — always grants the lock.
/// </summary>
public sealed class StubIdempotencyService : IIdempotencyService
{
    public Task<bool> TryAcquireAsync(string eventId, TimeSpan ttl, CancellationToken ct = default)
    {
        return Task.FromResult(true);
    }
}
