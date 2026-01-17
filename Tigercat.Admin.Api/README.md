# Tigercat.Admin.Api

Tigercat Admin 后端 API 服务，基于 .NET 10 Minimal API。

## 技术栈

- .NET 10
- Minimal API
- Aspire ServiceDefaults
- CORS 支持

## API 端点

- `GET /api/health` - 健康检查
- `GET /api/info` - 应用信息

## 运行

```bash
dotnet run
```

默认运行在 http://localhost:5000

## 开发

### 添加新端点

在 `Program.cs` 中添加新的路由:

```csharp
app.MapGet("/api/yourEndpoint", () => {
    // 实现逻辑
});
```

### CORS 配置

CORS 已配置为允许所有来源，生产环境需要根据实际情况调整。
