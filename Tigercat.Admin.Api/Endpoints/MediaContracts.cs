namespace Tigercat.Admin.Api.Endpoints;

public record MediaItemResponse(
    int Id,
    string PublicId,
    string OriginalFileName,
    string ContentType,
    string? Extension,
    long SizeBytes,
    string Url,
    string? UploadedBy,
    DateTime CreatedAt,
    int ReferenceCount);

public record MediaDetailResponse(
    int Id,
    string PublicId,
    string OriginalFileName,
    string ContentType,
    string? Extension,
    long SizeBytes,
    string Url,
    string? UploadedBy,
    DateTime CreatedAt,
    MediaReferenceResponse[] References);

public record MediaReferenceResponse(
    int Id,
    string ReferenceType,
    string ReferenceKey,
    string? DisplayName);

public record BatchDeleteMediaRequest(int[] Ids);
