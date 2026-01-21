namespace Tigercat.Admin.Api.Endpoints;

public interface IEndpointDefinition
{
    void DefineEndpoints(IEndpointRouteBuilder app);
}
