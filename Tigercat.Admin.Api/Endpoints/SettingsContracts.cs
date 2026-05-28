namespace Tigercat.Admin.Api.Endpoints;

// --- Response DTOs ---

public record SettingItemResponse(
    int Id,
    string Key,
    string Value,
    string DefaultValue,
    string? Description,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

// --- Request DTOs ---

public record UpdateSettingsRequest(SettingEntry[] Settings);

public record SettingEntry(string Key, string Value);
