using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class MenusEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/menus")
            .WithTags("Menus");

        group.MapGet("/schema", GetSchema)
            .RequireLogin()
            .WithName("GetMenuSchema");
    }

    private static IResult GetSchema()
    {
        return Results.Json(
            ApiResult.Ok(MenusCatalog.Schema),
            AppJsonContext.Default.ApiResponseMenuSchemaResponse);
    }
}
