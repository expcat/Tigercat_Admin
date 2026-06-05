namespace Tigercat.Admin.Api.Media;

public static class MediaStorageProviderResolver
{
    public const string LocalProvider = "Local";

    public static string Resolve(MediaOptions options)
    {
        var provider = string.IsNullOrWhiteSpace(options.Provider)
            ? LocalProvider
            : options.Provider.Trim();

        if (string.Equals(provider, LocalProvider, StringComparison.OrdinalIgnoreCase))
        {
            return LocalProvider;
        }

        throw new InvalidOperationException(
            $"Media provider '{provider}' is not registered. The only built-in provider is '{LocalProvider}'.");
    }
}
