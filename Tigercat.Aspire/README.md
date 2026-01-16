# Tigercat.Aspire

Aspire 主控项目，用于编排和管理 Tigercat Admin 的所有服务。

## 功能

- 编排后端 API 服务
- 编排 Vue3 前端服务
- 编排 React 前端服务
- 提供统一的服务管理面板

## 运行

```bash
dotnet run
```

运行后访问 Aspire Dashboard 查看所有服务状态。

## 配置

服务配置在 `AppHost.cs` 中定义，包括:
- API 服务端口和路由
- 前端服务端口和路由
- 服务间依赖关系
