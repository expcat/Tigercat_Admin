var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.Tigercat_Admin_Api>("tigercat-admin-api")
    .WithExternalHttpEndpoints();

api.WithUrlForEndpoint("http", url =>
{
    url.Url += "/scalar";
    url.DisplayText = url.Url;
});

api.WithUrlForEndpoint("https", url =>
{
    url.Url += "/scalar";
    url.DisplayText = url.Url;
});

var vue = builder.AddNpmApp("tigercat-admin-vue", "../Tigercat.Admin.Vue")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
    .PublishAsDockerFile();

var react = builder.AddNpmApp("tigercat-admin-react", "../Tigercat.Admin.React")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
    .PublishAsDockerFile();

builder.Build().Run();
