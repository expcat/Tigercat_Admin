# 数据导入 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

向导前三步（数据源、映射、参数）仍在页面本地。最后一步 `POST` 创建导入任务，再轮询 `GET` 直到完成。前端把最近任务 ID 写入 `sessionStorage` 键 `tigercat-admin:last-import-job`，刷新后可用 `GET` 恢复 Result。

## 对象

`ImportJobResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 导入任务 ID，如 `IMP-1001` |
| `source` | string | 文件名列表或「示例数据（未选择文件）」 |
| `target` | string[] | 目标表级联路径，如 `["hr","employees"]` |
| `mappings` | string[] | 已映射源字段 key |
| `mode` | string | `append`、`overwrite`、`upsert` |
| `conflict` | string | `skip`、`overwrite`、`error` |
| `batchSize` | number | 批量大小，默认 `1000`，范围 `100-5000` |
| `status` | string | `pending`、`running`、`completed`、`failed` |
| `progress` | number | 0-100 |
| `result` | object \| null | 完成时填充 |

`result`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `imported` | number | 导入条数（演示按映射字段数） |
| `skipped` | number | 跳过条数（`conflict=skip` 时为 1） |
| `message` | string | 足够填入 Result 副标题的摘要 |

服务端在每次 `GET` 时推进 `progress`（每次 +25 即可）。到 100 时 `status=completed` 并写入 `result`。MockApi 可用 `setTimeout` 辅助推进，但 `GET` 仍必须能观察到进展。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `POST /api/import-jobs` | 登录 | Body：`source`、`target`、`mappings`、`mode`、`conflict`；`batchSize` 可选 | 新建导入任务（`progress` 从 0 起） | `400` 目标/映射为空或枚举非法 |
| `GET /api/import-jobs/{id}` | 登录 | Path：任务 ID | 当前任务（可能已推进进度） | `404` 导入任务不存在 |
