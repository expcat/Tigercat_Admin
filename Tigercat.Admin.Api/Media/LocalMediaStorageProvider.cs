using Microsoft.Extensions.Options;

namespace Tigercat.Admin.Api.Media;

public class LocalMediaStorageProvider(
    IOptions<MediaOptions> options,
    IWebHostEnvironment environment) : IMediaStorageProvider
{
    private readonly MediaOptions _options = options.Value;

    public string ProviderName => "Local";

    public async Task<StoredMediaFile> SaveAsync(
        Stream stream,
        string publicId,
        string? extension,
        CancellationToken ct)
    {
        var safeExtension = MediaFileRules.NormalizeExtension(extension);
        var storedFileName = $"{publicId}{safeExtension}";
        var root = GetStorageRoot();
        Directory.CreateDirectory(root);

        var path = Path.Combine(root, storedFileName);
        await using var output = File.Create(path);
        await stream.CopyToAsync(output, ct);

        return new StoredMediaFile(storedFileName);
    }

    public Task<Stream> OpenReadAsync(string storedFileName, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var path = GetSafePath(storedFileName);
        if (!File.Exists(path))
        {
            throw new FileNotFoundException("Media file does not exist.", storedFileName);
        }

        return Task.FromResult<Stream>(File.OpenRead(path));
    }

    public Task DeleteAsync(string storedFileName, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var path = GetSafePath(storedFileName);
        if (File.Exists(path))
        {
            File.Delete(path);
        }

        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<StoredMediaFileInfo>> ListAsync(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        var root = GetStorageRoot();
        if (!Directory.Exists(root))
        {
            return Task.FromResult<IReadOnlyList<StoredMediaFileInfo>>([]);
        }

        var files = Directory
            .EnumerateFiles(root, "*", SearchOption.TopDirectoryOnly)
            .Select(path =>
            {
                var info = new FileInfo(path);
                return new StoredMediaFileInfo(
                    info.Name,
                    info.Length,
                    info.LastWriteTimeUtc);
            })
            .ToArray();

        return Task.FromResult<IReadOnlyList<StoredMediaFileInfo>>(files);
    }

    private string GetStorageRoot()
    {
        if (!string.IsNullOrWhiteSpace(_options.LocalRoot))
        {
            return Path.GetFullPath(_options.LocalRoot);
        }

        return Path.Combine(environment.ContentRootPath, "App_Data", "media");
    }

    private string GetSafePath(string storedFileName)
    {
        var root = GetStorageRoot();
        var path = Path.GetFullPath(Path.Combine(root, storedFileName));
        if (!path.StartsWith(Path.GetFullPath(root), StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Invalid media file path.");
        }

        return path;
    }
}
