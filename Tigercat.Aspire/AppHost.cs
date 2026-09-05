var builder = DistributedApplication.CreateBuilder(args);

var redis = builder.AddRedis("redis");

var api = builder.AddProject<Projects.Tigercat_Admin_Api>("tigercat-admin-api")
    .WithExternalHttpEndpoints()
    .WithReference(redis)
    .WaitFor(redis);

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

var vue = builder.AddViteApp("tigercat-admin-vue", "../Tigercat.Admin.Vue")
    .WithPnpm()
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
    .WithReference(api)
    .WaitFor(api)
    .PublishAsDockerFile();

var react = builder.AddViteApp("tigercat-admin-react", "../Tigercat.Admin.React")
    .WithPnpm()
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
    .WithReference(api)
    .WaitFor(api)
    .PublishAsDockerFile();

builder.Build().Run();
