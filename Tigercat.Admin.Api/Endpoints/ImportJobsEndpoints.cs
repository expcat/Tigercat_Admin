using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Import;
using Tigercat.Admin.Api.Observability;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class ImportJobsEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/import-jobs").WithTags("Import");
        group.MapPost("/preview", PreviewImport).RequirePermission("user:create").WithName("PreviewImport");
        group.MapPost("", CreateImportJob).RequirePermission("user:create").WithName("CreateImportJob");
        group.MapGet("/{id}", GetImportJob).RequirePermission("user:create").WithName("GetImportJob");
    }

    private static async Task<IResult> PreviewImport(CreateImportJobRequest request, AdminDbContext db, CancellationToken ct)
    {
        try
        {
            var (preview, _) = await CsvUserImport.PrepareAsync(request, db, false, ct);
            return Results.Json(ApiResult.Ok(preview), AppJsonContext.Default.ApiResponseImportPreviewResponse);
        }
        catch (FormatException ex) { return ImportError(ex.Message); }
    }

    private static async Task<IResult> CreateImportJob(CreateImportJobRequest request, AdminDbContext db, HttpContext context, CancellationToken ct)
    {
        try
        {
            var (_, rows) = await CsvUserImport.PrepareAsync(request, db, true, ct);
            // Validation failures and skips are processed by the same worker as valid rows.
            foreach (var row in rows) row.Status = "pending";
            var entity = new ImportJobEntity
            {
                PublicId = $"IMP-{Guid.NewGuid():N}"[..32], Source = request.Source!.Trim(),
                TargetJson = "[\"users\"]", MappingsJson = "[]", Mode = "append", Conflict = "skip",
                Operator = context.Items[AuthConstants.UsernameItemKey] as string ?? "unknown", Status = "pending", Total = rows.Count,
                RowsJson = CsvUserImport.WriteRows(rows)
            };
            db.ImportJobs.Add(entity);
            await db.SaveChangesAsync(ct);
            AdminMetrics.RecordImportJob("created");
            return Results.Json(ApiResult.Ok(ToResponse(entity)), AppJsonContext.Default.ApiResponseImportJobResponse);
        }
        catch (FormatException ex) { return ImportError(ex.Message); }
    }

    private static async Task<IResult> GetImportJob(string id, AdminDbContext db, CancellationToken ct)
    {
        var job = await db.ImportJobs.AsNoTracking().FirstOrDefaultAsync(item => item.PublicId == id, ct);
        return job is null
            ? Results.Json(ApiResult.Fail<ImportJobResponse>("导入任务不存在", 404), AppJsonContext.Default.ApiResponseImportJobResponse, statusCode: 404)
            : Results.Json(ApiResult.Ok(ToResponse(job)), AppJsonContext.Default.ApiResponseImportJobResponse);
    }

    private static IResult ImportError(string message) => Results.Json(ApiResult.Fail<ImportJobResponse>(message, 400),
        AppJsonContext.Default.ApiResponseImportJobResponse, statusCode: 400);

    private static ImportJobResponse ToResponse(ImportJobEntity job) => new(job.PublicId, job.Source, "users", job.Mode, job.Conflict,
        job.Status, job.Progress, job.Total, job.Processed,
        new ImportJobResultResponse(job.Imported ?? 0, job.Skipped ?? 0, job.Failed, job.ResultMessage ?? "等待逐行处理"),
        CsvUserImport.ReadRows(job.RowsJson).Select(row => row.ToResponse()).ToArray());
}
