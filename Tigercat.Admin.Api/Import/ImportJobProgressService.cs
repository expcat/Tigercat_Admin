using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Endpoints;

namespace Tigercat.Admin.Api.Import;

/// <summary>
/// Advances simulated import-job progress off the GET path so polling is read-only.
/// Does not parse files or invent a real importer.
/// </summary>
public sealed class ImportJobProgressService(
    IServiceScopeFactory scopeFactory,
    IConfiguration configuration,
    ILogger<ImportJobProgressService> logger) : BackgroundService
{
    public const string IntervalConfigKey = "ImportJobs:ProgressIntervalMilliseconds";
    public const int DefaultIntervalMilliseconds = 250;

    private readonly TimeSpan _interval = TimeSpan.FromMilliseconds(
        Math.Clamp(
            configuration.GetValue(IntervalConfigKey, DefaultIntervalMilliseconds),
            25,
            10_000));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Import job progress service started with interval {Interval}.", _interval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_interval, stoppingToken);
                await AdvanceRunningJobsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Import job progress loop failed.");
            }
        }
    }

    private async Task AdvanceRunningJobsAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        var jobs = await db.ImportJobs
            .Where(job => job.Status != "completed" && job.Status != "failed")
            .ToListAsync(ct);

        var changed = false;
        foreach (var job in jobs)
        {
            if (ImportJobsEndpoints.AdvanceProgress(job))
            {
                changed = true;
            }
        }

        if (changed)
        {
            await db.SaveChangesAsync(ct);
        }
    }
}
