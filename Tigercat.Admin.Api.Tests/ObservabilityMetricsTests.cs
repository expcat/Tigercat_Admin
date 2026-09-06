using System.Diagnostics.Metrics;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Cache;
using Tigercat.Admin.Api.Endpoints;
using Tigercat.Admin.Api.Observability;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public class ObservabilityMetricsTests : IClassFixture<InMemoryApiFactory>
{
    private readonly InMemoryApiFactory _factory;
    private readonly HttpClient _client;

    public ObservabilityMetricsTests(InMemoryApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task CacheGetOrSet_RecordsMissThenHit()
    {
        using var listener = new MeterCounterListener(AdminMetrics.MeterName, AdminMetrics.CacheEventsName);
        var cache = _factory.Services.GetRequiredService<ICacheService>();
        var key = $"cache:metrics:{Guid.NewGuid():N}";

        await cache.GetOrSetAsync(key, _ => Task.FromResult("value"), TimeSpan.FromMinutes(1));
        await cache.GetOrSetAsync(key, _ => Task.FromResult("ignored"), TimeSpan.FromMinutes(1));

        Assert.True(listener.Count("result", "miss") >= 1);
        Assert.True(listener.Count("result", "hit") >= 1);
    }

    [Fact]
    public async Task CacheGetAsync_RecordsMissThenHit()
    {
        using var listener = new MeterCounterListener(AdminMetrics.MeterName, AdminMetrics.CacheEventsName);
        var cache = _factory.Services.GetRequiredService<ICacheService>();
        var key = $"cache:metrics:get:{Guid.NewGuid():N}";

        Assert.Null(await cache.GetAsync<string>(key));
        await cache.SetAsync(key, "hello", TimeSpan.FromMinutes(1));
        Assert.Equal("hello", await cache.GetAsync<string>(key));

        Assert.True(listener.Count("result", "miss") >= 1);
        Assert.True(listener.Count("result", "hit") >= 1);
    }

    [Fact]
    public async Task CreateJob_RecordsJobCreated()
    {
        using var listener = new MeterCounterListener(AdminMetrics.MeterName, AdminMetrics.JobsName);
        var token = await LoginAsAdminAsync();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/jobs");
        request.Headers.Add("X-Token", token);
        request.Content = JsonContent.Create(new
        {
            name = $"metrics-job-{Guid.NewGuid():N}"[..20],
            cron = "0 0 * * *",
            enabled = false
        });

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();

        Assert.True(listener.Count("operation", "created") >= 1);
    }

    [Fact]
    public async Task CreateImportJob_RecordsImportCreated()
    {
        using var listener = new MeterCounterListener(AdminMetrics.MeterName, AdminMetrics.ImportJobsName);
        var token = await LoginAsAdminAsync();
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/import-jobs");
        request.Headers.Add("X-Token", token);
        request.Content = JsonContent.Create(new
        {
            source = "metrics-import",
            target = new[] { "hr", "employees" },
            mappings = new[] { "name", "email" },
            mode = "append",
            conflict = "skip",
            batchSize = 1000
        });

        var response = await _client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var body = await response.ReadApiResponseAsync<ImportJobResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body?.Data?.Id));

        Assert.True(listener.Count("operation", "created") >= 1);
    }

    private async Task<string> LoginAsAdminAsync()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("admin", "admin123"));
        login.EnsureSuccessStatusCode();
        var session = await login.ReadApiResponseAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(session?.Data?.Token));
        return session!.Data!.Token;
    }

    private sealed class MeterCounterListener : IDisposable
    {
        private readonly MeterListener _listener = new();
        private readonly Dictionary<string, long> _counts = new(StringComparer.Ordinal);
        private readonly object _gate = new();

        public MeterCounterListener(string meterName, string instrumentName)
        {
            _listener.InstrumentPublished = (instrument, listener) =>
            {
                if (instrument.Meter.Name == meterName && instrument.Name == instrumentName)
                {
                    listener.EnableMeasurementEvents(instrument);
                }
            };
            _listener.SetMeasurementEventCallback<long>((_, measurement, tags, _) =>
            {
                string? key = null;
                string? value = null;
                foreach (var tag in tags)
                {
                    key = tag.Key;
                    value = tag.Value?.ToString();
                    break;
                }

                if (key is null || value is null)
                {
                    return;
                }

                lock (_gate)
                {
                    var mapKey = $"{key}:{value}";
                    _counts[mapKey] = _counts.GetValueOrDefault(mapKey) + measurement;
                }
            });
            _listener.Start();
        }

        public long Count(string tagKey, string tagValue)
        {
            lock (_gate)
            {
                return _counts.GetValueOrDefault($"{tagKey}:{tagValue}");
            }
        }

        public void Dispose() => _listener.Dispose();
    }
}
