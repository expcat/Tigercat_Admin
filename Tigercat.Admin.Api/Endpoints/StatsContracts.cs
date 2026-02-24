namespace Tigercat.Admin.Api.Endpoints;

// --- Response DTOs ---

/// <summary>Overview statistics for the dashboard.</summary>
public record StatsOverviewResponse(
    int TotalUsers,
    int ActiveUsers,
    int DisabledUsers,
    int TotalRoles,
    int TotalPermissions);

/// <summary>A single data point in a user-creation trend.</summary>
public record TrendPointResponse(string Date, int Count);

/// <summary>User-creation trend over a date range.</summary>
public record StatsTrendResponse(TrendPointResponse[] Points);

/// <summary>One slice of the user-status distribution.</summary>
public record DistributionItemResponse(string Label, int Value);

/// <summary>User-status distribution.</summary>
public record StatsDistributionResponse(DistributionItemResponse[] Items);
