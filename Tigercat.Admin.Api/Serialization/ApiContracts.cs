using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;

namespace Tigercat.Admin.Api.Serialization;

internal record ApiContracts(
    RegisterRequest? RegisterRequest,
    LoginRequest? LoginRequest,
    ChangePasswordRequest? ChangePasswordRequest,
    UserResponse? UserResponse,
    LoginResponse? LoginResponse,
    MessageResponse? MessageResponse,
    HealthResponse? HealthResponse,
    InfoResponse? InfoResponse,
    ApiResponse<object>? ApiResponseObject,
    ApiResponse<string>? ApiResponseString,
    ApiResponse<UserResponse>? ApiResponseUserResponse,
    ApiResponse<LoginResponse>? ApiResponseLoginResponse,
    ApiResponse<MessageResponse>? ApiResponseMessageResponse,
    ApiResponse<HealthResponse>? ApiResponseHealthResponse,
    ApiResponse<InfoResponse>? ApiResponseInfoResponse,
    // Auth permissions
    UserPermissionsResponse? UserPermissionsResponse,
    ApiResponse<UserPermissionsResponse>? ApiResponseUserPermissionsResponse,
    // Users CRUD
    CreateUserRequest? CreateUserRequest,
    UpdateUserRequest? UpdateUserRequest,
    BatchDeleteUsersRequest? BatchDeleteUsersRequest,
    UserItemResponse? UserItemResponse,
    RoleInfoResponse? RoleInfoResponse,
    PagedResponse<UserItemResponse>? PagedResponseUserItemResponse,
    ApiResponse<UserItemResponse>? ApiResponseUserItemResponse,
    ApiResponse<PagedResponse<UserItemResponse>>? ApiResponsePagedResponseUserItemResponse,
    // Roles CRUD
    CreateRoleRequest? CreateRoleRequest,
    UpdateRoleRequest? UpdateRoleRequest,
    SetRolePermissionsRequest? SetRolePermissionsRequest,
    SetRoleUsersRequest? SetRoleUsersRequest,
    RoleDetailResponse? RoleDetailResponse,
    PermissionInfoResponse? PermissionInfoResponse,
    RoleUserInfoResponse? RoleUserInfoResponse,
    PagedResponse<RoleDetailResponse>? PagedResponseRoleDetailResponse,
    ApiResponse<RoleDetailResponse>? ApiResponseRoleDetailResponse,
    ApiResponse<PagedResponse<RoleDetailResponse>>? ApiResponsePagedResponseRoleDetailResponse,
    // All permissions list
    PermissionInfoResponse[]? PermissionInfoResponseArray,
    ApiResponse<PermissionInfoResponse[]>? ApiResponsePermissionInfoResponseArray,
    // Stats
    StatsOverviewResponse? StatsOverviewResponse,
    ApiResponse<StatsOverviewResponse>? ApiResponseStatsOverviewResponse,
    TrendPointResponse? TrendPointResponse,
    StatsTrendResponse? StatsTrendResponse,
    ApiResponse<StatsTrendResponse>? ApiResponseStatsTrendResponse,
    // Export
    ExportUserRow? ExportUserRow,
    ExportRoleRow? ExportRoleRow,
    ExportUserRow[]? ExportUserRowArray,
    ExportRoleRow[]? ExportRoleRowArray,
    // Settings
    SettingItemResponse? SettingItemResponse,
    SettingItemResponse[]? SettingItemResponseArray,
    UpdateSettingsRequest? UpdateSettingsRequest,
    SettingEntry? SettingEntry,
    ApiResponse<SettingItemResponse>? ApiResponseSettingItemResponse,
    ApiResponse<SettingItemResponse[]>? ApiResponseSettingItemResponseArray,
    // Media
    MediaItemResponse? MediaItemResponse,
    MediaItemResponse[]? MediaItemResponseArray,
    MediaDetailResponse? MediaDetailResponse,
    MediaReferenceResponse? MediaReferenceResponse,
    MediaReferenceResponse[]? MediaReferenceResponseArray,
    DuplicateMediaResponse? DuplicateMediaResponse,
    MediaOrphanCleanupRequest? MediaOrphanCleanupRequest,
    MediaOrphanFileResponse? MediaOrphanFileResponse,
    MediaOrphanFileResponse[]? MediaOrphanFileResponseArray,
    MediaOrphanCleanupResponse? MediaOrphanCleanupResponse,
    PagedResponse<MediaItemResponse>? PagedResponseMediaItemResponse,
    ApiResponse<MediaItemResponse>? ApiResponseMediaItemResponse,
    ApiResponse<DuplicateMediaResponse>? ApiResponseDuplicateMediaResponse,
    ApiResponse<MediaDetailResponse>? ApiResponseMediaDetailResponse,
    ApiResponse<MediaReferenceResponse[]>? ApiResponseMediaReferenceResponseArray,
    ApiResponse<MediaOrphanCleanupResponse>? ApiResponseMediaOrphanCleanupResponse,
    ApiResponse<PagedResponse<MediaItemResponse>>? ApiResponsePagedResponseMediaItemResponse
);
