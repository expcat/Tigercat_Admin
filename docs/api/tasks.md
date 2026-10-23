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
| `GET /api/tasks` | `task:view` | Query：`page` 默认 `1`；`pageSize` 默认 `100`、范围 `1-200`；`status`；`keyword`；`assignee`；`assigneeExact`；`unfinished`；`dueFrom`；`dueTo`；`blocked` | 分页任务 | `400` 无效任务状态 |
| `GET /api/tasks/{id}` | `task:view` | Path：任务公开 ID | 任务对象 | `404` 任务不存在 |
| `POST /api/tasks` | `task:create` | Body：`title` 必填；`description`、`assignee`、`priority`、`status`、`dueAt`、`estimateHours`、`blocked`、`blockedReason` 可选 | 创建后的任务对象 | `400` 字段长度、枚举或工时非法；事件 `admin.task.created` |
| `PUT /api/tasks/{id}` | `task:edit` | Body：同创建任务，全部可选 | 更新后的任务对象 | `400` 字段长度、枚举或工时非法；`404` 任务不存在；事件 `admin.task.updated` |
| `PUT /api/tasks/{id}/status` | `task:edit` | Body：`status` | 更新后的任务对象 | `400` 状态非法或阻塞任务移动到 `done`；`404` 任务不存在；事件 `admin.task.moved` |
| `POST /api/tasks/{id}/complete` | `task:edit` | Body：`confirm=true`，`completionNote` 可选 | 更新后的任务对象 | `400` 未确认、完成说明过长、阻塞任务不能完成；`404` 任务不存在；事件 `admin.task.completed` |

`keyword` 对标题、说明和负责人做不区分大小写的包含匹配；`assignee` 也做不区分大小写的包含匹配。可选 `assigneeExact` 对去除首尾空白后的查询值做不区分大小写的精确匹配；可选 `unfinished=true` 排除 `done`，覆盖 `backlog` / `todo` / `doing` / `review`。多个筛选取交集，空查询不限制；省略新参数时保持原行为。`total` 在全部筛选后、分页前计算。真实 API 与 MockApi 使用相同筛选和分页默认值。

负责人仍是展示字符串，没有建立账号分派关系。工作台以当前用户名传 `assigneeExact`，展示「用户名匹配的待办」，明确文字匹配范围，不把结果宣称为账号名下任务。列表按状态、截止时间升序，再按内部 ID 降序；`dueFrom` / `dueTo` 是包含边界的 UTC 时间。

前端看板仅加载当前筛选的前 200 条；总数取分页响应的 `total`，阻塞、超期和 WIP 统计仅覆盖已加载卡片。日期筛选按本机日历日的起止时间转换为 UTC。`/tasks?taskId=` 独立调用 `GET /api/tasks/{id}`，不依赖当前筛选或前 200 条；未知 ID、无权限和临时错误分别显示页内详情错误并可重试。MockApi 同样支持单项 GET、精确 ID 和端点权限。
