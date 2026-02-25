using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class SettingsEndpoints : IEndpointDefinition
{
    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/settings")
            .WithTags("Settings");

        group.MapGet("", GetSettings)
            .RequireLogin()
            .WithName("GetSettings");

        group.MapPut("", UpdateSettings)
            .RequireLogin()
            .WithName("UpdateSettings");

        group.MapGet("/{key}", GetSettingByKey)
            .RequireLogin()
            .WithName("GetSettingByKey");
    }

    /// <summary>
    /// GET /api/settings — 获取所有系统设置
    /// </summary>
    private static async Task<IResult> GetSettings(
        AdminDbContext db,
        CancellationToken ct)
    {
        var settings = await db.SystemSettings
            .OrderBy(s => s.Key)
            .Select(s => new SettingItemResponse(s.Id, s.Key, s.Value, s.Description, s.CreatedAt, s.UpdatedAt))
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(settings),
            AppJsonContext.Default.ApiResponseSettingItemResponseArray);
    }

    /// <summary>
    /// GET /api/settings/{key} — 按 Key 获取单个设置
    /// </summary>
    private static async Task<IResult> GetSettingByKey(
        string key,
        AdminDbContext db,
        CancellationToken ct)
    {
        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Key == key, ct);

        if (setting is null)
        {
            return Results.Json(
                ApiResult.Fail<SettingItemResponse>("设置项不存在", 404),
                AppJsonContext.Default.ApiResponseSettingItemResponse,
                statusCode: 404);
        }

        return Results.Json(
            ApiResult.Ok(new SettingItemResponse(setting.Id, setting.Key, setting.Value, setting.Description, setting.CreatedAt, setting.UpdatedAt)),
            AppJsonContext.Default.ApiResponseSettingItemResponse);
    }

    /// <summary>
    /// PUT /api/settings — 批量更新设置（仅更新已存在的 Key）
    /// </summary>
    private static async Task<IResult> UpdateSettings(
        UpdateSettingsRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        if (request.Settings is null || request.Settings.Length == 0)
        {
            return Results.Json(
                ApiResult.Fail<SettingItemResponse[]>("设置项不能为空", 400),
                AppJsonContext.Default.ApiResponseSettingItemResponseArray,
                statusCode: 400);
        }

        var keys = request.Settings.Select(s => s.Key).ToList();
        var entities = await db.SystemSettings
            .Where(s => keys.Contains(s.Key))
            .ToListAsync(ct);

        var entityMap = entities.ToDictionary(e => e.Key);
        var notFound = keys.Where(k => !entityMap.ContainsKey(k)).ToList();

        if (notFound.Count > 0)
        {
            return Results.Json(
                ApiResult.Fail<SettingItemResponse[]>($"以下设置项不存在: {string.Join(", ", notFound)}", 404),
                AppJsonContext.Default.ApiResponseSettingItemResponseArray,
                statusCode: 404);
        }

        foreach (var entry in request.Settings)
        {
            var entity = entityMap[entry.Key];
            entity.Value = entry.Value;
            entity.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);

        var updated = entities
            .OrderBy(s => s.Key)
            .Select(s => new SettingItemResponse(s.Id, s.Key, s.Value, s.Description, s.CreatedAt, s.UpdatedAt))
            .ToArray();

        return Results.Json(
            ApiResult.Ok(updated),
            AppJsonContext.Default.ApiResponseSettingItemResponseArray);
    }
}
