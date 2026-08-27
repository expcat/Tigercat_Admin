namespace Tigercat.Admin.Api.Endpoints;

public record ChatMessageResponse(
    string Id,
    string Content,
    string Direction,
    string Time);

public record CreateChatMessageRequest(string? Content);
