# Tigercat_Admin

Tigercat Admin 是一个基于 .NET Aspire、Vue3/React 和 Tigercat UI 的管理后台项目基础架构。

## 🏗️ 项目结构

```
Tigercat_Admin/
├── Tigercat.Aspire/              # Aspire 主控项目 (.NET 10)
├── Tigercat.ServiceDefaults/     # Aspire 服务默认配置
├── Tigercat.Admin.Api/           # 后端 API (.NET 10 Minimal API)
├── Tigercat.Admin.Vue/           # Vue3 前端项目
└── Tigercat.Admin.React/         # React 前端项目
```

## 🚀 快速开始

### 环境要求

- .NET 10 SDK
- Node.js 18+
- PNPM 8+

### 安装依赖

```bash
# 安装前端依赖
cd Tigercat.Admin.Vue && pnpm install
cd ../Tigercat.Admin.React && pnpm install
```

### 运行项目

#### 方式 1: 使用 Aspire 主控（推荐）

```bash
cd Tigercat.Aspire
dotnet run
```

访问 Aspire Dashboard 查看所有服务状态和管理。

#### 方式 2: 单独运行各个项目

**后端 API:**
```bash
cd Tigercat.Admin.Api
dotnet run
```

**Vue3 前端:**
```bash
cd Tigercat.Admin.Vue
pnpm dev
```

**React 前端:**
```bash
cd Tigercat.Admin.React
pnpm dev
```

## 📦 项目特性

- ✅ .NET 10 Aspire 主控和编排
- ✅ .NET 10 Minimal API 后端
- ✅ Vue3 + Vite 前端
- ✅ React 19 + Vite 前端
- ✅ PNPM 包管理
- ✅ 基础健康检查 API
- ⏳ Tigercat UI 集成（待实现）
- ⏳ 路由配置（待实现）
- ⏳ 状态管理（待实现）
- ⏳ 业务功能（待实现）

## 🧩 架构说明

### Aspire 主控
使用 .NET Aspire 进行服务编排，统一管理后端 API 和前端项目。

### 后端 API
- 使用 .NET 10 Minimal API
- 集成 Aspire ServiceDefaults
- 配置 CORS 支持跨域
- 提供基础 API 端点:
  - `/api/health` - 健康检查
  - `/api/info` - 应用信息

### 前端项目
- Vue3 和 React 两套独立实现
- 使用 Vite 作为构建工具
- 配置 API 代理
- 基础管理后台界面
- 预留 Tigercat UI 集成

## 📝 开发说明

### 添加新功能
1. 在对应的前端项目中添加组件和页面
2. 在后端 API 中添加对应的端点
3. 确保两套前端实现保持界面和交互一致

### Tigercat UI 集成
待 Tigercat UI 组件库就绪后，按照以下步骤集成:
1. 在前端项目中安装 Tigercat UI 包
2. 配置组件库
3. 替换基础组件为 Tigercat UI 组件

## 📄 许可证

[LICENSE](LICENSE)