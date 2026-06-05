namespace Tigercat.Admin.Api.Media;

public interface IMediaStorageProvider
{
    string ProviderName { get; }

    Task<StoredMediaFile> SaveAsync(
        Stream stream,
        string publicId,
        string? extension,
        CancellationToken ct);

    Task<Stream> OpenReadAsync(string storedFileName, CancellationToken ct);

    Task DeleteAsync(string storedFileName, CancellationToken ct);

    Task<IReadOnlyList<StoredMediaFileInfo>> ListAsync(CancellationToken ct);
}

public record StoredMediaFile(string StoredFileName);

public record StoredMediaFileInfo(string StoredFileName, long SizeBytes, DateTimeOffset LastModified);
