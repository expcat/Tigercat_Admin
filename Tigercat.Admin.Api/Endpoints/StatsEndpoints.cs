using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class StatsEndpoints : IEndpointDefinition
{
    /// <summary>Default number of days for the trend query.</summary>
    private const int DefaultTrendDays = 7;

    /// <summary>Maximum allowed days for the trend query.</summary>
    private const int MaxTrendDays = 90;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/stats")
            .WithTags("Stats");

        group.MapGet("/overview", GetOverview)
            .RequireLogin()
            .WithName("StatsOverview");

        group.MapGet("/trend", GetTrend)
            .RequireLogin()
            .WithName("StatsTrend");

        group.MapGet("/distribution", GetDistribution)
            .RequireLogin()
            .WithName("StatsDistribution");
    }

    // GET /api/stats/overview
    private static async Task<IResult> GetOverview(
        AdminDbContext db,
        CancellationToken ct)
    {
        var totalUsers = await db.Users.CountAsync(ct);
        var activeUsers = await db.Users.CountAsync(u => u.Status == UserStatus.Active, ct);
        var disabledUsers = await db.Users.CountAsync(u => u.Status == UserStatus.Disabled, ct);
        var totalRoles = await db.Roles.CountAsync(ct);
        var totalPermissions = await db.Permissions.CountAsync(ct);

        var data = new StatsOverviewResponse(
            totalUsers,
            activeUsers,
            disabledUsers,
            totalRoles,
            totalPermissions);

        return Results.Json(
            ApiResult.Ok(data),
            AppJsonContext.Default.ApiResponseStatsOverviewResponse);
    }

    // GET /api/stats/trend?days=7
    private static async Task<IResult> GetTrend(
        int? days,
        AdminDbContext db,
        CancellationToken ct)
    {
        var d = Math.Clamp(days ?? DefaultTrendDays, 1, MaxTrendDays);
        var startDate = DateTime.UtcNow.Date.AddDays(-d + 1);

        var users = await db.Users
            .Where(u => u.CreatedAt >= startDate)
            .ToListAsync(ct);

        // Build a dictionary of date -> count from actual data
        var grouped = users
            .GroupBy(u => u.CreatedAt.Date)
            .ToDictionary(g => g.Key, g => g.Count());

        // Fill all dates in the range (including zero-count days)
        var points = new TrendPointResponse[d];
        for (var i = 0; i < d; i++)
        {
            var date = startDate.AddDays(i);
            grouped.TryGetValue(date, out var count);
            points[i] = new TrendPointResponse(date.ToString("yyyy-MM-dd"), count);
        }

        var data = new StatsTrendResponse(points);
        return Results.Json(
            ApiResult.Ok(data),
            AppJsonContext.Default.ApiResponseStatsTrendResponse);
    }

    // GET /api/stats/distribution
    private static async Task<IResult> GetDistribution(
        AdminDbContext db,
        CancellationToken ct)
    {
        var activeCount = await db.Users.CountAsync(u => u.Status == UserStatus.Active, ct);
        var disabledCount = await db.Users.CountAsync(u => u.Status == UserStatus.Disabled, ct);

        var items = new DistributionItemResponse[]
        {
            new("Active", activeCount),
            new("Disabled", disabledCount)
        };

        var data = new StatsDistributionResponse(items);
        return Results.Json(
            ApiResult.Ok(data),
            AppJsonContext.Default.ApiResponseStatsDistributionResponse);
    }
}
