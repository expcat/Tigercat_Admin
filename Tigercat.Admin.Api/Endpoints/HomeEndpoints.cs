using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;

namespace Tigercat.Admin.Api.Endpoints;

public class HomeEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/home")
            .WithTags("Home");

        group.MapGet("", () => ApiResult.Ok("Hello world"))
            .RequireLogin()
            .WithName("Home");
    }
}
