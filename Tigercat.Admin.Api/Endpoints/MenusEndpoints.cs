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

        group.MapPost("/nodes", CreateNode)
            .RequirePermission("menu:create")
            .WithName("CreateMenuNode");

        group.MapPut("/nodes/{key}", UpdateNode)
            .RequirePermission("menu:edit")
            .WithName("UpdateMenuNode");

        group.MapDelete("/nodes/{key}", DeleteNode)
            .RequirePermission("menu:delete")
            .WithName("DeleteMenuNode");
    }

    private static IResult GetSchema(MenuSchemaStore store)
    {
        return Results.Json(
            ApiResult.Ok(store.Snapshot()),
            AppJsonContext.Default.ApiResponseMenuSchemaResponse);
    }

    private static IResult CreateNode(MenuNodeWriteRequest request, MenuSchemaStore store)
    {
        var result = store.Create(request);
        if (!result.Ok)
        {
            return MutationError(result);
        }

        return Results.Json(
            ApiResult.Ok(result.Node!),
            AppJsonContext.Default.ApiResponseMenuSchemaNodeResponse,
            statusCode: 201);
    }

    private static IResult UpdateNode(string key, MenuNodeWriteRequest request, MenuSchemaStore store)
    {
        var result = store.Update(key, request);
        if (!result.Ok)
        {
            return MutationError(result);
        }

        return Results.Json(
            ApiResult.Ok(result.Node!),
            AppJsonContext.Default.ApiResponseMenuSchemaNodeResponse);
    }

    private static IResult DeleteNode(string key, MenuSchemaStore store)
    {
        var result = store.Delete(key);
        if (!result.Ok)
        {
            return MutationError(result);
        }

        return Results.Json(
            ApiResult.Ok(new MessageResponse(result.Message)),
            AppJsonContext.Default.ApiResponseMessageResponse);
    }

    private static IResult MutationError(MenuSchemaMutation result)
    {
        return Results.Json(
            ApiResult.Fail<MenuSchemaNodeResponse>(result.Message, result.Status),
            AppJsonContext.Default.ApiResponseMenuSchemaNodeResponse,
            statusCode: result.Status);
    }
}
