namespace Tigercat.Admin.Api.Media;

public interface IMediaStorageProvider
{
    Task<StoredMediaFile> SaveAsync(
        Stream stream,
        string publicId,
        string? extension,
        CancellationToken ct);

    Task<Stream> OpenReadAsync(string storedFileName, CancellationToken ct);

    Task DeleteAsync(string storedFileName, CancellationToken ct);
}

public record StoredMediaFile(string StoredFileName);
