using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.Options;
using IPNetwork = System.Net.IPNetwork;

namespace Tigercat.Admin.Api.Hosting;

/// <summary>
/// Binds <see cref="ForwardedHeadersOptions"/> from <see cref="ForwardedHeadersSettings"/>
/// at options resolution time so test hosts can override configuration after CreateBuilder.
/// </summary>
public sealed class ConfigureForwardedHeadersOptions(IConfiguration configuration)
    : IConfigureOptions<ForwardedHeadersOptions>
{
    public void Configure(ForwardedHeadersOptions options)
    {
        var settings = configuration
            .GetSection(ForwardedHeadersSettings.SectionName)
            .Get<ForwardedHeadersSettings>() ?? new ForwardedHeadersSettings();
        var proxies = ParseAddresses(settings.KnownProxies);
        var networks = ParseNetworks(settings.KnownNetworks);
        if (!settings.Enabled || (proxies.Count == 0 && networks.Count == 0))
        {
            options.ForwardedHeaders = ForwardedHeaders.None;
            return;
        }

        options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
        options.KnownProxies.Clear();
        options.KnownIPNetworks.Clear();
        foreach (var proxy in proxies)
        {
            options.KnownProxies.Add(proxy);
        }

        foreach (var network in networks)
        {
            options.KnownIPNetworks.Add(network);
        }
    }

    public static bool IsEnabled(ForwardedHeadersOptions options)
    {
        return options.ForwardedHeaders != ForwardedHeaders.None
            && (options.KnownProxies.Count > 0 || options.KnownIPNetworks.Count > 0);
    }

    private static List<IPAddress> ParseAddresses(string[]? values)
    {
        var parsed = new List<IPAddress>();
        if (values is null)
        {
            return parsed;
        }

        foreach (var value in values)
        {
            if (IPAddress.TryParse(value, out var ip))
            {
                parsed.Add(ip);
            }
        }

        return parsed;
    }

    private static List<IPNetwork> ParseNetworks(string[]? values)
    {
        var parsed = new List<IPNetwork>();
        if (values is null)
        {
            return parsed;
        }

        foreach (var value in values)
        {
            if (IPNetwork.TryParse(value, out var network))
            {
                parsed.Add(network);
            }
        }

        return parsed;
    }
}
