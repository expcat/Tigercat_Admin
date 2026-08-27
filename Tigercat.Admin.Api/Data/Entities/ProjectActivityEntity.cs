namespace Tigercat.Admin.Api.Data.Entities;

public class ProjectActivityEntity
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public ProjectEntity Project { get; set; } = null!;
}
