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
| `GET /api/audit-logs` | `audit:view` | Query：`page` 默认 `1`；`pageSize` 默认 `30`、范围 `1-100`；`category`、`eventType`、`actor`、`keyword`、`from`、`to` | 分页审计日志 | `503` Redis 不可用；最大搜索窗口 1000 |
| `GET /api/audit-logs/{id}` | `audit:view` | Path：`id` | 单条审计日志 | `404` 不存在；`503` Redis 不可用 |
| `GET /api/audit-logs/export` | `audit:export` | Query：同审计列表筛选 | CSV 文件，`text/csv; charset=utf-8`，带 UTF-8 BOM | `503` Redis 不可用；最多导出 1000 条 |
| `GET /api/audit-logs/retention-policy` | `audit:view` | 无 | `retentionDays`、`updatedAtUtc` | 默认 90 天 |
| `PUT /api/audit-logs/retention-policy` | `setting:edit` | Body：`retentionDays`，范围 `1-3650` | `retentionDays`、`updatedAtUtc` | `400` 范围非法；事件 `admin.setting.updated` |
| `POST /api/audit-logs/retention/cleanup` | `setting:edit` | Body：`dryRun` | `dryRun`、`retentionDays`、`cutoffUtc`、`matchedCount`、`deletedCount` | `503` Redis 不可用；非 dry-run 发事件 `admin.audit.retention.cleaned` |

## 已知事件类型

常见事件包括：`auth.user.registered`、`auth.user.login`、`auth.user.password.changed`、`auth.user.logout`、`admin.user.created`、`admin.user.updated`、`admin.user.deleted`、`admin.user.batch.deleted`、`admin.user.batch.status.updated`、`admin.user.password.reset`、`admin.task.created`、`admin.task.updated`、`admin.task.moved`、`admin.task.completed`、`admin.setting.updated`、`admin.audit.retention.cleaned`、`admin.media.delete.failed`。
