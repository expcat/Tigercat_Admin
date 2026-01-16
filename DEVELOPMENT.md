# Tigercat Admin 开发指南

## 项目概述

Tigercat Admin 是一个现代化的管理后台基础架构，采用 .NET Aspire 编排，支持 Vue3 和 React 两套前端实现。

## 开发环境设置

### 必备工具

1. **.NET 10 SDK**
   - 下载地址: https://dotnet.microsoft.com/download/dotnet/10.0
   - 验证安装: `dotnet --version`

2. **Node.js 18+**
   - 下载地址: https://nodejs.org/
   - 验证安装: `node --version`

3. **PNPM 8+**
   - 安装: `npm install -g pnpm`
   - 验证安装: `pnpm --version`

### 项目结构说明

```
Tigercat_Admin/
├── Tigercat.Admin.sln              # .NET 解决方案文件
├── package.json                     # PNPM workspace 配置
├── pnpm-workspace.yaml             # PNPM workspace 定义
├── 
├── Tigercat.Aspire/                # Aspire 主控
│   ├── AppHost.cs                  # 服务编排配置
│   └── Tigercat.Aspire.csproj
├── 
├── Tigercat.ServiceDefaults/       # Aspire 服务默认配置
│   ├── Extensions.cs               # 服务扩展方法
│   └── Tigercat.ServiceDefaults.csproj
├── 
├── Tigercat.Admin.Api/             # 后端 API
│   ├── Program.cs                  # API 入口和配置
│   ├── Tigercat.Admin.Api.csproj
│   └── appsettings.json
├── 
├── Tigercat.Admin.Vue/             # Vue3 前端
│   ├── src/
│   │   ├── App.vue                 # 主组件
│   │   └── main.js                 # 入口文件
│   ├── vite.config.js              # Vite 配置
│   └── package.json
└── 
└── Tigercat.Admin.React/           # React 前端
    ├── src/
    │   ├── App.jsx                 # 主组件
    │   └── main.jsx                # 入口文件
    ├── vite.config.js              # Vite 配置
    └── package.json
```

## 开发工作流

### 初始设置

```bash
# 克隆仓库
git clone https://github.com/expcat/Tigercat_Admin.git
cd Tigercat_Admin

# 安装前端依赖
pnpm install

# 构建 .NET 项目
dotnet build Tigercat.Admin.sln
```

### 日常开发

#### 使用 Aspire 开发（推荐）

```bash
# 启动所有服务
cd Tigercat.Aspire
dotnet run
```

这会启动：
- Aspire Dashboard (通常在 http://localhost:15xxx)
- 后端 API
- Vue3 前端
- React 前端

通过 Dashboard 可以：
- 查看所有服务状态
- 查看日志
- 监控性能
- 管理服务生命周期

#### 独立开发单个服务

**后端 API:**
```bash
cd Tigercat.Admin.Api
dotnet run
# 默认运行在 http://localhost:5137
```

**Vue3 前端:**
```bash
cd Tigercat.Admin.Vue
pnpm dev
# 运行在 http://localhost:5173
```

**React 前端:**
```bash
cd Tigercat.Admin.React
pnpm dev
# 运行在 http://localhost:5174
```

## API 开发

### 添加新端点

在 `Tigercat.Admin.Api/Program.cs` 中：

```csharp
app.MapGet("/api/users", () => 
{
    // 实现逻辑
    return Results.Ok(new { users = new[] { "user1", "user2" } });
})
.WithName("GetUsers");
```

### CORS 配置

CORS 已配置为允许所有来源（开发环境）：

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});
```

生产环境需要限制具体域名。

## 前端开发

### Vue3 开发

**组件结构:**
```vue
<script setup>
import { ref, onMounted } from 'vue'

const data = ref(null)

onMounted(async () => {
  const response = await fetch('/api/endpoint')
  data.value = await response.json()
})
</script>

<template>
  <div>{{ data }}</div>
</template>

<style scoped>
/* 样式 */
</style>
```

### React 开发

**组件结构:**
```jsx
import { useState, useEffect } from 'react'

function Component() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/api/endpoint')
      .then(response => response.json())
      .then(data => setData(data))
  }, [])

  return <div>{data}</div>
}

export default Component
```

### API 调用

前端通过 `/api` 路径访问后端，Vite 会自动代理。API 地址由 Aspire 通过 `VITE_API_URL` 环境变量提供：

```javascript
// Vue 或 React 中
fetch('/api/health')
  .then(response => response.json())
  .then(data => console.log(data))
```

代理配置在 `vite.config.js`:

```javascript
server: {
  proxy: {
    '/api': {
      target: process.env.VITE_API_URL,  // 由 Aspire 提供
      changeOrigin: true,
    }
  }
}
```

**注意**: 运行前端项目时，需要通过 Aspire 启动以获取正确的 API 地址。

## 构建和部署

### 构建所有项目

```bash
# .NET 项目
dotnet build Tigercat.Admin.sln

# 前端项目
pnpm build:all
```

### 单独构建

```bash
# API
cd Tigercat.Admin.Api
dotnet build

# Vue
cd Tigercat.Admin.Vue
pnpm build

# React
cd Tigercat.Admin.React
pnpm build
```

构建产物：
- .NET: `bin/Debug/net10.0/` 或 `bin/Release/net10.0/`
- Vue/React: `dist/`

## Tigercat UI 集成（待实现）

当 Tigercat UI 组件库就绪后：

### Vue3 集成
```bash
cd Tigercat.Admin.Vue
pnpm add tigercat-ui-vue
```

### React 集成
```bash
cd Tigercat.Admin.React
pnpm add tigercat-ui-react
```

## 端口分配策略

项目使用以下端口分配，避免冲突：

| 服务 | 默认端口 | 说明 |
|------|---------|------|
| API | 5137 | 后端 API 服务 |
| Vue3 | 5173 | Vue 开发服务器 |
| React | 5174 | React 开发服务器 |
| Aspire Dashboard | 动态分配 | Aspire 管理面板 |

端口可通过环境变量覆盖：
- Vue: `PORT=5175 pnpm dev`
- React: `PORT=5176 pnpm dev`
- API: 修改 `Properties/launchSettings.json`

## 故障排查

### 端口冲突

如果端口被占用，可以修改配置：

**API:** 修改 `Properties/launchSettings.json`
**Vue:** 设置环境变量 `PORT=5175 pnpm dev`
**React:** 设置环境变量 `PORT=5176 pnpm dev`

### PNPM 依赖问题

```bash
# 清理并重装
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### .NET 构建问题

```bash
# 清理并重建
dotnet clean
dotnet restore
dotnet build
```

## 最佳实践

1. **保持前端一致性**: Vue 和 React 实现应该有相同的界面和交互
2. **使用 Aspire Dashboard**: 开发时使用 Dashboard 监控所有服务
3. **API 优先**: 先设计 API 接口，再实现前端
4. **代码复用**: 提取可复用的组件和工具函数
5. **文档更新**: 添加新功能时更新相应文档

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
dotnet test              # 运行测试
dotnet clean             # 清理构建产物

# Aspire
cd Tigercat.Aspire && dotnet run    # 启动 Aspire 编排
```

## 参考资源

- [.NET Aspire 文档](https://learn.microsoft.com/zh-cn/dotnet/aspire/)
- [Vue 3 文档](https://cn.vuejs.org/)
- [React 文档](https://react.dev/)
- [Vite 文档](https://vitejs.dev/)
- [PNPM 文档](https://pnpm.io/)
