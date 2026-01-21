using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;

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
    ApiResponse<InfoResponse>? ApiResponseInfoResponse
);
