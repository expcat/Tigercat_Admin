namespace Tigercat.Admin.Api.Endpoints;

public class MenuSchemaNodeResponse
{
    public required string Key { get; init; }
    public string? Label { get; init; }
    public string? Icon { get; init; }
    public string? Path { get; init; }
    public string? Permission { get; init; }
    public bool HideInMenu { get; init; }
    public MenuSchemaNodeResponse[]? Children { get; init; }
}

public class MenuSchemaResponse
{
    public required MenuSchemaNodeResponse[] Items { get; init; }
    public required MenuSchemaNodeResponse[] BottomItems { get; init; }
}
