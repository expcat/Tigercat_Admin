# 实时监控 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口只需登录（`RequireLogin`），不额外校验权限码，也不读取真实主机指标。

`GET /api/monitor/snapshot` 的 `data` 是当前步进快照。服务端在进程内做小步随机游走，连续请求会缓慢漂移而不是大幅跳变。节点种子 ID 为 `api-hz-1`、`api-bj-1`、`worker-hz-1`、`cache-hz-1`。前端优先连 SignalR `/hubs/monitor`，按 2 / 3 / 5 秒接收同一份 JSON；暂停后停止推送。WebSocket 不可用时回退轮询本 REST 接口。QPS / 延迟滚动窗口由前端用连续快照拼接（最近 20 点）。每次成功 `GET` 或一次 hub `Start`/到期推送都会推进一步进器。不落库、无 Migration。

## 对象

`MonitorSnapshotResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `cpu` | number | CPU 水位，约 `0-100` |
| `memory` | number | 内存水位，约 `0-100` |
| `disk` | number | 磁盘水位，约 `0-100` |
| `qps` | number | 当前 QPS |
| `latency` | number | P95 延迟（毫秒） |
| `nodes` | array | 节点列表，见下表 |
| `events` | array | 最近事件，足够喂给 `ActivityFeed`，服务端封顶 20 条 |
| `serverTime` | string | 快照时刻，ISO UTC |
| `tickCount` | number | 进程内步进次数 |
| `lastTickAt` | string | 最近一次步进时间，ISO UTC |

`nodes[]`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 节点 ID |
| `name` | string | 显示名 |
| `zone` | string | 可用区 |
| `cpu` | number | 节点 CPU 水位 |
| `memory` | number | 节点内存水位 |
| `status` | string | `healthy`、`warning`、`critical` |

`events[]`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 事件 ID |
| `title` | string | 标题 |
| `description` | string | 描述 |
| `time` | string | ISO 时间 |
| `status` | object | `{ label, variant }`，供 `ActivityFeed` 使用 |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/monitor/snapshot` | 登录 | 无 | 当前监控快照 | 未登录 `401` |

## SignalR

`/hubs/monitor` 需登录（与 REST 相同：`X-Token`、`Authorization: Bearer`，或 WebSocket 的 `access_token` 查询参数）。**不是**新监控产品，只替换传输。

| 方向 | 名称 | 载荷 |
| ---- | ---- | ---- |
| 客户端 → 服务端 | `Start(intervalSeconds)` | `intervalSeconds` 只能是 `2` / `3` / `5`。立即推送一帧，之后按间隔推送 |
| 客户端 → 服务端 | `Stop()` | 停止向该连接推送；断开也会停止 |
| 服务端 → 客户端 | `snapshot` | 与 REST `data` 相同的 `MonitorSnapshotResponse`（无 `ApiResponse` 包络） |

非法间隔返回 hub 错误「刷新间隔必须是 2、3 或 5 秒」。未登录连接 `401`。通知中心仍走 REST + Redis Stream，不要把本 hub 事件当成 `notification.*` toast。
