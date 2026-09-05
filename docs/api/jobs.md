# 定时任务 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

`GET /api/jobs` 的 `data` 是 **任务数组**（不是 `PagedResponse`），包含 Gantt 所需的 `start` / `end` / `color`。

## 对象

`JobResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 任务号，种子 `JOB-1001`…`JOB-1004`；新建从 `JOB-1005` 起 |
| `name` | string | 名称，最长 120 |
| `cron` | string | 调度表达式 |
| `concurrency` | number | 并发数 `1-20` |
| `timeout` | string | 超时秒数（展示用字符串） |
| `batchSize` | string | 每批条数（展示用字符串） |
| `enabled` | boolean | 是否启用 |
| `status` | string | `running`、`paused`、`failed` |
| `lastRun` | string | 上次执行展示文案 |
| `nextRun` | string | 下次执行展示文案；停用时为 `—` |
| `progress` | number | 执行进度 0-100 |
| `phase` | number | 运行阶段下标 0-3 |
| `start` | string | Gantt 开始日期 `YYYY-MM-DD` |
| `end` | string | Gantt 结束日期 `YYYY-MM-DD` |
| `color` | string | Gantt 色条 |

状态机：`enabled=true` 时变为 `running`（若当前已是 `failed` 且并非从停用重新启用，则保持 `failed`）；`enabled=false` 时变为 `paused`，`nextRun` 为 `—`。新建任务的 Gantt 窗口默认为短演示区间 `2026-07-01`–`2026-07-02`。

`cron` / `nextRun` 是展示字段。本仓库**没有**真实 cron 执行器或按表达式触发的托管调度；不要把 Jobs 当成产品级任务队列。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/jobs` | 登录 | 无 | 任务数组 | — |
| `POST /api/jobs` | 登录 | Body：`name` 必填；`cron`、`concurrency`、`timeout`、`batchSize`、`enabled` 可选 | 创建后的任务对象 | `400` 名称为空或字段非法 |
| `PUT /api/jobs/{id}` | 登录 | Body：`name`、`cron`、`concurrency`、`timeout`、`batchSize`、`enabled`、`status` 均可选 | 更新后的任务对象 | `400` 字段非法；`404` 任务不存在 |

列表按任务号升序。启停走 `PUT` 的 `enabled`，随后前端再 `GET` 刷新。
