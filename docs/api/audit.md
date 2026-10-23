# 审计日志 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录并按端点校验权限。

## 对象

`AuditLogItemResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 事件 ID |
| `stream` | string | Redis Stream |
| `category` | string | `auth`、`user`、`task`、`system` 等 |
| `eventType` | string | 事件类型 |
| `occurredAtUtc` | string | UTC 时间 |
| `traceId` | string \| null | 请求跟踪 ID |
| `title` | string | 前端可用标题 |
| `description` | string | 前端可用描述 |
| `actor` | string \| null | 操作者，优先取 `operator`，其次取 `username` |
| `data` | object | 已转为字符串或 `null` 的事件载荷 |

审计写入和读取会清理敏感字段；字段名包含 `password`、`pwd`、`token`、`authorization`、`secret`、`credential`、`apiKey` 或 `privateKey` 等片段时不会出现在审计输出中。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` / 返回 | 错误 / 事件 |
| ---------- | ---- | ------------- | ------------- | ----------- |
| `GET /api/audit-logs` | `audit:view` | Query：`page` 默认 `1`；`pageSize` 默认 `30`、范围 `1-100`；`category`、`eventType`、`actor`、`keyword`、`from`、`to` | 分页审计日志 | `503` Redis 不可用；先取最近 1000 条，再筛选、计算 total 和分页（同导出窗口） |
| `GET /api/audit-logs/{id}` | `audit:view` | Path：`id` | 单条审计日志 | `404` 不存在；`503` Redis 不可用 |
| `GET /api/audit-logs/export` | `audit:export` | Query：同审计列表筛选（`keyword`、`category`、`eventType`、`actor`、`from`、`to`）；`format=csv|json|xlsx` 默认 `csv`；`fields` 可选 | 文件流 `audit-logs.csv/json/xlsx`；CSV 带 UTF-8 BOM | `400` 不支持格式；`503` Redis 不可用；最多导出 1000 条 |
| `GET /api/audit-logs/retention-policy` | `audit:view` | 无 | `retentionDays`、`updatedAtUtc` | 默认 90 天 |
| `PUT /api/audit-logs/retention-policy` | `setting:edit` | Body：`retentionDays`，整数，范围 `1-3650` | `retentionDays`、`updatedAtUtc` | `400` 范围非法；事件 `admin.setting.updated` |
| `POST /api/audit-logs/retention/cleanup` | `setting:edit` | Body：`dryRun` | `dryRun`、`retentionDays`、`cutoffUtc`、`matchedCount`、`deletedCount` | `503` Redis 不可用；非 dry-run 发事件 `admin.audit.retention.cleaned` |

审计导出字段：`id`、`stream`、`category`、`eventType`、`occurredAtUtc`、`traceId`、`title`、`description`、`actor`。未传 `fields` 时导出全部字段。

列表、详情与导出均使用最近 1000 条事件窗口，页码不改变窗口或 total 的计算范围。前端在总数缩减后回到有效页码；URL 的 `eventId` 通过单条端点独立定位，不受当前页或筛选影响，404 / 503 时保留明确错误，不替换为列表首条。无 `audit:view` 时页面不发送列表、详情或保留策略读取请求；导出与修改仍分别依赖对应权限。

## 已知事件类型

常见事件包括：`auth.user.registered`、`auth.user.login`、`auth.user.password.changed`、`auth.user.logout`、`admin.user.created`、`admin.user.updated`、`admin.user.deleted`、`admin.user.batch.deleted`、`admin.user.batch.status.updated`、`admin.user.password.reset`、`admin.task.created`、`admin.task.updated`、`admin.task.moved`、`admin.task.completed`、`admin.setting.updated`、`admin.audit.retention.cleaned`、`admin.media.delete.failed`。
