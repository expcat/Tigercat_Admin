namespace Tigercat.Admin.Api.Endpoints;

public record MediaItemResponse(
    int Id,
    string PublicId,
    string OriginalFileName,
    string StorageProvider,
    string ContentType,
    string? Extension,
    long SizeBytes,
    string? Sha256Hash,
    int? Width,
    int? Height,
    string Url,
    string? UploadedBy,
    DateTime CreatedAt,
    int ReferenceCount);

public record MediaDetailResponse(
    int Id,
    string PublicId,
    string OriginalFileName,
    string StorageProvider,
    string ContentType,
    string? Extension,
    long SizeBytes,
    string? Sha256Hash,
    int? Width,
    int? Height,
    string Url,
    string? UploadedBy,
    DateTime CreatedAt,
    MediaReferenceResponse[] References);

public record MediaReferenceResponse(
    int Id,
    string ReferenceType,
    string ReferenceKey,
    string? DisplayName);

public record BatchDeleteMediaRequest(int[] Ids, bool Force = false);

public record DuplicateMediaResponse(MediaItemResponse Existing);

public record MediaOrphanCleanupRequest(bool DryRun);

public record MediaOrphanFileResponse(string StoredFileName, long SizeBytes, DateTimeOffset LastModified);

public record MediaOrphanCleanupResponse(bool DryRun, int MatchedCount, int DeletedCount, MediaOrphanFileResponse[] Items);
