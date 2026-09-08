namespace Tigercat.Admin.Api.Endpoints;

public class MenuSchemaNodeResponse
{
    public required string Key { get; set; }
    public string? Label { get; set; }
    public string? Icon { get; set; }
    public string? Path { get; set; }
    public string? Permission { get; set; }
    public bool HideInMenu { get; set; }
    public bool HideInBreadcrumb { get; set; }
    public bool FlatMenu { get; set; }
    public string? IframeSrc { get; set; }
    public MenuSchemaNodeResponse[]? Children { get; set; }
}

public class MenuSchemaResponse
{
    public required MenuSchemaNodeResponse[] Items { get; set; }
    public required MenuSchemaNodeResponse[] BottomItems { get; set; }
}

public class MenuNodeWriteRequest
{
    public string? Key { get; init; }
    public string? Label { get; init; }
    public string? Icon { get; init; }
    public string? Path { get; init; }
    public string? Permission { get; init; }
    public bool? HideInMenu { get; init; }
    public bool? HideInBreadcrumb { get; init; }
    public bool? FlatMenu { get; init; }
    public string? IframeSrc { get; init; }
    public string? ParentKey { get; init; }
    public string? Placement { get; init; }
}
