using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class ProjectsEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedStatuses = ["planning", "active", "paused", "done"];
    private const int DefaultPageSize = 6;
    private const int MaxPageSize = 200;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/projects")
            .WithTags("Projects");

        group.MapGet("", GetProjects)
            .RequireLogin()
            .WithName("GetProjects");

        group.MapGet("/{id}", GetProject)
            .RequireLogin()
            .WithName("GetProject");
    }

    private static async Task<IResult> GetProjects(
        int? page,
        int? pageSize,
        string? status,
        string? keyword,
        AdminDbContext db,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize);

        IQueryable<ProjectEntity> query = db.Projects;

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            if (!AllowedStatuses.Contains(normalizedStatus))
            {
                return Results.Json(
                    ApiResult.Fail<PagedResponse<ProjectResponse>>("无效的项目状态", 400),
                    AppJsonContext.Default.ApiResponsePagedResponseProjectResponse,
                    statusCode: 400);
            }

            query = query.Where(item => item.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            query = query.Where(item =>
                item.Name.ToLower().Contains(kw) ||
                item.Owner.ToLower().Contains(kw) ||
                item.PublicId.ToLower().Contains(kw));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .Include(item => item.Members)
            .Include(item => item.Activities)
            .OrderBy(item => item.PublicId)
            .ThenBy(item => item.Id)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToArrayAsync(ct);

        var data = items.Select(ToResponse).ToArray();
        return Results.Json(
            ApiResult.Ok(new PagedResponse<ProjectResponse>(data, total, p, ps)),
            AppJsonContext.Default.ApiResponsePagedResponseProjectResponse);
    }

    private static async Task<IResult> GetProject(string id, AdminDbContext db, CancellationToken ct)
    {
        var project = await db.Projects
            .Include(item => item.Members)
            .Include(item => item.Activities)
            .FirstOrDefaultAsync(item => item.PublicId == id, ct);

        if (project is null)
        {
            return Results.Json(
                ApiResult.Fail<ProjectResponse>("项目不存在", 404),
                AppJsonContext.Default.ApiResponseProjectResponse,
                statusCode: 404);
        }

        return Results.Json(
            ApiResult.Ok(ToResponse(project)),
            AppJsonContext.Default.ApiResponseProjectResponse);
    }

    private static ProjectResponse ToResponse(ProjectEntity project)
    {
        var members = project.Members
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .Select(item => new ProjectMemberResponse(item.PublicId, item.Name, item.Role, item.Color))
            .ToArray();

        var activities = project.Activities
            .OrderBy(item => item.SortOrder)
            .ThenBy(item => item.Id)
            .Select(item => new ProjectActivityResponse(item.PublicId, item.Label, item.Content, item.Color))
            .ToArray();

        return new ProjectResponse(
            project.PublicId,
            project.Name,
            project.Summary,
            project.Owner,
            project.Department,
            project.Status,
            project.Progress,
            project.Milestone,
            project.Budget,
            project.StartAt,
            project.EndAt,
            members,
            activities);
    }
}
