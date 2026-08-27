namespace Tigercat.Admin.Api.Data.Entities;

public class ImportJobEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string TargetJson { get; set; } = "[]";
    public string MappingsJson { get; set; } = "[]";
    public string Mode { get; set; } = "append";
    public string Conflict { get; set; } = "skip";
    public int BatchSize { get; set; } = 1000;
    public string Status { get; set; } = "pending";
    public int Progress { get; set; }
    public int? Imported { get; set; }
    public int? Skipped { get; set; }
    public string? ResultMessage { get; set; }
}
