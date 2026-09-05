using Microsoft.EntityFrameworkCore;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Hubs;
using Tigercat.Admin.Api.Serialization;

namespace Tigercat.Admin.Api.Endpoints;

public class ChatEndpoints : IEndpointDefinition
{
    private const int MessageMaxLength = 2000;

    public void DefineEndpoints(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/chat")
            .WithTags("Chat");

        group.MapGet("/messages", GetMessages)
            .RequireLogin()
            .WithName("GetChatMessages");

        group.MapPost("/messages", CreateMessage)
            .RequireLogin()
            .WithName("CreateChatMessage");
    }

    private static async Task<IResult> GetMessages(AdminDbContext db, CancellationToken ct)
    {
        var items = await db.ChatMessages
            .AsNoTracking()
            .OrderBy(m => m.CreatedAt)
            .ThenBy(m => m.Id)
            .ToArrayAsync(ct);

        return Results.Json(
            ApiResult.Ok(items.Select(ToResponse).ToArray()),
            AppJsonContext.Default.ApiResponseChatMessageResponseArray);
    }

    private static async Task<IResult> CreateMessage(
        CreateChatMessageRequest request,
        AdminDbContext db,
        ChatRealtimeNotifier realtime,
        CancellationToken ct)
    {
        var content = TicketsEndpoints.NormalizeOptional(request.Content);
        if (content is null)
        {
            return Results.Json(
                ApiResult.Fail<ChatMessageResponse[]>("消息内容不能为空", 400),
                AppJsonContext.Default.ApiResponseChatMessageResponseArray,
                statusCode: 400);
        }

        if (content.Length > MessageMaxLength)
        {
            return Results.Json(
                ApiResult.Fail<ChatMessageResponse[]>($"消息内容长度不能超过 {MessageMaxLength}", 400),
                AppJsonContext.Default.ApiResponseChatMessageResponseArray,
                statusCode: 400);
        }

        var now = DateTime.UtcNow;
        db.ChatMessages.Add(new ChatMessageEntity
        {
            PublicId = $"chat-{Guid.NewGuid():N}"[..20],
            Content = content,
            Direction = "self",
            CreatedAt = now
        });
        db.ChatMessages.Add(new ChatMessageEntity
        {
            PublicId = $"chat-{Guid.NewGuid():N}"[..20],
            Content = BuildReply(content),
            Direction = "other",
            CreatedAt = now.AddSeconds(1)
        });
        await db.SaveChangesAsync(ct);

        var items = await db.ChatMessages
            .AsNoTracking()
            .OrderBy(m => m.CreatedAt)
            .ThenBy(m => m.Id)
            .ToArrayAsync(ct);

        var payload = items.Select(ToResponse).ToArray();
        await realtime.PublishAsync(payload, ct);

        return Results.Json(
            ApiResult.Ok(payload),
            AppJsonContext.Default.ApiResponseChatMessageResponseArray);
    }

    private static string BuildReply(string input) =>
        $"已收到你的消息：“{input}”。这是演示客服坞，稍后会有同事跟进（ChatWindow 组件示例）。";

    private static ChatMessageResponse ToResponse(ChatMessageEntity message)
    {
        var utc = message.CreatedAt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(message.CreatedAt, DateTimeKind.Utc)
            : message.CreatedAt.ToUniversalTime();
        return new ChatMessageResponse(
            message.PublicId,
            message.Content,
            message.Direction,
            utc.ToString("yyyy-MM-ddTHH:mm:ss.fffZ"));
    }
}
