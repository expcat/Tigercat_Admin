namespace Tigercat.Admin.Api.Endpoints;

public record ProjectMemberResponse(
    string Id,
    string Name,
    string Role,
    string Color);

public record ProjectActivityResponse(
    string Key,
    string Label,
    string Content,
    string Color);

public record ProjectResponse(
    string Id,
    string Name,
    string Summary,
    string Owner,
    string Department,
    string Status,
    int Progress,
    int Milestone,
    int Budget,
    string StartAt,
    string EndAt,
    ProjectMemberResponse[] Members,
    ProjectActivityResponse[] Activities);
