using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class TasksEndpoints : IEndpointDefinition
{
    private static readonly string[] AllowedStatuses = ["backlog", "todo", "doing", "review", "done"];
    private static readonly string[] AllowedPriorities = ["low", "medium", "high"];
    private const int TitleMaxLength = 120;
    private const int DescriptionMaxLength = 1000;
    private const int AssigneeMaxLength = 80;
    private const int DefaultPageSize = 100;
    private const int MaxPageSize = 200;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tasks")
            .WithTags("Tasks");

        group.MapGet("", GetTasks)
            .RequirePermission("task:view")
            .WithName("GetTasks");

        group.MapGet("/{id}", GetTask)
            .RequirePermission("task:view")
            .WithName("GetTask");

        group.MapPost("", CreateTask)
            .RequirePermission("task:create")
            .WithName("CreateTask");

        group.MapPut("/{id}", UpdateTask)
            .RequirePermission("task:edit")
            .WithName("UpdateTask");

        group.MapPut("/{id}/status", MoveTask)
            .RequirePermission("task:edit")
            .WithName("MoveTask");
    }

    private static async Task<IResult> GetTasks(
        int? page,
        int? pageSize,
        string? status,
        string? keyword,
        AdminDbContext db,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize);

        IQueryable<AdminTaskEntity> query = db.AdminTasks;

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            if (!AllowedStatuses.Contains(normalizedStatus))
            {
                return Results.Json(
                    ApiResult.Fail<PagedResponse<AdminTaskResponse>>("无效的任务状态", 400),
                    AppJsonContext.Default.ApiResponsePagedResponseAdminTaskResponse,
                    statusCode: 400);
            }

            query = query.Where(t => t.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            query = query.Where(t =>
                t.Title.ToLower().Contains(kw) ||
                (t.Description != null && t.Description.ToLower().Contains(kw)) ||
                t.Assignee.ToLower().Contains(kw));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(t => t.Status)
            .ThenBy(t => t.DueAt)
            .ThenByDescending(t => t.Id)
            .Skip((p - 1) * ps)
            .Take(ps)
            .Select(t => ToResponse(t))
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(new PagedResponse<AdminTaskResponse>(items, total, p, ps)),
            AppJsonContext.Default.ApiResponsePagedResponseAdminTaskResponse);
    }

    private static async Task<IResult> GetTask(string id, AdminDbContext db, CancellationToken ct)
    {
        var task = await db.AdminTasks
            .Where(t => t.PublicId == id)
            .Select(t => ToResponse(t))
            .FirstOrDefaultAsync(ct);

        if (task is null)
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("任务不存在", 404),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 404);
        }

        return Results.Json(
            ApiResult.Ok(task),
            AppJsonContext.Default.ApiResponseAdminTaskResponse);
    }

    private static async Task<IResult> CreateTask(
        CreateAdminTaskRequest request,
        AdminDbContext db,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var validation = ValidateTaskInput(
            request.Title,
            request.Description,
            request.Assignee,
            request.Priority,
            request.Status,
            request.EstimateHours);

        if (validation is not null)
        {
            return validation;
        }

        var task = new AdminTaskEntity
        {
            PublicId = $"task-{Guid.NewGuid():N}",
            Title = request.Title.Trim(),
            Description = NormalizeOptional(request.Description),
            Assignee = NormalizeOptional(request.Assignee) ?? "待分配",
            Priority = NormalizeChoice(request.Priority, AllowedPriorities, "medium"),
            Status = NormalizeChoice(request.Status, AllowedStatuses, "todo"),
            DueAt = request.DueAt?.ToUniversalTime() ?? DateTime.UtcNow.AddDays(2),
            EstimateHours = request.EstimateHours ?? 2,
            Blocked = request.Blocked ?? false,
            CreatedBy = GetOperatorUsername(httpContext),
            CreatedAt = DateTime.UtcNow
        };

        if (task.Status == "done")
        {
            task.CompletedAt = DateTime.UtcNow;
        }

        db.AdminTasks.Add(task);
        await db.SaveChangesAsync(ct);
        await PublishTaskEventAsync(eventPublisher, "admin.task.created", task, httpContext, ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(task)),
            AppJsonContext.Default.ApiResponseAdminTaskResponse,
            statusCode: 201);
    }

    private static async Task<IResult> UpdateTask(
        string id,
        UpdateAdminTaskRequest request,
        AdminDbContext db,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var task = await db.AdminTasks.FirstOrDefaultAsync(t => t.PublicId == id, ct);

        if (task is null)
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("任务不存在", 404),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 404);
        }

        var validation = ValidateTaskInput(
            request.Title ?? task.Title,
            request.Description ?? task.Description,
            request.Assignee ?? task.Assignee,
            request.Priority ?? task.Priority,
            request.Status ?? task.Status,
            request.EstimateHours ?? task.EstimateHours);

        if (validation is not null)
        {
            return validation;
        }

        if (request.Title is not null)
        {
            task.Title = request.Title.Trim();
        }

        if (request.Description is not null)
        {
            task.Description = NormalizeOptional(request.Description);
        }

        if (request.Assignee is not null)
        {
            task.Assignee = NormalizeOptional(request.Assignee) ?? "待分配";
        }

        if (request.Priority is not null)
        {
            task.Priority = NormalizeChoice(request.Priority, AllowedPriorities, "medium");
        }

        if (request.Status is not null)
        {
            ApplyStatus(task, NormalizeChoice(request.Status, AllowedStatuses, task.Status));
        }

        if (request.DueAt.HasValue)
        {
            task.DueAt = request.DueAt.Value.ToUniversalTime();
        }

        if (request.EstimateHours.HasValue)
        {
            task.EstimateHours = request.EstimateHours.Value;
        }

        if (request.Blocked.HasValue)
        {
            task.Blocked = request.Blocked.Value;
        }

        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
        await PublishTaskEventAsync(eventPublisher, "admin.task.updated", task, httpContext, ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(task)),
            AppJsonContext.Default.ApiResponseAdminTaskResponse);
    }

    private static async Task<IResult> MoveTask(
        string id,
        MoveAdminTaskRequest request,
        AdminDbContext db,
        IEventPublisher eventPublisher,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var status = NormalizeOptional(request.Status)?.ToLowerInvariant();
        if (status is null || !AllowedStatuses.Contains(status))
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("无效的任务状态", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        var task = await db.AdminTasks.FirstOrDefaultAsync(t => t.PublicId == id, ct);

        if (task is null)
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("任务不存在", 404),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 404);
        }

        if (task.Blocked && status == "done")
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("阻塞任务不能直接移动到已完成", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        var previousStatus = task.Status;
        ApplyStatus(task, status);
        task.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);

        await eventPublisher.PublishAsync(
            EventEnvelope.Create(
                "admin.task.moved",
                new Dictionary<string, object?>
                {
                    ["taskId"] = task.PublicId,
                    ["title"] = task.Title,
                    ["fromStatus"] = previousStatus,
                    ["toStatus"] = task.Status,
                    ["operator"] = GetOperatorUsername(httpContext)
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(task)),
            AppJsonContext.Default.ApiResponseAdminTaskResponse);
    }

    private static IResult? ValidateTaskInput(
        string? title,
        string? description,
        string? assignee,
        string? priority,
        string? status,
        double? estimateHours)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("任务标题不能为空", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        if (title.Trim().Length > TitleMaxLength)
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>($"任务标题长度不能超过 {TitleMaxLength}", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        if (description is { Length: > DescriptionMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>($"任务说明长度不能超过 {DescriptionMaxLength}", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        if (assignee is { Length: > AssigneeMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>($"负责人长度不能超过 {AssigneeMaxLength}", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        if (!string.IsNullOrWhiteSpace(priority) && !AllowedPriorities.Contains(priority.Trim().ToLowerInvariant()))
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("无效的任务优先级", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        if (!string.IsNullOrWhiteSpace(status) && !AllowedStatuses.Contains(status.Trim().ToLowerInvariant()))
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("无效的任务状态", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        if (estimateHours is < 0 or > 1000)
        {
            return Results.Json(
                ApiResult.Fail<AdminTaskResponse>("预估工时需在 0-1000 之间", 400),
                AppJsonContext.Default.ApiResponseAdminTaskResponse,
                statusCode: 400);
        }

        return null;
    }

    private static void ApplyStatus(AdminTaskEntity task, string status)
    {
        task.Status = status;
        task.CompletedAt = status == "done"
            ? task.CompletedAt ?? DateTime.UtcNow
            : null;
    }

    private static string NormalizeChoice(string? value, string[] allowed, string fallback)
    {
        var normalized = NormalizeOptional(value)?.ToLowerInvariant();
        return normalized is not null && allowed.Contains(normalized) ? normalized : fallback;
    }

    private static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static AdminTaskResponse ToResponse(AdminTaskEntity task)
    {
        return new AdminTaskResponse(
            task.PublicId,
            task.Title,
            task.Description,
            task.Assignee,
            task.Priority,
            task.Status,
            task.DueAt,
            task.EstimateHours,
            task.Blocked,
            task.CreatedBy,
            task.CreatedAt,
            task.UpdatedAt,
            task.CompletedAt);
    }

    private static Task PublishTaskEventAsync(
        IEventPublisher eventPublisher,
        string eventType,
        AdminTaskEntity task,
        HttpContext httpContext,
        CancellationToken ct)
    {
        return eventPublisher.PublishAsync(
            EventEnvelope.Create(
                eventType,
                new Dictionary<string, object?>
                {
                    ["taskId"] = task.PublicId,
                    ["title"] = task.Title,
                    ["status"] = task.Status,
                    ["assignee"] = task.Assignee,
                    ["operator"] = GetOperatorUsername(httpContext)
                },
                httpContext.TraceIdentifier),
            EventBusConstants.AdminStream,
            ct);
    }

    private static string GetOperatorUsername(HttpContext httpContext)
    {
        return httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var operatorObj) &&
            operatorObj is string operatorName
            ? operatorName
            : "unknown";
    }
}
