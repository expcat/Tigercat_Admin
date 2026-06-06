# Tigercat_Admin

Tigercat Admin 是一个基于 .NET Aspire、.NET 10 Minimal API、React 19、Vue 3 和 Tigercat UI 的管理后台基础架构。仓库同时维护 React 与 Vue 两套前端，用同一组 API、业务类型、权限模型和界面规范验证后台管理体验。

## 文档地图

| 文档 | 用途 |
| ---- | ---- |
| [AGENT.md](AGENT.md) | 代码代理工作规则、双端一致性和验证要求 |
| [docs/frontend.md](docs/frontend.md) | React / Vue 前端蓝图、Tigercat UI 使用规范、LLM 生成指南 |
| [docs/api.md](docs/api.md) | 后端 API 契约、认证、错误码和事件说明 |
| [docs/operations.md](docs/operations.md) | 本地开发、数据库、部署、健康检查、CI 和发布 smoke |

如果目标是让 LLM 基于 Tigercat UI 生成相似的 Admin 前端，请按顺序读取：

```text
README.md -> docs/frontend.md -> docs/api.md
```

## 项目结构

```text
Tigercat_Admin/
├── Tigercat.Aspire/              # Aspire 主控项目
├── Tigercat.ServiceDefaults/     # Aspire 服务默认配置
├── Tigercat.Admin.Api/           # .NET 10 Minimal API 后端
├── Tigercat.Admin.Api.Tests/     # 后端测试
├── Tigercat.Admin.React/         # React + Vite 前端
├── Tigercat.Admin.Vue/           # Vue 3 + Vite 前端
├── Tigercat.Admin.MockApi/       # 前端静态演示 Mock API
├── e2e/                          # Playwright 双端测试
└── docs/                         # 保留的专题文档
```

## 快速开始

环境要求：

- .NET 10 SDK
- Node.js 20.11+
- PNPM 10+

安装依赖：

```bash
pnpm install
```

优先通过 Aspire 启动完整系统：

```bash
cd Tigercat.Aspire
dotnet run
```

也可以单独启动服务：

```bash
cd Tigercat.Admin.Api && dotnet run
cd Tigercat.Admin.React && pnpm dev
cd Tigercat.Admin.Vue && pnpm dev
```

默认端口：

| 服务 | 端口 |
| ---- | ---- |
| API | 5137 |
| React | 5174 |
| Vue | 5173 |
| Aspire Dashboard | 动态 |

## 常用命令

```bash
dotnet build Tigercat.Admin.sln
dotnet test Tigercat.Admin.sln
pnpm build:frontend
pnpm build:demo
pnpm e2e:react
pnpm e2e:vue
pnpm db:script:postgres
pnpm run check:links
```

前端依赖以仓库根目录的 `pnpm-lock.yaml` 为准；不要在 `Tigercat.Admin.React` 或 `Tigercat.Admin.Vue` 目录单独安装并提交漂移后的 lockfile。

## 核心能力

- Aspire 编排 API、React、Vue 和 Redis。
- .NET 10 Minimal API，支持认证、用户、角色、权限、统计、导出、设置、媒体、通知、任务和审计日志。
- React / Vue 双端共用业务概念，并保持页面、交互、状态命名和权限入口一致。
- Tigercat UI 1.2.16：`@expcat/tigercat-react`、`@expcat/tigercat-vue`、`@expcat/tigercat-core`。
- Tailwind CSS v4 通过 Tigercat modern 插件接入主题 token。
- SQLite 本地默认开发，PostgreSQL 生产发布，Redis 用于缓存与事件流。
- Playwright 覆盖 React / Vue 双端主流程和显示门禁。

## 开发约定

- 新增前端能力时先读 [docs/frontend.md](docs/frontend.md)，优先使用 Tigercat UI 组件。
- 涉及后端接口时同步维护 [docs/api.md](docs/api.md)。
- 数据库、部署、健康检查和 CI 事项见 [docs/operations.md](docs/operations.md)。
- 自动化代理或 LLM 修改代码前应先读 [AGENT.md](AGENT.md)。

## 许可证

[LICENSE](LICENSE)
