# Tigercat Admin 开发指南

## 项目概述

Tigercat Admin 是一个现代化的管理后台基础架构，采用 .NET Aspire 编排，支持 Vue3 和 React 两套前端实现。

> 项目结构、开发规范与代码复用约定见 [AGENT.md](AGENT.md)。

## 开发环境设置

### 必备工具

| 工具     | 版本 | 验证命令           |
| -------- | ---- | ------------------ |
| .NET SDK | 10+  | `dotnet --version` |
| Node.js  | 18+  | `node --version`   |
| PNPM     | 8+   | `pnpm --version`   |

### 初始设置

```bash
git clone https://github.com/expcat/Tigercat_Admin.git
cd Tigercat_Admin
pnpm install
dotnet build Tigercat.Admin.sln
```

前端依赖以仓库根目录的 `pnpm-lock.yaml` 为准；不要在子项目目录单独执行 `pnpm install` 并提交与 workspace 不一致的安装结果。

## 日常开发

### 使用 Aspire 开发（推荐）

```bash
cd Tigercat.Aspire
dotnet run
```

启动后可通过 Aspire Dashboard 查看所有服务状态、日志与性能监控。

### 独立运行单个服务

```bash
# 后端 API（http://localhost:5137）
cd Tigercat.Admin.Api && dotnet run

# Vue3 前端（http://localhost:5173）
cd Tigercat.Admin.Vue && pnpm dev

# React 前端（http://localhost:5174）
cd Tigercat.Admin.React && pnpm dev
```

### API 代理

前端通过 `/api` 路径访问后端，Vite 自动代理。API 地址由 Aspire 通过 `VITE_API_URL` 环境变量提供。

## 构建

```bash
dotnet build Tigercat.Admin.sln   # 后端
pnpm build:all                    # 所有前端
```

构建产物：.NET → `bin/Debug/net10.0/`，Vue/React → `dist/`

## 发布与生产化

生产环境配置样例、健康检查、数据库发布策略和 CI 门禁见 [docs/deployment.md](docs/deployment.md)。

## 数据库配置

后端通过 `Database:Provider` 显式选择数据库提供程序：

- `Sqlite`：默认本地开发模式，数据落在 `Tigercat.Admin.Api/tigercat_admin.db`。
- `InMemory`：仅建议用于自动化测试、临时演示或需要无状态启动的场景。
- `PostgreSql`：用于生产或独立环境部署，需同时配置 `ConnectionStrings:DefaultConnection`。

默认配置已经写在 [Tigercat.Admin.Api/appsettings.json](Tigercat.Admin.Api/appsettings.json)。

常见切换方式：

```bash
# 切换到 InMemory
export Database__Provider=InMemory

# 切回 SQLite 本地持久化
export Database__Provider=Sqlite
export ConnectionStrings__DefaultConnection="Data Source=tigercat_admin.db"

# 使用 PostgreSQL
export Database__Provider=PostgreSql
export ConnectionStrings__DefaultConnection="Host=localhost;Port=5432;Database=tigercat_admin;Username=postgres;Password=postgres"
```

SQLite 会在启动时自动应用现有迁移；PostgreSQL 在当前样例中使用启动时建表，适合配置验证与样例部署。如需严格迁移治理，请在后续迭代补齐独立的 PostgreSQL migration pipeline。

完整说明见 [docs/database.md](docs/database.md)。

## 端口分配

| 服务             | 端口 | 说明             |
| ---------------- | ---- | ---------------- |
| API              | 5137 | 后端 API 服务    |
| Vue3             | 5173 | Vue 开发服务器   |
| React            | 5174 | React 开发服务器 |
| Aspire Dashboard | 动态 | Aspire 管理面板  |

## 故障排查

### PNPM 依赖问题

```bash
pnpm store prune
rm -rf node_modules
pnpm install
```

### .NET 构建问题

```bash
dotnet clean && dotnet restore && dotnet build
```

## 常用命令速查

```bash
# PNPM Workspace
pnpm install              # 安装所有依赖
pnpm dev:vue             # 运行 Vue 开发服务器
pnpm dev:react           # 运行 React 开发服务器
pnpm dev:demo:all        # 同时启动本地 Vue 和 React 静态 Mock 演示服务 (无需启动后端)
pnpm build:all           # 构建所有前端项目
pnpm e2e                 # 运行 React + Vue 首批 E2E 烟测
pnpm e2e:react           # 仅运行 React E2E 烟测
pnpm e2e:vue             # 仅运行 Vue E2E 烟测

# .NET
dotnet build             # 构建解决方案
dotnet test Tigercat.Admin.sln  # 运行后端回归测试
dotnet run               # 运行当前项目
dotnet clean             # 清理构建产物

# Aspire
cd Tigercat.Aspire && dotnet run
```

说明：默认只维护仓库根目录的 workspace lockfile；若子项目出现旧依赖残留，回到仓库根目录重新执行 `pnpm install`。

## 参考资源

- [.NET Aspire 文档](https://learn.microsoft.com/zh-cn/dotnet/aspire/)
- [Vue 3 文档](https://cn.vuejs.org/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [PNPM 文档](https://pnpm.io/)
