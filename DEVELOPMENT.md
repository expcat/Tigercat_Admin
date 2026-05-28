# Tigercat Admin 开发指南

## 项目概述

Tigercat Admin 是一个现代化的管理后台基础架构，采用 .NET Aspire 编排，支持 Vue3 和 React 两套前端实现。

> 项目结构、开发规范与代码复用约定见 [.github/copilot-instructions.md](.github/copilot-instructions.md)。

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
pnpm build:all           # 构建所有前端项目

# .NET
dotnet build             # 构建解决方案
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
