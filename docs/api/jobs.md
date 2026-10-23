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

本仓库保存任务配置和启停标记，**没有**真实 cron 执行器或按表达式触发的托管调度。`status`、`lastRun`、`nextRun`、`progress`、`phase` 和 Gantt 的 `start` / `end` 是示例字段；保存 Cron 不会驱动时间轴、计算运行历史或触发执行。页面已将时间、状态和阶段明确标为示例。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/jobs` | 登录 | 无 | 任务数组 | — |
| `POST /api/jobs` | 登录 | Body：`name` 必填；`cron`、`concurrency`、`timeout`、`batchSize`、`enabled` 可选 | 创建后的任务对象 | `400` 名称为空或字段非法 |
| `PUT /api/jobs/{id}` | 登录 | Body：`name`、`cron`、`concurrency`、`timeout`、`batchSize`、`enabled`、`status` 均可选 | 更新后的任务对象 | `400` 字段非法；`404` 任务不存在 |

列表按任务号升序。启停走 `PUT` 的 `enabled`，随后前端再 `GET` 刷新。

## 前端校验与恢复

React / Vue 表单要求名称 trim 后非空且不超过 120 字，Cron 非空且不超过 64 字，使用现有 Core 校验 5 段数字 Unix Cron；不在 Admin 复制解析器。并发数必须是 1–20 的整数，清空不回填默认值。`timeout` / `batchSize` 仍为展示字符串，仅检查不超过 16 字，不要求数字或正数；数字键盘只是批量条数的输入方式。以上为页面输入约束，没有修改 API 的 `RequireLogin` 或请求 / 响应契约。

合法表达式可能没有下一次运行时间，例如 `0 0 31 2 *`；Core 的 `nextCronRun` 返回 `null` 不等于语法非法，页面仍允许保存。CronEditor 未提交的非法数字草稿也会阻止保存；取消重开恢复默认值或已保存配置。

列表失败提供重试；写入期间阻止重复提交和关闭 Drawer。创建 / 编辑失败保留草稿，启停失败还原勾选值。写入成功先应用响应对象，再刷新列表；若刷新失败，显示读取错误并保留已成功保存的配置。
