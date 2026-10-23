using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Tigercat.Admin.Api.Media;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class ContentEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedEditorTypes = ["rich", "markdown", "code"];
    private const int TitleMaxLength = 120;
    private const int BodyMaxLength = 20000;
    private const int CategoryMaxLength = 40;
    private const int TagMaxLength = 40;
    private const int MaxTags = 12;
    private const int MaxColumnDepth = 8;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/content/articles")
            .WithTags("Content");

        group.MapGet("", GetArticles)
            .RequireLogin()
            .WithName("GetContentArticles");

        group.MapGet("/{id}", GetArticle)
            .RequireLogin()
            .WithName("GetContentArticle");

        group.MapPut("/{id}", UpdateArticle)
            .RequireLogin()
            .WithName("UpdateContentArticle");
    }

    private static async Task<IResult> GetArticles(AdminDbContext db, IOptions<MediaOptions> mediaOptions, CancellationToken ct)
    {
        var items = await db.ContentArticles
            .AsNoTracking()
            .OrderBy(item => item.PublicId)
            .ThenBy(item => item.Id)
            .ToArrayAsync(ct);

        var responses = new List<ArticleResponse>();
        foreach (var article in items)
        {
            responses.Add(ToResponse(article, await LoadAttachmentsAsync(db, article.PublicId, mediaOptions.Value, ct)));
        }
        return Results.Json(
            ApiResult.Ok(responses.ToArray()),
            AppJsonContext.Default.ApiResponseArticleResponseArray);
    }

    private static async Task<IResult> GetArticle(string id, AdminDbContext db, IOptions<MediaOptions> mediaOptions, CancellationToken ct)
    {
        var article = await FindArticleAsync(db, id, ct, track: false);
        if (article is null)
        {
            return ArticleNotFound();
        }

        return Results.Json(
            ApiResult.Ok(ToResponse(article, await LoadAttachmentsAsync(db, article.PublicId, mediaOptions.Value, ct))),
            AppJsonContext.Default.ApiResponseArticleResponse);
    }

    private static async Task<IResult> UpdateArticle(
        string id,
        UpdateArticleRequest request,
        AdminDbContext db,
        IOptions<MediaOptions> mediaOptions,
        CancellationToken ct)
    {
        var article = await FindArticleAsync(db, id, ct, track: true);
        if (article is null)
        {
            return ArticleNotFound();
        }

        var published = request.Published ?? article.Published;
        var title = request.Title is null ? article.Title : request.Title.Trim();
        if (published && string.IsNullOrWhiteSpace(title))
        {
            return ArticleError("内容标题不能为空");
        }

        if (title.Length > TitleMaxLength)
        {
            return ArticleError($"内容标题长度不能超过 {TitleMaxLength}");
        }

        var editorType = request.EditorType is null
            ? article.EditorType
            : request.EditorType.Trim().ToLowerInvariant();
        if (!AllowedEditorTypes.Contains(editorType))
        {
            return ArticleError("无效的编辑器类型");
        }

        var body = request.Body ?? article.Body;
        if (body.Length > BodyMaxLength)
        {
            return ArticleError($"正文长度不能超过 {BodyMaxLength}");
        }

        var category = request.Category is null
            ? article.Category
            : request.Category.Trim();
        if (category.Length > CategoryMaxLength)
        {
            return ArticleError($"分类长度不能超过 {CategoryMaxLength}");
        }

        var tags = request.Tags is null
            ? DecodeStringArray(article.TagsJson)
            : NormalizeList(request.Tags, TagMaxLength, MaxTags);
        if (tags is null)
        {
            return ArticleError($"标签最多 {MaxTags} 个，且单项长度不能超过 {TagMaxLength}");
        }

        var column = request.Column is null
            ? DecodeStringArray(article.ColumnJson)
            : NormalizeList(request.Column, CategoryMaxLength, MaxColumnDepth);
        if (column is null)
        {
            return ArticleError("栏目路径无效");
        }

        if (request.AttachmentIds is not null)
        {
            var ids = request.AttachmentIds.Distinct().ToArray();
            if (ids.Length > 12 || ids.Any(id => id <= 0))
                return ArticleError("附件最多 12 个，且 ID 必须为正整数");
            var found = await db.MediaResources.CountAsync(media => ids.Contains(media.Id) && media.DeletedAt == null, ct);
            if (found != ids.Length) return ArticleError("附件不存在或已删除，请重新选择");
            var prefix = article.PublicId + ":";
            var existing = await db.MediaReferences.Where(reference =>
                reference.ReferenceType == MediaReferences.ContentAttachmentType && reference.ReferenceKey.StartsWith(prefix)).ToArrayAsync(ct);
            db.MediaReferences.RemoveRange(existing.Where(reference => !ids.Contains(reference.MediaResourceId)));
            foreach (var mediaId in ids.Except(existing.Select(reference => reference.MediaResourceId)))
            {
                db.MediaReferences.Add(new MediaReferenceEntity
                {
                    MediaResourceId = mediaId,
                    ReferenceType = MediaReferences.ContentAttachmentType,
                    ReferenceKey = prefix + mediaId,
                    DisplayName = "文章附件：" + article.PublicId
                });
            }
        }

        article.Title = title;
        article.EditorType = editorType;
        article.Body = body;
        article.TagsJson = EncodeStringArray(tags);
        article.Category = category;
        article.ColumnJson = EncodeStringArray(column);
        article.Published = published;
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(article, await LoadAttachmentsAsync(db, article.PublicId, mediaOptions.Value, ct))),
            AppJsonContext.Default.ApiResponseArticleResponse);
    }

    private static async Task<ContentArticleEntity?> FindArticleAsync(
        AdminDbContext db,
        string id,
        CancellationToken ct,
        bool track)
    {
        IQueryable<ContentArticleEntity> query = db.ContentArticles;
        if (!track)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(item => item.PublicId == id, ct);
    }

    private static IResult ArticleNotFound() =>
        Results.Json(
            ApiResult.Fail<ArticleResponse>("文章不存在", 404),
            AppJsonContext.Default.ApiResponseArticleResponse,
            statusCode: 404);

    private static IResult ArticleError(string message) =>
        Results.Json(
            ApiResult.Fail<ArticleResponse>(message, 400),
            AppJsonContext.Default.ApiResponseArticleResponse,
            statusCode: 400);

    internal static string EncodeStringArray(IEnumerable<string> values) =>
        JsonSerializer.Serialize(values.ToArray());

    internal static string[] DecodeStringArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<string[]>(json) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static string[]? NormalizeList(string[] values, int itemMaxLength, int maxCount)
    {
        var items = values
            .Select(item => item?.Trim() ?? string.Empty)
            .Where(item => item.Length > 0)
            .ToArray();
        if (items.Length > maxCount || items.Any(item => item.Length > itemMaxLength))
        {
            return null;
        }

        return items;
    }

    private static async Task<MediaItemResponse[]> LoadAttachmentsAsync(
        AdminDbContext db, string articleId, MediaOptions options, CancellationToken ct)
    {
        var prefix = articleId + ":";
        var media = await db.MediaReferences.AsNoTracking()
            .Where(reference => reference.ReferenceType == MediaReferences.ContentAttachmentType &&
                reference.ReferenceKey.StartsWith(prefix) && reference.MediaResource.DeletedAt == null)
            .OrderBy(reference => reference.MediaResourceId)
            .Select(reference => new { Media = reference.MediaResource, ReferenceCount = reference.MediaResource.References.Count })
            .ToArrayAsync(ct);
        return media.Select(item => MediaEndpoints.ToItem(item.Media, item.ReferenceCount, options)).ToArray();
    }

    private static ArticleResponse ToResponse(ContentArticleEntity article, MediaItemResponse[] attachments) =>
        new(
            article.PublicId,
            article.Title,
            article.EditorType,
            article.Body,
            DecodeStringArray(article.TagsJson),
            article.Category,
            DecodeStringArray(article.ColumnJson),
            article.Published,
            attachments);
}
