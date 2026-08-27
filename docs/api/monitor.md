# 实时监控 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口只需登录（`RequireLogin`），不额外校验权限码，也不读取真实主机指标。

`GET /api/monitor/snapshot` 的 `data` 是当前步进快照。服务端在进程内做小步随机游走，连续请求会缓慢漂移而不是大幅跳变。节点种子 ID 为 `api-hz-1`、`api-bj-1`、`worker-hz-1`、`cache-hz-1`。前端按 2 / 3 / 5 秒轮询；暂停后不再发请求。QPS / 延迟滚动窗口由前端用连续快照拼接（最近 20 点）。

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

每次成功 `GET` 都会推进一步进器。不落库、无 Migration。
