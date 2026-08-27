namespace Tigercat.Admin.Api.Endpoints;

public record TicketMessageResponse(
    string Id,
    string Content,
    string Direction,
    string Time);

public record TicketResponse(
    string Id,
    string Title,
    string Requester,
    string Category,
    string Priority,
    string Status,
    string CreatedAt,
    string UpdatedAt,
    double Satisfaction,
    string Description,
    TicketMessageResponse[] Messages);

public record CreateTicketRequest(
    string Title,
    string? Category,
    string? Priority,
    string? Description);

public record UpdateTicketRequest(
    string? Title,
    string? Category,
    string? Priority,
    string? Status,
    string? Description,
    double? Satisfaction);

public record CreateTicketMessageRequest(string? Content);
