using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public class MediaEndpointsTests : IClassFixture<InMemoryApiFactory>
{
    private readonly HttpClient _client;

    public MediaEndpointsTests(InMemoryApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task UploadListContentAndDelete_Succeeds()
    {
        var token = await LoginAsAdminAsync();
        var media = await UploadAsync(token, "sample.png", "image/png", [0x89, 0x50, 0x4e, 0x47]);

        var listRequest = AuthRequest(HttpMethod.Get, "/api/media?keyword=sample", token);
        var listResponse = await _client.SendAsync(listRequest);
        listResponse.EnsureSuccessStatusCode();
        var listBody = await listResponse.ReadApiResponseAsync<PagedResponse<MediaItemResponse>>();
        Assert.NotNull(listBody?.Data);
        Assert.Contains(listBody.Data.Items, item => item.Id == media.Id);

        var contentResponse = await _client.GetAsync(media.Url);
        contentResponse.EnsureSuccessStatusCode();
        Assert.Equal("image/png", contentResponse.Content.Headers.ContentType?.MediaType);

        var deleteResponse = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/media/{media.Id}", token));
        deleteResponse.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task BatchDeleteMedia_Succeeds()
    {
        var token = await LoginAsAdminAsync();
        var first = await UploadAsync(token, "batch-a.txt", "text/plain", [1, 2, 3]);
        var second = await UploadAsync(token, "batch-b.txt", "text/plain", [4, 5, 6]);

        var request = AuthRequest(HttpMethod.Post, "/api/media/batch-delete", token);
        request.Content = JsonContent.Create(new BatchDeleteMediaRequest([first.Id, second.Id]));
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MessageResponse>();
        Assert.NotNull(body?.Data);
        Assert.Contains("成功删除 2 个媒体资源", body.Data.Message);
    }

    [Fact]
    public async Task BatchDeleteMedia_WithReferencedItem_Returns409AndDeletesNothing()
    {
        var token = await LoginAsAdminAsync();
        var logo = await UploadAsync(token, "batch-logo.png", "image/png", [0x89, 0x50, 0x4e, 0x47], "logo");
        var other = await UploadAsync(token, "batch-other.txt", "text/plain", [7, 8, 9]);

        await UpdateSettingsAsync(token, new SettingEntry("site.logo", logo.Url));

        var request = AuthRequest(HttpMethod.Post, "/api/media/batch-delete", token);
        request.Content = JsonContent.Create(new BatchDeleteMediaRequest([logo.Id, other.Id]));
        var blocked = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        var blockedBody = await blocked.ReadApiResponseAsync<MediaReferenceResponse[]>();
        Assert.NotNull(blockedBody?.Data);
        Assert.Contains(blockedBody.Data, r => r.ReferenceType == "site.logo");

        var otherStillExists = await _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/media/{other.Id}", token));
        otherStillExists.EnsureSuccessStatusCode();

        await UpdateSettingsAsync(token, new SettingEntry("site.logo", ""));
        var cleanup = AuthRequest(HttpMethod.Post, "/api/media/batch-delete", token);
        cleanup.Content = JsonContent.Create(new BatchDeleteMediaRequest([logo.Id, other.Id]));
        var cleanupResponse = await _client.SendAsync(cleanup);
        cleanupResponse.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task UploadLogo_WithNonImage_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var response = await UploadRawAsync(token, "notes.txt", "text/plain", "logo", [1, 2, 3]);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadEmptyFile_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var response = await UploadRawAsync(token, "empty.png", "image/png", null, []);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteReferencedSiteLogo_Returns409UntilReferenceCleared()
    {
        var token = await LoginAsAdminAsync();
        var media = await UploadAsync(token, "logo.png", "image/png", [0x89, 0x50, 0x4e, 0x47], "logo");

        await UpdateSettingsAsync(token, new SettingEntry("site.logo", media.Url));

        var blocked = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/media/{media.Id}", token));
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        var blockedBody = await blocked.ReadApiResponseAsync<MediaReferenceResponse[]>();
        Assert.NotNull(blockedBody?.Data);
        Assert.Contains(blockedBody.Data, r => r.ReferenceType == "site.logo");

        await UpdateSettingsAsync(token, new SettingEntry("site.logo", ""));
        var deleted = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/media/{media.Id}", token));
        deleted.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task DeleteReferencedUserAvatar_Returns409UntilReferenceCleared()
    {
        var token = await LoginAsAdminAsync();
        var avatar = await UploadAsync(token, "avatar.png", "image/png", [0x89, 0x50, 0x4e, 0x47], "avatar");
        var admin = await GetAdminUserAsync(token);

        await UpdateUserAvatarAsync(token, admin.Id, avatar.Id);

        var blocked = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/media/{avatar.Id}", token));
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        var blockedBody = await blocked.ReadApiResponseAsync<MediaReferenceResponse[]>();
        Assert.NotNull(blockedBody?.Data);
        Assert.Contains(blockedBody.Data, r => r.ReferenceType == "user.avatar");

        await UpdateUserAvatarAsync(token, admin.Id, 0);
        var deleted = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/media/{avatar.Id}", token));
        deleted.EnsureSuccessStatusCode();
    }

    private async Task<string> LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin", "admin123"));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data);
        return body.Data.Token;
    }

    private async Task<MediaItemResponse> UploadAsync(
        string token,
        string fileName,
        string contentType,
        byte[] bytes,
        string? usage = null)
    {
        var response = await UploadRawAsync(token, fileName, contentType, usage, bytes);
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<MediaItemResponse>();
        Assert.NotNull(body?.Data);
        return body.Data;
    }

    private async Task<HttpResponseMessage> UploadRawAsync(
        string token,
        string fileName,
        string contentType,
        string? usage,
        byte[] bytes)
    {
        using var form = new MultipartFormDataContent();
        var content = new ByteArrayContent(bytes);
        content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(content, "file", fileName);
        if (usage is not null)
        {
            form.Add(new StringContent(usage), "usage");
        }

        var request = AuthRequest(HttpMethod.Post, "/api/media", token);
        request.Content = form;
        return await _client.SendAsync(request);
    }

    private async Task UpdateSettingsAsync(string token, SettingEntry entry)
    {
        var request = AuthRequest(HttpMethod.Put, "/api/settings", token);
        request.Content = JsonContent.Create(new UpdateSettingsRequest([entry]));
        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    private async Task<UserItemResponse> GetAdminUserAsync(string token)
    {
        var request = AuthRequest(HttpMethod.Get, "/api/users?keyword=admin", token);
        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<UserItemResponse>>();
        Assert.NotNull(body?.Data);
        return Assert.Single(body.Data.Items, u => u.Username == "admin");
    }

    private async Task UpdateUserAvatarAsync(string token, int userId, int avatarMediaId)
    {
        var request = AuthRequest(HttpMethod.Put, $"/api/users/{userId}", token);
        request.Content = JsonContent.Create(new { avatarMediaId });
        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
    }

    private static HttpRequestMessage AuthRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Token", token);
        return request;
    }
}
