using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
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
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? 20, 1, 100);

        IQueryable<MediaResourceEntity> query = db.MediaResources;

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
                m.ContentType,
                m.Extension,
                m.SizeBytes,
                MediaUrl.Content(m.PublicId),
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
        CancellationToken ct)
    {
        var media = await db.MediaResources
            .Where(m => m.Id == id)
            .Select(m => new MediaDetailResponse(
                m.Id,
                m.PublicId,
                m.OriginalFileName,
                m.ContentType,
                m.Extension,
                m.SizeBytes,
                MediaUrl.Content(m.PublicId),
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

        if (file.Length > mediaOptions.Value.MaxBytes)
        {
            return Results.Json(
                ApiResult.Fail<MediaItemResponse>($"文件大小不能超过 {mediaOptions.Value.MaxBytes} 字节", 400),
                AppJsonContext.Default.ApiResponseMediaItemResponse,
                statusCode: 400);
        }

        var contentType = string.IsNullOrWhiteSpace(file.ContentType)
            ? "application/octet-stream"
            : file.ContentType;

        if (!MediaFileRules.IsAllowedContentType(contentType))
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

        await using var stream = file.OpenReadStream();
        var stored = await storage.SaveAsync(stream, publicId, extension, ct);

        var media = new MediaResourceEntity
        {
            PublicId = publicId,
            OriginalFileName = string.IsNullOrWhiteSpace(originalFileName) ? "upload" : originalFileName,
            StoredFileName = stored.StoredFileName,
            ContentType = contentType,
            Extension = string.IsNullOrEmpty(extension) ? null : extension.TrimStart('.'),
            SizeBytes = file.Length,
            UploadedBy = GetOperatorUsername(httpContext),
            CreatedAt = DateTime.UtcNow
        };

        db.MediaResources.Add(media);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToItem(media, 0)),
            AppJsonContext.Default.ApiResponseMediaItemResponse,
            statusCode: 201);
    }

    private static async Task<IResult> DeleteMedia(
        int id,
        AdminDbContext db,
        IMediaStorageProvider storage,
        CancellationToken ct)
    {
        var media = await db.MediaResources
            .Include(m => m.References)
            .FirstOrDefaultAsync(m => m.Id == id, ct);

        if (media is null)
        {
            return Results.Json(
                ApiResult.Fail<MessageResponse>("媒体资源不存在", 404),
                AppJsonContext.Default.ApiResponseMessageResponse,
                statusCode: 404);
        }

        if (media.References.Count > 0)
        {
            var references = media.References
                .OrderBy(r => r.ReferenceType)
                .ThenBy(r => r.ReferenceKey)
                .Select(r => new MediaReferenceResponse(r.Id, r.ReferenceType, r.ReferenceKey, r.DisplayName))
                .ToArray();

            return Results.Json(
                new ApiResponse<MediaReferenceResponse[]>(references, "媒体资源正在被引用，不能删除", 409, false),
                AppJsonContext.Default.ApiResponseMediaReferenceResponseArray,
                statusCode: 409);
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
            .Where(m => distinctIds.Contains(m.Id))
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

        if (references.Length > 0)
        {
            return Results.Json(
                new ApiResponse<MediaReferenceResponse[]>(references, "选中的媒体资源正在被引用，不能批量删除", 409, false),
                AppJsonContext.Default.ApiResponseMediaReferenceResponseArray,
                statusCode: 409);
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
        CancellationToken ct)
    {
        var media = await db.MediaResources
            .FirstOrDefaultAsync(m => m.PublicId == publicId, ct);

        if (media is null)
        {
            return Results.NotFound();
        }

        try
        {
            var stream = await storage.OpenReadAsync(media.StoredFileName, ct);
            return Results.File(stream, media.ContentType, media.OriginalFileName, enableRangeProcessing: true);
        }
        catch (FileNotFoundException)
        {
            return Results.NotFound();
        }
    }

    private static MediaItemResponse ToItem(MediaResourceEntity media, int referenceCount)
    {
        return new MediaItemResponse(
            media.Id,
            media.PublicId,
            media.OriginalFileName,
            media.ContentType,
            media.Extension,
            media.SizeBytes,
            MediaUrl.Content(media.PublicId),
            media.UploadedBy,
            media.CreatedAt,
            referenceCount);
    }

    private static string GetOperatorUsername(HttpContext httpContext)
    {
        return httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var operatorObj) &&
            operatorObj is string operatorName
            ? operatorName
            : "unknown";
    }
}
