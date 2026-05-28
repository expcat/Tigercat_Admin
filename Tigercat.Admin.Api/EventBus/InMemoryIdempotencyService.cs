using System.Collections.Concurrent;

namespace Tigercat.Admin.Api.EventBus;

public sealed class InMemoryIdempotencyService : IIdempotencyService
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> _locks = new(StringComparer.Ordinal);

    public Task<bool> TryAcquireAsync(string eventId, TimeSpan ttl, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.Add(ttl <= TimeSpan.Zero ? TimeSpan.FromMinutes(5) : ttl);

        while (true)
        {
            if (_locks.TryGetValue(eventId, out var existingExpiry) && existingExpiry > now)
            {
                return Task.FromResult(false);
            }

            if (_locks.TryAdd(eventId, expiresAt))
            {
                return Task.FromResult(true);
            }

            if (_locks.TryUpdate(eventId, expiresAt, existingExpiry))
            {
                return Task.FromResult(true);
            }
        }
    }
}