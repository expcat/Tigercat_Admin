# 任务面板 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录并按端点校验权限。

## 对象

`AdminTaskResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 任务公开 ID |
| `title` | string | 标题，最长 120 |
| `description` | string \| null | 说明，最长 1000 |
| `assignee` | string | 负责人，最长 80，默认 `待分配` |
| `priority` | string | `low`、`medium`、`high` |
| `status` | string | `backlog`、`todo`、`doing`、`review`、`done` |
| `dueAt` | string | UTC 截止时间 |
| `estimateHours` | number | 预估工时，范围 `0-1000` |
| `blocked` | boolean | 是否阻塞 |
| `blockedReason` | string \| null | 阻塞原因，最长 500 |
| `completionNote` | string \| null | 完成说明，最长 500 |
| `createdBy` | string \| null | 创建人 |
| `createdAt` | string | UTC 创建时间 |
| `updatedAt` | string \| null | UTC 更新时间 |
| `completedAt` | string \| null | UTC 完成时间 |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 / 事件 |
| ---------- | ---- | ------------- | ------ | ----------- |
| `GET /api/tasks` | `task:view` | Query：`page` 默认 `1`；`pageSize` 默认 `100`、范围 `1-200`；`status`；`keyword`；`assignee`；`dueFrom`；`dueTo`；`blocked` | 分页任务 | `400` 无效任务状态 |
| `GET /api/tasks/{id}` | `task:view` | Path：任务公开 ID | 任务对象 | `404` 任务不存在 |
| `POST /api/tasks` | `task:create` | Body：`title` 必填；`description`、`assignee`、`priority`、`status`、`dueAt`、`estimateHours`、`blocked`、`blockedReason` 可选 | 创建后的任务对象 | `400` 字段长度、枚举或工时非法；事件 `admin.task.created` |
| `PUT /api/tasks/{id}` | `task:edit` | Body：同创建任务，全部可选 | 更新后的任务对象 | `400` 字段长度、枚举或工时非法；`404` 任务不存在；事件 `admin.task.updated` |
| `PUT /api/tasks/{id}/status` | `task:edit` | Body：`status` | 更新后的任务对象 | `400` 状态非法或阻塞任务移动到 `done`；`404` 任务不存在；事件 `admin.task.moved` |
| `POST /api/tasks/{id}/complete` | `task:edit` | Body：`confirm=true`，`completionNote` 可选 | 更新后的任务对象 | `400` 未确认、完成说明过长、阻塞任务不能完成；`404` 任务不存在；事件 `admin.task.completed` |
