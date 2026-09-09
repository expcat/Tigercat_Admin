# 审批 Mock API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。这是 Admin 中台演示用的内存状态机，**不是** Flowable / Camunda / BPMN 引擎。

实例存在内存（.NET 进程内 `ApprovalStore`；MockApi 写入 `sessionStorage` 演示状态）。重启 .NET API 会回到种子数据；Mock 演示刷新会话前会保留动作结果。

列表按当前登录用户划分四条车道：待办（当前处理人且未结束）、已办（当前用户曾同意/驳回/转交）、抄送（`cc` 含当前用户）、我发起的（`starter` 为当前用户）。同一实例可以同时出现在多条车道。

同意 / 驳回 / 转交写回实例上的 `status`、`assignee`、`steps`（含当前步骤与抄送 children）。若实例带 `ticketId`，动作还会把关联工单状态写成 `accepted` / `progress` / `resolved` / `closed`（见 [tickets.md](tickets.md)）。工单详情自己的操作条走工单 `PUT`，完整 Viewer + 实例写回以本接口为准。

## 对象

`ApprovalListItem`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 审批单号，如 `AP-1001` |
| `title` | string | 标题，最长 120 |
| `category` | string | `工单`、`请假`、`报销` 等，最长 40 |
| `ticketId` | string? | 可选关联工单号 |
| `starter` | string | 发起人用户名 |
| `assignee` | string | 当前处理人用户名 |
| `cc` | string[] | 抄送用户名 |
| `status` | string | `pending`、`approved`、`rejected`、`canceled` |
| `currentStepKey` | string? | 当前步骤 key |
| `currentStepTitle` | string? | 当前步骤标题 |
| `createdAt` | string | 展示时间 `yyyy-MM-dd HH:mm` |
| `updatedAt` | string | 展示时间 `yyyy-MM-dd HH:mm` |

`ApprovalDetail` 在列表字段之外还包括：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `reason` | string | 申请说明，最长 2000 |
| `amount` | string? | 金额或天数展示 |
| `formFields` | array | 详情表单区 `{ label, value }` |
| `steps` | array | 与 `@expcat/tigercat-core` `WorkflowTimelineStep` 对齐的步骤树（含 children / kind / signMode） |
| `actedBy` | string[] | 已操作过的用户名（进入已办） |

`steps[]` 关键字段：`key`、`title`、`status`（`pending` / `active` / `approved` / `rejected` / `canceled`）、`actor`、`action`、`comment`、`time`、`order`、`children`、`kind`（`start` / `approve` / `cc` / `condition`）、`signMode`、`rollbackPoint`。前端把同一份 `steps` 交给 `WorkflowViewer` 与 `WorkflowTimeline`，不要再造第二套时间线。

分页使用 `PagedResponse<ApprovalListItem>`。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/approvals` | 登录 | Query：`lane` 默认 `todo`，取值 `todo` / `done` / `cc` / `started`；`keyword` 可选（标题 / 单号 / 发起人 / 处理人 / 工单号）；`page` 默认 `1`；`pageSize` 默认 `50`、范围 `1-200` | 分页列表 | `400` 无效 `lane` |
| `GET /api/approvals/{id}` | 登录 | Path：审批单号 | 详情（含 `steps`） | `404` 实例不存在 |
| `POST /api/approvals` | 登录 | Body：`title` 必填；`category`、`reason`、`amount`、`ticketId`、`assignee`、`cc` 可选 | 创建后的详情 | `400` 标题为空或过长；`201` 成功 |
| `POST /api/approvals/{id}/actions` | 登录 | Body：`action` 为 `approve` / `reject` / `transfer` / `comment`；`comment` 可选；`transfer` 时 `transferTo` 必填 | 写回后的详情 | `400` 动作非法、已结束、转交对象为空、评论为空；`404` 实例不存在 |

种子数据（admin 登录可见）：`AP-1001` 待办且挂 `TK-2048`；`AP-1002` 已通过；`AP-1003` 抄送；`AP-1004` 我发起（处理人为 demo）；`AP-1005` 已驳回（含 rollbackPoint）。
