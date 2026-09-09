# 审批 Mock API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。这是 Admin 中台演示用的内存状态机，**不是** Flowable / Camunda / BPMN 引擎。

实例存在内存（.NET 进程内 `ApprovalStore`；MockApi 写入 `sessionStorage` 演示状态）。重启 .NET API 会回到种子数据；Mock 演示刷新会话前会保留动作结果。

列表按当前登录用户划分四条车道：待办（当前处理人且未结束）、已办（当前用户曾同意/驳回/转交）、抄送（`cc` 含当前用户）、我发起的（`starter` 为当前用户）。同一实例可以同时出现在多条车道。

同意 / 驳回 / 转交写回实例上的 `status`、`assignee`、`steps`（含当前步骤与抄送 children）。若实例带 `ticketId`，**同意 / 驳回**才会同步关联工单：通过且仍在审批中 → `accepted`（当前步为 `lead`/`start`）或 `progress`（后续步）；整单通过 → `resolved`；驳回 → `closed`。转交 / 评论不改工单状态；同步只允许前进（`open` < `accepted` < `progress` < `resolved`/`closed`），不会把已在 `progress` 的工单打回 `accepted`。工单详情自己的操作条走工单 `PUT`，完整 Viewer + 实例写回以本接口为准。

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
| `steps` | array | 与 `@expcat/tigercat-core` `WorkflowTimelineStep` 对齐的步骤树（含 children / kind / signMode / 可选 `actors`） |
| `actedBy` | string[] | 已操作过的用户名（进入已办） |

`steps[]` 关键字段：`key`、`title`、`status`（`pending` / `active` / `approved` / `rejected` / `canceled`）、`actor`、`actors`、`action`、`comment`、`time`、`order`、`children`、`kind`（`start` / `approve` / `cc` / `condition`）、`signMode`、`rollbackPoint`。

- `actor`：单数处理人，向后兼容。
- `actors`：可选会签 / 或签 / 依次名单。有 `actors.length` 时前端展示以名单为准，否则回落到 `actor`。每项 `{ id?, name?, status? }`；`status` 可选（`approved` / `pending` 等），只用于卡内已签/待处理点，**不**拆成每人一条待办。
- `children`：并行 / 抄送 / 条件子树。**不要**把会签人做成 children（Viewer 会画成横向分支）。

前端把同一份 `steps` 交给 `WorkflowViewer` 与 `WorkflowTimeline`，不要再造第二套时间线。写回仍是节点级：一次同意推进当前 `kind=approve` 节点。

分页使用 `PagedResponse<ApprovalListItem>`。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/approvals` | 登录 | Query：`lane` 默认 `todo`，取值 `todo` / `done` / `cc` / `started`；`keyword` 可选（标题 / 单号 / 发起人 / 处理人 / 工单号）；`page` 默认 `1`；`pageSize` 默认 `50`、范围 `1-200` | 分页列表 | `400` 无效 `lane` |
| `GET /api/approvals/{id}` | 登录 | Path：审批单号 | 详情（含 `steps`） | `404` 实例不存在 |
| `POST /api/approvals` | 登录 | Body：`title` 必填；`category`、`reason`、`amount`、`ticketId`、`assignee`、`cc` 可选 | 创建后的详情 | `400` 标题为空或过长；`201` 成功 |
| `POST /api/approvals/{id}/actions` | 登录 | Body：`action` 为 `approve` / `reject` / `transfer` / `comment`；`comment` 可选；`transfer` 时 `transferTo` 必填 | 写回后的详情 | `400` 动作非法、已结束、转交对象为空、评论为空；`404` 实例不存在 |

种子数据（admin 登录可见）：`AP-1001` 待办且挂 `TK-2048`；`AP-1002` 已通过；`AP-1003` 抄送；`AP-1004` 我发起（处理人为 demo）；`AP-1005` 已驳回（含 rollbackPoint）。
