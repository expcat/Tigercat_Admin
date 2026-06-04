using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Data.Entities;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.EventBus;
using Tigercat.Admin.Api.Notifications;
using Tigercat.Admin.Api.Tests.Fixtures;
using Tigercat.Admin.Api.Tests.Stubs;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

/// <summary>
/// Helper extensions for reading <see cref="ApiResponse{T}"/> payloads from test responses.
/// </summary>
internal static class HttpResponseExtensions
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    public static async Task<ApiResponse<T>?> ReadApiResponseAsync<T>(this HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<ApiResponse<T>>(content, JsonOptions);
    }
}

// ───────────────────────────────────────────────────────────────────────
// Abstract base — all provider-agnostic regression tests live here.
// The two concrete subclasses at the bottom instantiate the fixture
// for InMemory and SQLite respectively.
// ───────────────────────────────────────────────────────────────────────

public abstract class ProviderRegressionTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;
    private readonly TFixture _factory;

    protected ProviderRegressionTests(TFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    /// <summary>Login as the seeded admin and return the session token.</summary>
    private async Task<string> LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin", "admin123"));

        response.EnsureSuccessStatusCode();

        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.True(body.Success);
        Assert.NotNull(body.Data);
        Assert.False(string.IsNullOrWhiteSpace(body.Data.Token));

        return body.Data.Token;
    }

    private async Task<string> RegisterAndLoginAsync(string username, string password)
    {
        var registerResponse = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(username, password));
        registerResponse.EnsureSuccessStatusCode();

        var loginResponse = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(username, password));
        loginResponse.EnsureSuccessStatusCode();

        var body = await loginResponse.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data);
        Assert.False(string.IsNullOrWhiteSpace(body.Data.Token));

        return body.Data.Token;
    }

    /// <summary>Build a request message with the session token attached.</summary>
    private static HttpRequestMessage AuthRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Token", token);
        return request;
    }

    private async Task UpdateSettingAsync(string token, string key, string value)
    {
        var request = new HttpRequestMessage(HttpMethod.Put, "/api/settings")
        {
            Content = JsonContent.Create(new UpdateSettingsRequest([new SettingEntry(key, value)])),
        };
        request.Headers.Add("X-Token", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    private async Task<UserItemResponse> CreateUserAsync(
        string token,
        string username,
        string password,
        int[]? roleIds = null,
        string? displayName = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/users")
        {
            Content = JsonContent.Create(new CreateUserRequest(username, password, displayName, roleIds)),
        };
        request.Headers.Add("X-Token", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<UserItemResponse>();
        Assert.NotNull(body?.Data);
        return body.Data;
    }

    private async Task<UserItemResponse> EnsureUserWithRolesAsync(
        string token,
        string username,
        string password,
        int[] roleIds)
    {
        var usersRequest = AuthRequest(HttpMethod.Get, $"/api/users?page=1&pageSize=10&keyword={Uri.EscapeDataString(username)}", token);
        var usersResponse = await _client.SendAsync(usersRequest);
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.ReadApiResponseAsync<PagedResponse<UserItemResponse>>();
        var existing = users!.Data!.Items.FirstOrDefault(u => u.Username == username);

        if (existing is null)
        {
            return await CreateUserAsync(token, username, password, roleIds);
        }

        var updateRequest = new HttpRequestMessage(HttpMethod.Put, $"/api/users/{existing.Id}")
        {
            Content = JsonContent.Create(new UpdateUserRequest(existing.DisplayName, existing.Status, null, roleIds, null)),
        };
        updateRequest.Headers.Add("X-Token", token);

        var updateResponse = await _client.SendAsync(updateRequest);
        updateResponse.EnsureSuccessStatusCode();
        var body = await updateResponse.ReadApiResponseAsync<UserItemResponse>();
        Assert.NotNull(body?.Data);
        return body.Data;
    }

    private async Task<RoleDetailResponse> CreateRoleAsync(
        string token,
        string name,
        int[] permissionIds,
        string? description = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/roles")
        {
            Content = JsonContent.Create(new CreateRoleRequest(name, description, permissionIds)),
        };
        request.Headers.Add("X-Token", token);

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<RoleDetailResponse>();
        Assert.NotNull(body?.Data);
        return body.Data;
    }

    // ── 1. Login / Logout Flow ──────────────────────────────────────────

    [Fact]
    public async Task Login_WithDefaultAdmin_ReturnsToken()
    {
        var token = await LoginAsAdminAsync();
        Assert.NotEmpty(token);
    }

    [Fact]
    public async Task Login_WithBadPassword_Returns401()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin", "wrong_password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.False(body.Success);
    }

    [Fact]
    public async Task Login_WithRepeatedFailures_IsThrottled()
    {
        var username = $"missing-{Guid.NewGuid():N}";

        for (var i = 0; i < 5; i++)
        {
            var failed = await _client.PostAsJsonAsync("/api/auth/login",
                new LoginRequest(username, "wrong_password"));

            Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
        }

        var throttled = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(username, "wrong_password"));

        Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        var body = await throttled.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(429, body.Code);
    }

    [Fact]
    public async Task Login_UsesConfiguredSessionTimeout()
    {
        var token = await LoginAsAdminAsync();
        try
        {
            await UpdateSettingAsync(token, "auth.sessionTimeout", "30");

            var beforeLogin = DateTime.UtcNow;
            var response = await _client.PostAsJsonAsync("/api/auth/login",
                new LoginRequest("admin", "admin123"));

            response.EnsureSuccessStatusCode();
            var body = await response.ReadApiResponseAsync<LoginResponse>();

            Assert.NotNull(body?.Data);
            Assert.InRange(
                body.Data.ExpiresAt,
                beforeLogin.AddMinutes(25),
                beforeLogin.AddMinutes(35));
        }
        finally
        {
            await UpdateSettingAsync(token, "auth.sessionTimeout", "1440");
        }
    }

    [Fact]
    public async Task Login_UsesConfiguredThrottleLimit()
    {
        var token = await LoginAsAdminAsync();
        var username = $"throttle-{Guid.NewGuid():N}";

        try
        {
            await UpdateSettingAsync(token, "auth.maxAttempts", "2");

            for (var i = 0; i < 2; i++)
            {
                var failed = await _client.PostAsJsonAsync("/api/auth/login",
                    new LoginRequest(username, "wrong_password"));

                Assert.Equal(HttpStatusCode.Unauthorized, failed.StatusCode);
            }

            var throttled = await _client.PostAsJsonAsync("/api/auth/login",
                new LoginRequest(username, "wrong_password"));

            Assert.Equal(HttpStatusCode.TooManyRequests, throttled.StatusCode);
        }
        finally
        {
            await UpdateSettingAsync(token, "auth.maxAttempts", "5");
        }
    }

    [Fact]
    public async Task Logout_WithValidToken_Succeeds()
    {
        var token = await LoginAsAdminAsync();

        var logoutRequest = AuthRequest(HttpMethod.Post, "/api/auth/logout", token);
        var response = await _client.SendAsync(logoutRequest);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MessageResponse>();
        Assert.NotNull(body);
        Assert.True(body.Success);
    }

    [Fact]
    public async Task Logout_ThenReuse_Returns401()
    {
        var token = await LoginAsAdminAsync();

        // Logout
        var logoutRequest = AuthRequest(HttpMethod.Post, "/api/auth/logout", token);
        await _client.SendAsync(logoutRequest);

        // Try to use the revoked token
        var permRequest = AuthRequest(HttpMethod.Get, "/api/auth/permissions", token);
        var response = await _client.SendAsync(permRequest);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetPermissions_AsAdmin_ReturnsAllPermissions()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Get, "/api/auth/permissions", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<UserPermissionsResponse>();
        Assert.NotNull(body?.Data);
        Assert.Equal("admin", body.Data.Username);
        Assert.NotEmpty(body.Data.Permissions);
    }

    [Fact]
    public async Task ChangePassword_UsesConfiguredPasswordPolicy()
    {
        var token = await LoginAsAdminAsync();
        try
        {
            await UpdateSettingAsync(token, "auth.passwordMinLength", "12");

            var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/change-password")
            {
                Content = JsonContent.Create(new ChangePasswordRequest("admin123", "short123")),
            };
            request.Headers.Add("X-Token", token);

            var response = await _client.SendAsync(request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await response.ReadApiResponseAsync<MessageResponse>();
            Assert.NotNull(body);
            Assert.False(body.Success);
            Assert.Contains("密码长度不能少于 12 位", body.Message);
        }
        finally
        {
            await UpdateSettingAsync(token, "auth.passwordMinLength", "6");
        }
    }

    // ── 2. System Settings Read / Write ─────────────────────────────────

    [Fact]
    public async Task GetSettings_ReturnsSeededData()
    {
        var token = await LoginAsAdminAsync();

        var request = AuthRequest(HttpMethod.Get, "/api/settings", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<SettingItemResponse[]>();

        Assert.NotNull(body?.Data);
        Assert.True(body.Data.Length > 0, "Expected at least one seeded setting");

        // Verify a known seeded setting
        Assert.Contains(body.Data, s => s.Key == "site.name");
    }

    [Fact]
    public async Task GetSettings_ReturnsPermissionSeedMetadata()
    {
        var token = await LoginAsAdminAsync();

        var request = AuthRequest(HttpMethod.Get, "/api/settings", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<SettingItemResponse[]>();

        Assert.NotNull(body?.Data);
        Assert.Contains(body.Data, s =>
            s.Key == DbInitializer.PermissionSeedVersionKey &&
            s.Value == DbInitializer.PermissionSeedVersion);
        Assert.Contains(body.Data, s =>
            s.Key == DbInitializer.PermissionSeedChecksumKey &&
            s.Value == DbInitializer.PermissionSeedChecksum &&
            s.Value.Length == 64);
    }

    [Fact]
    public async Task GetSettingByKey_ReturnsCorrectSetting()
    {
        var token = await LoginAsAdminAsync();

        // Use a setting that is NOT modified by other tests to avoid ordering issues.
        var request = AuthRequest(HttpMethod.Get, "/api/settings/theme.mode", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<SettingItemResponse>();

        Assert.NotNull(body?.Data);
        Assert.Equal("theme.mode", body.Data.Key);
        Assert.Equal("system", body.Data.Value);
    }

    [Fact]
    public async Task UpdateSettings_ModifiesValue()
    {
        var token = await LoginAsAdminAsync();

        // Update theme.primaryColor (uses a dedicated setting to avoid conflicts)
        var updatePayload = new UpdateSettingsRequest(
            [new SettingEntry("theme.primaryColor", "#ff0000")]);

        var updateRequest = new HttpRequestMessage(HttpMethod.Put, "/api/settings")
        {
            Content = JsonContent.Create(updatePayload),
        };
        updateRequest.Headers.Add("X-Token", token);

        var updateResponse = await _client.SendAsync(updateRequest);
        updateResponse.EnsureSuccessStatusCode();

        // Read back to verify
        var readRequest = AuthRequest(HttpMethod.Get, "/api/settings/theme.primaryColor", token);
        var readResponse = await _client.SendAsync(readRequest);
        readResponse.EnsureSuccessStatusCode();

        var body = await readResponse.ReadApiResponseAsync<SettingItemResponse>();
        Assert.NotNull(body?.Data);
        Assert.Equal("#ff0000", body.Data.Value);
    }

    [Fact]
    public async Task UpdateSettings_RejectsInvalidAuthPolicyValues()
    {
        var token = await LoginAsAdminAsync();

        var updateRequest = new HttpRequestMessage(HttpMethod.Put, "/api/settings")
        {
            Content = JsonContent.Create(new UpdateSettingsRequest(
                [
                    new SettingEntry("auth.maxAttempts", "0"),
                    new SettingEntry("auth.requireComplexPassword", "maybe")
                ])),
        };
        updateRequest.Headers.Add("X-Token", token);

        var updateResponse = await _client.SendAsync(updateRequest);

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        var body = await updateResponse.ReadApiResponseAsync<SettingItemResponse[]>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Contains("auth.maxAttempts", body.Message);
    }

    // ── 3. Key List Pages Loading ───────────────────────────────────────

    [Fact]
    public async Task GetUsers_ReturnsPagedResult()
    {
        var token = await LoginAsAdminAsync();

        var request = AuthRequest(HttpMethod.Get, "/api/users?page=1&pageSize=10", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<UserItemResponse>>();

        Assert.NotNull(body?.Data);
        Assert.True(body.Data.Total >= 1, "Expected at least one seeded user (admin)");
        Assert.NotEmpty(body.Data.Items);
        Assert.Contains(body.Data.Items, u => u.Username == "admin");
    }

    [Fact]
    public async Task GetRoles_ReturnsPagedResult()
    {
        var token = await LoginAsAdminAsync();

        var request = AuthRequest(HttpMethod.Get, "/api/roles?page=1&pageSize=10", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<RoleDetailResponse>>();

        Assert.NotNull(body?.Data);
        Assert.True(body.Data.Total >= 3, "Expected at least 3 seeded roles (Admin, Editor, Viewer)");
        Assert.Contains(body.Data.Items, r => r.Name == "Admin");
        Assert.Contains(body.Data.Items, r => r.Name == "Editor");
        Assert.Contains(body.Data.Items, r => r.Name == "Viewer");
    }

    [Fact]
    public async Task GetAllPermissions_ReturnsSeededPermissions()
    {
        var token = await LoginAsAdminAsync();

        var request = AuthRequest(HttpMethod.Get, "/api/roles/permissions", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PermissionInfoResponse[]>();

        Assert.NotNull(body?.Data);
        // DbInitializer seeds 11 permissions
        Assert.True(body.Data.Length >= 11, $"Expected at least 11 permissions, got {body.Data.Length}");
        Assert.Contains(body.Data, p => p.Code == "dashboard:view");
        Assert.Contains(body.Data, p => p.Code == "user:view");
        Assert.Contains(body.Data, p => p.Code == "setting:view");
    }

    [Fact]
    public async Task ExportUsers_AppliesKeywordStatusAndSort()
    {
        var token = await LoginAsAdminAsync();
        var suffix = Guid.NewGuid().ToString("N");
        await CreateUserAsync(token, $"export-a-{suffix}", "export123", displayName: "导出用户 A");
        var disabled = await CreateUserAsync(token, $"export-z-{suffix}", "export123", displayName: "导出用户 Z");

        var statusRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-status")
        {
            Content = JsonContent.Create(new BatchUpdateUserStatusRequest([disabled.Id], 1)),
        };
        statusRequest.Headers.Add("X-Token", token);
        var statusResponse = await _client.SendAsync(statusRequest);
        statusResponse.EnsureSuccessStatusCode();

        var request = AuthRequest(
            HttpMethod.Get,
            $"/api/export/users?format=json&fields=username,status&keyword={suffix}&status=1&sortBy=username&sortOrder=desc",
            token);
        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var rows = document.RootElement.EnumerateArray().ToArray();
        var row = Assert.Single(rows);
        Assert.Equal($"export-z-{suffix}", row.GetProperty("username").GetString());
        Assert.Equal("Disabled", row.GetProperty("status").GetString());
    }

    [Fact]
    public async Task ExportRoles_AppliesKeywordAndSort()
    {
        var token = await LoginAsAdminAsync();
        var suffix = Guid.NewGuid().ToString("N");
        await CreateRoleAsync(token, $"export-role-a-{suffix}", [], "导出角色 A");
        await CreateRoleAsync(token, $"export-role-z-{suffix}", [], "导出角色 Z");

        var request = AuthRequest(
            HttpMethod.Get,
            $"/api/export/roles?format=json&fields=name,description&keyword={suffix}&sortBy=name&sortOrder=desc",
            token);
        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var rows = document.RootElement.EnumerateArray().ToArray();
        Assert.Equal(2, rows.Length);
        Assert.Equal($"export-role-z-{suffix}", rows[0].GetProperty("name").GetString());
        Assert.Equal($"export-role-a-{suffix}", rows[1].GetProperty("name").GetString());
    }

    [Fact]
    public async Task InitializeAsync_BackfillsMissingPermissionsForExistingAdminRole()
    {
        var options = new DbContextOptionsBuilder<AdminDbContext>()
            .UseInMemoryDatabase($"legacy-permissions-{Guid.NewGuid():N}")
            .Options;

        await using var db = new AdminDbContext(options);

        var adminRole = new RoleEntity
        {
            Name = "Admin",
            Description = "Legacy admin role"
        };
        var legacyPermission = new PermissionEntity
        {
            Code = "dashboard:view",
            Description = "查看仪表盘"
        };

        db.Roles.Add(adminRole);
        db.Permissions.Add(legacyPermission);
        await db.SaveChangesAsync();

        db.RolePermissions.Add(new RolePermissionEntity
        {
            RoleId = adminRole.Id,
            PermissionId = legacyPermission.Id
        });
        await db.SaveChangesAsync();

        await DbInitializer.InitializeAsync(db);

        var allPermissionCodes = await db.Permissions
            .Select(p => p.Code)
            .ToArrayAsync();
        var adminPermissionCodes = await db.RolePermissions
            .Where(rp => rp.RoleId == adminRole.Id)
            .Join(db.Permissions, rp => rp.PermissionId, p => p.Id, (_, p) => p.Code)
            .ToArrayAsync();
        var seedVersion = await db.SystemSettings
            .Where(s => s.Key == DbInitializer.PermissionSeedVersionKey)
            .Select(s => s.Value)
            .SingleAsync();

        Assert.Equal(DbInitializer.PermissionSeedVersion, seedVersion);
        Assert.Equal(allPermissionCodes.Length, adminPermissionCodes.Length);
        Assert.Contains("audit:export", adminPermissionCodes);
        Assert.Contains("task:edit", adminPermissionCodes);
    }

    [Fact]
    public async Task AdminRole_DangerousMutationsAreRejected()
    {
        var token = await LoginAsAdminAsync();

        var rolesRequest = AuthRequest(HttpMethod.Get, "/api/roles?page=1&pageSize=10", token);
        var rolesResponse = await _client.SendAsync(rolesRequest);
        rolesResponse.EnsureSuccessStatusCode();
        var roles = await rolesResponse.ReadApiResponseAsync<PagedResponse<RoleDetailResponse>>();
        var adminRole = Assert.Single(roles!.Data!.Items, r => r.Name == "Admin");

        var deleteRequest = AuthRequest(HttpMethod.Delete, $"/api/roles/{adminRole.Id}", token);
        var deleteResponse = await _client.SendAsync(deleteRequest);
        Assert.Equal(HttpStatusCode.BadRequest, deleteResponse.StatusCode);

        var permissionRequest = new HttpRequestMessage(HttpMethod.Put, $"/api/roles/{adminRole.Id}/permissions")
        {
            Content = JsonContent.Create(new SetRolePermissionsRequest([])),
        };
        permissionRequest.Headers.Add("X-Token", token);
        var permissionResponse = await _client.SendAsync(permissionRequest);
        Assert.Equal(HttpStatusCode.BadRequest, permissionResponse.StatusCode);

        var usersRequest = new HttpRequestMessage(HttpMethod.Put, $"/api/roles/{adminRole.Id}/users")
        {
            Content = JsonContent.Create(new SetRoleUsersRequest([])),
        };
        usersRequest.Headers.Add("X-Token", token);
        var usersResponse = await _client.SendAsync(usersRequest);
        Assert.Equal(HttpStatusCode.BadRequest, usersResponse.StatusCode);
    }

    [Fact]
    public async Task BatchDeleteUsers_PreventsDeletingCurrentAdmin()
    {
        var token = await LoginAsAdminAsync();

        var usersRequest = AuthRequest(HttpMethod.Get, "/api/users?page=1&pageSize=10", token);
        var usersResponse = await _client.SendAsync(usersRequest);
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.ReadApiResponseAsync<PagedResponse<UserItemResponse>>();
        var adminUser = Assert.Single(users!.Data!.Items, u => u.Username == "admin");

        var deleteRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-delete")
        {
            Content = JsonContent.Create(new BatchDeleteUsersRequest([adminUser.Id])),
        };
        deleteRequest.Headers.Add("X-Token", token);

        var deleteResponse = await _client.SendAsync(deleteRequest);

        Assert.Equal(HttpStatusCode.BadRequest, deleteResponse.StatusCode);
        var body = await deleteResponse.ReadApiResponseAsync<MessageResponse>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Contains("不能删除当前登录用户", body.Message);
    }

    [Fact]
    public async Task BatchUpdateUserStatus_UpdatesSelectedUsers()
    {
        var token = await LoginAsAdminAsync();
        var username = $"batch-status-{Guid.NewGuid():N}";
        var user = await CreateUserAsync(token, username, "batch123");

        var disableRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-status")
        {
            Content = JsonContent.Create(new BatchUpdateUserStatusRequest([user.Id], 1)),
        };
        disableRequest.Headers.Add("X-Token", token);

        var disableResponse = await _client.SendAsync(disableRequest);
        disableResponse.EnsureSuccessStatusCode();

        var readDisabled = await _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/users/{user.Id}", token));
        readDisabled.EnsureSuccessStatusCode();
        var disabledBody = await readDisabled.ReadApiResponseAsync<UserItemResponse>();
        Assert.Equal(1, disabledBody!.Data!.Status);

        var enableRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-status")
        {
            Content = JsonContent.Create(new BatchUpdateUserStatusRequest([user.Id], 0)),
        };
        enableRequest.Headers.Add("X-Token", token);

        var enableResponse = await _client.SendAsync(enableRequest);
        enableResponse.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task BatchUpdateUserStatus_ValidatesEmptyIdsAndStatus()
    {
        var token = await LoginAsAdminAsync();

        var emptyRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-status")
        {
            Content = JsonContent.Create(new BatchUpdateUserStatusRequest([], 1)),
        };
        emptyRequest.Headers.Add("X-Token", token);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(emptyRequest)).StatusCode);

        var invalidStatusRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-status")
        {
            Content = JsonContent.Create(new BatchUpdateUserStatusRequest([1], 9)),
        };
        invalidStatusRequest.Headers.Add("X-Token", token);
        Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(invalidStatusRequest)).StatusCode);
    }

    [Fact]
    public async Task BatchUpdateUserStatus_PreventsDisablingCurrentUser()
    {
        var token = await LoginAsAdminAsync();
        var usersRequest = AuthRequest(HttpMethod.Get, "/api/users?page=1&pageSize=10&keyword=admin", token);
        var usersResponse = await _client.SendAsync(usersRequest);
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.ReadApiResponseAsync<PagedResponse<UserItemResponse>>();
        var adminUser = Assert.Single(users!.Data!.Items, u => u.Username == "admin");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-status")
        {
            Content = JsonContent.Create(new BatchUpdateUserStatusRequest([adminUser.Id], 1)),
        };
        request.Headers.Add("X-Token", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.ReadApiResponseAsync<MessageResponse>();
        Assert.Contains("不能禁用当前登录用户", body!.Message);
    }

    [Fact]
    public async Task BatchUpdateUserStatus_PreventsDisablingLastActiveAdmin()
    {
        var adminToken = await LoginAsAdminAsync();

        var permissionsResponse = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/roles/permissions", adminToken));
        permissionsResponse.EnsureSuccessStatusCode();
        var permissions = await permissionsResponse.ReadApiResponseAsync<PermissionInfoResponse[]>();
        var permissionIds = permissions!.Data!
            .Where(p => p.Code is "user:view" or "user:edit")
            .Select(p => p.Id)
            .ToArray();

        var role = await CreateRoleAsync(adminToken, $"status-operator-{Guid.NewGuid():N}", permissionIds);
        var operatorName = $"status-operator-{Guid.NewGuid():N}";
        var operatorToken = await RegisterAndLoginAsync(operatorName, "operator123");
        await EnsureUserWithRolesAsync(adminToken, operatorName, "operator123", [role.Id]);

        var usersRequest = AuthRequest(HttpMethod.Get, "/api/users?page=1&pageSize=10&keyword=admin", adminToken);
        var usersResponse = await _client.SendAsync(usersRequest);
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.ReadApiResponseAsync<PagedResponse<UserItemResponse>>();
        var adminUser = Assert.Single(users!.Data!.Items, u => u.Username == "admin");

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-status")
        {
            Content = JsonContent.Create(new BatchUpdateUserStatusRequest([adminUser.Id], 1)),
        };
        request.Headers.Add("X-Token", operatorToken);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.ReadApiResponseAsync<MessageResponse>();
        Assert.Contains("不能禁用最后一个可用管理员用户", body!.Message);
    }

    [Fact]
    public async Task PermissionFilter_BlocksDangerousAndBatchOperationsForUnprivilegedUser()
    {
        var adminToken = await LoginAsAdminAsync();
        var username = $"limited-{Guid.NewGuid():N}";
        var userToken = await RegisterAndLoginAsync(username, "limited123");

        var usersRequest = AuthRequest(HttpMethod.Get, "/api/users?page=1&pageSize=10", adminToken);
        var usersResponse = await _client.SendAsync(usersRequest);
        usersResponse.EnsureSuccessStatusCode();
        var users = await usersResponse.ReadApiResponseAsync<PagedResponse<UserItemResponse>>();
        var adminUser = Assert.Single(users!.Data!.Items, u => u.Username == "admin");

        var rolesRequest = AuthRequest(HttpMethod.Get, "/api/roles?page=1&pageSize=10", adminToken);
        var rolesResponse = await _client.SendAsync(rolesRequest);
        rolesResponse.EnsureSuccessStatusCode();
        var roles = await rolesResponse.ReadApiResponseAsync<PagedResponse<RoleDetailResponse>>();
        var adminRole = Assert.Single(roles!.Data!.Items, r => r.Name == "Admin");

        var batchDeleteRequest = new HttpRequestMessage(HttpMethod.Post, "/api/users/batch-delete")
        {
            Content = JsonContent.Create(new BatchDeleteUsersRequest([adminUser.Id])),
        };
        batchDeleteRequest.Headers.Add("X-Token", userToken);

        var deleteRoleRequest = AuthRequest(HttpMethod.Delete, $"/api/roles/{adminRole.Id}", userToken);
        var updateSettingsRequest = new HttpRequestMessage(HttpMethod.Put, "/api/settings")
        {
            Content = JsonContent.Create(new UpdateSettingsRequest([new SettingEntry("site.name", "blocked")])),
        };
        updateSettingsRequest.Headers.Add("X-Token", userToken);

        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(batchDeleteRequest)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(deleteRoleRequest)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(updateSettingsRequest)).StatusCode);
    }

    [Fact]
    public void EventEnvelope_RemovesSensitiveAuditFields()
    {
        var envelope = EventEnvelope.Create(
            "security.test",
            new Dictionary<string, object?>
            {
                ["username"] = "admin",
                ["password"] = "secret",
                ["accessToken"] = "token",
                ["authorizationHeader"] = "Bearer token",
            });

        Assert.Contains("username", envelope.Data.Keys);
        Assert.DoesNotContain("password", envelope.Data.Keys);
        Assert.DoesNotContain("accessToken", envelope.Data.Keys);
        Assert.DoesNotContain("authorizationHeader", envelope.Data.Keys);
    }

    [Fact]
    public void EventEnvelope_RemovesNestedSensitiveAuditFields()
    {
        var envelope = EventEnvelope.Create(
            "security.test",
            new Dictionary<string, object?>
            {
                ["username"] = "admin",
                ["profile"] = new Dictionary<string, object?>
                {
                    ["displayName"] = "管理员",
                    ["refreshToken"] = "secret"
                },
                ["items"] = new object?[]
                {
                    new Dictionary<string, object?>
                    {
                        ["name"] = "safe",
                        ["clientSecret"] = "secret"
                    }
                }
            });

        var profile = Assert.IsType<Dictionary<string, object?>>(envelope.Data["profile"]);
        var items = Assert.IsType<object?[]>(envelope.Data["items"]);
        var firstItem = Assert.IsType<Dictionary<string, object?>>(items[0]);

        Assert.Contains("displayName", profile.Keys);
        Assert.DoesNotContain("refreshToken", profile.Keys);
        Assert.Contains("name", firstItem.Keys);
        Assert.DoesNotContain("clientSecret", firstItem.Keys);
    }

    [Fact]
    public void EventDataSanitizer_RemovesJsonElementSensitiveAuditFields()
    {
        var payload = JsonSerializer.Deserialize<Dictionary<string, object?>>(
            """
            {
              "username": "admin",
              "authorization": "Bearer token",
              "profile": {
                "displayName": "管理员",
                "refreshToken": "secret"
              },
              "items": [
                {
                  "name": "safe",
                  "apiKey": "secret"
                }
              ]
            }
            """);

        Assert.NotNull(payload);
        var sanitized = EventDataSanitizer.SanitizeData(payload);
        var profile = Assert.IsType<Dictionary<string, object?>>(sanitized["profile"]);
        var items = Assert.IsType<object?[]>(sanitized["items"]);
        var firstItem = Assert.IsType<Dictionary<string, object?>>(items[0]);

        Assert.Contains("username", sanitized.Keys);
        Assert.DoesNotContain("authorization", sanitized.Keys);
        Assert.Contains("displayName", profile.Keys);
        Assert.DoesNotContain("refreshToken", profile.Keys);
        Assert.Contains("name", firstItem.Keys);
        Assert.DoesNotContain("apiKey", firstItem.Keys);
    }

    [Fact]
    public void EventDataSanitizer_RemovesLegacyDictionarySensitiveAuditFields()
    {
        var payload = new Dictionary<string, object?>
        {
            ["metadata"] = new System.Collections.Hashtable
            {
                ["name"] = "safe",
                ["accessToken"] = "secret",
            },
        };

        var sanitized = EventDataSanitizer.SanitizeData(payload);
        var metadata = Assert.IsType<Dictionary<string, object?>>(sanitized["metadata"]);

        Assert.Contains("name", metadata.Keys);
        Assert.DoesNotContain("accessToken", metadata.Keys);
    }

    [Fact]
    public async Task GetNotifications_ReturnsSeededInbox()
    {
        var token = await LoginAsAdminAsync();

        var request = AuthRequest(HttpMethod.Get, "/api/notifications?page=1&pageSize=10", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<NotificationItemResponse>>();

        Assert.NotNull(body?.Data);
        Assert.True(body.Data.Total >= 3);
        Assert.Contains(body.Data.Items, n => n.Id == "release-window");
    }

    [Fact]
    public async Task MarkNotificationsRead_UpdatesUnreadState()
    {
        var token = await LoginAsAdminAsync();

        var updateRequest = new HttpRequestMessage(HttpMethod.Post, "/api/notifications/mark-read")
        {
            Content = JsonContent.Create(new MarkNotificationsReadRequest("ops")),
        };
        updateRequest.Headers.Add("X-Token", token);

        var updateResponse = await _client.SendAsync(updateRequest);
        updateResponse.EnsureSuccessStatusCode();

        var readRequest = AuthRequest(HttpMethod.Get, "/api/notifications?groupKey=ops&unread=true", token);
        var readResponse = await _client.SendAsync(readRequest);
        readResponse.EnsureSuccessStatusCode();

        var body = await readResponse.ReadApiResponseAsync<PagedResponse<NotificationItemResponse>>();
        Assert.NotNull(body?.Data);
        Assert.Equal(0, body.Data.Total);
    }

    [Fact]
    public async Task CreateAndMoveTask_PersistsWorkflowState()
    {
        var token = await LoginAsAdminAsync();

        var createRequest = new HttpRequestMessage(HttpMethod.Post, "/api/tasks")
        {
            Content = JsonContent.Create(new CreateAdminTaskRequest(
                "验证运维任务后端化",
                "来自 API 回归测试的任务",
                "测试账号",
                "high",
                "todo",
                DateTime.UtcNow.AddDays(1),
                2,
                false,
                null)),
        };
        createRequest.Headers.Add("X-Token", token);

        var createResponse = await _client.SendAsync(createRequest);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.ReadApiResponseAsync<AdminTaskResponse>();

        Assert.NotNull(created?.Data);
        Assert.Equal("todo", created.Data.Status);

        var moveRequest = new HttpRequestMessage(HttpMethod.Put, $"/api/tasks/{created.Data.Id}/status")
        {
            Content = JsonContent.Create(new MoveAdminTaskRequest("doing")),
        };
        moveRequest.Headers.Add("X-Token", token);

        var moveResponse = await _client.SendAsync(moveRequest);
        moveResponse.EnsureSuccessStatusCode();
        var moved = await moveResponse.ReadApiResponseAsync<AdminTaskResponse>();

        Assert.NotNull(moved?.Data);
        Assert.Equal("doing", moved.Data.Status);
    }

    [Fact]
    public async Task CompleteTask_RequiresConfirmationAndPersistsGovernanceFields()
    {
        var token = await LoginAsAdminAsync();
        StubEventPublisher.Clear();

        var createRequest = new HttpRequestMessage(HttpMethod.Post, "/api/tasks")
        {
            Content = JsonContent.Create(new CreateAdminTaskRequest(
                "验证任务完成确认",
                "来自 API 回归测试的完成确认任务",
                "测试账号",
                "medium",
                "review",
                DateTime.UtcNow.AddDays(1),
                1,
                false,
                null)),
        };
        createRequest.Headers.Add("X-Token", token);

        var createResponse = await _client.SendAsync(createRequest);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.ReadApiResponseAsync<AdminTaskResponse>();
        Assert.NotNull(created?.Data);

        var rejectedRequest = new HttpRequestMessage(HttpMethod.Post, $"/api/tasks/{created.Data.Id}/complete")
        {
            Content = JsonContent.Create(new CompleteAdminTaskRequest(false, "未经确认")),
        };
        rejectedRequest.Headers.Add("X-Token", token);
        var rejectedResponse = await _client.SendAsync(rejectedRequest);
        Assert.Equal(HttpStatusCode.BadRequest, rejectedResponse.StatusCode);

        var completeRequest = new HttpRequestMessage(HttpMethod.Post, $"/api/tasks/{created.Data.Id}/complete")
        {
            Content = JsonContent.Create(new CompleteAdminTaskRequest(true, "验收完成")),
        };
        completeRequest.Headers.Add("X-Token", token);

        var completeResponse = await _client.SendAsync(completeRequest);
        completeResponse.EnsureSuccessStatusCode();
        var completed = await completeResponse.ReadApiResponseAsync<AdminTaskResponse>();

        Assert.NotNull(completed?.Data);
        Assert.Equal("done", completed.Data.Status);
        Assert.Equal("验收完成", completed.Data.CompletionNote);
        Assert.Contains(StubEventPublisher.PublishedEvents, item => item.Envelope.EventType == "admin.task.completed");
    }

    [Fact]
    public async Task GetTasks_FiltersByAssigneeDueDateAndBlockedState()
    {
        var token = await LoginAsAdminAsync();
        var url = "/api/tasks?page=1&pageSize=20&assignee=%E5%B9%B3%E5%8F%B0%E8%BF%90%E7%BB%B4&blocked=true&dueFrom=2026-05-01T00:00:00Z&dueTo=2026-06-30T00:00:00Z";

        var request = AuthRequest(HttpMethod.Get, url, token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<AdminTaskResponse>>();

        Assert.NotNull(body?.Data);
        Assert.NotEmpty(body.Data.Items);
        Assert.All(body.Data.Items, item =>
        {
            Assert.True(item.Blocked);
            Assert.Contains("平台运维", item.Assignee, StringComparison.Ordinal);
            Assert.False(string.IsNullOrWhiteSpace(item.BlockedReason));
        });
    }

    [Fact]
    public async Task AdminNotificationService_MapsTaskEventIdempotently()
    {
        await LoginAsAdminAsync();
        using var scope = _factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<IAdminNotificationService>();
        var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
        var envelope = new EventEnvelope(
            "event-task-notification",
            "admin.task.created",
            "1.0",
            DateTime.UtcNow,
            "trace-test",
            new Dictionary<string, object?>
            {
                ["taskId"] = "task-demo",
                ["title"] = "闭环通知测试",
                ["operator"] = "admin",
                ["password"] = "should-not-leak"
            });

        await service.HandleEventAsync(envelope, EventBusConstants.AdminStream);
        await service.HandleEventAsync(envelope, EventBusConstants.AdminStream);

        var notifications = await db.AdminNotifications
            .Where(n => n.PublicId == "notif-event-task-notification")
            .ToArrayAsync();

        var notification = Assert.Single(notifications);
        Assert.Equal("/tasks?taskId=task-demo", notification.LinkUrl);
        Assert.DoesNotContain("password", notification.MetadataJson, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task AuditRetentionPolicy_CanBeUpdated()
    {
        var token = await LoginAsAdminAsync();
        StubEventPublisher.Clear();

        var updateRequest = new HttpRequestMessage(HttpMethod.Put, "/api/audit-logs/retention-policy")
        {
            Content = JsonContent.Create(new UpdateAuditRetentionPolicyRequest(120)),
        };
        updateRequest.Headers.Add("X-Token", token);

        var updateResponse = await _client.SendAsync(updateRequest);
        updateResponse.EnsureSuccessStatusCode();

        var readRequest = AuthRequest(HttpMethod.Get, "/api/audit-logs/retention-policy", token);
        var readResponse = await _client.SendAsync(readRequest);
        readResponse.EnsureSuccessStatusCode();

        var body = await readResponse.ReadApiResponseAsync<AuditRetentionPolicyResponse>();
        Assert.NotNull(body?.Data);
        Assert.Equal(120, body.Data.RetentionDays);
        Assert.Contains(StubEventPublisher.PublishedEvents, item =>
            item.Envelope.EventType == "admin.setting.updated" &&
            item.Envelope.Data.TryGetValue("changedKeys", out var changedKeys) &&
            JsonSerializer.Serialize(changedKeys).Contains("ops.auditRetentionDays", StringComparison.Ordinal));
    }

    [Fact]
    public async Task UpdateSettings_PublishesSettingsAuditEvent()
    {
        var token = await LoginAsAdminAsync();
        StubEventPublisher.Clear();

        await UpdateSettingAsync(token, "site.name", "Tigercat Admin P6");

        Assert.Contains(StubEventPublisher.PublishedEvents, item =>
            item.Envelope.EventType == "admin.setting.updated" &&
            item.Envelope.Data.TryGetValue("changedKeys", out var changedKeys) &&
            JsonSerializer.Serialize(changedKeys).Contains("site.name", StringComparison.Ordinal));
    }

    [Fact]
    public async Task AuditRetentionCleanup_Returns503WhenRedisUnavailable()
    {
        var token = await LoginAsAdminAsync();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/audit-logs/retention/cleanup")
        {
            Content = JsonContent.Create(new AuditRetentionCleanupRequest(true)),
        };
        request.Headers.Add("X-Token", token);

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    // ── 4. Health Endpoints ─────────────────────────────────────────────

    [Fact]
    public async Task HealthCheck_ReturnsHealthy()
    {
        var response = await _client.GetAsync("/api/health");
        response.EnsureSuccessStatusCode();

        var body = await response.ReadApiResponseAsync<HealthResponse>();
        Assert.NotNull(body?.Data);
        Assert.Equal("healthy", body.Data.Status);
        Assert.NotNull(body.Data.Details);
        Assert.Equal("healthy", body.Data.Details["database"].Status);
        Assert.Equal("healthy", body.Data.Details["redis"].Status);
        Assert.Equal("healthy", body.Data.Details["eventChannel"].Status);
        Assert.Equal("healthy", body.Data.Details["configuration"].Status);
    }

    [Fact]
    public async Task InfoEndpoint_ReturnsApiInfo()
    {
        var response = await _client.GetAsync("/api/info");
        response.EnsureSuccessStatusCode();

        var body = await response.ReadApiResponseAsync<InfoResponse>();
        Assert.NotNull(body?.Data);
        Assert.Equal("Tigercat Admin API", body.Data.Name);
    }
}

// ───────────────────────────────────────────────────────────────────────
// Concrete test classes — one per database provider
// ───────────────────────────────────────────────────────────────────────

public class InMemoryProviderRegressionTests : ProviderRegressionTests<InMemoryApiFactory>
{
    public InMemoryProviderRegressionTests(InMemoryApiFactory factory) : base(factory) { }
}

public class SqliteProviderRegressionTests : ProviderRegressionTests<SqliteApiFactory>
{
    public SqliteProviderRegressionTests(SqliteApiFactory factory) : base(factory) { }
}
