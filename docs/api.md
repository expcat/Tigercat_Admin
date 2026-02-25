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

### 7.1 获取当前用户权限

- **方法**：GET
- **路径**：`/api/auth/permissions`
- **认证**：是
- **参数**：无
- **返回 data**：
  - `username`：当前用户名
  - `permissions`：权限数组，每个元素包含 `id`、`code`、`description`（其中 `description` 可能为 `null`）
- **可能错误码**：
  - `401`：未登录

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "username": "admin",
    "permissions": [
      { "id": 1, "code": "dashboard:view", "description": "查看仪表盘" },
      { "id": 2, "code": "user:view", "description": "查看用户列表" },
      { "id": 3, "code": "user:create", "description": "创建用户" }
    ]
  }
}
```

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
  - `sortBy`：排序字段（可选，支持 `id`、`username`、`displayname`、`status`、`createdat`，默认按 `id`）
  - `sortOrder`：排序方向（可选，`asc` 或 `desc`，默认 `asc`）
  - `status`：状态筛选（可选，`0`=正常，`1`=禁用）
- **返回 data**：
  - `items`：用户数组（见下方用户对象结构）
  - `total`：总数
  - `page`：当前页
  - `pageSize`：每页数量

**用户对象结构**：

| 字段          | 类型           | 说明                                   |
| ------------- | -------------- | -------------------------------------- |
| `id`          | number         | 用户 ID                                |
| `username`    | string         | 用户名                                 |
| `displayName` | string \| null | 显示名称                               |
| `status`      | number         | 状态（0=Active 活跃，1=Disabled 禁用） |
| `createdAt`   | string         | 创建时间（UTC）                        |
| `updatedAt`   | string \| null | 更新时间（UTC）                        |
| `roles`       | array          | 角色列表，包含 `id` 和 `name`          |

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
  - `400`：用户名或密码为空 / 用户名格式不合法（长度 2-50，仅字母数字及 `_-.`）/ 密码长度不足 6 位 / 显示名称超过 100 字符 / 角色 ID 无效
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

错误示例（用户已存在）：

```json
{
  "code": 409,
  "message": "用户已存在",
  "success": false,
  "data": null
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
  - `displayName`：显示名称（最长 100 字符）
  - `status`：状态（`0`=Active，`1`=Disabled）
  - `password`：新密码（如需重置密码，最短 6 位；会发布审计事件）
  - `roleIds`：角色 ID 数组（提供时会替换现有角色，所有 ID 须有效）
- **返回 data**：更新后的用户对象
- **可能错误码**：
  - `400`：无效的用户状态 / 密码过短（最短 6 位）/ 显示名称过长（最长 100 字符）/ 角色 ID 无效
  - `404`：用户不存在

- **事件**：
  - 若修改了密码，发布 `admin.user.password.reset` 到 Redis Stream `stream:auth`（包含 `targetUserId`、`targetUsername`、`operator`）。

示例请求体：

```json
{
  "displayName": "新名称",
  "status": 0,
  "roleIds": [1, 2]
}
```

错误示例（用户不存在）：

```json
{
  "code": 404,
  "message": "用户不存在",
  "success": false,
  "data": null
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
  - `400`：不能删除自己 / 不能删除最后一个管理员用户
  - `404`：用户不存在

错误示例（不能删除自己）：

```json
{
  "code": 400,
  "message": "不能删除自己",
  "success": false,
  "data": null
}
```

### 12.1 批量删除用户

- **方法**：POST
- **路径**：`/api/users/batch-delete`
- **认证**：是
- **权限**：`user:delete`
- **请求体**：
  - `ids`：用户 ID 数组（必填，至少包含一个 ID）
- **返回 data**：
  - `message`：`"成功删除 N 个用户"`
- **可能错误码**：
  - `400`：请选择要删除的用户 / 不能删除当前登录用户 / 不能删除最后一个管理员用户
  - `404`：未找到任何要删除的用户

示例请求体：

```json
{
  "ids": [2, 3, 5]
}
```

示例返回：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "message": "成功删除 3 个用户"
  }
}
```

---

## 角色管理接口 (`/api/roles`)

> 以下接口均需登录且需要对应权限。未登录返回 `401`，权限不足返回 `403`。

**角色对象结构**：

| 字段          | 类型           | 说明            |
| ------------- | -------------- | --------------- |
| `id`          | number         | 角色 ID         |
| `name`        | string         | 角色名称        |
| `description` | string \| null | 描述            |
| `createdAt`   | string         | 创建时间（UTC） |
| `permissions` | array          | 权限列表        |
| `users`       | array          | 关联用户列表    |

**权限对象结构**（`permissions` 数组元素）：

| 字段          | 类型           | 说明     |
| ------------- | -------------- | -------- |
| `id`          | number         | 权限 ID  |
| `code`        | string         | 权限编码 |
| `description` | string \| null | 权限描述 |

**角色用户对象结构**（`users` 数组元素）：

| 字段          | 类型           | 说明     |
| ------------- | -------------- | -------- |
| `id`          | number         | 用户 ID  |
| `username`    | string         | 用户名   |
| `displayName` | string \| null | 显示名称 |

### 13. 获取角色列表（分页 + 搜索）

- **方法**：GET
- **路径**：`/api/roles`
- **认证**：是
- **权限**：`role:view`
- **查询参数**：
  - `page`：页码（默认 `1`，最小 `1`）
  - `pageSize`：每页数量（默认 `10`，范围 `1-100`）
  - `keyword`：搜索关键词（按角色名称或描述模糊匹配，可选）
  - `sortBy`：排序字段（可选，支持 `id`、`name`、`createdat`，默认按 `id`）
  - `sortOrder`：排序方向（可选，`asc` 或 `desc`，默认 `asc`）
- **返回 data**：
  - `items`：角色数组（见上方角色对象结构）
  - `total`：总数
  - `page`：当前页
  - `pageSize`：每页数量

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
        "name": "Admin",
        "description": "超级管理员，拥有所有权限",
        "createdAt": "2026-01-01T00:00:00Z",
        "permissions": [
          { "id": 1, "code": "dashboard:view", "description": "查看仪表盘" }
        ],
        "users": [{ "id": 1, "username": "admin", "displayName": "管理员" }]
      }
    ],
    "total": 1,
    "page": 1,
    "pageSize": 10
  }
}
```

### 14. 获取角色详情

- **方法**：GET
- **路径**：`/api/roles/{id}`
- **认证**：是
- **权限**：`role:view`
- **路径参数**：
  - `id`：角色 ID
- **返回 data**：角色对象（同上）
- **可能错误码**：
  - `404`：角色不存在

### 15. 创建角色

- **方法**：POST
- **路径**：`/api/roles`
- **认证**：是
- **权限**：`role:create`
- **请求体**：
  - `name`：角色名称（必填，长度 2-50）
  - `description`：描述（可选，最长 200 字符）
  - `permissionIds`：权限 ID 数组（可选）
- **返回 data**：创建后的角色对象
- **可能错误码**：
  - `400`：名称为空 / 名称长度不合法（2-50）/ 角色名称为系统保留（`Admin`）/ 描述过长 / 权限 ID 无效
  - `409`：角色名称已存在

示例请求体：

```json
{
  "name": "Operator",
  "description": "运维人员",
  "permissionIds": [1, 2, 3]
}
```

错误示例（角色名称已存在）：

```json
{
  "code": 409,
  "message": "角色名称已存在",
  "success": false,
  "data": null
}
```

### 16. 更新角色

- **方法**：PUT
- **路径**：`/api/roles/{id}`
- **认证**：是
- **权限**：`role:edit`
- **路径参数**：
  - `id`：角色 ID
- **请求体**（所有字段均为可选，仅提供的字段会被更新）：
  - `name`：角色名称（长度 2-50，不可改为保留名称 `Admin`）
  - `description`：描述（最长 200 字符）
  - `permissionIds`：权限 ID 数组（提供时会替换现有权限，所有 ID 须有效）
- **返回 data**：更新后的角色对象
- **可能错误码**：
  - `400`：名称长度不合法 / 描述过长 / 权限 ID 无效 / 不能使用保留角色名称
  - `404`：角色不存在
  - `409`：角色名称已存在

示例请求体：

```json
{
  "name": "Operator",
  "description": "运维人员（更新）",
  "permissionIds": [1, 2]
}
```

### 17. 删除角色

- **方法**：DELETE
- **路径**：`/api/roles/{id}`
- **认证**：是
- **权限**：`role:delete`
- **路径参数**：
  - `id`：角色 ID
- **返回 data**：
  - `message`：`"删除成功"`
- **可能错误码**：
  - `400`：不能删除管理员角色（`Admin` 为系统保留角色）
  - `404`：角色不存在

错误示例（不能删除管理员角色）：

```json
{
  "code": 400,
  "message": "不能删除管理员角色",
  "success": false,
  "data": null
}
```

### 18. 配置角色权限

- **方法**：PUT
- **路径**：`/api/roles/{id}/permissions`
- **认证**：是
- **权限**：`role:edit`
- **路径参数**：
  - `id`：角色 ID
- **请求体**：
  - `permissionIds`：权限 ID 数组（替换该角色所有权限）
- **返回 data**：更新后的角色对象
- **可能错误码**：
  - `400`：权限 ID 无效 / 不能修改管理员角色的权限（Admin 角色始终拥有所有权限）
  - `404`：角色不存在

示例请求体：

```json
{
  "permissionIds": [1, 2, 3, 4]
}
```

错误示例（尝试修改 Admin 角色权限）：

```json
{
  "code": 400,
  "message": "不能修改管理员角色的权限",
  "success": false,
  "data": null
}
```

### 19. 配置角色用户

- **方法**：PUT
- **路径**：`/api/roles/{id}/users`
- **认证**：是
- **权限**：`role:edit`
- **路径参数**：
  - `id`：角色 ID
- **请求体**：
  - `userIds`：用户 ID 数组（替换该角色所有关联用户）
- **返回 data**：更新后的角色对象
- **可能错误码**：
  - `400`：用户 ID 无效 / 管理员角色必须至少有一个用户（不能清空 Admin 角色关联用户）
  - `404`：角色不存在

示例请求体：

```json
{
  "userIds": [1, 2]
}
```

错误示例（尝试清空 Admin 角色用户）：

```json
{
  "code": 400,
  "message": "管理员角色必须至少有一个用户",
  "success": false,
  "data": null
}
```

### 20. 获取所有权限列表

- **方法**：GET
- **路径**：`/api/roles/permissions`
- **认证**：是
- **权限**：`role:view`
- **参数**：无
- **返回 data**：权限数组，每个元素包含 `id`、`code`、`description`

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": [
    { "id": 1, "code": "dashboard:view", "description": "查看仪表盘" },
    { "id": 2, "code": "user:view", "description": "查看用户列表" },
    { "id": 3, "code": "user:create", "description": "创建用户" }
  ]
}
```

---

## 统计接口 (`/api/stats`)

> 以下接口均需登录（无额外权限要求）。未登录返回 `401`。

### 21. 统计概览

- **方法**：GET
- **路径**：`/api/stats/overview`
- **认证**：是（登录即可，无额外权限要求）
- **参数**：无
- **返回 data**：
  - `totalUsers`：用户总数
  - `activeUsers`：启用用户数
  - `disabledUsers`：禁用用户数
  - `totalRoles`：角色总数
  - `totalPermissions`：权限总数
- **可能错误码**：
  - `401`：未登录

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "totalUsers": 10,
    "activeUsers": 8,
    "disabledUsers": 2,
    "totalRoles": 3,
    "totalPermissions": 12
  }
}
```

### 22. 用户创建趋势

- **方法**：GET
- **路径**：`/api/stats/trend`
- **认证**：是（登录即可，无额外权限要求）
- **查询参数**：
  - `days`（可选，默认 `7`，范围 `1-90`）：统计天数。超出范围的值会被自动修正到最近的边界值。
- **返回 data**：
  - `points`：按日期排列的数组，包含请求天数内每一天的数据（含零值天）
    - `date`：日期字符串（`yyyy-MM-dd`）
    - `count`：当日新增用户数
- **可能错误码**：
  - `401`：未登录

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "points": [
      { "date": "2026-02-19", "count": 0 },
      { "date": "2026-02-20", "count": 2 },
      { "date": "2026-02-21", "count": 1 },
      { "date": "2026-02-22", "count": 0 },
      { "date": "2026-02-23", "count": 3 },
      { "date": "2026-02-24", "count": 0 },
      { "date": "2026-02-25", "count": 1 }
    ]
  }
}
```

### 23. 用户状态分布

- **方法**：GET
- **路径**：`/api/stats/distribution`
- **认证**：是（登录即可，无额外权限要求）
- **参数**：无
- **返回 data**：
  - `items`：分布数组
    - `label`：状态标签（`Active` / `Disabled`）
    - `value`：对应数量
- **可能错误码**：
  - `401`：未登录

示例：

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {
    "items": [
      { "label": "Active", "value": 8 },
      { "label": "Disabled", "value": 2 }
    ]
  }
}
```

---

## 导出接口 (`/api/export`)

> 以下接口均需登录且需要对应权限。未登录返回 `401`，权限不足返回 `403`。
> 单次导出上限为 **10,000** 条记录，超出时仅返回前 10,000 条。

### 24. 导出用户数据

- **方法**：GET
- **路径**：`/api/export/users`
- **认证**：是
- **权限**：`user:view`
- **查询参数**：
  - `format`（可选）：导出格式，可选 `csv`（默认）、`json`、`xlsx`
  - `fields`（可选）：导出字段，逗号分隔。可选值：`id`、`username`、`displayName`、`status`、`createdAt`、`updatedAt`、`roles`。留空则导出全部字段。无效字段名会被忽略，若全部无效则导出全部字段。
- **返回**：文件下载（非 JSON API 响应）
  - CSV：`text/csv; charset=utf-8`，带 UTF-8 BOM（兼容 Excel 直接打开）
  - JSON：`application/json; charset=utf-8`，数组格式
  - XLSX：`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **可能错误码**：
  - `400`：不支持的格式
  - `401`：未登录
  - `403`：权限不足

示例请求：

```
GET /api/export/users?format=csv&fields=id,username,status
```

错误示例（不支持的格式）：

```json
{
  "code": 400,
  "message": "不支持的格式，可选值：csv, json, xlsx",
  "success": false,
  "data": null
}
```

### 25. 导出角色数据

- **方法**：GET
- **路径**：`/api/export/roles`
- **认证**：是
- **权限**：`role:view`
- **查询参数**：
  - `format`（可选）：导出格式，可选 `csv`（默认）、`json`、`xlsx`
  - `fields`（可选）：导出字段，逗号分隔。可选值：`id`、`name`、`description`、`createdAt`、`permissions`、`userCount`。留空则导出全部字段。无效字段名会被忽略，若全部无效则导出全部字段。
- **返回**：文件下载（非 JSON API 响应）
  - CSV：`text/csv; charset=utf-8`，带 UTF-8 BOM（兼容 Excel 直接打开）
  - JSON：`application/json; charset=utf-8`，数组格式
  - XLSX：`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **可能错误码**：
  - `400`：不支持的格式
  - `401`：未登录
  - `403`：权限不足

示例请求：

```
GET /api/export/roles?format=xlsx&fields=id,name,description
```

错误示例（不支持的格式）：

```json
{
  "code": 400,
  "message": "不支持的格式，可选值：csv, json, xlsx",
  "success": false,
  "data": null
}
```

---

## 通用错误码参考

下表列出所有接口可能返回的业务状态码，供前端统一处理。

| 状态码 | 含义           | 说明                                                               |
| ------ | -------------- | ------------------------------------------------------------------ |
| `200`  | 成功           | 请求成功                                                           |
| `201`  | 创建成功       | 资源创建成功（POST 创建用户/角色等）                               |
| `400`  | 请求参数错误   | 参数缺失、格式不合法、违反业务规则（如不能删除自己、保留角色名等） |
| `401`  | 未授权         | 未登录或 Token 无效/过期                                           |
| `403`  | 权限不足       | 已登录但没有对应操作权限                                           |
| `404`  | 资源不存在     | 请求的用户、角色等不存在                                           |
| `409`  | 冲突           | 资源已存在（用户名/角色名重复）                                    |
| `500`  | 服务器内部错误 | 服务端异常                                                         |
| `503`  | 服务不可用     | 依赖服务不可用（如 Redis 故障）                                    |

### 通用错误返回示例

未登录（`401`）：

```json
{
  "code": 401,
  "message": "未授权",
  "success": false,
  "data": null
}
```

权限不足（`403`）：

```json
{
  "code": 403,
  "message": "权限不足",
  "success": false,
  "data": null
}
```

---

## 审计事件汇总

以下 API 操作在成功后会发布异步审计事件至 Redis Stream（`stream:auth`）：

| 事件类型                     | 触发操作                            | 载荷字段                                     |
| ---------------------------- | ----------------------------------- | -------------------------------------------- |
| `auth.user.registered`       | POST `/api/auth/register`           | `username`                                   |
| `auth.user.login`            | POST `/api/auth/login`              | `username`、`expiresAt`                      |
| `auth.user.password.changed` | POST `/api/auth/change-password`    | `username`                                   |
| `auth.user.logout`           | POST `/api/auth/logout`             | `username`                                   |
| `admin.user.password.reset`  | PUT `/api/users/{id}`（修改密码时） | `targetUserId`、`targetUsername`、`operator` |
