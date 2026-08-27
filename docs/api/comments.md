# 评论 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

评论是通用资源，`targetType` 目前为 `ticket` 或 `project`。工单页的 `CommentThread` 使用 `targetType=ticket`；项目详情使用 `targetType=project`。

## 对象

`CommentResponse`（对齐 `CommentThread` 节点）：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 评论 ID |
| `content` | string | 正文 |
| `user` | object | `{ name }`，创建时取当前用户显示名，否则用户名 |
| `time` | string | 展示时间 `yyyy-MM-dd HH:mm` |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/comments` | 登录 | Query：`targetType`（`ticket` \| `project`）、`targetId` 必填 | 评论数组，按时间升序 | `400` 无效 `targetType` 或缺少 `targetId` |
| `POST /api/comments` | 登录 | Body：`targetType`、`targetId`、`body` | 新建评论对象 | `400` 目标类型非法、目标 ID 或正文为空、长度超限 |

请求体字段名是 `body`，响应字段名是 `content`，以便直接交给 `CommentThread` 的 `nodes`。
