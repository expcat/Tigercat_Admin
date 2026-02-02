namespace Tigercat.Admin.Api.EventBus;

public static class EventBusConstants
{
    public const string AuthStream = "stream:auth";
    public const string AdminStream = "stream:admin";
    public const string SystemStream = "stream:system";

    public static readonly string[] Streams = { AuthStream, AdminStream, SystemStream };

    public static readonly TimeSpan DefaultIdempotencyTtl = TimeSpan.FromHours(6);
    public const int MaxIdempotencyTtlSeconds = 60 * 60 * 24 * 30;
}
