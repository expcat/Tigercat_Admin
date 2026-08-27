using System.Net;
using System.Net.Http.Json;
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

    protected ContentJobsImportEndpointsTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SaveArticle_PutThenGet_PersistsDraft()
    {
        var token = await LoginAsAdminAsync();
        var put = AuthRequest(HttpMethod.Put, "/api/content/articles/a1", token);
        put.Content = JsonContent.Create(new
        {
            title = "组件库 v1.6 发布说明（已保存）",
            editorType = "markdown",
            body = "# 已保存草稿",
            tags = new[] { "发布", "草稿" },
            category = "backend",
            column = new[] { "docs", "api" },
            published = false
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
    public async Task CreateImportJob_ThenGet_AdvancesToCompleted()
    {
        var token = await LoginAsAdminAsync();
        var create = AuthRequest(HttpMethod.Post, "/api/import-jobs", token);
        create.Content = JsonContent.Create(new
        {
            source = "employees.csv",
            target = new[] { "hr", "employees" },
            mappings = new[] { "name", "email", "dept" },
            mode = "append",
            conflict = "skip",
            batchSize = 1000
        });

        var createResponse = await _client.SendAsync(create);
        createResponse.EnsureSuccessStatusCode();
        var created = await createResponse.ReadApiResponseAsync<ImportJobResponse>();
        Assert.NotNull(created?.Data);
        Assert.StartsWith("IMP-", created.Data.Id);
        Assert.Equal("employees.csv", created.Data.Source);
        Assert.Equal("append", created.Data.Mode);
        Assert.Equal("skip", created.Data.Conflict);
        Assert.True(created.Data.Progress < 100);

        ImportJobResponse? latest = created.Data;
        var lastProgress = -1;
        for (var i = 0; i < 8; i++)
        {
            var getResponse = await _client.SendAsync(
                AuthRequest(HttpMethod.Get, $"/api/import-jobs/{created.Data.Id}", token));
            getResponse.EnsureSuccessStatusCode();
            var body = await getResponse.ReadApiResponseAsync<ImportJobResponse>();
            Assert.NotNull(body?.Data);
            latest = body.Data;
            Assert.True(latest.Progress >= lastProgress);
            lastProgress = latest.Progress;
            if (latest.Status == "completed" && latest.Progress == 100)
            {
                break;
            }
        }

        Assert.NotNull(latest);
        Assert.Equal(100, latest.Progress);
        Assert.Equal("completed", latest.Status);
        Assert.NotNull(latest.Result);
        Assert.Equal(3, latest.Result.Imported);
        Assert.Equal(1, latest.Result.Skipped);
        Assert.Contains("追加", latest.Result.Message);
        Assert.Contains("3 个字段", latest.Result.Message);
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
