namespace Tigercat.Admin.Api.Endpoints;

public record ImportMappings(int? Username, int? Password, int? DisplayName, int? RoleIds);
public record CreateImportJobRequest(string? Source, string? Csv, ImportMappings? Mappings, string? Mode = null, string? Conflict = null);
public record ImportRowResponse(int RowNumber, string Username, string? DisplayName, string RoleIds, string Status, string Message, int? UserId);
public record ImportPreviewResponse(string[] Headers, ImportMappings Mappings, int Total, int Valid, int Skipped, int Failed, string PasswordHint, ImportRowResponse[] Rows);
public record ImportJobResultResponse(int Imported, int Skipped, int Failed, string Message);
public record ImportJobResponse(string Id, string Source, string Resource, string Mode, string Conflict, string Status, int Progress, int Total, int Processed, ImportJobResultResponse? Result, ImportRowResponse[] Rows);
