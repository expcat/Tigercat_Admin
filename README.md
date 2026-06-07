# Tigercat_Admin

Tigercat Admin 是基于 .NET Aspire、.NET 10 Minimal API、React 19、Vue 3 和 Tigercat UI 的管理后台基础架构。仓库同时维护 React 与 Vue 两套前端，共用 API、业务类型、权限模型和界面规范。

## 文档地图

| 文档 | 用途 |
| ---- | ---- |
| [docs/llm.md](docs/llm.md) | LLM 按需读取入口、任务到文档的路由、Skill 使用提示 |
| [AGENT.md](AGENT.md) | 代码代理工作规则、Skill 指引、同步文档和验证要求 |
| [docs/frontend.md](docs/frontend.md) | React / Vue 前端蓝图、Tigercat UI 使用规范、组件缺口 |
| [docs/api.md](docs/api.md) | API 契约索引、通用响应、认证、错误码和专题入口 |
| [docs/operations.md](docs/operations.md) | 本地开发、数据库、部署、健康检查、CI 和发布 smoke |

LLM 默认先读 [docs/llm.md](docs/llm.md)，再按任务读取对应专题；不要把专题细节重复堆回 README。

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
└── docs/                         # LLM 友好的按需专题文档
```

## 快速开始

环境要求：.NET 10 SDK、Node.js 20.11+、PNPM 10+。

```bash
pnpm install

cd Tigercat.Aspire
dotnet run
```

Aspire 会编排 API、React、Vue 和 Redis。也可以单独启动：

```bash
cd Tigercat.Admin.Api && dotnet run
cd Tigercat.Admin.React && pnpm dev
cd Tigercat.Admin.Vue && pnpm dev
```

默认端口：API `5137`，React `5174`，Vue `5173`，Aspire Dashboard 动态分配。

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

## 开发约定

- 自动化代理或 LLM 修改代码前先读 [AGENT.md](AGENT.md) 和 [docs/llm.md](docs/llm.md)。
- 新增或调整前端能力时同步维护 [docs/frontend.md](docs/frontend.md)。
- 新增或修改 API 时同步维护 [docs/api.md](docs/api.md) 和对应 [docs/api](docs/api) 专题。
- 数据库、部署、健康检查和 CI 事项同步维护 [docs/operations.md](docs/operations.md)。

## 许可证

[LICENSE](LICENSE)
