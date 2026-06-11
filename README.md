# Tigercat_Admin

Tigercat Admin 是基于 .NET Aspire、.NET 10 Minimal API、React 19、Vue 3 和 Tigercat UI 的管理后台基础架构。仓库同时维护 React 与 Vue 两套前端，共用 API、业务类型、权限模型和界面规范；它同时是**创建新的 Tigercat 后台管理网站的官方蓝本**——Agent 可以参照本仓库，在其他目录从零搭建基于 Tigercat 的 Vue 或 React 后台项目。

## 两种使用方式

先判断你的目标，再进入对应文档线：

| 你的目标 | 入口 |
| -------- | ---- |
| 以本仓库为蓝本，在其他目录创建新的 React / Vue + Tigercat 后台 | [docs/guide/new-project.md](docs/guide/new-project.md) |
| 为新项目选择或对接后端（任意后端 / 本仓库 .NET API / MockApi） | [docs/guide/backend.md](docs/guide/backend.md) |
| 运行、学习、修改、维护本仓库 | [AGENT.md](AGENT.md) + [docs/llm.md](docs/llm.md) |

## Agent 必读规则

- LLM 按需读取：先经 [docs/llm.md](docs/llm.md) 路由判别任务，再读最小必要文档，不要一次性加载全部文档。
- 两条文档线规则互不适用：修改本仓库前先读 [AGENT.md](AGENT.md)；创建新项目时 AGENT.md 的验证命令与文档同步规则不适用，以 [docs/guide/new-project.md](docs/guide/new-project.md) 的验收清单为准。

## 文档地图

### 创建新项目（蓝本线）

| 文档 | 用途 |
| ---- | ---- |
| [docs/guide/new-project.md](docs/guide/new-project.md) | 脚手架、依赖、Tailwind v4 + Tigercat 接入、App Shell 复制清单、页面模式、验收 |
| [docs/guide/backend.md](docs/guide/backend.md) | 前端后端抽象契约与三种后端方案 |
| [docs/frontend.md](docs/frontend.md) | 两线共用：组件选择矩阵、视觉规则、双端映射、表格约定（guide 按需引用） |

### 维护本仓库（贡献线）

| 文档 | 用途 |
| ---- | ---- |
| [docs/llm.md](docs/llm.md) | LLM 按需读取入口、任务到文档的路由、Skill 使用提示 |
| [AGENT.md](AGENT.md) | 代码代理工作规则、Skill 指引、同步文档和验证要求 |
| [docs/frontend.md](docs/frontend.md) | React / Vue 前端蓝图、Tigercat UI 使用规范 |
| [docs/frontend-upstream-suggestions.md](docs/frontend-upstream-suggestions.md) | 待上游 Tigercat UI 改进的组件能力清单 |
| [docs/api.md](docs/api.md) | API 契约索引、通用响应、认证、错误码和专题入口 |
| [docs/operations.md](docs/operations.md) | 本地开发、数据库、部署、健康检查、CI 和发布 smoke |

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
    └── guide/                    # 创建新项目线：bootstrap 与后端方案
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

## 许可证

[LICENSE](LICENSE)
