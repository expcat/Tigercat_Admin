using System.Net;
using System.Net.Http.Json;
using Tigercat.Admin.Api.Auth;
using Tigercat.Admin.Api.Common;
using Tigercat.Admin.Api.Tests.Fixtures;
using Xunit;

namespace Tigercat.Admin.Api.Tests;

public abstract class AuthTwoFactorTests<TFixture> : IClassFixture<TFixture>
    where TFixture : AdminApiFactory
{
    private readonly HttpClient _client;

    protected AuthTwoFactorTests(TFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Login_DemoAccount_RequiresTwoFactor()
    {
        var response = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("demo", "demo"));
        response.EnsureSuccessStatusCode();

        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data);
        Assert.True(body.Data.RequiresTwoFactor);
        Assert.Equal("demo", body.Data.Username);
        Assert.True(string.IsNullOrWhiteSpace(body.Data.Token));
        Assert.False(string.IsNullOrWhiteSpace(body.Data.ChallengeId));
    }

    [Fact]
    public async Task TwoFactorVerify_WithDemoCode_IssuesSession()
    {
        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("demo", "demo"));
        var challenge = await login.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(challenge?.Data?.ChallengeId);

        var response = await _client.PostAsJsonAsync(
            "/api/auth/two-factor/verify",
            new TwoFactorVerifyRequest("demo", AuthDemoCodes.OtpCode, challenge.Data.ChallengeId));
        response.EnsureSuccessStatusCode();

        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body?.Data);
        Assert.False(body.Data.RequiresTwoFactor);
        Assert.False(string.IsNullOrWhiteSpace(body.Data.Token));
        Assert.Equal("demo", body.Data.Username);
    }

    [Fact]
    public async Task TwoFactorVerify_WithWrongCode_Returns401()
    {
        await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest("demo", "demo"));

        var response = await _client.PostAsJsonAsync(
            "/api/auth/two-factor/verify",
            new TwoFactorVerifyRequest("demo", "000000"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        var body = await response.ReadApiResponseAsync<LoginResponse>();
        Assert.NotNull(body);
        Assert.False(body.Success);
        Assert.Equal(401, body.Code);
    }

    [Fact]
    public async Task TwoFactor_EnableDisable_ControlsNextLogin()
    {
        var username = $"otp-{Guid.NewGuid():N}"[..20];
        var password = "otp-pass-123";
        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(username, password));
        register.EnsureSuccessStatusCode();

        var login = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        login.EnsureSuccessStatusCode();
        var session = await login.ReadApiResponseAsync<LoginResponse>();
        Assert.False(session?.Data?.RequiresTwoFactor);
        Assert.False(string.IsNullOrWhiteSpace(session?.Data?.Token));

        var enableRequest = new HttpRequestMessage(HttpMethod.Put, "/api/auth/two-factor")
        {
            Content = JsonContent.Create(new UpdateTwoFactorRequest(true)),
        };
        enableRequest.Headers.Add("X-Token", session!.Data!.Token);
        var enableResponse = await _client.SendAsync(enableRequest);
        enableResponse.EnsureSuccessStatusCode();

        var challenged = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        challenged.EnsureSuccessStatusCode();
        var challenge = await challenged.ReadApiResponseAsync<LoginResponse>();
        Assert.True(challenge?.Data?.RequiresTwoFactor);

        var verify = await _client.PostAsJsonAsync(
            "/api/auth/two-factor/verify",
            new TwoFactorVerifyRequest(username, AuthDemoCodes.OtpCode, challenge!.Data!.ChallengeId));
        verify.EnsureSuccessStatusCode();
        var verified = await verify.ReadApiResponseAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(verified?.Data?.Token));

        var disableRequest = new HttpRequestMessage(HttpMethod.Put, "/api/auth/two-factor")
        {
            Content = JsonContent.Create(new UpdateTwoFactorRequest(false)),
        };
        disableRequest.Headers.Add("X-Token", verified!.Data!.Token);
        var disableResponse = await _client.SendAsync(disableRequest);
        disableResponse.EnsureSuccessStatusCode();

        var direct = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, password));
        direct.EnsureSuccessStatusCode();
        var directBody = await direct.ReadApiResponseAsync<LoginResponse>();
        Assert.False(directBody?.Data?.RequiresTwoFactor);
        Assert.False(string.IsNullOrWhiteSpace(directBody?.Data?.Token));
    }

    [Fact]
    public async Task ForgotPassword_UnknownTarget_StillSucceeds()
    {
        var target = $"missing-{Guid.NewGuid():N}@tigercat.local";
        var codeResponse = await _client.PostAsJsonAsync(
            "/api/auth/forgot-password/code",
            new ForgotPasswordCodeRequest("email", target));
        codeResponse.EnsureSuccessStatusCode();
        var sent = await codeResponse.ReadApiResponseAsync<ForgotPasswordCodeResponse>();
        Assert.Equal(target, sent?.Data?.SentTo);

        var reset = await _client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordResetRequest("email", target, AuthDemoCodes.OtpCode, "new-pass-123"));
        reset.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task ForgotPassword_ExistingUser_UpdatesPassword()
    {
        var username = $"fp-{Guid.NewGuid():N}"[..20];
        var oldPassword = "old-pass-123";
        var newPassword = "new-pass-456";
        var register = await _client.PostAsJsonAsync("/api/auth/register", new RegisterRequest(username, oldPassword));
        register.EnsureSuccessStatusCode();

        var target = $"{username}@tigercat.local";
        var codeResponse = await _client.PostAsJsonAsync(
            "/api/auth/forgot-password/code",
            new ForgotPasswordCodeRequest("email", target));
        codeResponse.EnsureSuccessStatusCode();

        var reset = await _client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordResetRequest("email", target, AuthDemoCodes.OtpCode, newPassword));
        reset.EnsureSuccessStatusCode();

        var oldLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, oldPassword));
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(username, newPassword));
        newLogin.EnsureSuccessStatusCode();
        var body = await newLogin.ReadApiResponseAsync<LoginResponse>();
        Assert.False(string.IsNullOrWhiteSpace(body?.Data?.Token));
    }

    [Fact]
    public async Task ForgotPassword_WrongCode_Returns400()
    {
        var target = "demo@tigercat.local";
        await _client.PostAsJsonAsync(
            "/api/auth/forgot-password/code",
            new ForgotPasswordCodeRequest("email", target));

        var reset = await _client.PostAsJsonAsync(
            "/api/auth/forgot-password",
            new ForgotPasswordResetRequest("email", target, "000000", "new-pass-123"));
        Assert.Equal(HttpStatusCode.BadRequest, reset.StatusCode);
    }
}

public class AuthTwoFactorTestsInMemory : AuthTwoFactorTests<InMemoryApiFactory>
{
    public AuthTwoFactorTestsInMemory(InMemoryApiFactory factory) : base(factory)
    {
    }
}

public class AuthTwoFactorTestsSqlite : AuthTwoFactorTests<SqliteApiFactory>
{
    public AuthTwoFactorTestsSqlite(SqliteApiFactory factory) : base(factory)
    {
    }
}
