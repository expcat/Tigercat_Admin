namespace Tigercat.Admin.Api.Endpoints;

public record ImportJobResultResponse(
    int Imported,
    int Skipped,
    string Message);

public record ImportJobResponse(
    string Id,
    string Source,
    string[] Target,
    string[] Mappings,
    string Mode,
    string Conflict,
    int BatchSize,
    string Status,
    int Progress,
    ImportJobResultResponse? Result);

public record CreateImportJobRequest(
    string? Source,
    string[]? Target,
    string[]? Mappings,
    string? Mode,
    string? Conflict,
    int? BatchSize);
