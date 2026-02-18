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

- **事件**：
  - 成功注册后发布 `auth.user.registered` 到 Redis Stream `stream:auth`（异步审计事件）。

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

- **事件**：
  - 成功登录后发布 `auth.user.login` 到 Redis Stream `stream:auth`（异步审计事件）。

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

- **事件**：
  - 成功修改后发布 `auth.user.password.changed` 到 Redis Stream `stream:auth`（异步审计事件）。

### 6. 退出登录

- **方法**：POST
- **路径**：`/api/auth/logout`
- **认证**：是
- **参数**：无
- **返回 data**：
  - `message`：`"退出成功"`

- **事件**：
  - 成功退出后发布 `auth.user.logout` 到 Redis Stream `stream:auth`（异步审计事件）。

### 7. 示例受保护接口

- **方法**：GET
- **路径**：`/api/home`
- **认证**：是
- **参数**：无
- **返回 data**：
  - 字符串：`"Hello world"`

---

## 用户管理接口 (`/api/users`)

> 以下接口均需登录且需要对应权限。未登录返回 `401`，权限不足返回 `403`。

### 8. 获取用户列表（分页 + 搜索）

- **方法**：GET
- **路径**：`/api/users`
- **认证**：是
- **权限**：`user:view`
- **查询参数**：
  - `page`：页码（默认 `1`，最小 `1`）
  - `pageSize`：每页数量（默认 `10`，范围 `1-100`）
  - `keyword`：搜索关键词（按用户名或显示名模糊匹配，可选）
- **返回 data**：
  - `items`：用户数组（见下方用户对象结构）
  - `total`：总数
  - `page`：当前页
  - `pageSize`：每页数量

**用户对象结构**：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | number | 用户 ID |
| `username` | string | 用户名 |
| `displayName` | string \| null | 显示名称 |
| `status` | number | 状态（0=启用，1=禁用） |
| `createdAt` | string | 创建时间（UTC） |
| `updatedAt` | string \| null | 更新时间（UTC） |
| `roles` | array | 角色列表，包含 `id` 和 `name` |

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "items": [
      {
        "id": 1,
        "username": "admin",
        "displayName": "管理员",
        "status": 0,
        "createdAt": "2026-01-01T00:00:00Z",
        "updatedAt": null,
        "roles": [{ "id": 1, "name": "Admin" }]
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### 9. 获取用户详情

- **方法**：GET
- **路径**：`/api/users/{id}`
- **认证**：是
- **权限**：`user:view`
- **路径参数**：
  - `id`：用户 ID
- **返回 data**：用户对象（同上）
- **可能错误码**：
  - `404`：用户不存在

### 10. 创建用户

- **方法**：POST
- **路径**：`/api/users`
- **认证**：是
- **权限**：`user:create`
- **请求体**：
  - `username`：用户名（必填）
  - `password`：密码（必填）
  - `displayName`：显示名称（可选）
  - `roleIds`：角色 ID 数组（可选）
- **返回 data**：创建后的用户对象
- **可能错误码**：
  - `400`：用户名或密码为空
  - `409`：用户已存在

示例请求体：

```json
{
  "username": "editor",
  "password": "editor123",
  "displayName": "编辑员",
  "roleIds": [2]
}
```

### 11. 更新用户

- **方法**：PUT
- **路径**：`/api/users/{id}`
- **认证**：是
- **权限**：`user:edit`
- **路径参数**：
  - `id`：用户 ID
- **请求体**（所有字段均为可选，仅提供的字段会被更新）：
  - `displayName`：显示名称
  - `status`：状态（`0`=启用，`1`=禁用）
  - `password`：新密码（如需重置密码）
  - `roleIds`：角色 ID 数组（提供时会替换现有角色）
- **返回 data**：更新后的用户对象
- **可能错误码**：
  - `404`：用户不存在

示例请求体：

```json
{
  "displayName": "新名称",
  "status": 0,
  "roleIds": [1, 2]
}
```

### 12. 删除用户

- **方法**：DELETE
- **路径**：`/api/users/{id}`
- **认证**：是
- **权限**：`user:delete`
- **路径参数**：
  - `id`：用户 ID
- **返回 data**：
  - `message`：`"删除成功"`
- **可能错误码**：
  - `400`：不能删除自己
  - `404`：用户不存在
