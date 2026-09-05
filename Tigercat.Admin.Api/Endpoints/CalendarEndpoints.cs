using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class CalendarEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedTypes = ["meeting", "review", "release", "reminder"];
    private const int TitleMaxLength = 120;
    private const int LocationMaxLength = 200;
    private static readonly Regex DatePattern = new(@"^\d{4}-\d{2}-\d{2}$", RegexOptions.Compiled);
    private static readonly Regex TimePattern = new(@"^\d{2}:\d{2}$", RegexOptions.Compiled);

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/calendar/events")
            .WithTags("Calendar");

        group.MapGet("", GetEvents)
            .RequireLogin()
            .WithName("GetCalendarEvents");

        group.MapPost("", CreateEvent)
            .RequireLogin()
            .WithName("CreateCalendarEvent");
    }

    private static async Task<IResult> GetEvents(
        string? from,
        string? to,
        AdminDbContext db,
        CancellationToken ct)
    {
        var fromValue = TicketsEndpoints.NormalizeOptional(from);
        var toValue = TicketsEndpoints.NormalizeOptional(to);

        if (fromValue is not null && !IsDate(fromValue))
        {
            return RangeError("开始日期格式无效，需为 YYYY-MM-DD");
        }

        if (toValue is not null && !IsDate(toValue))
        {
            return RangeError("结束日期格式无效，需为 YYYY-MM-DD");
        }

        if (fromValue is not null && toValue is not null &&
            string.CompareOrdinal(fromValue, toValue) > 0)
        {
            return RangeError("开始日期不能晚于结束日期");
        }

        IQueryable<CalendarEventEntity> query = db.CalendarEvents.AsNoTracking();
        if (fromValue is not null)
        {
            query = query.Where(item => item.Date.CompareTo(fromValue) >= 0);
        }

        if (toValue is not null)
        {
            query = query.Where(item => item.Date.CompareTo(toValue) <= 0);
        }

        var items = await query
            .OrderBy(item => item.Date)
            .ThenBy(item => item.Start)
            .ThenBy(item => item.Id)
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(items.Select(ToResponse).ToArray()),
            AppJsonContext.Default.ApiResponseCalendarEventResponseArray);
    }

    private static async Task<IResult> CreateEvent(
        CreateCalendarEventRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var title = TicketsEndpoints.NormalizeOptional(request.Title);
        if (title is null)
        {
            return CreateError("日程标题不能为空");
        }

        if (title.Length > TitleMaxLength)
        {
            return CreateError($"日程标题长度不能超过 {TitleMaxLength}");
        }

        var date = TicketsEndpoints.NormalizeOptional(request.Date);
        if (date is null || !IsDate(date))
        {
            return CreateError("日期格式无效，需为 YYYY-MM-DD");
        }

        var start = TicketsEndpoints.NormalizeOptional(request.Start);
        if (start is null || !IsTime(start))
        {
            return CreateError("开始时间格式无效，需为 HH:mm");
        }

        var end = TicketsEndpoints.NormalizeOptional(request.End);
        if (end is null || !IsTime(end))
        {
            return CreateError("结束时间格式无效，需为 HH:mm");
        }

        var type = TicketsEndpoints.NormalizeOptional(request.Type)?.ToLowerInvariant();
        if (type is null || !AllowedTypes.Contains(type))
        {
            return CreateError("无效的日程类型");
        }

        var location = TicketsEndpoints.NormalizeOptional(request.Location) ?? "—";
        if (location.Length > LocationMaxLength)
        {
            return CreateError($"地点长度不能超过 {LocationMaxLength}");
        }

        var entity = new CalendarEventEntity
        {
            PublicId = $"e-{Guid.NewGuid():N}"[..16],
            Date = date,
            Start = start,
            End = end,
            Title = title,
            Type = type,
            Location = location
        };

        db.CalendarEvents.Add(entity);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(entity)),
            AppJsonContext.Default.ApiResponseCalendarEventResponse);
    }

    private static IResult RangeError(string message) =>
        Results.Json(
            ApiResult.Fail<CalendarEventResponse[]>(message, 400),
            AppJsonContext.Default.ApiResponseCalendarEventResponseArray,
            statusCode: 400);

    private static IResult CreateError(string message) =>
        Results.Json(
            ApiResult.Fail<CalendarEventResponse>(message, 400),
            AppJsonContext.Default.ApiResponseCalendarEventResponse,
            statusCode: 400);

    private static bool IsDate(string value) =>
        DatePattern.IsMatch(value) &&
        DateTime.TryParseExact(value, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _);

    private static bool IsTime(string value) =>
        TimePattern.IsMatch(value) &&
        TimeSpan.TryParseExact(value, @"hh\:mm", CultureInfo.InvariantCulture, out _);

    private static CalendarEventResponse ToResponse(CalendarEventEntity item) =>
        new(item.PublicId, item.Date, item.Start, item.End, item.Title, item.Type, item.Location);
}
