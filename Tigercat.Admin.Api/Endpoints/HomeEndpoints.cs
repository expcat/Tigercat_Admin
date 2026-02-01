using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class HomeEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/home")
            .WithTags("Home");

        group.MapGet("", GetHome)
            .RequireLogin()
            .WithName("Home");
    }

    private static Task<IResult> GetHome(CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();
        return Task.FromResult<IResult>(Results.Json(ApiResult.Ok("Hello world"), AppJsonContext.Default.ApiResponseString));
    }
}
