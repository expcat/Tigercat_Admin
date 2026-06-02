namespace Tigercat.Admin.Api.Media;

public interface IMediaReferenceService
{
    Task SyncSiteLogoReferenceAsync(string? logoUrl, CancellationToken ct);

    Task SyncUserAvatarReferenceAsync(
        int userId,
        string username,
        int? mediaResourceId,
        CancellationToken ct);
}
