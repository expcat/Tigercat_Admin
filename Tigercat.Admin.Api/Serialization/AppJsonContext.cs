using System.Text.Json.Serialization;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Serialization;

[JsonSerializable(typeof(ApiContracts))]
[JsonSerializable(typeof(RegisterRequest))]
[JsonSerializable(typeof(LoginRequest))]
[JsonSerializable(typeof(ChangePasswordRequest))]
[JsonSerializable(typeof(ApiResponse<object>))]
[JsonSerializable(typeof(ApiResponse<string>))]
[JsonSerializable(typeof(ApiResponse<UserResponse>))]
[JsonSerializable(typeof(ApiResponse<LoginResponse>))]
[JsonSerializable(typeof(ApiResponse<MessageResponse>))]
[JsonSerializable(typeof(ApiResponse<HealthResponse>))]
[JsonSerializable(typeof(ApiResponse<InfoResponse>))]
[JsonSerializable(typeof(UserResponse))]
[JsonSerializable(typeof(EventEnvelope))]
internal partial class AppJsonContext : JsonSerializerContext
{
}
