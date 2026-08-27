namespace Tigercat.Admin.Api.Data.Entities;

public class ProjectMemberEntity
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public ProjectEntity Project { get; set; } = null!;
}
