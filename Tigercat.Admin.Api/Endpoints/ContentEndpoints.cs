using System.Text.Json;
using Microsoft.EntityFrameworkCore;
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

    private static async Task<IResult> GetArticles(AdminDbContext db, CancellationToken ct)
    {
        var items = await db.ContentArticles
            .AsNoTracking()
            .OrderBy(item => item.PublicId)
            .ThenBy(item => item.Id)
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(items.Select(ToResponse).ToArray()),
            AppJsonContext.Default.ApiResponseArticleResponseArray);
    }

    private static async Task<IResult> GetArticle(string id, AdminDbContext db, CancellationToken ct)
    {
        var article = await FindArticleAsync(db, id, ct, track: false);
        if (article is null)
        {
            return ArticleNotFound();
        }

        return Results.Json(
            ApiResult.Ok(ToResponse(article)),
            AppJsonContext.Default.ApiResponseArticleResponse);
    }

    private static async Task<IResult> UpdateArticle(
        string id,
        UpdateArticleRequest request,
        AdminDbContext db,
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

        article.Title = title;
        article.EditorType = editorType;
        article.Body = body;
        article.TagsJson = EncodeStringArray(tags);
        article.Category = category;
        article.ColumnJson = EncodeStringArray(column);
        article.Published = published;
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(article)),
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

    private static ArticleResponse ToResponse(ContentArticleEntity article) =>
        new(
            article.PublicId,
            article.Title,
            article.EditorType,
            article.Body,
            DecodeStringArray(article.TagsJson),
            article.Category,
            DecodeStringArray(article.ColumnJson),
            article.Published);
}
