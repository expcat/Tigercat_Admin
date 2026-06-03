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

构建时设置 `VITE_API_URL=https://admin-api.example.com`。前端代码仍以 `/api` 为业务入口；独立部署时建议由反向代理把 `/api` 转发到 API 服务，或保持同源路径。

## 健康检查

API 暴露两个无需认证的健康入口：

- `/api/health`：返回数据库、Redis、事件通道和关键配置状态。
- `/api/health/redis`：仅检查 Redis ping，便于单项排障。

生产环境至少应把 `/api/health` 接入平台 readiness probe。若未显式配置 `Cors:AllowedOrigins`，非 Development 环境会在健康检查的 `configuration` 明细中标记为 `unhealthy`。

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
pnpm e2e
pnpm dlx markdown-link-check README.md DEVELOPMENT.md AGENT.md docs/*.md
```

GitHub Actions 最小门禁见 [.github/workflows/ci.yml](../.github/workflows/ci.yml)。
