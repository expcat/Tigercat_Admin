using Microsoft.AspNetCore.SignalR;
using Tigercat.Admin.Api.Endpoints;

namespace Tigercat.Admin.Api.Hubs;

public sealed class ChatRealtimeNotifier(IHubContext<ChatHub> hub)
{
    public Task PublishAsync(ChatMessageResponse[] messages, CancellationToken ct) =>
        hub.Clients.All.SendAsync(RealtimeHubs.MessagesEvent, messages, ct);
}
