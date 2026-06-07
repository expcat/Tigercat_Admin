# 健康、应用信息、认证与权限 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。

## 端点

| 方法与路径 | 认证 | 权限 | 参数 / 请求体 | `data` | 错误 / 事件 |
| ---------- | ---- | ---- | ------------- | ------ | ----------- |
| `GET /api/health` | 否 | 无 | 无 | `status`、`timestamp`、`details`；`details` 含 `database`、`redis`、`eventChannel`、`mediaStorage`、`configuration`、`security` | 任一依赖或关键配置不可用时返回 `503`；生产 `security` 检查 PostgreSQL TLS、Redis TLS、CORS、`AllowedHosts`、默认管理员密码和安全策略 |
| `GET /api/health/redis` | 否 | 无 | 无 | `status`、`timestamp` | Redis 不可用返回 `503` |
| `GET /api/info` | 否 | 无 | 无 | `name`、`version`、`description` | - |
| `POST /api/auth/register` | 否 | 无 | `username`、`password` 必填 | `username` | `400` 用户名/密码为空或密码策略不满足；`409` 用户已存在；事件 `auth.user.registered` 到 `stream:auth` |
| `POST /api/auth/login` | 否 | 无 | `username`、`password` 必填 | `token`、`expiresAt`、`username` | `401` 账号或密码错误；`429` 登录失败次数过多；事件 `auth.user.login` 到 `stream:auth` |
| `POST /api/auth/change-password` | 是 | 无 | `oldPassword`、`newPassword` 必填 | `message` | `400` 新密码不满足策略；`401` 未登录或旧密码错误；事件 `auth.user.password.changed` 到 `stream:auth` |
| `POST /api/auth/logout` | 是 | 无 | 无 | `message` | 事件 `auth.user.logout` 到 `stream:auth` |
| `GET /api/home` | 是 | 无 | 无 | 字符串 `"Hello world"` | 示例受保护接口 |
| `GET /api/auth/permissions` | 是 | 无 | 无 | `username`、`permissions[]` | `401` 未登录 |

## 对象

`permissions[]` 元素：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 权限 ID |
| `code` | string | 权限编码 |
| `description` | string \| null | 权限描述 |

## 关键示例

登录成功：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "token": "session-token",
    "expiresAt": "2026-01-21T00:00:00Z",
    "username": "admin"
  }
}
```
