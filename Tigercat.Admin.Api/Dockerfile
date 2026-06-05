# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Tigercat.Admin.sln ./
COPY Tigercat.Admin.Api/Tigercat.Admin.Api.csproj Tigercat.Admin.Api/
COPY Tigercat.ServiceDefaults/Tigercat.ServiceDefaults.csproj Tigercat.ServiceDefaults/
RUN dotnet restore Tigercat.Admin.Api/Tigercat.Admin.Api.csproj

COPY Tigercat.Admin.Api/ Tigercat.Admin.Api/
COPY Tigercat.ServiceDefaults/ Tigercat.ServiceDefaults/
RUN dotnet publish Tigercat.Admin.Api/Tigercat.Admin.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish ./

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl --fail http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["dotnet", "Tigercat.Admin.Api.dll"]
