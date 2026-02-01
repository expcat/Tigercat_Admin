# API 文档

> 用途：提供前端开发接口参考（接口列表、参数与返回值）。

## 通用返回结构

所有接口返回统一结构（`ApiResponse<T>`）：

- `code`：业务状态码（成功为 `200`，失败为具体错误码）
- `message`：提示信息
- `success`：是否成功
- `data`：接口数据（不同接口的重点字段）

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {}
}
```

## 认证方式

需要登录的接口支持两种方式之一：

- `X-Token: <TOKEN>`
- `Authorization: Bearer <TOKEN>`

## 接口列表

### 1. 健康检查

- **方法**：GET
- **路径**：`/api/health`
- **认证**：否
- **参数**：无
- **返回 data**：
  - `status`：健康状态字符串
  - `timestamp`：UTC 时间

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-21T00:00:00Z"
  }
}
```

### 1.1 Redis 健康检查

- **方法**：GET
- **路径**：`/api/health/redis`
- **认证**：否
- **参数**：无
- **返回 data**：
  - `status`：健康状态字符串
  - `timestamp`：UTC 时间

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-01-21T00:00:00Z"
  }
}
```

失败示例（Redis 不可用时）：

```json
{
  "code": 503,
  "message": "Redis unavailable",
  "success": false,
  "data": {
    "status": "unhealthy",
    "timestamp": "2026-01-21T00:00:00Z"
  }
}
```

### 2. 应用信息

- **方法**：GET
- **路径**：`/api/info`
- **认证**：否
- **参数**：无
- **返回 data**：
  - `name`：应用名称
  - `version`：版本号
  - `description`：描述

### 3. 注册用户

- **方法**：POST
- **路径**：`/api/auth/register`
- **认证**：否
- **请求体**：
  - `username`：用户名（必填）
  - `password`：密码（必填）
- **返回 data**：
  - `username`：注册成功的用户名
- **可能错误码**：
  - `400`：用户名或密码为空
  - `409`：用户已存在

### 4. 登录

- **方法**：POST
- **路径**：`/api/auth/login`
- **认证**：否
- **请求体**：
  - `username`：用户名（必填）
  - `password`：密码（必填）
- **返回 data**：
  - `token`：会话 Token
  - `expiresAt`：过期时间（UTC）
  - `username`：用户名
- **可能错误码**：
  - `401`：账号或密码错误

### 5. 修改密码

- **方法**：POST
- **路径**：`/api/auth/change-password`
- **认证**：是
- **请求体**：
  - `oldPassword`：旧密码（必填）
  - `newPassword`：新密码（必填）
- **返回 data**：
  - `message`：`"密码修改成功"`
- **可能错误码**：
  - `401`：未登录或旧密码错误

### 6. 退出登录

- **方法**：POST
- **路径**：`/api/auth/logout`
- **认证**：是
- **参数**：无
- **返回 data**：
  - `message`：`"退出成功"`

### 7. 示例受保护接口

- **方法**：GET
- **路径**：`/api/home`
- **认证**：是
- **参数**：无
- **返回 data**：
  - 字符串：`"Hello world"`
