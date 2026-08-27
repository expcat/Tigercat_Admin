namespace Tigercat.Admin.Api.Endpoints;

public record CalendarEventResponse(
    string Id,
    string Date,
    string Start,
    string End,
    string Title,
    string Type,
    string Location);

public record CreateCalendarEventRequest(
    string? Date,
    string? Start,
    string? End,
    string? Title,
    string? Type,
    string? Location);
