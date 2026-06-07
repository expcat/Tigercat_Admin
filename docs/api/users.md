# 用户管理 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录并按端点校验权限。

## 对象

`UserItemResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 用户 ID |
| `username` | string | 用户名 |
| `displayName` | string \| null | 显示名称 |
| `status` | number | `0`=Active，`1`=Disabled |
| `avatarMediaId` | number \| null | 头像媒体资源 ID |
| `avatarUrl` | string \| null | 头像内容 URL |
| `createdAt` | string | UTC 创建时间 |
| `updatedAt` | string \| null | UTC 更新时间 |
| `roles` | array | `{ id, name }[]` |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 / 事件 |
| ---------- | ---- | ------------- | ------ | ----------- |
| `GET /api/users` | `user:view` | Query：`page` 默认 `1`；`pageSize` 默认 `10`、范围 `1-100`；`keyword`；`sortBy=id|username|displayname|status|createdat`；`sortOrder=asc|desc`；`status=0|1` | 分页用户 | `400` 无效 `status` |
| `GET /api/users/{id}` | `user:view` | Path：`id` | 用户对象 | `404` 用户不存在 |
| `POST /api/users` | `user:create` | Body：`username`、`password` 必填；`displayName`、`roleIds` 可选 | 创建后的用户对象 | `400` 用户名/密码为空、用户名长度 2-50、用户名字符非法、密码策略不满足、显示名称超 100、角色 ID 无效；`409` 用户已存在；事件 `admin.user.created` |
| `PUT /api/users/{id}` | `user:edit` | Body 全可选：`displayName`、`status`、`password`、`roleIds`、`avatarMediaId`；`avatarMediaId<=0` 清空头像 | 更新后的用户对象 | `400` 无效状态、密码策略不满足、显示名称超 100、角色 ID 无效、头像不存在或非图片；`404` 用户不存在；事件 `admin.user.updated`，改密码另发 `admin.user.password.reset` |
| `DELETE /api/users/{id}` | `user:delete` | Path：`id` | `{ message }` | `400` 不能删除自己 / 最后一个管理员；`404` 用户不存在；事件 `admin.user.deleted` |
| `POST /api/users/batch-delete` | `user:delete` | Body：`ids` 必填且至少一个 | `{ message }` | `400` 未选择、包含当前登录用户、删除最后一个管理员；`404` 未找到任何用户；事件 `admin.user.batch.deleted` |
| `POST /api/users/batch-status` | `user:edit` | Body：`ids` 必填，`status` 为 `0` 或 `1` | `{ message }` | `400` 未选择、状态无效、禁用当前用户、禁用最后一个可用管理员；`404` 任一用户 ID 不存在；事件 `admin.user.batch.status.updated` |

## 关键示例

分页列表形状：

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
        "avatarMediaId": null,
        "avatarUrl": null,
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
