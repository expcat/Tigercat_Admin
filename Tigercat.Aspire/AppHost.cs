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

var vue = builder.AddPnpmApp("tigercat-admin-vue", "../Tigercat.Admin.Vue")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
    .WithReference(api)
    .WaitFor(api)
    .PublishAsDockerFile();

var react = builder.AddPnpmApp("tigercat-admin-react", "../Tigercat.Admin.React")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .WithEnvironment("VITE_API_URL", api.GetEndpoint("http"))
    .WithReference(api)
    .WaitFor(api)
    .PublishAsDockerFile();

builder.Build().Run();
