using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;

namespace Tigercat.Admin.Api.Media;

public class MediaReferenceService(AdminDbContext db) : IMediaReferenceService
{
    public async Task SyncSiteLogoReferenceAsync(string? logoUrl, CancellationToken ct)
    {
        var publicId = MediaUrl.TryGetPublicId(logoUrl);
        var mediaId = publicId is null
            ? null
            : await db.MediaResources
                .Where(m => m.PublicId == publicId)
                .Select(m => (int?)m.Id)
                .FirstOrDefaultAsync(ct);

        await UpsertReferenceAsync(
            MediaReferences.SiteLogoType,
            MediaReferences.SiteLogoKey,
            mediaId,
            "站点 Logo",
            ct);
    }

    public Task SyncUserAvatarReferenceAsync(
        int userId,
        string username,
        int? mediaResourceId,
        CancellationToken ct)
    {
        return UpsertReferenceAsync(
            MediaReferences.UserAvatarType,
            MediaReferences.UserAvatarKey(userId),
            mediaResourceId,
            $"用户头像：{username}",
            ct);
    }

    private async Task UpsertReferenceAsync(
        string referenceType,
        string referenceKey,
        int? mediaResourceId,
        string displayName,
        CancellationToken ct)
    {
        var existing = await db.MediaReferences
            .FirstOrDefaultAsync(r => r.ReferenceType == referenceType && r.ReferenceKey == referenceKey, ct);

        if (mediaResourceId is null)
        {
            if (existing is not null)
            {
                db.MediaReferences.Remove(existing);
                await db.SaveChangesAsync(ct);
            }

            return;
        }

        if (existing is null)
        {
            db.MediaReferences.Add(new MediaReferenceEntity
            {
                MediaResourceId = mediaResourceId.Value,
                ReferenceType = referenceType,
                ReferenceKey = referenceKey,
                DisplayName = displayName,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.MediaResourceId = mediaResourceId.Value;
            existing.DisplayName = displayName;
            existing.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }
}
