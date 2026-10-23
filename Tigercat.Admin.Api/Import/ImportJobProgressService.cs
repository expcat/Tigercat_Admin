using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Observability;

namespace Tigercat.Admin.Api.Import;

/// <summary>Processes durable, hash-only CSV rows; GET never advances a job.</summary>
public sealed class ImportJobProgressService(IServiceScopeFactory scopeFactory, IConfiguration configuration,
    ILogger<ImportJobProgressService> logger) : BackgroundService
{
    public const string IntervalConfigKey = "ImportJobs:ProgressIntervalMilliseconds";
    public const int DefaultIntervalMilliseconds = 250;
    private readonly TimeSpan _interval = TimeSpan.FromMilliseconds(Math.Clamp(configuration.GetValue(IntervalConfigKey, DefaultIntervalMilliseconds), 25, 10_000));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_interval, stoppingToken);
                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
                var jobs = await db.ImportJobs.Where(job => job.Status == "pending" || job.Status == "running").Select(job => job.Id).ToArrayAsync(stoppingToken);
                foreach (var id in jobs) await ProcessRowAsync(id, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogWarning(ex, "CSV import processing loop failed."); }
        }
    }

    private async Task ProcessRowAsync(int id, CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        var job = await db.ImportJobs.SingleAsync(job => job.Id == id, ct);
        var rows = CsvUserImport.ReadRows(job.RowsJson);
        var row = rows.FirstOrDefault(row => row.Status == "pending");
        if (row is null)
        {
            // Older filename-only jobs cannot be converted into real imports.
            job.Status = "failed";
            job.ResultMessage = "任务没有可处理的 CSV 行，请重新选择文件导入";
            await db.SaveChangesAsync(ct);
            return;
        }
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        UserEntity? user = null;
        try
        {
            job.Status = "running";
            if (row.PasswordHash is null)
                row.Status = row.Message == "用户名已存在，跳过" ? "skipped" : "failed";
            else if (await db.Users.AnyAsync(user => user.Username == row.Username, ct))
            {
                row.Status = "skipped";
                row.Message = "用户名已存在，跳过";
            }
            else if (await db.Roles.CountAsync(role => row.Roles.Contains(role.Id), ct) != row.Roles.Length)
            {
                row.Status = "failed";
                row.Message = "角色已变更，请重新校验角色 ID";
            }
            else
            {
                user = new UserEntity { Username = row.Username, DisplayName = row.DisplayName, PasswordHash = row.PasswordHash,
                    Status = UserStatus.Active, CreatedAt = DateTime.UtcNow };
                db.Users.Add(user);
                foreach (var roleId in row.Roles) db.UserRoles.Add(new UserRoleEntity { User = user, RoleId = roleId });
                await db.SaveChangesAsync(ct);
                row.UserId = user.Id;
                row.Status = "success";
                row.Message = "已创建用户";
            }
            row.PasswordHash = null;
            job.Processed++;
            job.Imported = rows.Count(row => row.Status == "success");
            job.Skipped = rows.Count(row => row.Status == "skipped");
            job.Failed = rows.Count(row => row.Status == "failed");
            job.Progress = job.Processed * 100 / job.Total;
            if (job.Processed == job.Total) job.Status = "completed";
            job.ResultMessage = $"已处理 {job.Processed}/{job.Total} 行，成功 {job.Imported}，跳过 {job.Skipped}，失败 {job.Failed}。";
            job.RowsJson = CsvUserImport.WriteRows(rows);
            await db.SaveChangesAsync(ct);
            if (transaction is not null) await transaction.CommitAsync(ct);
            AdminMetrics.RecordImportJob(job.Status == "completed" ? "completed" : "progress");
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
        catch (Exception ex)
        {
            if (transaction is not null)
            {
                await transaction.RollbackAsync(ct);
                await transaction.DisposeAsync();
            }
            db.ChangeTracker.Clear();
            var failed = await db.ImportJobs.SingleAsync(item => item.Id == id, ct);
            var savedRows = CsvUserImport.ReadRows(failed.RowsJson);
            foreach (var saved in savedRows) saved.PasswordHash = null;
            failed.RowsJson = CsvUserImport.WriteRows(savedRows);
            failed.Status = "failed";
            failed.ResultMessage = "处理已中断；已完成行已保留，请重新选择原 CSV 导入，已有用户名将跳过";
            await db.SaveChangesAsync(ct);
            AdminMetrics.RecordImportJob("failed");
            logger.LogWarning(ex, "Import job {JobId} stopped at row {RowNumber}.", job.PublicId, row.RowNumber);
            return;
        }
        if (user is not null)
        {
            // Event transport failure must not turn a committed user into a failed import.
            try
            {
                var publisher = scope.ServiceProvider.GetRequiredService<IEventPublisher>();
                await publisher.PublishAsync(EventEnvelope.Create("admin.user.created", new Dictionary<string, object?>
                {
                    ["targetUserId"] = user.Id, ["targetUsername"] = user.Username, ["operator"] = job.Operator,
                    ["roleCount"] = row.Roles.Length
                }), EventBusConstants.AdminStream, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested) { throw; }
            catch (Exception ex) { logger.LogWarning(ex, "Import user-created event could not be published for user {UserId}.", user.Id); }
        }
    }
}
