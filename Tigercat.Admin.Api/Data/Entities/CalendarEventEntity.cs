namespace Tigercat.Admin.Api.Data.Entities;

public class CalendarEventEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Start { get; set; } = string.Empty;
    public string End { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = "meeting";
    public string Location { get; set; } = string.Empty;
}
