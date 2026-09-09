using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class ApprovalsEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/approvals")
            .WithTags("Approvals");

        group.MapGet("", GetApprovals)
            .RequireLogin()
            .WithName("GetApprovals");

        group.MapGet("/{id}", GetApproval)
            .RequireLogin()
            .WithName("GetApproval");

        group.MapPost("", CreateApproval)
            .RequireLogin()
            .WithName("CreateApproval");

        group.MapPost("/{id}/actions", ApplyApprovalAction)
            .RequireLogin()
            .WithName("ApplyApprovalAction");
    }

    private static IResult GetApprovals(
        string? lane,
        string? keyword,
        int? page,
        int? pageSize,
        HttpContext httpContext,
        ApprovalStore store)
    {
        try
        {
            var username = CurrentUsername(httpContext);
            var (items, total, p, ps) = store.List(username, lane, keyword, page, pageSize);
            return Results.Json(
                ApiResult.Ok(new PagedResponse<ApprovalListItemResponse>(items, total, p, ps)),
                AppJsonContext.Default.ApiResponsePagedResponseApprovalListItemResponse);
        }
        catch (ApprovalStoreException ex)
        {
            return Results.Json(
                ApiResult.Fail<PagedResponse<ApprovalListItemResponse>>(ex.Message, ex.Status),
                AppJsonContext.Default.ApiResponsePagedResponseApprovalListItemResponse,
                statusCode: ex.Status);
        }
    }

    private static IResult GetApproval(string id, ApprovalStore store)
    {
        var detail = store.Get(id);
        if (detail is null)
        {
            return ApprovalNotFound();
        }

        return Results.Json(
            ApiResult.Ok(detail),
            AppJsonContext.Default.ApiResponseApprovalDetailResponse);
    }

    private static IResult CreateApproval(
        CreateApprovalRequest request,
        HttpContext httpContext,
        ApprovalStore store)
    {
        var result = store.Create(request, CurrentUsername(httpContext));
        if (!result.Ok)
        {
            return MutationError(result);
        }

        return Results.Json(
            ApiResult.Ok(result.Detail!),
            AppJsonContext.Default.ApiResponseApprovalDetailResponse,
            statusCode: 201);
    }

    private static async Task<IResult> ApplyApprovalAction(
        string id,
        ApprovalActionRequest request,
        HttpContext httpContext,
        ApprovalStore store,
        AdminDbContext db,
        CancellationToken ct)
    {
        var result = store.ApplyAction(id, request, CurrentUsername(httpContext));
        if (!result.Ok)
        {
            return MutationError(result);
        }

        if (!string.IsNullOrWhiteSpace(result.TicketId) && !string.IsNullOrWhiteSpace(result.TicketStatus))
        {
            var ticket = await db.Tickets.FirstOrDefaultAsync(item => item.PublicId == result.TicketId, ct);
            if (ticket is not null && ApprovalStore.ShouldAdvanceTicketStatus(ticket.Status, result.TicketStatus))
            {
                ticket.Status = result.TicketStatus;
                ticket.UpdatedAt = DateTime.Now;
                await db.SaveChangesAsync(ct);
            }
        }

        return Results.Json(
            ApiResult.Ok(result.Detail!),
            AppJsonContext.Default.ApiResponseApprovalDetailResponse);
    }

    private static IResult MutationError(ApprovalMutation result)
    {
        return Results.Json(
            ApiResult.Fail<ApprovalDetailResponse>(result.Message, result.Status),
            AppJsonContext.Default.ApiResponseApprovalDetailResponse,
            statusCode: result.Status);
    }

    private static IResult ApprovalNotFound()
        => Results.Json(
            ApiResult.Fail<ApprovalDetailResponse>("审批实例不存在", 404),
            AppJsonContext.Default.ApiResponseApprovalDetailResponse,
            statusCode: 404);

    private static string CurrentUsername(HttpContext httpContext)
        => httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var operatorObj) &&
           operatorObj is string operatorName
            ? operatorName
            : "unknown";
}
