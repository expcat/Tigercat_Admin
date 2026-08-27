namespace Tigercat.Admin.Api.Data.Entities;

public class ProjectEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Owner { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Status { get; set; } = "planning";
    public int Progress { get; set; }
    public int Milestone { get; set; }
    public int Budget { get; set; }
    public string StartAt { get; set; } = string.Empty;
    public string EndAt { get; set; } = string.Empty;
    public List<ProjectMemberEntity> Members { get; set; } = [];
    public List<ProjectActivityEntity> Activities { get; set; } = [];
}
