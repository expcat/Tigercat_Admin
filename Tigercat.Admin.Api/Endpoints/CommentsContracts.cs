namespace Tigercat.Admin.Api.Endpoints;

public record CommentUserResponse(string Name);

public record CommentResponse(
    string Id,
    string Content,
    CommentUserResponse User,
    string Time);

public record CreateCommentRequest(
    string? TargetType,
    string? TargetId,
    string? Body);
