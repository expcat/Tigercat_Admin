# 开发、部署与运维指南

本文合并本地开发、数据库、部署、健康检查、CI 和发布 smoke，属「维护本仓库」文档线。前端界面规范见 [frontend.md](frontend.md)，API 契约见 [api.md](api.md)。新项目复用本仓库后端时只需读「数据库」和「生产配置」两节（由 [guide/backend.md](guide/backend.md) 引用）。Native AOT 只做评估、默认不启用，见 [Native AOT 评估](#native-aot)。

## 环境与安装

| 工具 | 版本 |
| ---- | ---- |
| .NET SDK | 10+ |
| Node.js | 20.11+ |
| PNPM | 10+ |

```bash
pnpm install
dotnet build Tigercat.Admin.sln
```

前端依赖以仓库根目录的 `pnpm-lock.yaml` 为准，不要在子项目目录单独安装依赖并提交漂移后的 lockfile。

## 本地开发

推荐通过 Aspire 启动完整系统：

```bash
cd Tigercat.Aspire
dotnet run
```

Aspire 会编排 API、React、Vue 和 Redis，并提供 Dashboard。前端资源用 `Aspire.Hosting.JavaScript` 的 `AddViteApp` + `WithPnpm`（与 AppHost SDK 同主版本）；不要再引用已更名的 `Aspire.Hosting.NodeJs` 9.x。

单独运行：

```bash
cd Tigercat.Admin.Api && dotnet run
cd Tigercat.Admin.React && pnpm dev
cd Tigercat.Admin.Vue && pnpm dev
```

端口：

| 服务 | 端口 |
| ---- | ---- |
| API | 5137 |
| React | 5174 |
| Vue | 5173 |
| Aspire Dashboard | 动态 |

前端通过 `/api` 访问后端。Aspire 会注入 `VITE_API_URL`。单独 `pnpm dev` 时 Vite 把 `/api` 与 `/hubs`（WebSocket）代理到 `http://127.0.0.1:5137`，可用 `VITE_API_URL` 覆盖。

## 常用命令

```bash
pnpm dev:react
pnpm dev:vue
pnpm dev:demo:all
pnpm typecheck
pnpm build:frontend
pnpm build:demo
pnpm build:pages
pnpm e2e:react
pnpm e2e:vue
pnpm e2e:demo
pnpm e2e:mobile
pnpm e2e:dark
pnpm e2e:demo:mobile
pnpm e2e:demo:dark
pnpm db:script:postgres
pnpm run check:links

dotnet build Tigercat.Admin.sln
dotnet test Tigercat.Admin.sln
dotnet list Tigercat.Admin.Api/Tigercat.Admin.Api.csproj package --vulnerable --include-transitive
dotnet list Tigercat.Admin.Api.Tests/Tigercat.Admin.Api.Tests.csproj package --vulnerable --include-transitive
dotnet list Tigercat.Aspire/Tigercat.Aspire.csproj package --vulnerable --include-transitive
dotnet list Tigercat.ServiceDefaults/Tigercat.ServiceDefaults.csproj package --vulnerable --include-transitive
```

Playwright 默认 Desktop 项目会 `grepInvert` `@mobile` / `@dark`，避免把同一批用例再跑一遍。375 视口与 `colorScheme: dark` 是独立 project，只跑带对应 tag 的用例（`e2e/viewport-a11y.spec.ts`）。焦点恢复与 Vue overlay 回归在 `e2e/overlay-focus.spec.ts`，走 Desktop。只跑标注用例用 `pnpm e2e:mobile` / `pnpm e2e:dark`（demo 配置对应 `e2e:demo:mobile` / `e2e:demo:dark`）。

## NuGet 依赖审计

`dotnet restore` / `dotnet build` 默认开启 NuGet 漏洞审计（NU1901–NU1904）。**不要**用 `NuGetAudit=false`、降低 `NuGetAuditLevel` 或 `NuGetAuditSuppress` 消警告。

当前直接依赖仍会拉入带 advisory 的传递包时，在引入该传递包的项目上加直接 `PackageReference`，钉到无 advisory 的版本（不引入 Central Package Management，不关掉审计）：

| 传递包 | 引入项目 | 钉在 |
| ------ | -------- | ---- |
| `Microsoft.OpenApi`（`Microsoft.AspNetCore.OpenApi` 10.0.8 → 2.0.0，NU1903 [GHSA-v5pm-xwqc-g5wc](https://github.com/advisories/GHSA-v5pm-xwqc-g5wc)） | `Tigercat.Admin.Api` | 2.x 补丁线（不要升 3.x，与 `Microsoft.AspNetCore.OpenApi` 10 不兼容） |
| `SQLitePCLRaw.lib.e_sqlite3`（EF Core Sqlite → bundle 2.1.11，NU1903 [GHSA-2m69-gcr7-jv3q](https://github.com/advisories/GHSA-2m69-gcr7-jv3q)） | `Tigercat.Admin.Api` | 抬 `SQLitePCLRaw.bundle_e_sqlite3` 到 advisory 范围（`<= 2.1.11`）之外的 2.1 线 |
| `MessagePack`（Aspire → `StreamJsonRpc` 2.22.23 → 2.5.192，NU1903/NU1902） | `Tigercat.Aspire` | 2.5 安全合并版（不要升 3.x） |

具体版本以对应 `.csproj` 的 `PackageReference` 为准。`Tigercat.Admin.Api.Tests` 通过项目引用继承 API 的钉版本；`Tigercat.ServiceDefaults` 当前无 advisory。

发布前对 Admin.Api、Admin.Api.Tests、Aspire、ServiceDefaults 跑 `dotnet list package --vulnerable --include-transitive`。只允许留下已记录、且无法升级的传递包。

## 数据库

后端通过 `Database:Provider` 选择数据库：

| Provider | 场景 | 持久化 | 必要配置 |
| -------- | ---- | ------ | -------- |
| `Sqlite` | 本地开发默认 | 是 | `Database:Provider=Sqlite`，`ConnectionStrings:DefaultConnection=Data Source=tigercat_admin.db` |
| `InMemory` | 测试、临时演示 | 否 | `Database:Provider=InMemory` |
| `PostgreSql` | 生产或独立部署 | 是 | `Database:Provider=PostgreSql` 和 PostgreSQL 连接串 |

默认 SQLite 配置位于 [Tigercat.Admin.Api/appsettings.json](../Tigercat.Admin.Api/appsettings.json)，本地数据库文件在 `Tigercat.Admin.Api/tigercat_admin.db`。

常见切换：

```bash
export Database__Provider=InMemory

export Database__Provider=Sqlite
export ConnectionStrings__DefaultConnection="Data Source=tigercat_admin.db"

export Database__Provider=PostgreSql
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=tigercat_admin;Username=postgres;Password=postgres"
```

SQLite 与 PostgreSQL 共用 EF Core migrations。生产发布前生成并评审幂等 SQL：

```bash
pnpm db:script:postgres
```

输出位置：`artifacts/sql/tigercat-admin-postgres.sql`。

应用启动会幂等写入权限、角色、默认管理员、系统设置、通知和任务种子数据。生产首次启动应通过 `BootstrapAdmin:Password` 注入默认管理员初始密码。

## 生产配置

API 生产样例见 [Tigercat.Admin.Api/appsettings.Production.sample.json](../Tigercat.Admin.Api/appsettings.Production.sample.json)。实际环境优先使用环境变量或密钥系统：

```bash
export ASPNETCORE_ENVIRONMENT=Production
export Database__Provider=PostgreSql
export ConnectionStrings__DefaultConnection="Host=db.example.internal;Port=5432;Database=tigercat_admin;Username=tigercat_admin;Password=<secret>;Pooling=true;SSL Mode=Require;Trust Server Certificate=false"
export ConnectionStrings__Redis="redis.example.internal:6379,password=<secret>,ssl=True,abortConnect=False"
export Cors__AllowedOrigins__0="https://admin.example.com"
export AllowedHosts="admin-api.example.com"
export BootstrapAdmin__Password="<secret>"
export AuthRateLimit__PermitLimit=30
export AuthRateLimit__WindowSeconds=60
export ForwardedHeaders__Enabled=false
export OpenApi__Enabled=false
export Media__Provider=Local
export Media__LocalRoot=/var/lib/tigercat-admin/media
export Media__PublicBaseUrl=https://admin-api.example.com
export Media__PublicCacheSeconds=86400
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otel.example.internal"
```

前端生产构建：

```bash
pnpm build:frontend -- --data=api --api-url=https://admin-api.example.com --base=/
pnpm build:frontend -- --data=mock --base=/
pnpm build:pages
```

参数要点：

- `--data=api|mock`：真实 API 或浏览器静态 Mock。
- `--api-url`：真实 API 发布地址。
- `--router=history|hash`：路由模式；mock 默认 hash。
- `--base=/admin/`：静态资源 base path。
- `--target=all|react|vue`：选择构建目标。

前端业务入口仍是 `/api`；Monitor / Chat 实时连接走同源 `/hubs/monitor` 与 `/hubs/chat`。独立部署时建议由反向代理把 `/api` 和 `/hubs` 转发到 API 服务，`/hubs` 必须支持 WebSocket 升级。无 WebSocket 时前端回退 REST，不要为此关掉 REST 快照或聊天 POST。

### 认证与请求面

- 密码存储使用 ASP.NET Identity `PasswordHasher<T>`（PBKDF2）。**不要**引入 Cookie Identity UI 或 JwtBearer；会话仍是 `X-Token` / `Authorization: Bearer` + `ISessionStore`。
- 升级前写入的 SHA256 hex 哈希在成功登录后透明重哈希。启动时若仍有旧哈希，日志会给出条数，不会在启动时批量改写（没有明文）。
- 生产健康检查用 hasher **校验** `admin123`，同时识别 Identity 哈希和未升级的 SHA256 hex。默认管理员密码必须轮换。
- `POST /api/auth/login`、`/api/auth/two-factor/verify`、`/api/auth/forgot-password*`、`/api/auth/register` 启用按 IP 的 ASP.NET `RateLimiter`（配置节 `AuthRateLimit`：`PermitLimit`、`WindowSeconds`）。开发默认 `AuthRateLimitOptions.DefaultPermitLimit`（120 次/60 秒）。显式 `AuthRateLimit:PermitLimit` 始终生效；生产未配置该键时回落到 `ProductionPermitLimit`（30）。生产样例写 30。账号锁定（`auth.maxAttempts`）仍然独立生效。限流拒绝返回 `ApiResponse` `429`，message 为「请求过于频繁，请稍后再试」。
- 限流分区键是 `Connection.RemoteIpAddress`。API 若在反向代理后面，必须配置 `ForwardedHeaders` 才会按客户端 IP 分区，否则所有用户挤在代理地址上。默认 **关闭**。只有 `ForwardedHeaders:Enabled=true` **并且** `KnownProxies` 或 `KnownNetworks` 至少有一条有效 CIDR/地址时才调用 `UseForwardedHeaders`（在 `UseRateLimiter` 之前）。不要清空 allow-list 去信任任意 `X-Forwarded-For`，那会让客户端伪造 IP 绕过限流。生产示例：

```bash
export ForwardedHeaders__Enabled=true
export ForwardedHeaders__KnownProxies__0="10.0.0.1"
export ForwardedHeaders__KnownNetworks__0="10.0.0.0/8"
```
- 开发环境暴露 `/openapi/v1.json` 与 `/scalar`，文档含 Bearer / `X-Token` 安全方案，方便对照契约。生产**默认关闭**：OpenAPI 会列出内部模型、字段和错误形状，匿名读取等于把 API 面公开。不要为了「方便调试」在公网打开。若必须打开：设置 `OpenApi:Enabled=true`，这两条路由会走登录过滤器，禁止无鉴权读取内部模型。

## 媒体、Redis 与事件

- 当前媒体 provider 为 `Local`，`Media:LocalRoot` 必须指向持久化卷。
- `Media:PublicBaseUrl` 可设置 API 对外域名；同源部署可留空使用相对 URL。
- 上传会校验大小、MIME、扩展名和图片尺寸，并计算 SHA256；重复内容返回已有媒体资源。
- Logo 或头像引用中的媒体普通删除会失败并发布 `admin.media.delete.failed`；强制删除会清理已知引用并发布 `admin.media.delete.forced`。
- `POST /api/media/orphans/cleanup` 支持预览或清理本地孤儿文件。
- Redis Streams 用于把任务、设置、审计清理、媒体删除失败和用户治理事件转化为通知中心消息。
- 缓存走 `ICacheService` + HybridCache：`Infrastructure:UseInMemory=true` 时只有进程内 L1；Redis 在线时 L2 复用现有 `IConnectionMultiplexer`（`IDistributedCache`）。权限列表和 `GET /api/settings` 用 `GetOrSet` 防 stampede。2FA / 忘记密码验证码仍走同一 `ICacheService` 的 Get/Set/Remove。**不要**加全局 `OutputCache`：业务 GET 几乎都要登录，Stats 若缓存必须按用户/权限 `VaryBy`，Monitor snapshot 是步进演示，缓存会破坏「每次不同」。
- 导入任务进度由 `ImportJobProgressService`（`BackgroundService`）推进，`GET /api/import-jobs/{id}` 只读。间隔 `ImportJobs:ProgressIntervalMilliseconds`（默认 250）。这不是真实文件解析器，也不是 cron 产品。

## 健康检查与观测

无需认证的生产探针：

- `/api/health`：返回现有 `ApiResponse` 包络（`status` / `timestamp` / `details`）。`details` 含 `database`、`redis`、`eventChannel`、`mediaStorage`、`configuration`、`security`。内部委托 ASP.NET `IHealthCheck`（`HealthCheckService`，tag `ready`）；契约字段和 503 语义不变。测试 host 设 `Infrastructure:UseInMemory=true` 时 Redis / 事件通道走 in-memory 分支，不碰真实 Redis。
- `/api/health/redis`：仅在未启用 in-memory 基础设施时映射，直接 ping Redis。

Aspire ServiceDefaults 另有 `/health`（全部检查）和 `/alive`（仅 `live` tag）。这两条**只在 Development 映射**，生产不暴露，避免把依赖细节放到未鉴权路径上。生产 readiness 用 `/api/health`（Docker `HEALTHCHECK` 也打这条）。不要把 Aspire `/health` 当生产探针，除非单独加鉴权或网络隔离。

生产环境会严格检查 PostgreSQL TLS、Redis TLS、CORS 白名单、`AllowedHosts`、默认管理员密码轮换（Identity 或遗留 SHA256 哈希均按 `admin123` 校验）、`BootstrapAdmin:Password` 和安全策略默认值。

OpenTelemetry 在配置 `OTEL_EXPORTER_OTLP_ENDPOINT` 后导出 logs、metrics 和 traces。Meter 名 `Tigercat.Admin.Api`：

| 指标 | 含义 |
| ---- | ---- |
| `tigercat.auth.events` | 登录 / 2FA / 改密 / 退出 |
| `tigercat.redis_stream.events` | Redis Stream 发布与消费 |
| `tigercat.cache.events` | HybridCache `hit` / `miss`（`Get` 与 `GetOrSet`）。`Get` 用 `DisableUnderlyingData` 做 try-get，缺省值记 `miss`，命中记 `hit`。 |
| `tigercat.import_jobs` | 导入任务 `created` / `progress` / `completed` |
| `tigercat.jobs` | 定时任务 `created` / `updated`（仍无真实 cron 执行器） |

Tracing 含 ASP.NET、HttpClient、Runtime，以及 EF Core instrumentation（`OpenTelemetry.Instrumentation.EntityFrameworkCore`，当前为 1.15.x beta）。`/health`、`/alive`、`/api/health*` 不进 traces。

## Docker

```bash
docker build -f Tigercat.Admin.Api/Dockerfile -t tigercat-admin-api .
docker build -f Tigercat.Admin.React/Dockerfile -t tigercat-admin-react .
docker build -f Tigercat.Admin.Vue/Dockerfile -t tigercat-admin-vue .
```

- API 镜像监听 `8080`，健康检查为 `/api/health`。入口是 `dotnet Tigercat.Admin.Api.dll`（`mcr.microsoft.com/dotnet/aspnet:10.0` 框架依赖运行时）。不要改成 Native AOT 可执行文件；原因见 [Native AOT 评估](#native-aot)。
- React / Vue 镜像使用 Nginx 承载静态资源，`/healthz` 返回容器健康状态，history 路由 fallback 到 `index.html`。

## CI 与发布门禁

[.github/workflows/ci.yml](../.github/workflows/ci.yml) **仅** `workflow_dispatch` 手动触发（不再在 `push` / `pull_request` 时自动跑）。需要门禁时在 GitHub Actions 里手动 Run workflow。Node 固定 20（与 README 一致），不要为 MCP engines `>=22.13` 强升 Admin。

始终跑的矩阵：

- `backend`：`dotnet test Tigercat.Admin.sln`
- `frontend`：`pnpm typecheck` 与 `pnpm build`（并构建 Pages 演示产物）

E2E 仍是单 worker（Playwright `workers: 1`），在矩阵通过后跑 demo E2E、双端 E2E、链接检查和 PostgreSQL SQL 生成。**不要**把 `PublishAot` 或 native ILC publish 加进 CI。

发布前建议执行：

```bash
dotnet test Tigercat.Admin.sln
pnpm build:frontend
pnpm build:demo
pnpm e2e:demo
pnpm e2e
pnpm db:script:postgres
pnpm run check:links
```

文档 only 改动至少执行：

```bash
pnpm run check:links
```

## 发布 smoke 与回滚

部署后至少检查：

1. `/api/health` 中 `database`、`redis`、`eventChannel`、`mediaStorage`、`configuration`、`security` 为 `healthy`。
2. 管理员登录、设置读取和用户列表读取正常。
3. 保存一次设置，确认通知中心可见并可跳转。
4. 完成一个任务，确认任务状态和通知事件。
5. 对被 Logo 或头像引用的媒体执行普通删除，确认失败通知；确认业务影响后再验证强制删除。
6. 执行审计清理 `dryRun=true`，确认通知可跳转到 `/audit-logs?eventId=...`。

回滚演练应覆盖应用镜像回退、PostgreSQL schema 回退或备份恢复、本地媒体目录与数据库记录同步恢复，以及回退后的 `/api/health` 和登录 smoke。

## 故障排查

PNPM 依赖问题：

```bash
pnpm store prune
Remove-Item -Recurse -Force node_modules
pnpm install
```

.NET 构建问题：

```bash
dotnet clean
dotnet restore
dotnet build Tigercat.Admin.sln
```

<a id="native-aot"></a>

## Native AOT 评估（不启用）

**结论：** 保持现有 JIT + `aspnet` 运行时发布。不要打开 `Tigercat.Admin.Api.csproj` 里已注释的 `PublishAot`，不要把 AOT publish 加进 CI。完整 Native AOT 会被 EF Core、动态 `Database:Provider`、Scalar/OpenAPI、Redis 客户端、MiniExcel、SignalR 和若干反射 JSON 路径挡住。本附录只记录挡点和 JSON source-gen 覆盖面，便于以后复核。

### 现状（已铺垫，开关仍关）

| 项 | 位置 | 状态 |
| -- | ---- | ---- |
| `PublishAot` | [Tigercat.Admin.Api.csproj](../Tigercat.Admin.Api/Tigercat.Admin.Api.csproj) | 注释掉，**保持注释** |
| `InvariantGlobalization` | 同上 | `true`（AOT 友好，但不是 AOT 本身） |
| `AppJsonContext` | [Serialization/AppJsonContext.cs](../Tigercat.Admin.Api/Serialization/AppJsonContext.cs) | STJ source-gen，覆盖 HTTP 契约包络 |
| `ConfigureHttpJsonOptions` | [Program.cs](../Tigercat.Admin.Api/Program.cs) | `TypeInfoResolverChain` 插入 `AppJsonContext.Default` |
| 端点注册 | `Program.cs` `MapEndpoint<T>()` | 显式 `new TEndpoint()`，不做程序集扫描（注释写「AOT compatible」） |
| Docker | [Tigercat.Admin.Api/Dockerfile](../Tigercat.Admin.Api/Dockerfile) | `ENTRYPOINT ["dotnet", "Tigercat.Admin.Api.dll"]`，`aspnet:10.0` |
| CI | [.github/workflows/ci.yml](../.github/workflows/ci.yml) | `dotnet test` / 前端 / e2e，无 AOT |

官方兼容性：ASP.NET Core 10 的 Minimal API 与 SignalR 都是**部分**支持 Native AOT；MVC 不支持。见 [ASP.NET Core Native AOT](https://learn.microsoft.com/en-us/aspnet/core/fundamentals/native-aot)。EF Core 10 的 NativeAOT / 预编译查询仍标 **experimental, not production**，运行时模型构建会走 `NativeAotNoCompiledModel`。见 [EF NativeAOT and precompiled queries](https://learn.microsoft.com/en-us/ef/core/performance/nativeaot-and-precompiled-queries)。

本机评估（2026-09-05，.NET SDK 10.0.400）：

```bash
dotnet build Tigercat.Admin.Api/Tigercat.Admin.Api.csproj -c Release \
  -p:IsAotCompatible=true -p:PublishAot=false --no-incremental
```

- 228 条 IL2026 / IL3050 / IL2090 警告，0 error。这是分析器，**不是** native publish。
- 其中约 166 条来自 `MapGet` / `MapPost` / `MapPut` / `MapDelete`（未开 RequestDelegateGenerator 时的固定噪声）。
- 其余主要是无 `JsonTypeInfo` 的 `JsonSerializer`、`ConfigurationBinder.Get<T>`、`Configure<TOptions>`、EF `DbContext` 构造 / `MigrateAsync` / `EnsureCreatedAsync`，以及导出路径的 `GetProperties`。
- 分析器只扫本项目源码，**不会**把 MiniExcel、Scalar、FreeRedis、StackExchange.Redis 的内部 trim 警告算进来；那些要等 `PublishAot=true` 的 ILC 全图。本环境没有 `clang`，未跑 ILC，也不应为此改 CI。

### 包级挡点

直接依赖以 [Tigercat.Admin.Api.csproj](../Tigercat.Admin.Api/Tigercat.Admin.Api.csproj) 和 [Tigercat.ServiceDefaults.csproj](../Tigercat.ServiceDefaults/Tigercat.ServiceDefaults.csproj) 为准。

| 包 | 当前角色 | 为何挡完整 AOT |
| -- | -------- | -------------- |
| `Microsoft.EntityFrameworkCore.Sqlite` 10.0.8、`Npgsql.EntityFrameworkCore.PostgreSQL` 10.0.2、`Microsoft.EntityFrameworkCore.InMemory` 10.0.8 | 运行时三选一 | NativeAOT 需要编译模型 + 预编译查询（EF 10 仍实验）。`OnModelCreating` 运行时建模型在 AOT 下会失败。三个 provider 都编进同一个程序集。 |
| `SQLitePCLRaw.bundle_e_sqlite3` 2.1.13 | SQLite native | 原生互操作；AOT 还要处理 native 库打包，且与动态 provider 叠加。 |
| `Scalar.AspNetCore` 2.14.14、`Microsoft.AspNetCore.OpenApi` 10.0.8 | Development Scalar；生产默认关 | OpenAPI 文档生成走反射。包被引用就会进 trim 图。生产即使不映射 `/scalar`，AOT 发布仍要处理该依赖。 |
| `StackExchange.Redis` 2.13.17、`Microsoft.Extensions.Caching.StackExchangeRedis` 10.0.8 | 缓存 L2、`IConnectionMultiplexer` | 库已改善 AOT，但未作为本仓库的 AOT 门禁；Lua/`ScriptEvaluate` 一类 API 仍可能 trim 警告。 |
| `FreeRedis` 1.5.5 | Redis Streams 发布/消费 | 未标 `IsAotCompatible`；阻塞命令与动态调用不适合 AOT。 |
| `MiniExcel` 1.44.1 | `GET /api/export/*` 的 xlsx | `SaveAs` 对 `List<Dictionary<string, object?>>` 做反射映射。 |
| `Microsoft.Extensions.Caching.Hybrid` 10.0.0 | `ICacheService` | 包本身可 AOT，但默认 JSON 在 AOT 下必须 `WithJsonSerializerOptions` 接到 source-gen；当前是裸 `AddHybridCache()`。 |
| `Microsoft.AspNetCore.SignalR`（共享框架） | `/hubs/monitor`、`/hubs/chat` | ASP.NET Core 10 对 SignalR 仅部分支持。默认 JSON hub protocol 不用 `AppJsonContext`。 |
| OpenTelemetry 1.15.x（含 `Instrumentation.EntityFrameworkCore` 1.15.1-beta.1） | ServiceDefaults | instrumentation 大量 DiagnosticSource / 反射；beta EF 探测不是 AOT 目标。 |

`Microsoft.EntityFrameworkCore.Design` 是 `PrivateAssets=all`，不进发布输出，不是运行时挡点。

### 应用代码挡点

这些是本仓库自己的形状，不是「换包版本」能消掉的。

1. **动态 `Database:Provider`。** [DatabaseProviderResolver](../Tigercat.Admin.Api/Data/DatabaseProviderResolver.cs) 在解析 `IServiceProvider` 时在 Sqlite / PostgreSQL / InMemory 之间切换。AOT 编译模型按 provider 生成；一个二进制三种 provider 要么三种模型全编进去，要么发布时钉死一种。当前设计就是运行时选择。
2. **EF 运行时模型与迁移。** `AdminDbContext.OnModelCreating` 手写 Fluent 配置；启动走 `DbInitializer` 的 `EnsureCreatedAsync` / `MigrateAsync`。没有 `Microsoft.EntityFrameworkCore.Tasks` 编译模型。
3. **RequestDelegateGenerator 未开。** 每个 `MapGet`/`MapPost` 都会 IL2026/IL3050。AOT 模板靠 source-gen 拦截器消这些警告。
4. **`WebApplication.CreateBuilder`。** 不是硬挡，但 AOT 模板用 `CreateSlimBuilder` 才能把 IIS / HTTPS / 多余 logging 裁掉。
5. **配置绑定。** `Configure<MediaOptions>`、`Configure<AuthRateLimitOptions>`、`Configure<ForwardedHeadersSettings>`、`Get<AuthRateLimitOptions>`、`Get<ForwardedHeadersSettings>`、`Get<string[]>`（CORS）、多处 `GetValue<bool>`。AOT 需要配置 source-gen 或把选项改成手动读标量。
6. **导出反射。** `ExportEndpoints.PropertyAccessorCache<T>` 对 `GetProperties` + `Expression.Compile`（动态代码），JSON 导出再 `SerializeToUtf8Bytes` 一份 `List<Dictionary<string, object?>>`。xlsx 交给 MiniExcel。
7. **SignalR 载荷。** `MonitorHub` 推 `MonitorSnapshotResponse`，聊天 fan-out `ChatMessageResponse[]`。这两种类型已在 `AppJsonContext`，但 hub 不走 `ConfigureHttpJsonOptions`。
8. **HybridCache 泛型。** L2 序列化的类型：`string`（2FA / 忘记密码）、`string[]`（权限）、`SettingItemResponse[]`（设置）。后两个已在 source-gen 里，但 `AddHybridCache()` 没有接 `AppJsonContext`。
9. **媒体 provider 解析。** 目前只有 `Local`，`ActivatorUtilities.CreateInstance<LocalMediaStorageProvider>` 类型已知，不是主挡点。
10. **Docker / CI。** 原生可执行文件不能再 `dotnet *.dll`；CI 也没有 clang / native RID 矩阵。两者都不改。

RateLimiter、CORS、HealthChecks、Identity **仅** `PasswordHasher<T>`、显式 `MapEndpoint<T>` 与 `InvariantGlobalization` 不构成挡点。

### JSON source-gen 覆盖

`AppJsonContext`（`JsonSourceGenerationOptions`：camelCase）已注册 HTTP 请求/响应包络，并在 `ConfigureHttpJsonOptions` 与 Redis Stream / 审计日志的 `JsonSerializerOptions.TypeInfoResolverChain` 里插入。端点成功/失败路径普遍写 `Results.Json(..., AppJsonContext.Default.ApiResponse…)`，而不是反射 overload。

已覆盖的域（`[JsonSerializable]`，约 170 条，含 `ApiResponse<T>` / `PagedResponse<T>` 包装）：

| 域 | 代表类型 |
| -- | -------- |
| 包络 | `ApiResponse<object>`、`ApiResponse<string>`、`ApiContracts` |
| 认证 | `LoginRequest` / `LoginResponse`、`RegisterRequest`、改密、2FA、忘记密码、`UserPermissionsResponse` |
| 用户 / 角色 | CRUD 请求、`UserItemResponse`、`RoleDetailResponse`、`PermissionInfoResponse` 及分页 |
| 统计 / 导出行 | `StatsOverviewResponse`、`StatsTrendResponse`、`ExportUserRow`、`ExportRoleRow` |
| 设置 / 媒体 | `SettingItemResponse[]`、`UpdateSettingsRequest`、媒体列表/详情/引用/孤儿清理 |
| 通知 / 监控 / 任务 | `NotificationItemResponse`、`MonitorSnapshotResponse`、`AdminTaskResponse` 及对应请求 |
| 工单 / 聊天 / 评论 | `TicketResponse`、`ChatMessageResponse[]`、`CommentResponse` |
| 项目 / 日历 | `ProjectResponse`、`CalendarEventResponse`、`CreateCalendarEventRequest` |
| 内容 / 作业 / 导入 | `ArticleResponse`、`JobResponse`、`ImportJobResponse` 及创建/更新请求 |
| 健康 / 信息 | `HealthResponse`、`HealthDependencyStatus`、`InfoResponse` |
| 事件 | `EventEnvelope` |
| 字典 / 数组 | `Dictionary<string, string>`、`Dictionary<string, string?>`、`Dictionary<string, HealthDependencyStatus>`、`string[]` |

HTTP JSON 体（Minimal API 绑定 + `Results.Json`）对已注册类型来说，source-gen **覆盖了 API 包络**。缺口在「注册了但调用没带 `JsonTypeInfo`」以及「类型本身无法静态化」：

| 缺口 | 位置 | 说明 |
| ---- | ---- | ---- |
| `JsonSerializer.Serialize/Deserialize` 不传 `JsonTypeInfo` | `ContentEndpoints.EncodeStringArray` / `DecodeStringArray` | 类型 `string[]` 已注册，调用仍走反射 overload（IL2026/IL3050） |
| 同上 | `NotificationsEndpoints` 元数据、`AdminNotificationService.SerializeMetadata` | `Dictionary<string, string>` 已注册，调用未传对应 `JsonTypeInfo` |
| 同上 | `DbInitializer` 种子 `TagsJson` / `ColumnJson` | 启动时反射序列化 |
| `EventEnvelope.Data` 为 `Dictionary<string, object?>` | 信封定义、审计 `FormatDataValue`、Redis Stream 发布/消费 | `object?` 运行时类型无法 source-gen。审计/Stream 虽把 `AppJsonContext` 放进 `TypeInfoResolverChain`，调用仍是泛型 reflection overload，多态 payload 在 AOT 下会失败 |
| 导出 JSON | `ExportEndpoints.BuildJsonResult` | `List<Dictionary<string, object?>>` + 新的 `JsonSerializerOptions`（无 source-gen） |
| HybridCache L2 | `AddHybridCache()` | 未 `WithJsonSerializerOptions`；AOT 下 L2 JSON 需要 context |
| SignalR JSON protocol | `AddSignalR()`、`MonitorHub`、`ChatRealtimeNotifier` | 不使用 `AppJsonContext` |
| 配置 POCO | `MediaOptions`、`AuthRateLimitOptions`、`ForwardedHeadersSettings` | 不是 STJ 问题，是 `ConfigurationBinder` |

`ApiResponse<object>` 只能稳住失败包络（`data` 为 null）。不要把它当成任意成功载荷的 AOT 逃逸口。

### 以后若再评估（现在不做）

按顺序才有意义，且**仍然默认不做**：

1. EF NativeAOT 达到生产声明；本仓库生成编译模型，并在发布时钉死单一 `Database:Provider`。
2. 打开 RequestDelegateGenerator；JSON 反射调用全部改成 `AppJsonContext` 的 `JsonTypeInfo`；`EventEnvelope.Data` 改为 `JsonElement` 或封闭标量字典。
3. HybridCache 接到同一 context；SignalR 使用带 source-gen 的 JSON hub protocol。
4. 替换或删除 MiniExcel；导出字段改为显式选择器，而不是 `GetProperties`。
5. Scalar/OpenAPI 从 AOT 发布图里拿掉（继续仅 Development / 可选登录后打开）。
6. 证实或替换 FreeRedis / StackExchange.Redis / OTEL instrumentation。
7. Docker 改为 native RID + `runtime-deps`，入口不再是 `dotnet *.dll`。
8. 只有 ILC publish **零 trim/AOT 警告** 且核心契约测试在原生二进制上通过，才考虑把 `PublishAot` 写进 csproj。即便那时，也先不要加进 CI。

在此之前，发布模型保持：`dotnet publish`（非 AOT）→ `aspnet:10.0` 镜像 → `/api/health` 探针。
