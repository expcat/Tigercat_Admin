namespace Tigercat.Admin.Api.Data.Entities;

public class AdminTaskEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = Guid.NewGuid().ToString("N");
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Assignee { get; set; } = "待分配";
    public string Priority { get; set; } = "medium";
    public string Status { get; set; } = "todo";
    public DateTime DueAt { get; set; } = DateTime.UtcNow.AddDays(2);
    public double EstimateHours { get; set; } = 2;
    public bool Blocked { get; set; }
    public string? CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
