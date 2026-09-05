# 开发、部署与运维指南

本文合并本地开发、数据库、部署、健康检查、CI 和发布 smoke，属「维护本仓库」文档线。前端界面规范见 [frontend.md](frontend.md)，API 契约见 [api.md](api.md)。新项目复用本仓库后端时只需读「数据库」和「生产配置」两节（由 [guide/backend.md](guide/backend.md) 引用）。

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

前端通过 `/api` 访问后端。Aspire 会注入 `VITE_API_URL`，单独开发时由 Vite 代理到 API。

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

前端业务入口仍是 `/api`；独立部署时建议由反向代理把 `/api` 转发到 API 服务。

### 认证与请求面

- 密码存储使用 ASP.NET Identity `PasswordHasher<T>`（PBKDF2）。**不要**引入 Cookie Identity UI 或 JwtBearer；会话仍是 `X-Token` / `Authorization: Bearer` + `ISessionStore`。
- 升级前写入的 SHA256 hex 哈希在成功登录后透明重哈希。启动时若仍有旧哈希，日志会给出条数，不会在启动时批量改写（没有明文）。
- 生产健康检查用 hasher **校验** `admin123`，同时识别 Identity 哈希和未升级的 SHA256 hex。默认管理员密码必须轮换。
- `POST /api/auth/login`、`/api/auth/two-factor/verify`、`/api/auth/forgot-password*`、`/api/auth/register` 启用按 IP 的 ASP.NET `RateLimiter`（配置节 `AuthRateLimit`：`PermitLimit`、`WindowSeconds`）。开发默认 120 次/60 秒；生产样例 30 次/60 秒。账号锁定（`auth.maxAttempts`）仍然独立生效。限流拒绝返回 `ApiResponse` `429`，message 为「请求过于频繁，请稍后再试」。
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
| `tigercat.cache.events` | HybridCache `hit` / `miss`（`Get` 与 `GetOrSet`） |
| `tigercat.import_jobs` | 导入任务 `created` / `progress` / `completed` |
| `tigercat.jobs` | 定时任务 `created` / `updated`（仍无真实 cron 执行器） |

Tracing 含 ASP.NET、HttpClient、Runtime，以及 EF Core instrumentation（`OpenTelemetry.Instrumentation.EntityFrameworkCore`，当前为 1.15.x beta）。`/health`、`/alive`、`/api/health*` 不进 traces。

## Docker

```bash
docker build -f Tigercat.Admin.Api/Dockerfile -t tigercat-admin-api .
docker build -f Tigercat.Admin.React/Dockerfile -t tigercat-admin-react .
docker build -f Tigercat.Admin.Vue/Dockerfile -t tigercat-admin-vue .
```

- API 镜像监听 `8080`，健康检查为 `/api/health`。
- React / Vue 镜像使用 Nginx 承载静态资源，`/healthz` 返回容器健康状态，history 路由 fallback 到 `index.html`。

## CI 与发布门禁

[.github/workflows/ci.yml](../.github/workflows/ci.yml) 在 `push` / `pull_request` 到 `main` 以及 `workflow_dispatch` 时运行。Node 固定 20（与 README 一致），不要为 MCP engines `>=22.13` 强升 Admin。

始终跑的矩阵：

- `backend`：`dotnet test Tigercat.Admin.sln`
- `frontend`：`pnpm typecheck` 与 `pnpm build`（并构建 Pages 演示产物）

E2E 仍是单 worker（Playwright `workers: 1`），在矩阵通过后跑 demo E2E、双端 E2E、链接检查和 PostgreSQL SQL 生成。

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
