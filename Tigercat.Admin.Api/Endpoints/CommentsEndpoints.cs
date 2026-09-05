using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class CommentsEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedTargetTypes = ["ticket", "project"];
    private const int BodyMaxLength = 2000;
    private const int TargetIdMaxLength = 64;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/comments")
            .WithTags("Comments");

        group.MapGet("", GetComments)
            .RequireLogin()
            .WithName("GetComments");

        group.MapPost("", CreateComment)
            .RequireLogin()
            .WithName("CreateComment");
    }

    private static async Task<IResult> GetComments(
        string? targetType,
        string? targetId,
        AdminDbContext db,
        CancellationToken ct)
    {
        var typeError = ValidateTargetType(targetType);
        if (typeError is not null)
        {
            return typeError;
        }

        var id = TicketsEndpoints.NormalizeOptional(targetId);
        if (id is null)
        {
            return Results.Json(
                ApiResult.Fail<CommentResponse[]>("目标 ID 不能为空", 400),
                AppJsonContext.Default.ApiResponseCommentResponseArray,
                statusCode: 400);
        }

        var type = targetType!.Trim().ToLowerInvariant();
        var items = await db.Comments
            .AsNoTracking()
            .Where(c => c.TargetType == type && c.TargetId == id)
            .OrderBy(c => c.CreatedAt)
            .ThenBy(c => c.Id)
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(items.Select(ToResponse).ToArray()),
            AppJsonContext.Default.ApiResponseCommentResponseArray);
    }

    private static async Task<IResult> CreateComment(
        CreateCommentRequest request,
        AdminDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var typeError = ValidateTargetType(request.TargetType);
        if (typeError is not null)
        {
            return typeError;
        }

        var targetId = TicketsEndpoints.NormalizeOptional(request.TargetId);
        if (targetId is null)
        {
            return Results.Json(
                ApiResult.Fail<CommentResponse>("目标 ID 不能为空", 400),
                AppJsonContext.Default.ApiResponseCommentResponse,
                statusCode: 400);
        }

        if (targetId.Length > TargetIdMaxLength)
        {
            return Results.Json(
                ApiResult.Fail<CommentResponse>($"目标 ID 长度不能超过 {TargetIdMaxLength}", 400),
                AppJsonContext.Default.ApiResponseCommentResponse,
                statusCode: 400);
        }

        var body = TicketsEndpoints.NormalizeOptional(request.Body);
        if (body is null)
        {
            return Results.Json(
                ApiResult.Fail<CommentResponse>("评论内容不能为空", 400),
                AppJsonContext.Default.ApiResponseCommentResponse,
                statusCode: 400);
        }

        if (body.Length > BodyMaxLength)
        {
            return Results.Json(
                ApiResult.Fail<CommentResponse>($"评论内容长度不能超过 {BodyMaxLength}", 400),
                AppJsonContext.Default.ApiResponseCommentResponse,
                statusCode: 400);
        }

        var comment = new CommentEntity
        {
            PublicId = $"c-{Guid.NewGuid():N}"[..16],
            TargetType = request.TargetType!.Trim().ToLowerInvariant(),
            TargetId = targetId,
            Body = body,
            UserName = await TicketsEndpoints.ResolveActorNameAsync(db, httpContext, ct),
            CreatedAt = DateTime.Now
        };

        db.Comments.Add(comment);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(comment)),
            AppJsonContext.Default.ApiResponseCommentResponse);
    }

    private static IResult? ValidateTargetType(string? targetType)
    {
        var type = TicketsEndpoints.NormalizeOptional(targetType)?.ToLowerInvariant();
        if (type is null || !AllowedTargetTypes.Contains(type))
        {
            return Results.Json(
                ApiResult.Fail<CommentResponse[]>("无效的评论目标类型", 400),
                AppJsonContext.Default.ApiResponseCommentResponseArray,
                statusCode: 400);
        }

        return null;
    }

    private static CommentResponse ToResponse(CommentEntity comment) =>
        new(
            comment.PublicId,
            comment.Body,
            new CommentUserResponse(comment.UserName),
            TicketsEndpoints.FormatTime(comment.CreatedAt));
}
