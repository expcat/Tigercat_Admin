namespace Tigercat.Admin.Api.Data.Entities;

public class TicketMessageEntity
{
    public int Id { get; set; }
    public int TicketId { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Direction { get; set; } = "self";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public TicketEntity Ticket { get; set; } = null!;
}
