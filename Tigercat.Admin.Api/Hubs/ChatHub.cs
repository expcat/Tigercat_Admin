using Microsoft.AspNetCore.SignalR;
using Tigercat.Admin.Api.Auth;

namespace Tigercat.Admin.Api.Hubs;

public sealed class ChatHub(SessionRevocationNotifier revocationNotifier) : SessionBoundHub(revocationNotifier)
{
}
