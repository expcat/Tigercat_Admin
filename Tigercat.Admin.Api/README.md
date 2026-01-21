# Tigercat.Admin.Api

Tigercat Admin 后端 API 服务，基于 .NET 10 Minimal API。

## 技术栈

- .NET 10
- Minimal API
- Aspire ServiceDefaults
- CORS 支持
- OpenAPI + Scalar UI

## API 端点

- `GET /api/health` - 健康检查
- `GET /api/info` - 应用信息
- `POST /api/auth/register` - 注册用户
- `POST /api/auth/login` - 登录获取 Token
- `POST /api/auth/change-password` - 修改密码（需登录）
- `GET /api/home` - 示例受保护接口（需登录）

## OpenAPI 文档

- OpenAPI JSON：`/openapi/v1.json`
- UI（Scalar）：`/scalar`

## 登录与 Token 使用

### 1) 登录获取 Token

请求：

```bash
curl -X POST http://localhost:5137/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin"}'
```

响应示例：

```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "token": "<TOKEN>",
    "expiresAt": "2026-01-21T00:00:00Z",
    "username": "admin"
  },
  "success": true
}
```

### 2) 携带 Token 访问受保护接口

支持两种方式：

1. `X-Token` 请求头

```bash
curl http://localhost:5137/api/home \
    -H "X-Token: <TOKEN>"
```

2. `Authorization: Bearer` 请求头

```bash
curl http://localhost:5137/api/home \
    -H "Authorization: Bearer <TOKEN>"
```

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
