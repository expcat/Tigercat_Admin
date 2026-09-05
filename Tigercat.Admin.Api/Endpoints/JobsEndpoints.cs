using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Observability;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class JobsEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedStatuses = ["running", "paused", "failed"];
    private const int NameMaxLength = 120;
    private const int CronMaxLength = 64;
    private const int TimeoutMaxLength = 16;
    private const int BatchSizeMaxLength = 16;
    private const int MinConcurrency = 1;
    private const int MaxConcurrency = 20;
    internal const string DefaultGanttStart = "2026-07-01";
    internal const string DefaultGanttEnd = "2026-07-02";
    internal const string DefaultGanttColor = "#3b82f6";
    internal const string PendingNextRun = "待调度";
    internal const string Dash = "—";

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/jobs")
            .WithTags("Jobs");

        group.MapGet("", GetJobs)
            .RequireLogin()
            .WithName("GetJobs");

        group.MapPost("", CreateJob)
            .RequireLogin()
            .WithName("CreateJob");

        group.MapPut("/{id}", UpdateJob)
            .RequireLogin()
            .WithName("UpdateJob");
    }

    private static async Task<IResult> GetJobs(AdminDbContext db, CancellationToken ct)
    {
        var items = await db.Jobs
            .AsNoTracking()
            .OrderBy(item => item.PublicId)
            .ThenBy(item => item.Id)
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(items.Select(ToResponse).ToArray()),
            AppJsonContext.Default.ApiResponseJobResponseArray);
    }

    private static async Task<IResult> CreateJob(
        CreateJobRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var validation = ValidateJobInput(
            request.Name,
            request.Cron,
            request.Concurrency,
            request.Timeout,
            request.BatchSize,
            allowEmptyName: false);
        if (validation is not null)
        {
            return validation;
        }

        var enabled = request.Enabled ?? true;
        var entity = new JobEntity
        {
            PublicId = await NextJobIdAsync(db, ct),
            Name = request.Name!.Trim(),
            Cron = NormalizeCron(request.Cron),
            Concurrency = NormalizeConcurrency(request.Concurrency, 2),
            Timeout = NormalizeOptional(request.Timeout) ?? "60",
            BatchSize = NormalizeOptional(request.BatchSize) ?? "500",
            Enabled = enabled,
            Status = enabled ? "running" : "paused",
            LastRun = Dash,
            NextRun = enabled ? PendingNextRun : Dash,
            Progress = 0,
            Phase = 0,
            Start = DefaultGanttStart,
            End = DefaultGanttEnd,
            Color = DefaultGanttColor
        };

        db.Jobs.Add(entity);
        await db.SaveChangesAsync(ct);
        AdminMetrics.RecordJob("created");

        return Results.Json(
            ApiResult.Ok(ToResponse(entity)),
            AppJsonContext.Default.ApiResponseJobResponse);
    }

    private static async Task<IResult> UpdateJob(
        string id,
        UpdateJobRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var job = await db.Jobs.FirstOrDefaultAsync(item => item.PublicId == id, ct);
        if (job is null)
        {
            return Results.Json(
                ApiResult.Fail<JobResponse>("任务不存在", 404),
                AppJsonContext.Default.ApiResponseJobResponse,
                statusCode: 404);
        }

        var validation = ValidateJobInput(
            request.Name ?? job.Name,
            request.Cron ?? job.Cron,
            request.Concurrency ?? job.Concurrency,
            request.Timeout ?? job.Timeout,
            request.BatchSize ?? job.BatchSize,
            allowEmptyName: request.Name is null);
        if (validation is not null)
        {
            return validation;
        }

        if (request.Name is not null)
        {
            job.Name = request.Name.Trim();
        }

        if (request.Cron is not null)
        {
            job.Cron = NormalizeCron(request.Cron);
        }

        if (request.Concurrency.HasValue)
        {
            job.Concurrency = NormalizeConcurrency(request.Concurrency, job.Concurrency);
        }

        if (request.Timeout is not null)
        {
            job.Timeout = NormalizeOptional(request.Timeout) ?? job.Timeout;
        }

        if (request.BatchSize is not null)
        {
            job.BatchSize = NormalizeOptional(request.BatchSize) ?? job.BatchSize;
        }

        var wasEnabled = job.Enabled;
        if (request.Enabled.HasValue)
        {
            job.Enabled = request.Enabled.Value;
        }

        ApplyStatusMachine(job, wasEnabled, request.Status);
        await db.SaveChangesAsync(ct);
        AdminMetrics.RecordJob("updated");

        return Results.Json(
            ApiResult.Ok(ToResponse(job)),
            AppJsonContext.Default.ApiResponseJobResponse);
    }

    internal static void ApplyStatusMachine(JobEntity job, bool wasEnabled, string? requestedStatus)
    {
        if (!job.Enabled)
        {
            job.Status = "paused";
            job.NextRun = Dash;
            return;
        }

        var reenabled = !wasEnabled;
        if (reenabled)
        {
            job.Status = "running";
            if (string.IsNullOrWhiteSpace(job.NextRun) || job.NextRun == Dash)
            {
                job.NextRun = PendingNextRun;
            }

            return;
        }

        if (job.Status == "failed")
        {
            return;
        }

        var status = TicketsEndpoints.NormalizeOptional(requestedStatus)?.ToLowerInvariant();
        job.Status = status is not null && AllowedStatuses.Contains(status) ? status : "running";
        if (string.IsNullOrWhiteSpace(job.NextRun) || job.NextRun == Dash)
        {
            job.NextRun = PendingNextRun;
        }
    }

    private static IResult? ValidateJobInput(
        string? name,
        string? cron,
        int? concurrency,
        string? timeout,
        string? batchSize,
        bool allowEmptyName)
    {
        if (!allowEmptyName && string.IsNullOrWhiteSpace(name))
        {
            return JobError("任务名称不能为空");
        }

        if (name is { Length: > NameMaxLength })
        {
            return JobError($"任务名称长度不能超过 {NameMaxLength}");
        }

        if (cron is { Length: > CronMaxLength })
        {
            return JobError($"调度表达式长度不能超过 {CronMaxLength}");
        }

        if (concurrency.HasValue && (concurrency.Value < MinConcurrency || concurrency.Value > MaxConcurrency))
        {
            return JobError($"并发数需在 {MinConcurrency}-{MaxConcurrency} 之间");
        }

        if (timeout is { Length: > TimeoutMaxLength })
        {
            return JobError($"超时时间长度不能超过 {TimeoutMaxLength}");
        }

        if (batchSize is { Length: > BatchSizeMaxLength })
        {
            return JobError($"批量条数长度不能超过 {BatchSizeMaxLength}");
        }

        return null;
    }

    private static IResult JobError(string message) =>
        Results.Json(
            ApiResult.Fail<JobResponse>(message, 400),
            AppJsonContext.Default.ApiResponseJobResponse,
            statusCode: 400);

    private static async Task<string> NextJobIdAsync(AdminDbContext db, CancellationToken ct)
    {
        var ids = await db.Jobs.Select(item => item.PublicId).ToArrayAsync(ct);
        var max = 1004;
        foreach (var publicId in ids)
        {
            if (publicId.StartsWith("JOB-", StringComparison.OrdinalIgnoreCase) &&
                int.TryParse(publicId.AsSpan(4), out var number) &&
                number > max)
            {
                max = number;
            }
        }

        return $"JOB-{max + 1}";
    }

    private static int NormalizeConcurrency(int? value, int fallback)
    {
        if (!value.HasValue)
        {
            return fallback;
        }

        return Math.Clamp(value.Value, MinConcurrency, MaxConcurrency);
    }

    private static string NormalizeCron(string? value) =>
        TicketsEndpoints.NormalizeOptional(value) ?? "0 2 * * *";

    private static string? NormalizeOptional(string? value) => TicketsEndpoints.NormalizeOptional(value);

    private static JobResponse ToResponse(JobEntity job) =>
        new(
            job.PublicId,
            job.Name,
            job.Cron,
            job.Concurrency,
            job.Timeout,
            job.BatchSize,
            job.Enabled,
            job.Status,
            job.LastRun,
            job.NextRun,
            job.Progress,
            job.Phase,
            job.Start,
            job.End,
            job.Color);
}
