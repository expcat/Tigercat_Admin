using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace Tigercat.Admin.Api.Auth;

/// <summary>
/// Documents the session-token schemes already enforced by <see cref="LoginFilter"/>.
/// Schemes are advertised only; public endpoints (health, login) stay unauthenticated.
/// </summary>
internal sealed class OpenApiAuthDocumentTransformer : IOpenApiDocumentTransformer
{
    public Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "Session token",
            Description = "Session token from POST /api/auth/login. Equivalent to the X-Token header."
        };

        document.Components.SecuritySchemes["XToken"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.ApiKey,
            In = ParameterLocation.Header,
            Name = "X-Token",
            Description = "Session token from POST /api/auth/login. Equivalent to Authorization: Bearer."
        };

        return Task.CompletedTask;
    }
}
