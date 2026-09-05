using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class TicketsEndpoints : IEndpointDefinition
{
    internal static readonly string[] AllowedStatuses = ["open", "accepted", "progress", "resolved", "closed"];
    internal static readonly string[] AllowedPriorities = ["high", "medium", "low"];
    private const int TitleMaxLength = 120;
    private const int DescriptionMaxLength = 2000;
    private const int CategoryMaxLength = 40;
    private const int MessageMaxLength = 2000;
    private const int DefaultPageSize = 50;
    private const int MaxPageSize = 200;
    private const string TicketReply = "收到，我们会尽快跟进本工单（演示自动回复）。";

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/tickets")
            .WithTags("Tickets");

        group.MapGet("", GetTickets)
            .RequireLogin()
            .WithName("GetTickets");

        group.MapGet("/{id}", GetTicket)
            .RequireLogin()
            .WithName("GetTicket");

        group.MapPost("", CreateTicket)
            .RequireLogin()
            .WithName("CreateTicket");

        group.MapPut("/{id}", UpdateTicket)
            .RequireLogin()
            .WithName("UpdateTicket");

        group.MapPost("/{id}/messages", CreateTicketMessage)
            .RequireLogin()
            .WithName("CreateTicketMessage");
    }

    private static async Task<IResult> GetTickets(
        int? page,
        int? pageSize,
        string? status,
        string? keyword,
        AdminDbContext db,
        CancellationToken ct)
    {
        var p = Math.Max(page ?? 1, 1);
        var ps = Math.Clamp(pageSize ?? DefaultPageSize, 1, MaxPageSize);

        IQueryable<TicketEntity> query = db.Tickets.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(status))
        {
            var normalizedStatus = status.Trim().ToLowerInvariant();
            if (!AllowedStatuses.Contains(normalizedStatus))
            {
                return Results.Json(
                    ApiResult.Fail<PagedResponse<TicketResponse>>("无效的工单状态", 400),
                    AppJsonContext.Default.ApiResponsePagedResponseTicketResponse,
                    statusCode: 400);
            }

            query = query.Where(t => t.Status == normalizedStatus);
        }

        if (!string.IsNullOrWhiteSpace(keyword))
        {
            var kw = keyword.Trim().ToLowerInvariant();
            query = query.Where(t =>
                t.Title.ToLower().Contains(kw) ||
                t.Requester.ToLower().Contains(kw) ||
                t.PublicId.ToLower().Contains(kw));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .Include(t => t.Messages)
            .OrderByDescending(t => t.UpdatedAt)
            .ThenByDescending(t => t.Id)
            .Skip((p - 1) * ps)
            .Take(ps)
            .ToArrayAsync(ct);

        var data = items.Select(ToResponse).ToArray();
        return Results.Json(
            ApiResult.Ok(new PagedResponse<TicketResponse>(data, total, p, ps)),
            AppJsonContext.Default.ApiResponsePagedResponseTicketResponse);
    }

    private static async Task<IResult> GetTicket(string id, AdminDbContext db, CancellationToken ct)
    {
        var ticket = await FindTicketAsync(db, id, ct, track: false);
        if (ticket is null)
        {
            return TicketNotFound();
        }

        return Results.Json(
            ApiResult.Ok(ToResponse(ticket)),
            AppJsonContext.Default.ApiResponseTicketResponse);
    }

    private static async Task<IResult> CreateTicket(
        CreateTicketRequest request,
        AdminDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var validation = ValidateTicketInput(request.Title, request.Category, request.Priority, request.Description);
        if (validation is not null)
        {
            return validation;
        }

        var now = DateTime.Now;
        var ticket = new TicketEntity
        {
            PublicId = await NextTicketIdAsync(db, ct),
            Title = request.Title.Trim(),
            Requester = await ResolveActorNameAsync(db, httpContext, ct),
            Category = NormalizeOptional(request.Category) ?? "缺陷",
            Priority = NormalizeChoice(request.Priority, AllowedPriorities, "medium"),
            Status = "open",
            CreatedAt = now,
            UpdatedAt = now,
            Satisfaction = 0,
            Description = NormalizeOptional(request.Description) ?? "（无描述）"
        };

        db.Tickets.Add(ticket);
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(ticket)),
            AppJsonContext.Default.ApiResponseTicketResponse);
    }

    private static async Task<IResult> UpdateTicket(
        string id,
        UpdateTicketRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var ticket = await FindTicketAsync(db, id, ct, track: true);
        if (ticket is null)
        {
            return TicketNotFound();
        }

        var validation = ValidateTicketInput(
            request.Title ?? ticket.Title,
            request.Category ?? ticket.Category,
            request.Priority ?? ticket.Priority,
            request.Description ?? ticket.Description,
            allowEmptyTitle: request.Title is null);
        if (validation is not null)
        {
            return validation;
        }

        if (request.Title is not null)
        {
            ticket.Title = request.Title.Trim();
        }

        if (request.Category is not null)
        {
            ticket.Category = request.Category.Trim();
        }

        if (request.Priority is not null)
        {
            ticket.Priority = NormalizeChoice(request.Priority, AllowedPriorities, ticket.Priority);
        }

        if (request.Status is not null)
        {
            var status = request.Status.Trim().ToLowerInvariant();
            if (!AllowedStatuses.Contains(status))
            {
                return Results.Json(
                    ApiResult.Fail<TicketResponse>("无效的工单状态", 400),
                    AppJsonContext.Default.ApiResponseTicketResponse,
                    statusCode: 400);
            }

            ticket.Status = status;
        }

        if (request.Description is not null)
        {
            ticket.Description = NormalizeOptional(request.Description) ?? "（无描述）";
        }

        if (request.Satisfaction.HasValue)
        {
            if (request.Satisfaction.Value is < 0 or > 5)
            {
                return Results.Json(
                    ApiResult.Fail<TicketResponse>("满意度需在 0-5 之间", 400),
                    AppJsonContext.Default.ApiResponseTicketResponse,
                    statusCode: 400);
            }

            ticket.Satisfaction = request.Satisfaction.Value;
        }

        ticket.UpdatedAt = DateTime.Now;
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(ticket)),
            AppJsonContext.Default.ApiResponseTicketResponse);
    }

    private static async Task<IResult> CreateTicketMessage(
        string id,
        CreateTicketMessageRequest request,
        AdminDbContext db,
        CancellationToken ct)
    {
        var content = NormalizeOptional(request.Content);
        if (content is null)
        {
            return Results.Json(
                ApiResult.Fail<TicketResponse>("消息内容不能为空", 400),
                AppJsonContext.Default.ApiResponseTicketResponse,
                statusCode: 400);
        }

        if (content.Length > MessageMaxLength)
        {
            return Results.Json(
                ApiResult.Fail<TicketResponse>($"消息内容长度不能超过 {MessageMaxLength}", 400),
                AppJsonContext.Default.ApiResponseTicketResponse,
                statusCode: 400);
        }

        var ticket = await FindTicketAsync(db, id, ct, track: true);
        if (ticket is null)
        {
            return TicketNotFound();
        }

        var now = DateTime.Now;
        ticket.Messages.Add(new TicketMessageEntity
        {
            PublicId = NextMessageId("m"),
            Content = content,
            Direction = "self",
            CreatedAt = now
        });
        ticket.Messages.Add(new TicketMessageEntity
        {
            PublicId = NextMessageId("m"),
            Content = TicketReply,
            Direction = "other",
            CreatedAt = now.AddSeconds(1)
        });
        ticket.UpdatedAt = now;
        await db.SaveChangesAsync(ct);

        return Results.Json(
            ApiResult.Ok(ToResponse(ticket)),
            AppJsonContext.Default.ApiResponseTicketResponse);
    }

    private static IResult? ValidateTicketInput(
        string? title,
        string? category,
        string? priority,
        string? description,
        bool allowEmptyTitle = false)
    {
        if (!allowEmptyTitle && string.IsNullOrWhiteSpace(title))
        {
            return Results.Json(
                ApiResult.Fail<TicketResponse>("工单标题不能为空", 400),
                AppJsonContext.Default.ApiResponseTicketResponse,
                statusCode: 400);
        }

        if (title is { Length: > TitleMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<TicketResponse>($"工单标题长度不能超过 {TitleMaxLength}", 400),
                AppJsonContext.Default.ApiResponseTicketResponse,
                statusCode: 400);
        }

        if (category is { Length: > CategoryMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<TicketResponse>($"工单分类长度不能超过 {CategoryMaxLength}", 400),
                AppJsonContext.Default.ApiResponseTicketResponse,
                statusCode: 400);
        }

        if (!string.IsNullOrWhiteSpace(priority) && !AllowedPriorities.Contains(priority.Trim().ToLowerInvariant()))
        {
            return Results.Json(
                ApiResult.Fail<TicketResponse>("无效的工单优先级", 400),
                AppJsonContext.Default.ApiResponseTicketResponse,
                statusCode: 400);
        }

        if (description is { Length: > DescriptionMaxLength })
        {
            return Results.Json(
                ApiResult.Fail<TicketResponse>($"工单描述长度不能超过 {DescriptionMaxLength}", 400),
                AppJsonContext.Default.ApiResponseTicketResponse,
                statusCode: 400);
        }

        return null;
    }

    private static async Task<TicketEntity?> FindTicketAsync(
        AdminDbContext db,
        string id,
        CancellationToken ct,
        bool track)
    {
        IQueryable<TicketEntity> query = db.Tickets.Include(t => t.Messages);
        if (!track)
        {
            query = query.AsNoTracking();
        }

        return await query.FirstOrDefaultAsync(t => t.PublicId == id, ct);
    }

    private static IResult TicketNotFound()
    {
        return Results.Json(
            ApiResult.Fail<TicketResponse>("工单不存在", 404),
            AppJsonContext.Default.ApiResponseTicketResponse,
            statusCode: 404);
    }

    private static async Task<string> NextTicketIdAsync(AdminDbContext db, CancellationToken ct)
    {
        var ids = await db.Tickets.Select(t => t.PublicId).ToArrayAsync(ct);
        var max = 2050;
        foreach (var publicId in ids)
        {
            if (publicId.StartsWith("TK-", StringComparison.OrdinalIgnoreCase) &&
                int.TryParse(publicId.AsSpan(3), out var number) &&
                number > max)
            {
                max = number;
            }
        }

        return $"TK-{max + 1}";
    }

    internal static async Task<string> ResolveActorNameAsync(
        AdminDbContext db,
        HttpContext httpContext,
        CancellationToken ct)
    {
        var username = GetOperatorUsername(httpContext);
        var displayName = await db.Users
            .Where(u => u.Username == username)
            .Select(u => u.DisplayName)
            .FirstOrDefaultAsync(ct);
        return string.IsNullOrWhiteSpace(displayName) ? username : displayName;
    }

    internal static string GetOperatorUsername(HttpContext httpContext)
    {
        return httpContext.Items.TryGetValue(AuthConstants.UsernameItemKey, out var operatorObj) &&
            operatorObj is string operatorName
            ? operatorName
            : "unknown";
    }

    internal static string FormatTime(DateTime value) => value.ToString("yyyy-MM-dd HH:mm");

    internal static string? NormalizeOptional(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static string NormalizeChoice(string? value, string[] allowed, string fallback)
    {
        var normalized = NormalizeOptional(value)?.ToLowerInvariant();
        return normalized is not null && allowed.Contains(normalized) ? normalized : fallback;
    }

    private static string NextMessageId(string prefix) => $"{prefix}-{Guid.NewGuid():N}"[..16];

    private static TicketResponse ToResponse(TicketEntity ticket)
    {
        var messages = ticket.Messages
            .OrderBy(m => m.CreatedAt)
            .ThenBy(m => m.Id)
            .Select(m => new TicketMessageResponse(m.PublicId, m.Content, m.Direction, FormatTime(m.CreatedAt)))
            .ToArray();

        return new TicketResponse(
            ticket.PublicId,
            ticket.Title,
            ticket.Requester,
            ticket.Category,
            ticket.Priority,
            ticket.Status,
            FormatTime(ticket.CreatedAt),
            FormatTime(ticket.UpdatedAt),
            ticket.Satisfaction,
            ticket.Description,
            messages);
    }
}
