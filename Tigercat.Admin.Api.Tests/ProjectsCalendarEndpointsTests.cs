using System.Net;
using System.Net.Http.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class ProjectsCalendarEndpointsTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;

    protected ProjectsCalendarEndpointsTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ListProjects_Returns200WithSeededItems()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/projects?page=1&pageSize=6", token));

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<PagedResponse<ProjectResponse>>();
        Assert.NotNull(body);
        Assert.True(body.Success);
        Assert.Equal(200, body.Code);
        Assert.NotNull(body.Data);
        Assert.True(body.Data.Total >= 8);
        Assert.Equal(1, body.Data.Page);
        Assert.Equal(6, body.Data.PageSize);
        Assert.Contains(body.Data.Items, item => item.Id == "1001");
        var seeded = body.Data.Items.First(item => item.Id == "1001");
        Assert.Equal("智能运营台", seeded.Name);
        Assert.Equal("active", seeded.Status);
        Assert.NotEmpty(seeded.Members);
    }

    [Fact]
    public async Task GetProject_Returns200()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/projects/1001", token));

        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<ProjectResponse>();
        Assert.NotNull(body?.Data);
        Assert.True(body.Success);
        Assert.Equal(200, body.Code);
        Assert.Equal("1001", body.Data.Id);
        Assert.Equal("智能运营台", body.Data.Name);
        Assert.Equal("王小虎", body.Data.Owner);
        Assert.NotEmpty(body.Data.Members);
        Assert.NotEmpty(body.Data.Activities);
    }

    [Fact]
    public async Task MissingProject_Returns404()
    {
        var token = await LoginAsAdminAsync();
        var response = await _client.SendAsync(AuthRequest(HttpMethod.Get, "/api/projects/missing", token));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = await response.ReadApiResponseAsync<ProjectResponse>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(404, body.Code);
    }

    [Fact]
    public async Task CreateCalendarEvent_Returns200()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Post, "/api/calendar/events", token);
        request.Content = JsonContent.Create(new
        {
            date = "2026-08-27",
            start = "10:00",
            end = "11:00",
            title = "R6 日历创建验收",
            type = "meeting",
            location = "会议室 C"
        });

        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.ReadApiResponseAsync<CalendarEventResponse>();
        Assert.NotNull(body?.Data);
        Assert.True(body.Success);
        Assert.Equal(200, body.Code);
        Assert.False(string.IsNullOrWhiteSpace(body.Data.Id));
        Assert.Equal("2026-08-27", body.Data.Date);
        Assert.Equal("10:00", body.Data.Start);
        Assert.Equal("11:00", body.Data.End);
        Assert.Equal("R6 日历创建验收", body.Data.Title);
        Assert.Equal("meeting", body.Data.Type);
        Assert.Equal("会议室 C", body.Data.Location);
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

public class ProjectsCalendarEndpointsTestsInMemory : ProjectsCalendarEndpointsTests<InMemoryRedisStubApiFactory>
{
    public ProjectsCalendarEndpointsTestsInMemory(InMemoryRedisStubApiFactory factory) : base(factory)
    {
    }
}

public class ProjectsCalendarEndpointsTestsSqlite : ProjectsCalendarEndpointsTests<SqliteRedisStubApiFactory>
{
    public ProjectsCalendarEndpointsTestsSqlite(SqliteRedisStubApiFactory factory) : base(factory)
    {
    }
}
