using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class ImportJobsEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedModes = ["append", "overwrite", "upsert"];
    internal static readonly string[] AllowedConflicts = ["skip", "overwrite", "error"];
    private const int SourceMaxLength = 500;
    private const int MappingMaxLength = 40;
    private const int MaxMappings = 50;
    private const int TargetSegmentMaxLength = 40;
    private const int MaxTargetDepth = 8;
    private const int DefaultBatchSize = 1000;
    private const int MinBatchSize = 100;
    private const int MaxBatchSize = 5000;
    private const int ProgressStep = 25;
    internal const string ExampleSource = "示例数据（未选择文件）";

    private static readonly Dictionary<string, string> ModeLabels = new()
    {
        ["append"] = "追加",
        ["overwrite"] = "覆盖",
        ["upsert"] = "更新插入"
    };

    private static readonly Dictionary<string, string> TargetLabels = new()
    {
        ["hr"] = "人力资源",
        ["employees"] = "员工表",
        ["departments"] = "部门表",
        ["crm"] = "客户管理",
        ["customers"] = "客户表",
        ["contacts"] = "联系人表"
    };

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/import-jobs")
            .WithTags("Import");

        group.MapPost("", CreateImportJob)
            .RequireLogin()
            .WithName("CreateImportJob");

        group.MapGet("/{id}", GetImportJob)
            .RequireLogin()
            .WithName("GetImportJob");
    }

    private static async Task<IResult> CreateImportJob(
        CreateImportJobRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var source = TicketsEndpoints.NormalizeOptional(request.Source) ?? ExampleSource;
        if (source.Length > SourceMaxLength)
        {
            return ImportError("数据源描述过长");
        }

        var target = NormalizeList(request.Target, TargetSegmentMaxLength, MaxTargetDepth);
        if (target is null || target.Length == 0)
        {
            return ImportError("请选择目标数据表");
        }

        var mappings = NormalizeList(request.Mappings, MappingMaxLength, MaxMappings);
        if (mappings is null || mappings.Length == 0)
        {
            return ImportError("请至少映射一个字段");
        }

        var mode = TicketsEndpoints.NormalizeOptional(request.Mode)?.ToLowerInvariant() ?? "append";
        if (!AllowedModes.Contains(mode))
        {
            return ImportError("无效的导入模式");
        }

        var conflict = TicketsEndpoints.NormalizeOptional(request.Conflict)?.ToLowerInvariant() ?? "skip";
        if (!AllowedConflicts.Contains(conflict))
        {
            return ImportError("无效的冲突策略");
        }

        var batchSize = request.BatchSize ?? DefaultBatchSize;
        if (batchSize < MinBatchSize || batchSize > MaxBatchSize)
        {
            return ImportError($"批量大小需在 {MinBatchSize}-{MaxBatchSize} 之间");
        }

        var entity = new ImportJobEntity
        {
            PublicId = await NextImportJobIdAsync(db, ct),
            Source = source,
            TargetJson = ContentEndpoints.EncodeStringArray(target),
            MappingsJson = ContentEndpoints.EncodeStringArray(mappings),
            Mode = mode,
            Conflict = conflict,
            BatchSize = batchSize,
            Status = "running",
            Progress = 0
        };

        db.ImportJobs.Add(entity);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(entity)),
            AppJsonContext.Default.ApiResponseImportJobResponse);
    }

    private static async Task<IResult> GetImportJob(string id, AdminDbContext db, CancellationToken ct)
    {
        var job = await db.ImportJobs.FirstOrDefaultAsync(item => item.PublicId == id, ct);
        if (job is null)
        {
            return Results.Json(
                ApiResult.Fail<ImportJobResponse>("导入任务不存在", 404),
                AppJsonContext.Default.ApiResponseImportJobResponse,
                statusCode: 404);
        }

        if (AdvanceProgress(job))
        {
            await db.SaveChangesAsync(ct);
        }

        return Results.Json(
            ApiResult.Ok(ToResponse(job)),
            AppJsonContext.Default.ApiResponseImportJobResponse);
    }

    internal static bool AdvanceProgress(ImportJobEntity job)
    {
        if (job.Status is "completed" or "failed")
        {
            return false;
        }

        job.Status = "running";
        job.Progress = Math.Min(100, job.Progress + ProgressStep);
        if (job.Progress < 100)
        {
            return true;
        }

        job.Progress = 100;
        job.Status = "completed";
        var mappings = ContentEndpoints.DecodeStringArray(job.MappingsJson);
        var target = ContentEndpoints.DecodeStringArray(job.TargetJson);
        job.Imported = mappings.Length;
        job.Skipped = job.Conflict == "skip" ? 1 : 0;
        job.ResultMessage = BuildResultMessage(job, mappings.Length, target);
        return true;
    }

    internal static string BuildResultMessage(ImportJobEntity job, int mappingCount, string[] target)
    {
        var modeLabel = ModeLabels.GetValueOrDefault(job.Mode, job.Mode);
        var targetText = target.Length == 0
            ? "未选择"
            : string.Join(" / ", target.Select(segment => TargetLabels.GetValueOrDefault(segment, segment)));
        return $"已按「{modeLabel}」模式导入至 {targetText}，映射 {mappingCount} 个字段。";
    }

    private static IResult ImportError(string message) =>
        Results.Json(
            ApiResult.Fail<ImportJobResponse>(message, 400),
            AppJsonContext.Default.ApiResponseImportJobResponse,
            statusCode: 400);

    private static async Task<string> NextImportJobIdAsync(AdminDbContext db, CancellationToken ct)
    {
        var ids = await db.ImportJobs.Select(item => item.PublicId).ToArrayAsync(ct);
        var max = 1000;
        foreach (var publicId in ids)
        {
            if (publicId.StartsWith("IMP-", StringComparison.OrdinalIgnoreCase) &&
                int.TryParse(publicId.AsSpan(4), out var number) &&
                number > max)
            {
                max = number;
            }
        }

        return $"IMP-{max + 1}";
    }

    private static string[]? NormalizeList(string[]? values, int itemMaxLength, int maxCount)
    {
        if (values is null)
        {
            return [];
        }

        var items = values
            .Select(item => item?.Trim() ?? string.Empty)
            .Where(item => item.Length > 0)
            .ToArray();
        if (items.Length > maxCount || items.Any(item => item.Length > itemMaxLength))
        {
            return null;
        }

        return items;
    }

    private static ImportJobResponse ToResponse(ImportJobEntity job)
    {
        ImportJobResultResponse? result = null;
        if (job.Status == "completed" && job.Imported.HasValue && job.Skipped.HasValue)
        {
            result = new ImportJobResultResponse(
                job.Imported.Value,
                job.Skipped.Value,
                job.ResultMessage ?? string.Empty);
        }

        return new ImportJobResponse(
            job.PublicId,
            job.Source,
            ContentEndpoints.DecodeStringArray(job.TargetJson),
            ContentEndpoints.DecodeStringArray(job.MappingsJson),
            job.Mode,
            job.Conflict,
            job.BatchSize,
            job.Status,
            job.Progress,
            result);
    }
}
