namespace Tigercat.Admin.Api.Endpoints;

public static class EndpointExtensions
{
    public static IEndpointRouteBuilder MapEndpoint<TEndpoint>(this IEndpointRouteBuilder app)
        where TEndpoint : IEndpointDefinition, new()
    {
        var endpoint = new TEndpoint();
        endpoint.DefineEndpoints(app);
        return app;
    }
}
