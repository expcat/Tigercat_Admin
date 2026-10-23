# 仪表盘统计与导出 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。

## 统计

统计接口需要登录。

| 方法与路径 | 参数 | `data` | 错误 / 说明 |
| ---------- | ---- | ------ | ----------- |
| `GET /api/stats/overview` | 无 | `totalUsers`、`activeUsers`、`disabledUsers`、`totalRoles`、`totalPermissions` | - |
| `GET /api/stats/trend` | Query：`days` 默认 `7`，范围 `1-90` | `points[]`，元素为 `{ date, count }` | 统计用户创建趋势 |

趋势按 UTC 日期统计真实用户 `CreatedAt`，范围为 UTC 今天向前 `days - 1` 天至今天（首尾均包含），缺失日期补零。Mock 使用其用户集合的 `createdAt`，同样支持 1–90 天。概览始终为当前累计值，不随天数过滤。

## 导出

导出接口需要登录并按端点校验权限。返回文件流，不包裹 `ApiResponse<T>`；格式错误时返回通用错误 JSON。

| 方法与路径 | 权限 | 参数 | 返回 | 错误 / 说明 |
| ---------- | ---- | ---- | ---- | ----------- |
| `GET /api/export/users` | `user:view` | Query：`format=csv|json|xlsx` 默认 `csv`；`fields` 可选；`keyword`；`status=0|1`；`sortBy=id|username|displayname|status|createdat`；`sortOrder=asc|desc` | `users.csv/json/xlsx` | `400` 不支持格式或无效 `status`；最多导出 10000 行 |
| `GET /api/export/roles` | `role:view` | Query：`format=csv|json|xlsx` 默认 `csv`；`fields` 可选；`keyword`；`sortBy=id|name|createdat`；`sortOrder=asc|desc` | `roles.csv/json/xlsx` | `400` 不支持格式；最多导出 10000 行 |
| `GET /api/export/reports` | 登录即可 | Query：`type=daily|weekly|monthly`；`format=csv|json|xlsx` 默认 `csv`；`fields` 可选 | `reports.csv/json/xlsx` | `400` 不支持 `type` 或格式。保留的旧版静态销售示例端点，当前报表页不再使用 |
| `GET /api/export/overview` | 登录即可 | Query：`format=csv|json|xlsx` 默认 `csv`；`days` 默认 `7`，范围 `1-90`（与 `/api/stats/trend` 相同） | `overview.csv/json/xlsx` | `400` 不支持格式。内容来自当前概览指标 + 用户创建趋势 |

## 字段

用户导出字段：`id`、`username`、`displayName`、`status`、`createdAt`、`updatedAt`、`roles`。

角色导出字段：`id`、`name`、`description`、`createdAt`、`permissions`、`userCount`。

报表导出字段：`section`、`visits`、`orders`、`conversionRate`、`revenue`、`channel`、`channelVisits`、`channelOrders`、`channelRate`、`channelAmount`。`section` 为 `kpi` 或 `channel`。

概览导出字段：`section`、`key`、`label`、`value`。`section` 为 `overview`（KPI）或 `trend`（按日新增用户）。

当前报表页同时读取概览与趋势，预览、A4 打印和 `/api/export/overview` 使用同一天数。导出按五项概览（`totalUsers`、`activeUsers`、`disabledUsers`、`totalRoles`、`totalPermissions`）后接逐日趋势排序；趋势的 `key` 与 `label` 均为 `YYYY-MM-DD`，`value` 为计数字符串。CSV / JSON / XLSX 的字段、顺序和数值相同。导出会重新查询，若系统数据发生变化，应先刷新预览再比较；不提供跨请求快照事务。
