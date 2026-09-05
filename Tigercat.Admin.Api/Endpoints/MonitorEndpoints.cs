using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Hubs;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class MonitorEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/monitor")
            .WithTags("Monitor");

        group.MapGet("/snapshot", GetSnapshot)
            .RequireLogin()
            .WithName("GetMonitorSnapshot");
    }

    private static IResult GetSnapshot(MonitorSnapshotSource snapshots)
    {
        return Results.Json(
            ApiResult.Ok(snapshots.Next()),
            AppJsonContext.Default.ApiResponseMonitorSnapshotResponse);
    }
}
