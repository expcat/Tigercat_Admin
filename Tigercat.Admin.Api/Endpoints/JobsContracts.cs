namespace Tigercat.Admin.Api.Endpoints;

public record JobResponse(
    string Id,
    string Name,
    string Cron,
    int Concurrency,
    string Timeout,
    string BatchSize,
    bool Enabled,
    string Status,
    string LastRun,
    string NextRun,
    int Progress,
    int Phase,
    string Start,
    string End,
    string Color);

public record CreateJobRequest(
    string? Name,
    string? Cron,
    int? Concurrency,
    string? Timeout,
    string? BatchSize,
    bool? Enabled);

public record UpdateJobRequest(
    string? Name,
    string? Cron,
    int? Concurrency,
    string? Timeout,
    string? BatchSize,
    bool? Enabled,
    string? Status);
