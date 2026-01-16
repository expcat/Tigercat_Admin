var builder = DistributedApplication.CreateBuilder(args);

// Add the backend API
var api = builder.AddProject<Projects.Tigercat_Admin_Api>("tigercat-admin-api")
    .WithExternalHttpEndpoints();

// Add Vue3 frontend
var vue = builder.AddNpmApp("tigercat-admin-vue", "../Tigercat.Admin.Vue")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

// Add React frontend
var react = builder.AddNpmApp("tigercat-admin-react", "../Tigercat.Admin.React")
    .WithHttpEndpoint(env: "PORT")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

builder.Build().Run();
