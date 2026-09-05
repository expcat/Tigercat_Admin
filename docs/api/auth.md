# 健康、应用信息、认证与权限 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。

## 端点

| 方法与路径 | 认证 | 权限 | 参数 / 请求体 | `data` | 错误 / 事件 |
| ---------- | ---- | ---- | ------------- | ------ | ----------- |
| `GET /api/health` | 否 | 无 | 无 | `status`、`timestamp`、`details`；`details` 含 `database`、`redis`、`eventChannel`、`mediaStorage`、`configuration`、`security` | 包络不变。内部委托 `IHealthCheck`（tag `ready`）。任一依赖或关键配置不可用时返回 `503`；`Infrastructure:UseInMemory=true` 时 Redis / 事件通道为 in-memory。生产 `security` 检查 PostgreSQL TLS、Redis TLS、CORS、`AllowedHosts`、默认管理员密码（Identity 哈希或未升级的 SHA256 hex 均按 `admin123` 校验）和安全策略。Aspire `/health` 与 `/alive` 仅 Development，不是本契约 |
| `GET /api/health/redis` | 否 | 无 | 无 | `status`、`timestamp` | Redis 不可用返回 `503` |
| `GET /api/info` | 否 | 无 | 无 | `name`、`version`、`description` | - |
| `POST /api/auth/register` | 否 | 无 | `username`、`password` 必填 | `username` | `400` 用户名/密码为空或密码策略不满足；`409` 用户已存在；同一 IP 触发认证限流时 `429`（`ApiResponse`，message「请求过于频繁」）；事件 `auth.user.registered` 到 `stream:auth` |
| `POST /api/auth/login` | 否 | 无 | `username`、`password` 必填 | 成功：`token`、`expiresAt`、`username`。若该账号 `TwoFactorEnabled`，密码正确后不发 token，返回 `requiresTwoFactor: true`、`username`、`challengeId`。种子账号 `demo`/`demo` 默认开启 2FA，`admin` 默认关闭 | `401` 账号或密码错误；账号锁定 `429`（失败次数过多）；同一 IP 认证限流 `429`（「请求过于频繁」）。锁定按账号+IP，限流按 IP，两者叠加。完整登录成功后事件 `auth.user.login` 到 `stream:auth` |
| `POST /api/auth/two-factor/verify` | 否 | 无 | `username`、`code`，可选 `challengeId` | `token`、`expiresAt`、`username`。须先走登录 2FA 挑战；演示环境验证码固定 `123456` | `401` 验证码错误或挑战不存在/不匹配；同一 IP 认证限流 `429` |
| `GET /api/auth/two-factor` | 是 | 无 | 无 | `enabled`：当前用户是否开启 2FA | `401` 未登录 |
| `PUT /api/auth/two-factor` | 是 | 无 | `enabled` | `enabled`。开启后该账号下次登录需要 OTP | `401` 未登录 |
| `POST /api/auth/forgot-password/code` | 否 | 无 | `channel`（`email` / `phone`）、`target` | `sentTo`。目标用户不存在时仍返回成功，避免账号枚举。验证码 5 分钟 TTL，演示环境固定 `123456` | `400` 请输入邮箱或手机号；同一 IP 认证限流 `429` |
| `POST /api/auth/forgot-password` | 否 | 无 | `channel`、`target`、`code`、`password` | `message`。用户存在则更新密码；不存在仍返回成功 | `400` 验证码错误或密码不满足策略；同一 IP 认证限流 `429` |
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

开启 2FA 的账号密码校验通过后：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "token": null,
    "expiresAt": null,
    "username": "demo",
    "requiresTwoFactor": true,
    "challengeId": "challenge-id"
  }
}
```

## 密码哈希与认证限流

- 新密码使用 ASP.NET Identity `PasswordHasher<T>`（PBKDF2）。不引入 Cookie Identity / JWT。
- 库中仍为 SHA256 hex 的旧哈希在**密码校验成功后**透明升级。登录契约（`X-Token` / `Bearer`、session token）不变。
- 2FA 与忘记密码演示码仍为 `123456`，本阶段不改为 TOTP/短信。
- `POST /api/auth/login`、`/two-factor/verify`、`/forgot-password*`、`/register` 叠加 IP `RateLimiter`；账号锁定仍按失败次数。两种 `429` 都走 `ApiResponse`。限流窗口见 [operations.md](../operations.md)。
