namespace Tigercat.Admin.Api.Hosting;

/// <summary>
/// Optional reverse-proxy forwarding so auth rate limits key on the client IP.
/// Disabled unless Enabled is true and at least one known proxy or network is set.
/// Do not enable with empty allow-lists: that would trust arbitrary X-Forwarded-For.
/// </summary>
public sealed class ForwardedHeadersSettings
{
    public const string SectionName = "ForwardedHeaders";

    public bool Enabled { get; set; }

    public string[]? KnownProxies { get; set; }

    public string[]? KnownNetworks { get; set; }
}
