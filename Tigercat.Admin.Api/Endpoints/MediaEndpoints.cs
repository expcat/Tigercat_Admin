using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Media;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class MediaEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/media")
            .WithTags("Media");

        group.MapGet("", GetMedia)
            .RequirePermission("media:view")
            .WithName("GetMedia");

        group.MapPost("", UploadMedia)
            .RequirePermission("media:upload")
            .WithName("UploadMedia")
            .DisableAntiforgery();

        group.MapGet("/{id:int}", GetMediaById)
            .RequirePermission("media:view")
            .WithName("GetMediaById");

        group.MapDelete("/{id:int}", DeleteMedia)
            .RequirePermission("media:delete")
            .WithName("DeleteMedia");

        group.MapPost("/batch-delete", BatchDeleteMedia)
            .RequirePermission("media:delete")
            .WithName("BatchDeleteMedia");

        group.MapPost("/orphans/cleanup", CleanupOrphanMedia)
            .RequirePermission("media:delete")
            .WithName("CleanupOrphanMedia");

        group.MapGet("/{publicId}/content", GetMediaContent)
            .WithName("GetMediaContent");
    }

    private static async Task<IResult> GetMedia(
        int? page,
        int? pageSize,
        string? keyword,
        string? contentType,
        string? sortBy,
        string? sortOrder,
        AdminDbContext db,
        IOptions<MediaOptions> mediaOptions,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? 20, 1, 100);

        IQueryable<MediaResourceEntity> query = db.MediaResources
            .Where(m => m.DeletedAt == null);

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            query = query.Where(m => m.OriginalFileName.ToLower().Contains(kw));
        }

        if (!string.IsNullOrWhiteSpace(contentType))
        {
            var type = contentType.Trim().ToLowerInvariant();
            query = query.Where(m => m.ContentType.ToLower().StartsWith(type));
        }

        var total = await query.CountAsync(ct);
        var desc = string.Equals(sortOrder, "desc", StringComparison.OrdinalIgnoreCase);

        IOrderedQueryable<MediaResourceEntity> ordered = sortBy?.ToLowerInvariant() switch
        {
            "name" => desc
                ? query.OrderByDescending(m => m.OriginalFileName).ThenByDescending(m => m.Id)
                : query.OrderBy(m => m.OriginalFileName).ThenBy(m => m.Id),
            "size" => desc
                ? query.OrderByDescending(m => m.SizeBytes).ThenByDescending(m => m.Id)
                : query.OrderBy(m => m.SizeBytes).ThenBy(m => m.Id),
            "type" => desc
                ? query.OrderByDescending(m => m.ContentType).ThenByDescending(m => m.Id)
                : query.OrderBy(m => m.ContentType).ThenBy(m => m.Id),
            _ => desc
                ? query.OrderByDescending(m => m.CreatedAt).ThenByDescending(m => m.Id)
                : query.OrderBy(m => m.CreatedAt).ThenBy(m => m.Id),
        };

        var items = await ordered
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(m => new MediaItemResponse(
                m.Id,
                m.PublicId,
                m.OriginalFileName,
                m.StorageProvider ?? MediaStorageProviderResolver.LocalProvider,
                m.ContentType,
                m.Extension,
                m.SizeBytes,
                m.Sha256Hash,
                m.Width,
                m.Height,
                MediaUrl.Content(m.PublicId, mediaOptions.Value),
                m.UploadedBy,
                m.CreatedAt,
                m.References.Count))
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(new PagedResponse<MediaItemResponse>(items, total, p, ps)),
            AppJsonContext.Default.ApiResponsePagedResponseMediaItemResponse);
    }

    private static async Task<IResult> GetMediaById(
        int id,
        AdminDbContext db,
        IOptions<MediaOptions> mediaOptions,
        CancellationToken ct)
    {
        var media = await db.MediaResources
            .Where(m => m.Id == id && m.DeletedAt == null)
            .Select(m => new MediaDetailResponse(
                m.Id,
                m.PublicId,
                m.OriginalFileName,
                m.StorageProvider ?? MediaStorageProviderResolver.LocalProvider,
                m.ContentType,
                m.Extension,
                m.SizeBytes,
                m.Sha256Hash,
                m.Width,
                m.Height,
                MediaUrl.Content(m.PublicId, mediaOptions.Value),
                m.UploadedBy,
                m.CreatedAt,
                m.References
                    .OrderBy(r => r.ReferenceType)
                    .ThenBy(r => r.ReferenceKey)
                    .Select(r => new MediaReferenceResponse(r.Id, r.ReferenceType, r.ReferenceKey, r.DisplayName))
                    .ToArray()))
            .FirstOrDefaultAsync(ct);

        if (media is null)
        {
            return Results.Json(
                ApiResult.Fail<MediaDetailResponse>("媒体资源不存在", 404),
                AppJsonContext.Default.ApiResponseMediaDetailResponse,
                statusCode: 404);
        }

        return Results.Json(
            ApiResult.Ok(media),
            AppJsonContext.Default.ApiResponseMediaDetailResponse);
    }

    private static async Task<IResult> UploadMedia(
        HttpRequest request,
        AdminDbContext db,
        IMediaStorageProvider storage,
        IOptions<MediaOptions> mediaOptions,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (!request.HasFormContentType)
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>("请使用 multipart/form-data 上传文件", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        var form = await request.ReadFormAsync(ct);
        var file = form.Files.GetFile("file") ?? form.Files.FirstOrDefault();
        var usage = form.TryGetValue("usage", out var usageValue) ? usageValue.ToString() : null;

        if (file is null)
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>("请选择要上传的文件", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        if (file.Length <= 0)
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>("不能上传空文件", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        var options = mediaOptions.Value;

        if (file.Length > options.MaxBytes)
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>($"文件大小不能超过 {options.MaxBytes} 字节", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        var contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType.Split(';', StringSplitOptions.TrimEntries)[0];

        if (!MediaFileRules.IsAllowedContentType(contentType, options))
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>("不支持的文件类型", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        if ((string.Equals(usage, "logo", StringComparison.OrdinalIgnoreCase) ||
             string.Equals(usage, "avatar", StringComparison.OrdinalIgnoreCase)) &&
            !MediaFileRules.IsImageContentType(contentType))
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>("Logo 和头像只能上传图片", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        var publicId = Guid.NewGuid().ToString("N");
        var originalFileName = Path.GetFileName(file.FileName);
        var extension = MediaFileRules.NormalizeExtension(Path.GetExtension(originalFileName));

        if (!MediaFileRules.IsAllowedExtension(extension, options))
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>("不支持的文件扩展名", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        if (!MediaFileRules.IsExtensionAllowedForContentType(contentType, extension))
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>("文件扩展名与 MIME 类型不匹配", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        await using var stream = file.OpenReadStream();
        using var memory = new MemoryStream((int)file.Length);
        await stream.CopyToAsync(memory, ct);
        var bytes = memory.ToArray();
        var sha256Hash = Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

        var duplicate = await db.MediaResources
            .Where(m => m.DeletedAt == null && m.Sha256Hash == sha256Hash && m.SizeBytes == file.Length)
            .FirstOrDefaultAsync(ct);

        if (duplicate is not null)
        {
            return Results.Json(
                new ApiResponse<DuplicateMediaResponse>(
                    new DuplicateMediaResponse(ToItem(duplicate, duplicate.References.Count, options)),
                    "文件已存在，可复用已有媒体资源",
                    409,
                    false),
                AppJsonContext.Default.ApiResponseDuplicateMediaResponse,
                statusCode: 409);
        }

        var dimensions = await MediaImageMetadata.TryReadDimensionsAsync(bytes, contentType, ct);
        if (dimensions is not null)
        {
            if (options.MaxImageWidth is > 0 && dimensions.Width > options.MaxImageWidth)
            {
                return Results.Json(
                    ApiResult.Fail<MediaItemResponse>($"图片宽度不能超过 {options.MaxImageWidth} 像素", 400),
                    AppJsonContext.Default.ApiResponseMediaItemResponse,
                    statusCode: 400);
            }

            if (options.MaxImageHeight is > 0 && dimensions.Height > options.MaxImageHeight)
            {
                return Results.Json(
                    ApiResult.Fail<MediaItemResponse>($"图片高度不能超过 {options.MaxImageHeight} 像素", 400),
                    AppJsonContext.Default.ApiResponseMediaItemResponse,
                    statusCode: 400);
            }
        }

        await using var saveStream = new MemoryStream(bytes);
        var stored = await storage.SaveAsync(saveStream, publicId, extension, ct);

        var media = new MediaResourceEntity
        {
            PublicId = publicId,
            OriginalFileName = string.IsNullOrWhiteSpace(originalFileName) ? "upload" : originalFileName,
            StoredFileName = stored.StoredFileName,
            StorageProvider = storage.ProviderName,
            StorageKey = stored.StoredFileName,
            ContentType = contentType,
            Extension = string.IsNullOrEmpty(extension) ? null : extension.TrimStart('.'),
            SizeBytes = file.Length,
            Sha256Hash = sha256Hash,
            Width = dimensions?.Width,
            Height = dimensions?.Height,
            UploadedBy = GetOperatorUsername(httpContext),
            CreatedAt = DateTime.UtcNow
        };

        db.MediaResources.Add(media);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToItem(media, 0, options)),
            AppJsonContext.Default.ApiResponseMediaItemResponse,
            statusCode: 201);
    }

    private static async Task<IResult> DeleteMedia(
        int id,
        bool? force,
        AdminDbContext db,
        IMediaStorageProvider storage,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var media = await db.MediaResources
            .Include(m => m.References)
            .FirstOrDefaultAsync(m => m.Id == id && m.DeletedAt == null, ct);

        if (media is null)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("媒体资源不存在", 404),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 404);
        }

        if (media.References.Count > 0 && force != true)
        {
            var references = media.References
                .OrderBy(r => r.ReferenceType)
                .ThenBy(r => r.ReferenceKey)
                .Select(r => new MediaReferenceResponse(r.Id, r.ReferenceType, r.ReferenceKey, r.DisplayName))
                .ToArray();

            await PublishMediaDeleteFailedAsync(
                eventPublisher,
                httpContext,
                media,
                references.Length,
                "媒体资源正在被引用，不能删除",
                ct);

            return Results.Json(
                new ApiResponse<MediaReferenceResponse[]>(references, "媒体资源正在被引用，不能删除", 409, false),
                AppJsonContext.Default.ApiResponseMediaReferenceResponseArray,
                statusCode: 409);
        }

        if (media.References.Count > 0 && force == true)
        {
            var unknownReferences = media.References
                .Where(static reference => !IsKnownForceDeleteReference(reference))
                .OrderBy(r => r.ReferenceType)
                .ThenBy(r => r.ReferenceKey)
                .Select(r => new MediaReferenceResponse(r.Id, r.ReferenceType, r.ReferenceKey, r.DisplayName))
                .ToArray();

            if (unknownReferences.Length > 0)
            {
                return Results.Json(
                    new ApiResponse<MediaReferenceResponse[]>(unknownReferences, "媒体资源包含未知业务引用，不能强制删除", 409, false),
                    AppJsonContext.Default.ApiResponseMediaReferenceResponseArray,
                    statusCode: 409);
            }

            await ClearKnownReferencesAsync(db, media.References.ToArray(), ct);
            await PublishMediaDeleteForcedAsync(eventPublisher, httpContext, [media], media.References.Count, ct);
        }

        db.MediaResources.Remove(media);
        await db.SaveChangesAsync(ct);
        await storage.DeleteAsync(media.StoredFileName, ct);

        return Results.Json(
            ApiResult.Ok(new MessageResponse("删除成功")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    private static async Task<IResult> BatchDeleteMedia(
        BatchDeleteMediaRequest request,
        AdminDbContext db,
        IMediaStorageProvider storage,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        if (request.Ids is not { Length: > 0 })
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("请选择要删除的媒体资源", 400),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 400);
        }

        var distinctIds = request.Ids.Distinct().ToArray();
        var mediaItems = await db.MediaResources
            .Include(m => m.References)
            .Where(m => distinctIds.Contains(m.Id) && m.DeletedAt == null)
            .ToListAsync(ct);

        var missingIds = distinctIds.Except(mediaItems.Select(static media => media.Id)).ToArray();
        if (missingIds.Length > 0)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>($"以下媒体资源 ID 不存在: {string.Join(", ", missingIds)}", 404),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 404);
        }

        var references = mediaItems
            .SelectMany(static media => media.References)
            .OrderBy(r => r.ReferenceType)
            .ThenBy(r => r.ReferenceKey)
            .Select(r => new MediaReferenceResponse(r.Id, r.ReferenceType, r.ReferenceKey, r.DisplayName))
            .ToArray();

        if (references.Length > 0 && !request.Force)
        {
            await PublishBatchMediaDeleteFailedAsync(
                eventPublisher,
                httpContext,
                mediaItems,
                references.Length,
                "选中的媒体资源正在被引用，不能批量删除",
                ct);

            return Results.Json(
                new ApiResponse<MediaReferenceResponse[]>(references, "选中的媒体资源正在被引用，不能批量删除", 409, false),
                AppJsonContext.Default.ApiResponseMediaReferenceResponseArray,
                statusCode: 409);
        }

        if (references.Length > 0 && request.Force)
        {
            var unknownReferences = mediaItems
                .SelectMany(static media => media.References)
                .Where(static reference => !IsKnownForceDeleteReference(reference))
                .OrderBy(r => r.ReferenceType)
                .ThenBy(r => r.ReferenceKey)
                .Select(r => new MediaReferenceResponse(r.Id, r.ReferenceType, r.ReferenceKey, r.DisplayName))
                .ToArray();

            if (unknownReferences.Length > 0)
            {
                return Results.Json(
                    new ApiResponse<MediaReferenceResponse[]>(unknownReferences, "选中的媒体资源包含未知业务引用，不能强制删除", 409, false),
                    AppJsonContext.Default.ApiResponseMediaReferenceResponseArray,
                    statusCode: 409);
            }

            await ClearKnownReferencesAsync(db, mediaItems.SelectMany(static media => media.References).ToArray(), ct);
            await PublishMediaDeleteForcedAsync(eventPublisher, httpContext, mediaItems, references.Length, ct);
        }

        var storedFileNames = mediaItems.Select(static media => media.StoredFileName).ToArray();
        db.MediaResources.RemoveRange(mediaItems);
        await db.SaveChangesAsync(ct);

        foreach (var storedFileName in storedFileNames)
        {
            await storage.DeleteAsync(storedFileName, ct);
        }

        return Results.Json(
            ApiResult.Ok(new MessageResponse($"成功删除 {mediaItems.Count} 个媒体资源")),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    private static async Task<IResult> GetMediaContent(
        string publicId,
        AdminDbContext db,
        IMediaStorageProvider storage,
        IOptions<MediaOptions> mediaOptions,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var media = await db.MediaResources
            .FirstOrDefaultAsync(m => m.PublicId == publicId && m.DeletedAt == null, ct);

        if (media is null)
        {
            return Results.NotFound();
        }

        try
        {
            var stream = await storage.OpenReadAsync(media.StoredFileName, ct);
            var cacheSeconds = Math.Max(mediaOptions.Value.PublicCacheSeconds, 0);
            httpContext.Response.Headers.CacheControl = cacheSeconds > 0
                ? $"public,max-age={cacheSeconds}"
                : "no-store";
            httpContext.Response.Headers["X-Content-Type-Options"] = "nosniff";
            return Results.File(stream, media.ContentType, media.OriginalFileName, enableRangeProcessing: true);
        }
        catch (FileNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static async Task<IResult> CleanupOrphanMedia(
        MediaOrphanCleanupRequest request,
        AdminDbContext db,
        IMediaStorageProvider storage,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var storedFiles = await storage.ListAsync(ct);
        var knownStoredFileNames = await db.MediaResources
            .Select(static media => media.StoredFileName)
            .ToArrayAsync(ct);

        var known = knownStoredFileNames.ToHashSet(StringComparer.OrdinalIgnoreCase);
        var orphans = storedFiles
            .Where(file => !known.Contains(file.StoredFileName))
            .OrderBy(file => file.StoredFileName)
            .Select(file => new MediaOrphanFileResponse(file.StoredFileName, file.SizeBytes, file.LastModified))
            .ToArray();

        var deletedCount = 0;
        if (!request.DryRun)
        {
            foreach (var orphan in orphans)
            {
                await storage.DeleteAsync(orphan.StoredFileName, ct);
                deletedCount++;
            }

            await eventPublisher.PublishAsync(
                EventEnvelope.Create(
                    "admin.media.orphans.cleaned",
                    new Dictionary<string, object?>
                    {
                        ["matchedCount"] = orphans.Length,
                        ["deletedCount"] = deletedCount,
                        ["operator"] = GetOperatorUsername(httpContext)
                    },
                    httpContext.TraceIdentifier),
                EventBusConstants.AdminStream,
                ct);
        }

        return Results.Json(
            ApiResult.Ok(new MediaOrphanCleanupResponse(request.DryRun, orphans.Length, deletedCount, orphans)),
            AppJsonContext.Default.ApiResponseMediaOrphanCleanupResponse);
    }

    private static MediaItemResponse ToItem(MediaResourceEntity media, int referenceCount, MediaOptions options)
    {
        return new MediaItemResponse(
            media.Id,
            media.PublicId,
            media.OriginalFileName,
            media.StorageProvider ?? MediaStorageProviderResolver.LocalProvider,
            media.ContentType,
            media.Extension,
            media.SizeBytes,
            media.Sha256Hash,
            media.Width,
            media.Height,
            MediaUrl.Content(media.PublicId, options),
            media.UploadedBy,
            media.CreatedAt,
            referenceCount);
    }

    private static bool IsKnownForceDeleteReference(MediaReferenceEntity reference)
    {
        return string.Equals(reference.ReferenceType, MediaReferences.SiteLogoType, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(reference.ReferenceType, MediaReferences.UserAvatarType, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task ClearKnownReferencesAsync(
        AdminDbContext db,
        IReadOnlyCollection<MediaReferenceEntity> references,
        CancellationToken ct)
    {
        if (references.Any(static reference =>
                string.Equals(reference.ReferenceType, MediaReferences.SiteLogoType, StringComparison.OrdinalIgnoreCase)))
        {
            var logoSetting = await db.SystemSettings
                .FirstOrDefaultAsync(setting => setting.Key == MediaReferences.SiteLogoKey, ct);

            if (logoSetting is not null)
            {
                logoSetting.Value = string.Empty;
                logoSetting.UpdatedAt = DateTime.UtcNow;
            }
        }

        var userIds = references
            .Where(static reference => string.Equals(reference.ReferenceType, MediaReferences.UserAvatarType, StringComparison.OrdinalIgnoreCase))
            .Select(static reference => int.TryParse(reference.ReferenceKey, out var userId) ? userId : 0)
            .Where(static userId => userId > 0)
            .Distinct()
            .ToArray();

        if (userIds.Length > 0)
        {
            var users = await db.Users
                .Where(user => userIds.Contains(user.Id))
                .ToListAsync(ct);

            foreach (var user in users)
            {
                user.AvatarMediaId = null;
                user.UpdatedAt = DateTime.UtcNow;
            }
        }

        db.MediaReferences.RemoveRange(references);
        await db.SaveChangesAsync(ct);
    }

    private static Task PublishMediaDeleteForcedAsync(
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        IReadOnlyCollection<MediaResourceEntity> mediaItems,
        int referenceCount,
        CancellationToken ct)
    {
        return eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.media.delete.forced",
                new Dictionary<string, object?>
                {
                    ["mediaIds"] = mediaItems.Select(static media => media.Id).ToArray(),
                    ["fileNames"] = mediaItems.Select(static media => media.OriginalFileName).ToArray(),
                    ["referenceCount"] = referenceCount,
                    ["operator"] = GetOperatorUsername(httpContext)
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);
    }

    private static Task PublishMediaDeleteFailedAsync(
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        MediaResourceEntity media,
        int referenceCount,
        string reason,
        CancellationToken ct)
    {
        return eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.media.delete.failed",
                new Dictionary<string, object?>
                {
                    ["mediaId"] = media.Id,
                    ["fileName"] = media.OriginalFileName,
                    ["referenceCount"] = referenceCount,
                    ["reason"] = reason,
                    ["operator"] = GetOperatorUsername(httpContext)
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);
    }

    private static Task PublishBatchMediaDeleteFailedAsync(
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        IReadOnlyCollection<MediaResourceEntity> mediaItems,
        int referenceCount,
        string reason,
        CancellationToken ct)
    {
        return eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.media.delete.failed",
                new Dictionary<string, object?>
                {
                    ["mediaIds"] = mediaItems.Select(static media => media.Id).ToArray(),
                    ["fileNames"] = mediaItems.Select(static media => media.OriginalFileName).ToArray(),
                    ["referenceCount"] = referenceCount,
                    ["reason"] = reason,
                    ["operator"] = GetOperatorUsername(httpContext)
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);
    }

    private static string GetOperatorUsername(HttpContext httpContext)
    {
        return httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var operatorObj) &&
            operatorObj is string operatorName
            ? operatorName
            : "unknown";
    }
}
