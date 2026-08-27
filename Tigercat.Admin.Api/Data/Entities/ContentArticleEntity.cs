namespace Tigercat.Admin.Api.Data.Entities;

public class ContentArticleEntity
{
    public int Id { get; set; }
    public string PublicId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string EditorType { get; set; } = "rich";
    public string Body { get; set; } = string.Empty;
    public string TagsJson { get; set; } = "[]";
    public string Category { get; set; } = string.Empty;
    public string ColumnJson { get; set; } = "[]";
    public bool Published { get; set; }
}
