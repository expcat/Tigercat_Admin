# 角色与权限 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录并按端点校验权限。

## 对象

`RoleDetailResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 角色 ID |
| `name` | string | 角色名称 |
| `description` | string \| null | 描述 |
| `createdAt` | string | UTC 创建时间 |
| `permissions` | array | `{ id, code, description }[]` |
| `users` | array | `{ id, username, displayName }[]` |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 / 说明 |
| ---------- | ---- | ------------- | ------ | ----------- |
| `GET /api/roles` | `role:view` | Query：`page` 默认 `1`；`pageSize` 默认 `10`、范围 `1-100`；`keyword`；`sortBy=id|name|createdat`；`sortOrder=asc|desc` | 分页角色 | - |
| `GET /api/roles/{id}` | `role:view` | Path：`id` | 角色对象 | `404` 角色不存在 |
| `POST /api/roles` | `role:create` | Body：`name` 必填、长度 2-50；`description` 最长 200；`permissionIds` 可选 | 创建后的角色对象 | `400` 名称为空/长度不合法/使用保留名 `Admin`/描述过长/权限 ID 无效；`409` 角色名称已存在 |
| `PUT /api/roles/{id}` | `role:edit` | Body 全可选：`name`、`description`、`permissionIds` | 更新后的角色对象 | `400` 名称或描述不合法、权限 ID 无效、不能改为保留名称；`404` 角色不存在；`409` 名称冲突 |
| `DELETE /api/roles/{id}` | `role:delete` | Path：`id` | `{ message }` | `400` 不能删除管理员角色；`404` 角色不存在 |
| `PUT /api/roles/{id}/permissions` | `role:edit` | Body：`permissionIds` 替换全部权限 | 更新后的角色对象 | `400` 权限 ID 无效、不能修改 `Admin` 角色权限；`404` 角色不存在 |
| `PUT /api/roles/{id}/users` | `role:edit` | Body：`userIds` 替换全部关联用户 | 更新后的角色对象 | `400` 用户 ID 无效、管理员角色必须至少有一个用户；`404` 角色不存在 |
| `GET /api/roles/permissions` | `role:view` | 无 | 权限数组 | - |

## 权限对象

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 权限 ID |
| `code` | string | 权限编码 |
| `description` | string \| null | 权限描述 |
