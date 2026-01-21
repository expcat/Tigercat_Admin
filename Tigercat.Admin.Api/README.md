# Tigercat.Admin.Api

Tigercat Admin 后端 API 服务，基于 .NET 10 Minimal API。

## 技术栈

- .NET 10
- Minimal API
- Aspire ServiceDefaults
- CORS 支持
- OpenAPI + Scalar UI

## API 文档

接口列表、参数与返回说明见 [docs/api.md](../docs/api.md)。

## OpenAPI 文档

- OpenAPI JSON：`/openapi/v1.json`
- UI（Scalar）：`/scalar`

## 认证说明

认证方式与示例见 [docs/api.md](../docs/api.md)。

### 默认用户（开发环境）

服务启动时会预置以下账号：

- `admin / admin`
- `Admin / Admin`
- `test / test`

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
