using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class ExportEndpointsTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;

    protected ExportEndpointsTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ExportReports_Json_ReturnsFile()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Get, "/api/export/reports?type=daily&format=json", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var rows = document.RootElement.EnumerateArray().ToArray();
        Assert.True(rows.Length >= 1);
        Assert.Contains(rows, row => row.TryGetProperty("visits", out var visits) && visits.GetString() == "18420");
    }

    [Fact]
    public async Task ExportReports_InvalidFormat_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Get, "/api/export/reports?type=daily&format=xml", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.ReadApiResponseAsync<object>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(400, body.Code);
        Assert.Contains("csv", body.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExportOverview_Json_ReturnsFile()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Get, "/api/export/overview?format=json&days=7", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var rows = document.RootElement.EnumerateArray().ToArray();
        Assert.Contains(rows, row =>
            row.TryGetProperty("section", out var section) &&
            section.GetString() == "overview" &&
            row.TryGetProperty("key", out var key) &&
            key.GetString() == "totalUsers");
        Assert.Contains(rows, row =>
            row.TryGetProperty("section", out var section) &&
            section.GetString() == "trend");
    }

    [Fact]
    public async Task ExportOverview_InvalidFormat_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Get, "/api/export/overview?format=xml", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.ReadApiResponseAsync<object>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(400, body.Code);
    }

    [Fact]
    public async Task ExportAuditLogs_Json_ReturnsFile()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Get, "/api/audit-logs/export?format=json", token);
        var response = await _client.SendAsync(request);

        response.EnsureSuccessStatusCode();
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Array, document.RootElement.ValueKind);
    }

    [Fact]
    public async Task ExportAuditLogs_InvalidFormat_Returns400()
    {
        var token = await LoginAsAdminAsync();
        var request = AuthRequest(HttpMethod.Get, "/api/audit-logs/export?format=xml", token);
        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.ReadApiResponseAsync<object>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(400, body.Code);
    }

    private async Task<string> LoginAsAdminAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest("admin", "admin123"));

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

public class ExportEndpointsTestsInMemory : ExportEndpointsTests<InMemoryRedisStubApiFactory>
{
    public ExportEndpointsTestsInMemory(InMemoryRedisStubApiFactory factory) : base(factory)
    {
    }
}

public class ExportEndpointsTestsSqlite : ExportEndpointsTests<SqliteRedisStubApiFactory>
{
    public ExportEndpointsTestsSqlite(SqliteRedisStubApiFactory factory) : base(factory)
    {
    }
}
