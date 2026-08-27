# 仪表盘统计与导出 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。

## 统计

统计接口需要登录。

| 方法与路径 | 参数 | `data` | 错误 / 说明 |
| ---------- | ---- | ------ | ----------- |
| `GET /api/stats/overview` | 无 | `totalUsers`、`activeUsers`、`disabledUsers`、`totalRoles`、`totalPermissions` | - |
| `GET /api/stats/trend` | Query：`days` 默认 `7`，范围 `1-90` | `points[]`，元素为 `{ date, count }` | 统计用户创建趋势 |

## 导出

导出接口需要登录并按端点校验权限。返回文件流，不包裹 `ApiResponse<T>`；格式错误时返回通用错误 JSON。

| 方法与路径 | 权限 | 参数 | 返回 | 错误 / 说明 |
| ---------- | ---- | ---- | ---- | ----------- |
| `GET /api/export/users` | `user:view` | Query：`format=csv|json|xlsx` 默认 `csv`；`fields` 可选；`keyword`；`status=0|1`；`sortBy=id|username|displayname|status|createdat`；`sortOrder=asc|desc` | `users.csv/json/xlsx` | `400` 不支持格式或无效 `status`；最多导出 10000 行 |
| `GET /api/export/roles` | `role:view` | Query：`format=csv|json|xlsx` 默认 `csv`；`fields` 可选；`keyword`；`sortBy=id|name|createdat`；`sortOrder=asc|desc` | `roles.csv/json/xlsx` | `400` 不支持格式；最多导出 10000 行 |
| `GET /api/export/reports` | 登录即可 | Query：`type=daily|weekly|monthly`；`format=csv|json|xlsx` 默认 `csv`；`fields` 可选 | `reports.csv/json/xlsx` | `400` 不支持 `type` 或格式。数据与报表页 KPI / 渠道演示表一致 |
| `GET /api/export/overview` | 登录即可 | Query：`format=csv|json|xlsx` 默认 `csv`；`days` 默认 `7`，范围 `1-90`（与 `/api/stats/trend` 相同） | `overview.csv/json/xlsx` | `400` 不支持格式。内容来自当前概览指标 + 用户创建趋势 |

## 字段

用户导出字段：`id`、`username`、`displayName`、`status`、`createdAt`、`updatedAt`、`roles`。

角色导出字段：`id`、`name`、`description`、`createdAt`、`permissions`、`userCount`。

报表导出字段：`section`、`visits`、`orders`、`conversionRate`、`revenue`、`channel`、`channelVisits`、`channelOrders`、`channelRate`、`channelAmount`。`section` 为 `kpi` 或 `channel`。

概览导出字段：`section`、`key`、`label`、`value`。`section` 为 `overview`（KPI）或 `trend`（按日新增用户）。
