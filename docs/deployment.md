# 发布与部署基线

> 本文说明生产化配置、部署模式和发布前验证。它不是 Roadmap；后续优先级仍以 [ROADMAP.md](ROADMAP.md) 为准。

## 部署模式差异

| 模式 | 用途 | 启动方式 | 基础设施 |
| ---- | ---- | -------- | -------- |
| Aspire 本地编排 | 日常开发与端到端联调 | `cd Tigercat.Aspire && dotnet run` | Aspire 启动 API、双端 Vite 和 Redis |
| 独立本地开发 | 单服务调试 | 分别运行 API、React、Vue | 手动提供 Redis；默认 SQLite |
| 独立生产部署 | 容器、虚拟机或平台服务 | 发布 API 与静态前端产物 | 外部 PostgreSQL、Redis、密钥系统和反向代理 |

Aspire 适合开发期服务发现、Dashboard 和依赖编排；生产部署应把 PostgreSQL、Redis、TLS、域名和密钥交给目标平台管理。

## 生产配置

API 生产样例见 [Tigercat.Admin.Api/appsettings.Production.sample.json](../Tigercat.Admin.Api/appsettings.Production.sample.json)。实际环境优先使用环境变量或密钥系统覆盖敏感值：

```bash
export ASPNETCORE_ENVIRONMENT=Production
export Database__Provider=PostgreSql
export ConnectionStrings__DefaultConnection="Host=db.example.internal;Port=5432;Database=tigercat_admin;Username=tigercat_admin;Password=<secret>;Pooling=true;SSL Mode=Require;Trust Server Certificate=false"
export ConnectionStrings__Redis="redis.example.internal:6379,password=<secret>,ssl=True,abortConnect=False"
export Cors__AllowedOrigins__0="https://admin.example.com"
export AllowedHosts="admin-api.example.com"
export BootstrapAdmin__Password="<secret>"
export Media__Provider=Local
export Media__LocalRoot=/var/lib/tigercat-admin/media
export Media__PublicBaseUrl=https://admin-api.example.com
export Media__PublicCacheSeconds=86400
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otel.example.internal"
export Logging__LogLevel__Default=Warning
```

前端生产样例见：

- [Tigercat.Admin.React/.env.production.sample](../Tigercat.Admin.React/.env.production.sample)
- [Tigercat.Admin.Vue/.env.production.sample](../Tigercat.Admin.Vue/.env.production.sample)

前端发布统一通过参数选择数据源：

```bash
# 真实 API 发布，默认使用 history 路由
pnpm build:frontend -- --data=api --api-url=https://admin-api.example.com --base=/

# 静态 Mock 演示发布，默认使用 hash 路由
pnpm build:frontend -- --data=mock --base=/

# 单 Pages 根目录发布，同时包含入口页、React 和 Vue 演示
pnpm build:pages
```

参数说明：

- `--data=api|mock`：发布数据源。`api` 使用真实 API；`mock` 把前端静态 Mock API 打包进产物。
- `--api-url=https://admin-api.example.com`：真实 API 发布时传入，供 Vite 开发代理或环境记录使用。
- `--router=history|hash`：路由模式。未传时 `api` 默认 `history`，`mock` 默认 `hash`。
- `--base=/admin/`：Vite 静态资源 base path；部署到子目录时传对应路径。
- `--target=all|react|vue`：可选，默认同时构建 React 与 Vue。
- `--deploy=pages`：构建单 Pages 根目录部署产物，默认输出到 `dist/pages`。
- `--out=dist/pages`：`--deploy=pages` 时可选，指定统一输出目录。

前端代码仍以 `/api` 为业务入口；真实 API 独立部署时建议由反向代理把 `/api` 转发到 API 服务，或保持同源路径。

## 媒体资源生产配置

当前内置媒体 provider 只有 `Local`。`Media:Provider` 会显式解析，配置为其他值时会在启动或 `/api/health` 的 `mediaStorage` 明细中暴露错误；后续接入对象存储时应复用 `IMediaStorageProvider` 边界并通过密钥系统注入 provider 凭据。

推荐生产配置：

- `Media:LocalRoot` 指向持久化卷，例如 `/var/lib/tigercat-admin/media`，不要使用容器临时层。
- `Media:PublicBaseUrl` 设置为 API 对外域名，用于返回绝对资源 URL；若前端与 API 同源，可留空保持 `/api/media/.../content` 相对路径。
- `Media:PublicCacheSeconds` 控制内容读取的 `Cache-Control`。媒体 URL 使用不可预测 `publicId`，Logo/头像变更会生成新 URL，适合设置较长浏览器缓存。
- `Media:MaxBytes`、`AllowedContentTypes`、`AllowedExtensions`、`MaxImageWidth`、`MaxImageHeight` 应按业务需求收敛，避免任意文件进入生产存储。

反向代理建议：

- 对 `/api/media/{publicId}/content` 保留 Range 请求与响应头，不要剥离 `Cache-Control` 和 `X-Content-Type-Options`。
- 如由 Nginx/Caddy 缓存媒体内容，缓存 key 应包含完整路径，清理策略以新 URL 生效为主，不依赖覆盖原文件。
- 本地 provider 的数据库记录和 `Media:LocalRoot` 文件目录需要一起备份与恢复；只恢复其中一侧会产生孤儿文件或 404 内容读取。可使用 `POST /api/media/orphans/cleanup` 先 `dryRun=true` 巡检。

## 前端静态演示部署

React 与 Vue 均支持纯前端静态演示模式。该模式把 Mock API 打包进前端产物，由浏览器侧拦截 `/api/*` 请求并返回会话级模拟数据；不需要启动 ASP.NET Core API、数据库、Redis 或 Aspire，也不会进行真实写入。

```bash
pnpm build:frontend -- --data=mock
pnpm --filter tigercat-admin-react preview:demo
pnpm --filter tigercat-admin-vue preview:demo
```

演示模式使用以下环境变量：

- `VITE_TIGERCAT_DEMO=true`：启用前端 Mock API adapter，由 `--data=mock` 自动设置。
- `VITE_TIGERCAT_ROUTER_MODE=hash`：使用 hash 路由，适配无 history fallback 的静态空间；可用 `--router` 覆盖。
- `VITE_TIGERCAT_BASE_PATH=/`：控制 Vite 静态资源 base path；可用 `--base` 覆盖。

静态演示产物可直接上传到对象存储、静态站点平台或 Nginx 静态目录。若目标平台已经配置 history fallback，也可以改用 history 路由；默认推荐 hash 路由，以避免刷新深链页面时 404。

演示账号：

- `admin / admin123`
- `demo / demo`

演示模式会覆盖登录、权限、用户、角色、设置、通知、任务、媒体、审计、统计和导出等核心展示接口。新增、编辑、删除、上传、标记已读和任务流转仅保存在浏览器 `sessionStorage` 中，刷新同一会话可保留，关闭会话后不承诺持久化。

### 单 Pages 根目录部署

若需要把 React 与 Vue 两个演示端发布到同一个 Pages 网址下，使用：

```bash
pnpm build:pages
```

默认输出结构：

```text
dist/pages/
  index.html
  404.html
  react/
  vue/
```

根目录 `index.html` 提供双端入口；React 演示路径为 `react/#/login`，Vue 演示路径为 `vue/#/login`。两个子应用都使用前端 Mock 数据、hash 路由和相对静态资源路径，因此可以直接把 `dist/pages` 作为 Pages 发布根目录，不需要 API 服务，也不会出现 React / Vue 路由和资源路径冲突。

## 健康检查

API 暴露两个无需认证的健康入口：

- `/api/health`：返回数据库、Redis、事件通道和关键配置状态。
- `/api/health/redis`：仅检查 Redis ping，便于单项排障。

生产环境至少应把 `/api/health` 接入平台 readiness probe。若未显式配置 `Cors:AllowedOrigins`，非 Development 环境会在健康检查的 `configuration` 明细中标记为 `unhealthy`；若 `Media:Provider` 不是已注册 provider，`mediaStorage` 明细会标记为 `unhealthy`。`security` 明细只在 `Production` 环境严格检查 PostgreSQL TLS、Redis TLS、CORS 白名单、`AllowedHosts`、默认管理员密码轮换、`BootstrapAdmin:Password` 注入和会话/密码策略默认值。

OpenTelemetry 已注册 `Tigercat.Admin.Api` meter，并记录 Redis Stream 发布/消费与认证关键事件。配置 `OTEL_EXPORTER_OTLP_ENDPOINT` 后，日志、metrics 和 traces 会通过 OTLP exporter 输出；生产样例默认启用 JSON console logging，便于平台日志采集。

## 运维工作流运行要求

通知、任务、设置与审计清理已经形成后台工作流闭环：

- API 成功发布任务、设置、用户治理和审计清理事件后写入 Redis Streams。
- `RedisStreamConsumer` 消费白名单事件并写入通知中心，通知 `linkUrl` 指向站内页面。
- 媒体资源因站点 Logo 或用户头像引用导致删除失败时会发布 `admin.media.delete.failed`，通知中心指向文件管理页；确认业务影响后可通过文件管理页强制删除已知引用，成功事件为 `admin.media.delete.forced`。
- 审计保留清理通过 `POST /api/audit-logs/retention/cleanup` 执行；生产环境建议先用 `dryRun=true` 预览，再在维护窗口执行清理。

生产 smoke 除登录和健康检查外，建议补一次通知跳转、任务完成确认、设置保存事件、媒体删除失败通知和审计清理 dry-run，并确认审计清理通知可跳转到 `/audit-logs?eventId=...` 详情。

## 数据库发布策略

SQLite 与 PostgreSQL 都使用 EF Core migrations。生产发布建议：

1. 发布前备份目标 PostgreSQL 数据库。
2. 运行 `pnpm db:script:postgres` 生成 `artifacts/sql/tigercat-admin-postgres.sql`，评审后由流水线或 DBA 执行。
3. 在预发环境使用同一连接串格式完成 `/api/health`、登录、设置读取和用户列表烟测。
4. 应用启动后会幂等写入权限、角色、系统设置、通知、任务和默认管理员种子数据；首次生产启动应通过 `BootstrapAdmin:Password` 注入默认管理员初始密码。
5. 回滚应用版本时同步评估 schema 兼容性；涉及破坏性 schema 变更时先执行已评审回滚 SQL 或从备份恢复。

## Docker 参考

仓库提供 API、React、Vue 三个生产 Dockerfile，构建上下文统一为仓库根目录：

```bash
docker build -f Tigercat.Admin.Api/Dockerfile -t tigercat-admin-api .
docker build -f Tigercat.Admin.React/Dockerfile -t tigercat-admin-react .
docker build -f Tigercat.Admin.Vue/Dockerfile -t tigercat-admin-vue .
```

- API 镜像监听 `8080`，健康检查为 `/api/health`；运行时注入数据库、Redis、CORS、媒体、日志和 OTLP 环境变量。
- React / Vue 镜像使用 Nginx 承载静态资源，`/healthz` 返回容器健康状态，history 路由通过 `try_files` fallback 到 `index.html`。
- 前端镜像仍以 `/api` 为业务入口；独立部署时由反向代理把 `/api` 转发到 API 服务，或把前端与 API 放在同源路径下。

## CI 与产物

[.github/workflows/ci.yml](../.github/workflows/ci.yml) 在 `pull_request`、`push` 和手动触发时执行后端测试、前端生产构建、Pages 静态演示构建、demo E2E、双端 E2E、链接检查和 PostgreSQL SQL 生成。Workflow 上传以下 artifacts：

- `frontend-dist`：React / Vue 真实 API 模式构建产物。
- `pages-demo`：单 Pages 根目录静态演示产物。
- `postgres-migration-sql`：`artifacts/sql/tigercat-admin-postgres.sql`。
- `playwright-report`：失败排障用的 Playwright report 与 test-results。

## 发布 smoke 与回滚演练

部署后至少执行：

1. 调用 `/api/health`，确认 `database`、`redis`、`eventChannel`、`mediaStorage`、`configuration`、`security` 均为 `healthy`。
2. 用生产管理员账号登录，读取设置和用户列表。
3. 保存一次设置，确认通知中心可见设置事件并可跳转。
4. 完成一个任务，确认任务状态和通知事件。
5. 对被站点 Logo 或头像引用的媒体执行普通删除，确认失败通知；确认业务影响后再验证强制删除路径。
6. 执行审计清理 `dryRun=true`，确认通知跳转到 `/audit-logs?eventId=...`。

回滚演练应覆盖应用镜像回退、PostgreSQL schema 回退或备份恢复、本地媒体目录与数据库记录同步恢复，以及回退后 `/api/health` 和登录 smoke。

## 发布前门禁

```bash
dotnet test Tigercat.Admin.sln
pnpm build
pnpm build:demo
pnpm e2e:demo
pnpm e2e
pnpm db:script:postgres
pnpm run check:links
```

GitHub Actions 分层门禁见 [.github/workflows/ci.yml](../.github/workflows/ci.yml)。
