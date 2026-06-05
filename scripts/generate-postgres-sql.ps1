$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$outputDir = Join-Path $repoRoot 'artifacts/sql'
$outputFile = Join-Path $outputDir 'tigercat-admin-postgres.sql'

New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

dotnet tool restore --tool-manifest (Join-Path $repoRoot '.config/dotnet-tools.json')

$env:Database__Provider = 'PostgreSql'
$env:ConnectionStrings__DefaultConnection = 'Host=localhost;Port=5432;Database=tigercat_admin;Username=tigercat_admin;Password=tigercat_admin;Pooling=true;SSL Mode=Require;Trust Server Certificate=false'
$env:Infrastructure__UseInMemory = 'true'

dotnet ef migrations script `
  --idempotent `
  --project (Join-Path $repoRoot 'Tigercat.Admin.Api/Tigercat.Admin.Api.csproj') `
  --startup-project (Join-Path $repoRoot 'Tigercat.Admin.Api/Tigercat.Admin.Api.csproj') `
  --context Tigercat.Admin.Api.Data.AdminDbContext `
  --output $outputFile

Write-Host "Generated PostgreSQL migration SQL: $outputFile"
