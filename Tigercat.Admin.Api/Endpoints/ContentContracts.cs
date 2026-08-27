namespace Tigercat.Admin.Api.Endpoints;

public record ArticleResponse(
    string Id,
    string Title,
    string EditorType,
    string Body,
    string[] Tags,
    string Category,
    string[] Column,
    bool Published);

public record UpdateArticleRequest(
    string? Title,
    string? EditorType,
    string? Body,
    string[]? Tags,
    string? Category,
    string[]? Column,
    bool? Published);
