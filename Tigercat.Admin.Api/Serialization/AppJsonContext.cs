using System.Text.Json.Serialization;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.EventBus;

namespace Tigercat.Admin.Api.Serialization;

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
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
// Users CRUD types
[JsonSerializable(typeof(CreateUserRequest))]
[JsonSerializable(typeof(UpdateUserRequest))]
[JsonSerializable(typeof(UserItemResponse))]
[JsonSerializable(typeof(RoleInfoResponse))]
[JsonSerializable(typeof(PagedResponse<UserItemResponse>))]
[JsonSerializable(typeof(ApiResponse<UserItemResponse>))]
[JsonSerializable(typeof(ApiResponse<PagedResponse<UserItemResponse>>))]
// Auth permissions
[JsonSerializable(typeof(UserPermissionsResponse))]
[JsonSerializable(typeof(ApiResponse<UserPermissionsResponse>))]
// Roles CRUD types
[JsonSerializable(typeof(CreateRoleRequest))]
[JsonSerializable(typeof(UpdateRoleRequest))]
[JsonSerializable(typeof(SetRolePermissionsRequest))]
[JsonSerializable(typeof(SetRoleUsersRequest))]
[JsonSerializable(typeof(RoleDetailResponse))]
[JsonSerializable(typeof(PermissionInfoResponse))]
[JsonSerializable(typeof(RoleUserInfoResponse))]
[JsonSerializable(typeof(PagedResponse<RoleDetailResponse>))]
[JsonSerializable(typeof(ApiResponse<RoleDetailResponse>))]
[JsonSerializable(typeof(ApiResponse<PagedResponse<RoleDetailResponse>>))]
internal partial class AppJsonContext : JsonSerializerContext
{
}
