namespace Tigercat.Admin.Api.Data.Entities;

public class TicketEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Requester { get; set; } = string.Empty;
    public string Category { get; set; } = "缺陷";
    public string Priority { get; set; } = "medium";
    public string Status { get; set; } = "open";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public double Satisfaction { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<TicketMessageEntity> Messages { get; set; } = [];
}
