using System.Net;
using System.Net.Http.Json;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Tigercat.Admin.Api.Data;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class ContentJobsImportEndpointsTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;
    private readonly TFixture _factory;

    protected ContentJobsImportEndpointsTests(TFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SaveArticle_PutThenGet_PersistsDraft()
    {
        var token = await LoginAsAdminAsync();
        var bytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO1sAAAAASUVORK5CYII=");
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(file, "file", "article-attachment.png");
        var upload = AuthRequest(HttpMethod.Post, "/api/media", token);
        upload.Content = form;
        var uploaded = await _client.SendAsync(upload);
        uploaded.EnsureSuccessStatusCode();
        var media = (await uploaded.ReadApiResponseAsync<MediaItemResponse>())!.Data!;
        Assert.Equal(bytes, await _client.GetByteArrayAsync(media.Url));
        var shapes = JsonSerializer.Deserialize<JsonElement[]>("""[{"id":"box-1","type":"rectangle","x":0,"y":0,"width":1,"height":1}]""")!;
        var annotate = AuthRequest(HttpMethod.Put, $"/api/media/{media.Id}/annotations", token);
        annotate.Content = JsonContent.Create(new UpdateMediaAnnotationsRequest(shapes));
        (await _client.SendAsync(annotate)).EnsureSuccessStatusCode();
        var detailResponse = await _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/media/{media.Id}", token));
        var detail = (await detailResponse.ReadApiResponseAsync<MediaDetailResponse>())!.Data!;
        Assert.Equal("box-1", Assert.Single(detail.Annotations).GetProperty("id").GetString());
        Assert.Equal(1, detail.Width);
        var put = AuthRequest(HttpMethod.Put, "/api/content/articles/a1", token);
        put.Content = JsonContent.Create(new
        {
            title = "组件库 v1.6 发布说明（已保存）",
            editorType = "markdown",
            body = "# 已保存草稿",
            tags = new[] { "发布", "草稿" },
            category = "backend",
            column = new[] { "docs", "api" },
            published = false,
            attachmentIds = new[] { media.Id }
        });

        var putResponse = await _client.SendAsync(put);
        putResponse.EnsureSuccessStatusCode();
        var putBody = await putResponse.ReadApiResponseAsync<ArticleResponse>();
        Assert.NotNull(putBody?.Data);
        Assert.Equal("a1", putBody.Data.Id);
        Assert.Equal("组件库 v1.6 发布说明（已保存）", putBody.Data.Title);
        Assert.Equal("markdown", putBody.Data.EditorType);
        Assert.Equal("# 已保存草稿", putBody.Data.Body);
        Assert.Equal(["发布", "草稿"], putBody.Data.Tags);
        Assert.Equal("backend", putBody.Data.Category);
        Assert.Equal(["docs", "api"], putBody.Data.Column);
        Assert.False(putBody.Data.Published);

        var getResponse = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/content/articles/a1", token));
        getResponse.EnsureSuccessStatusCode();
        var getBody = await getResponse.ReadApiResponseAsync<ArticleResponse>();
        Assert.NotNull(getBody?.Data);
        Assert.Equal("组件库 v1.6 发布说明（已保存）", getBody.Data.Title);
        Assert.Equal("markdown", getBody.Data.EditorType);
        Assert.Equal("# 已保存草稿", getBody.Data.Body);
        Assert.False(getBody.Data.Published);
        var attachment = Assert.Single(getBody.Data.Attachments);
        Assert.Equal(media.Id, attachment.Id);
        Assert.Equal(1, attachment.ReferenceCount);
        var blocked = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/media/{media.Id}", token));
        Assert.Equal(HttpStatusCode.Conflict, blocked.StatusCode);
        var references = (await blocked.ReadApiResponseAsync<MediaReferenceResponse[]>())!.Data!;
        Assert.Contains(references, reference => reference.ReferenceType == "content.attachment");
        var deleted = await _client.SendAsync(AuthRequest(HttpMethod.Delete, $"/api/media/{media.Id}?force=true", token));
        deleted.EnsureSuccessStatusCode();
        var refreshed = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/content/articles/a1", token));
        Assert.Empty((await refreshed.ReadApiResponseAsync<ArticleResponse>())!.Data!.Attachments);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/media/{media.Id}", token))).StatusCode);
    }

    [Fact]
    public async Task ToggleJob_PutThenGet_PersistsEnabledStatus()
    {
        var token = await LoginAsAdminAsync();
        var disable = AuthRequest(HttpMethod.Put, "/api/jobs/JOB-1001", token);
        disable.Content = JsonContent.Create(new { enabled = false });

        var disableResponse = await _client.SendAsync(disable);
        disableResponse.EnsureSuccessStatusCode();
        var disabled = await disableResponse.ReadApiResponseAsync<JobResponse>();
        Assert.NotNull(disabled?.Data);
        Assert.False(disabled.Data.Enabled);
        Assert.Equal("paused", disabled.Data.Status);
        Assert.Equal("—", disabled.Data.NextRun);

        var disabledGet = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/jobs", token));
        disabledGet.EnsureSuccessStatusCode();
        var listed = await disabledGet.ReadApiResponseAsync<JobResponse[]>();
        Assert.NotNull(listed?.Data);
        var paused = listed.Data.First(item => item.Id == "JOB-1001");
        Assert.False(paused.Enabled);
        Assert.Equal("paused", paused.Status);
        Assert.Equal("—", paused.NextRun);

        var enable = AuthRequest(HttpMethod.Put, "/api/jobs/JOB-1001", token);
        enable.Content = JsonContent.Create(new { enabled = true });
        var enableResponse = await _client.SendAsync(enable);
        enableResponse.EnsureSuccessStatusCode();
        var enabled = await enableResponse.ReadApiResponseAsync<JobResponse>();
        Assert.NotNull(enabled?.Data);
        Assert.True(enabled.Data.Enabled);
        Assert.Equal("running", enabled.Data.Status);
        Assert.Equal("待调度", enabled.Data.NextRun);
    }

    [Fact]
    public async Task CreateImportJob_ThenGet_CreatesUsersAndReportsActualRows()
    {
        var token = await LoginAsAdminAsync();
        var suffix = Guid.NewGuid().ToString("N")[..12];
        var username = $"csv.é猫_{suffix}";
        const string password = "ImportSecret42!";
        var csv = $"\uFEFFusername,password,displayName,roleIds\r\n" +
            $"  {username.ToUpperInvariant()}  ,{password},\"Alice, \"\"A\"\"\r\nTeam\",1\r\n" +
            $"{username},{password},Duplicate,\r\nadmin,{password},Existing,\r\n" +
            $"short_{suffix},x,Invalid,\r\nrole_{suffix},{password},Invalid,999999\r\n" +
            $"columns_{suffix},{password}\r\nsecond_{suffix},{password},Second,\r\n";
        var input = new { source = "users.csv", csv };
        var previewRequest = AuthRequest(HttpMethod.Post, "/api/import-jobs/preview", token);
        previewRequest.Content = JsonContent.Create(input);
        var previewResponse = await _client.SendAsync(previewRequest);
        previewResponse.EnsureSuccessStatusCode();
        var preview = (await previewResponse.ReadApiResponseAsync<ImportPreviewResponse>())!.Data!;
        Assert.Equal(7, preview.Total);
        Assert.Equal(2, preview.Valid);
        Assert.Equal(2, preview.Skipped);
        Assert.Equal(3, preview.Failed);
        Assert.Equal(new[] { 2, 4, 5, 6, 7, 8, 9 }, preview.Rows.Select(row => row.RowNumber));
        Assert.Equal("Alice, \"A\"\r\nTeam", preview.Rows[0].DisplayName);
        Assert.DoesNotContain(password, await previewResponse.Content.ReadAsStringAsync());
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            Assert.False(await db.Users.AnyAsync(user => user.Username == username));
        }
        var create = AuthRequest(HttpMethod.Post, "/api/import-jobs", token);
        create.Content = JsonContent.Create(input);
        var createResponse = await _client.SendAsync(create);
        createResponse.EnsureSuccessStatusCode();
        var latest = (await createResponse.ReadApiResponseAsync<ImportJobResponse>())!.Data!;
        var id = latest.Id;
        Assert.StartsWith("IMP-", id);
        for (var i = 0; i < 100 && latest.Status != "completed"; i++)
        {
            await Task.Delay(50);
            var get = await _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/import-jobs/{id}", token));
            get.EnsureSuccessStatusCode();
            var text = await get.Content.ReadAsStringAsync();
            Assert.DoesNotContain(password, text);
            Assert.DoesNotContain("passwordHash", text, StringComparison.OrdinalIgnoreCase);
            var next = (await get.ReadApiResponseAsync<ImportJobResponse>())!.Data!;
            Assert.True(next.Processed >= latest.Processed);
            Assert.Equal(next.Processed * 100 / next.Total, next.Progress);
            Assert.Equal(next.Processed, next.Rows.Count(row => row.Status != "pending"));
            latest = next;
        }
        Assert.Equal("completed", latest.Status);
        Assert.Equal(7, latest.Processed);
        Assert.Equal(100, latest.Progress);
        Assert.Equal(2, latest.Result!.Imported);
        Assert.Equal(2, latest.Result.Skipped);
        Assert.Equal(3, latest.Result.Failed);
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var user = await db.Users.Include(user => user.UserRoles).SingleAsync(user => user.Username == username);
            Assert.Equal(0, (int)user.Status);
            Assert.Equal("Alice, \"A\"\r\nTeam", user.DisplayName);
            Assert.Equal(1, Assert.Single(user.UserRoles).RoleId);
            Assert.True(PasswordHasher.Matches(user.PasswordHash, password));
            Assert.False(PasswordHasher.Matches(user.PasswordHash, user.PasswordHash));
            var job = await db.ImportJobs.SingleAsync(job => job.PublicId == id);
            Assert.DoesNotContain(password, job.RowsJson);
            Assert.DoesNotContain(user.PasswordHash, job.RowsJson);
        }
        // Completed GETs do not create another user or change row results.
        var gets = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ =>
            _client.SendAsync(AuthRequest(HttpMethod.Get, $"/api/import-jobs/{id}", token))));
        foreach (var get in gets)
        {
            var result = (await get.ReadApiResponseAsync<ImportJobResponse>())!.Data!;
            Assert.Equal(latest.Rows, result.Rows);
            Assert.Equal(7, result.Processed);
        }
    }

    [Fact]
    public async Task CreateImportJob_RejectsMalformedCsvAndMissingPermission()
    {
        var token = await LoginAsAdminAsync();
        foreach (var csv in new[] { "", "username,password", "username,password\n\"unclosed,secret", "username,username\na,b" })
        {
            var request = AuthRequest(HttpMethod.Post, "/api/import-jobs", token);
            request.Content = JsonContent.Create(new { source = "invalid.csv", csv });
            Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(request)).StatusCode);
        }
        var missing = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/import-jobs/IMP-missing", token));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        var unauthenticated = await _client.PostAsJsonAsync("/api/import-jobs/preview", new { source = "users.csv", csv = "username,password\nunauthorized,secret42" });
        Assert.Equal(HttpStatusCode.Unauthorized, unauthenticated.StatusCode);
    }

    private async Task<string> LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin", "admin123"));
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data?.Token);
        return body.Data.Token;
    }

    private static HttpRequestMessage AuthRequest(HttpMethod method, string url, string token)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("X-Token", token);
        return request;
    }
}

public class ContentJobsImportEndpointsTestsInMemory : ContentJobsImportEndpointsTests<InMemoryRedisStubApiFactory>
{
    public ContentJobsImportEndpointsTestsInMemory(InMemoryRedisStubApiFactory factory) : base(factory)
    {
    }
}

public class ContentJobsImportEndpointsTestsSqlite : ContentJobsImportEndpointsTests<SqliteRedisStubApiFactory>
{
    public ContentJobsImportEndpointsTestsSqlite(SqliteRedisStubApiFactory factory) : base(factory)
    {
    }
}
