# 通知中心 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录并按端点校验权限。

## 对象

`NotificationItemResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 通知公开 ID |
| `groupKey` | string | 分组，例如 `ops`、`security`、`release` |
| `title` | string | 标题 |
| `description` | string | 描述 |
| `time` | string | 创建时间字符串 |
| `read` | boolean | 是否已读 |
| `toastType` | string | 前端 toast 类型 |
| `meta` | object | 字符串键值元数据 |
| `linkUrl` | string \| null | 站内跳转路径 |
| `createdAt` | string | UTC 创建时间 |
| `readAt` | string \| null | UTC 已读时间 |
| `updatedAt` | string \| null | UTC 更新时间 |

后台事件消费者会把任务、设置、审计清理、媒体删除失败和关键用户治理等事件转化为通知。自动生成通知 ID 格式为 `notif-{eventId}`。`linkUrl` 只使用站内路径，例如 `/tasks?taskId=...`、`/settings?key=...`、`/audit-logs?eventId=...`、`/files`。

`CreateNotificationRequest`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `groupKey` | string | 必填，`ops`、`security`、`release` |
| `title` | string | 必填标题 |
| `description` | string | 描述，可空 |
| `toastType` | string | 必填，`info`、`success`、`warning`、`error` |
| `linkUrl` | string \| null | 可选站内路径，须以 `/` 开头且不能是 `//` |
| `meta` | object | 可选字符串键值 |

当前通知是全局列表，不是按用户分发。`POST` 创建即插入一条未读记录，前端当作广播演示。权限码 `notification:create`（「创建通知」）种子给 Admin 与 Editor；Viewer 与 Demo 不给。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 / 说明 |
| ---------- | ---- | ------------- | ------ | ----------- |
| `GET /api/notifications` | `notification:view` | Query：`page` 默认 `1`；`pageSize` 默认 `50`、范围 `1-100`；`groupKey`；`unread=true|false` | 分页通知 | 未读优先，再按创建时间倒序 |
| `POST /api/notifications` | `notification:create` | Body：`groupKey`、`title`、`description`、`toastType`、`linkUrl?`、`meta?` | 新建的 `NotificationItemResponse`（未读） | `400` 标题为空、分组/类型非法或链接不是安全站内路径 |
| `PUT /api/notifications/{id}/read` | `notification:edit` | Body：`read` | 更新后的通知对象 | `404` 通知不存在 |
| `POST /api/notifications/mark-read` | `notification:edit` | Body：`groupKey` 可为 `null` 或省略 | `{ message }` | 只处理未读通知；传分组时只处理该组 |

前端通知中心取第 1 页、每页 100 条，显示服务端 total，分组未读数仅统计当前加载记录。通知及已读状态由所有账号共享；批量成功提示不以当前加载数量冒充全组处理量。单项和批量写需 `notification:edit`，串行提交且成功后才更新本地状态，失败显示原因并可重试；点击链接标已读失败时停留在通知中心。站内目标的 `taskId` / `eventId` 由目标页独立读取，未知 ID 明确显示失败。创建弹层仅成功后关闭，失败在弹层内显示原因并保留输入，提交期间禁重复及关闭。

工作台只读 `unread=true&page=1&pageSize=5`，显示未读总数，直接打开安全站内目标且不写已读状态。读取需 `notification:view`，目标链接另核对目标页权限；Header 铃铛也按读取权限挂载。
