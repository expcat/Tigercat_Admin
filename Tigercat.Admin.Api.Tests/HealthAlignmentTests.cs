using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Tigercat.Admin.Api.Health;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public class DevelopmentHealthAlignmentTests : IClassFixture<InMemoryApiFactory>
{
    private readonly InMemoryApiFactory _factory;
    private readonly HttpClient _client;

    public DevelopmentHealthAlignmentTests(InMemoryApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ApiHealth_DelegatesToRegisteredReadyChecks()
    {
        var healthChecks = _factory.Services.GetRequiredService<HealthCheckService>();
        var report = await healthChecks.CheckHealthAsync(
            registration => registration.Tags.Contains("ready"));

        Assert.Equal(HealthStatus.Healthy, report.Status);
        Assert.Contains("database", report.Entries.Keys);
        Assert.Contains("redis", report.Entries.Keys);
        Assert.Contains("mediaStorage", report.Entries.Keys);

        var response = await _client.GetAsync("/api/health");
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<HealthResponse>();
        Assert.NotNull(body?.Data?.Details);
        Assert.Equal("healthy", body.Data.Status);
        Assert.All(
            new[] { "database", "redis", "eventChannel", "mediaStorage", "configuration", "security" },
            name => Assert.Equal("healthy", body.Data.Details[name].Status));
    }

    [Fact]
    public async Task AspireHealthEndpoint_IsMappedInDevelopment()
    {
        var response = await _client.GetAsync("/health");
        response.EnsureSuccessStatusCode();
    }
}

public class ProductionHealthAlignmentTests : IClassFixture<ProductionSecurityApiFactory>
{
    private readonly HttpClient _client;

    public ProductionHealthAlignmentTests(ProductionSecurityApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task AspireHealthEndpoint_IsNotMappedInProduction()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        var alive = await _client.GetAsync("/alive");
        Assert.Equal(HttpStatusCode.NotFound, alive.StatusCode);
    }
}
