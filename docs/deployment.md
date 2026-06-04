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

生产环境至少应把 `/api/health` 接入平台 readiness probe。若未显式配置 `Cors:AllowedOrigins`，非 Development 环境会在健康检查的 `configuration` 明细中标记为 `unhealthy`。

## 运维工作流运行要求

通知、任务、设置与审计清理已经形成后台工作流闭环：

- API 成功发布任务、设置、用户治理和审计清理事件后写入 Redis Streams。
- `RedisStreamConsumer` 消费白名单事件并写入通知中心，通知 `linkUrl` 指向站内页面。
- 审计保留清理通过 `POST /api/audit-logs/retention/cleanup` 执行；生产环境建议先用 `dryRun=true` 预览，再在维护窗口执行清理。

生产 smoke 除登录和健康检查外，建议补一次通知跳转、任务完成确认、设置保存事件和审计清理 dry-run。

## 数据库发布策略

当前 SQLite 使用 EF Core migrations；PostgreSQL 样例启动时使用 `EnsureCreated` 建表，适合基线部署和配置验证。生产发布建议：

1. 发布前备份目标 PostgreSQL 数据库。
2. 在预发环境使用同一连接串格式完成 `/api/health`、登录、设置读取和用户列表烟测。
3. 若 schema 变更进入生产，先生成并评审迁移 SQL，再由部署流水线或 DBA 执行。
4. 应用启动后会幂等写入权限、角色、系统设置、通知、任务和默认管理员种子数据。
5. 回滚应用版本时同步评估 schema 兼容性；涉及破坏性 schema 变更时先执行数据库回滚脚本或从备份恢复。

## Docker 参考

本仓库尚未固定生产镜像 Dockerfile；Aspire 可为前端项目生成开发发布用 Dockerfile。独立生产容器可按以下方向落地：

- API：`dotnet publish Tigercat.Admin.Api/Tigercat.Admin.Api.csproj -c Release -o out/api`，运行时注入数据库、Redis、CORS 和日志环境变量。
- React：`pnpm --filter tigercat-admin-react build`，把 `Tigercat.Admin.React/dist` 交给 Nginx、Caddy 或平台静态站点。
- Vue：`pnpm --filter tigercat-admin-vue build`，把 `Tigercat.Admin.Vue/dist` 交给 Nginx、Caddy 或平台静态站点。

## 发布前门禁

```bash
dotnet test Tigercat.Admin.sln
pnpm build
pnpm build:demo
pnpm e2e:demo
pnpm e2e
pnpm dlx markdown-link-check README.md DEVELOPMENT.md AGENT.md docs/*.md
```

GitHub Actions 最小门禁见 [.github/workflows/ci.yml](../.github/workflows/ci.yml)。
