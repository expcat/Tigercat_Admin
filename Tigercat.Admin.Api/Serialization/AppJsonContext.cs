using System.Text.Json.Serialization;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.EventBus;
// PermissionInfoResponse is now in Tigercat.Admin.Api.Common

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
[JsonSerializable(typeof(Dictionary<string, string?>))]
[JsonSerializable(typeof(UserResponse))]
[JsonSerializable(typeof(EventEnvelope))]
[JsonSerializable(typeof(AuditLogItemResponse))]
[JsonSerializable(typeof(AuditLogItemResponse[]))]
[JsonSerializable(typeof(ApiResponse<AuditLogItemResponse[]>))]
// Users CRUD types
[JsonSerializable(typeof(CreateUserRequest))]
[JsonSerializable(typeof(UpdateUserRequest))]
[JsonSerializable(typeof(BatchDeleteUsersRequest))]
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
[JsonSerializable(typeof(PermissionInfoResponse[]))]
[JsonSerializable(typeof(ApiResponse<PermissionInfoResponse[]>))]
// Stats types
[JsonSerializable(typeof(StatsOverviewResponse))]
[JsonSerializable(typeof(ApiResponse<StatsOverviewResponse>))]
[JsonSerializable(typeof(TrendPointResponse))]
[JsonSerializable(typeof(StatsTrendResponse))]
[JsonSerializable(typeof(ApiResponse<StatsTrendResponse>))]
// Export types
[JsonSerializable(typeof(ExportUserRow))]
[JsonSerializable(typeof(ExportRoleRow))]
[JsonSerializable(typeof(ExportUserRow[]))]
[JsonSerializable(typeof(ExportRoleRow[]))]
// Settings types
[JsonSerializable(typeof(SettingItemResponse))]
[JsonSerializable(typeof(SettingItemResponse[]))]
[JsonSerializable(typeof(UpdateSettingsRequest))]
[JsonSerializable(typeof(SettingEntry))]
[JsonSerializable(typeof(ApiResponse<SettingItemResponse>))]
[JsonSerializable(typeof(ApiResponse<SettingItemResponse[]>))]
// Media types
[JsonSerializable(typeof(MediaItemResponse))]
[JsonSerializable(typeof(MediaItemResponse[]))]
[JsonSerializable(typeof(MediaDetailResponse))]
[JsonSerializable(typeof(MediaReferenceResponse))]
[JsonSerializable(typeof(MediaReferenceResponse[]))]
[JsonSerializable(typeof(PagedResponse<MediaItemResponse>))]
[JsonSerializable(typeof(ApiResponse<MediaItemResponse>))]
[JsonSerializable(typeof(ApiResponse<MediaDetailResponse>))]
[JsonSerializable(typeof(ApiResponse<MediaReferenceResponse[]>))]
[JsonSerializable(typeof(ApiResponse<PagedResponse<MediaItemResponse>>))]
internal partial class AppJsonContext : JsonSerializerContext
{
}
