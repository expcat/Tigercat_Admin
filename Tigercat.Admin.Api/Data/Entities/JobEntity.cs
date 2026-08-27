namespace Tigercat.Admin.Api.Data.Entities;

public class JobEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Cron { get; set; } = string.Empty;
    public int Concurrency { get; set; } = 1;
    public string Timeout { get; set; } = "60";
    public string BatchSize { get; set; } = "500";
    public bool Enabled { get; set; } = true;
    public string Status { get; set; } = "running";
    public string LastRun { get; set; } = "—";
    public string NextRun { get; set; } = "—";
    public int Progress { get; set; }
    public int Phase { get; set; }
    public string Start { get; set; } = string.Empty;
    public string End { get; set; } = string.Empty;
    public string Color { get; set; } = "#3b82f6";
}
