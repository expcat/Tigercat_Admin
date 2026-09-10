# 审批 Mock API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。这是 Admin 中台演示用的内存状态机，**不是** Flowable / Camunda / BPMN 引擎。组织树不进 Tigercat 主包；Admin 用 Mock 通讯录解析 `ApproverSource`。

实例存在内存（.NET 进程内 `ApprovalStore`；MockApi 写入 `sessionStorage` 演示状态）。重启 .NET API 会回到种子数据；Mock 演示刷新会话前会保留动作结果。

列表按当前登录用户划分四条车道：待办（当前处理人且未结束；有 `tasks[]` 时看该用户是否有 `pending`/`active` 任务，**不含** `blocked` 前加签暂停）、已办（当前用户曾操作）、抄送（`cc` 含当前用户）、我发起的（`starter` 为当前用户）。同一实例可以同时出现在多条车道。加签待办、退回后的再提交待办走同一套 `tasks[]` 写回，不是假按钮。

无 `tasks` 时写回兼容 2.4.2 **节点级**（一次同意推进当前 `kind=approve` 节点）。有 `tasks[]` 时同意写到**当前用户任务**，会签按人累计。

同意 / 驳回 / 转交 / 加签 / 退回 / 撤回 / 评论 / `request_changes` 写回实例上的 `status`、`assignee`、`steps`、`tasks`、`history`。若实例带 `ticketId`，**同意 / 驳回**才会同步关联工单：通过且仍在审批中 → `accepted`（当前步为 `lead`/`start`）或 `progress`（后续步）；整单通过 → `resolved`；驳回 → `closed`。转交 / 评论 / 加签 / 退回 / 撤回不改工单状态；同步只允许前进（`open` < `accepted` < `progress` < `resolved`/`closed`），不会把已在 `progress` 的工单打回 `accepted`。工单详情自己的操作条走工单 `PUT`，完整 Viewer + 实例写回以本接口为准。

## 对象

`ApprovalListItem`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 审批单号，如 `AP-1001` |
| `title` | string | 标题，最长 120 |
| `category` | string | `工单`、`请假`、`报销` 等，最长 40 |
| `ticketId` | string? | 可选关联工单号 |
| `starter` | string | 发起人用户名 |
| `assignee` | string | 当前处理人用户名（有 `tasks` 时取第一个未完成任务的人） |
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
| `steps` | array | 与 `@expcat/tigercat-core` `WorkflowTimelineStep` 对齐的步骤树（含 children / kind / signMode / 可选 `actors` / 临时加签节点） |
| `actedBy` | string[] | 已操作过的用户名（进入已办） |
| `tasks` | array? | 按人任务。有此数组时会签进度以任务为准 |
| `history` | array? | 动作历史 `{ at, actorId, action, comment?, nodeKey?, taskId? }` |
| `resumeToNodeKey` | string? | `direct` 退回后，目标完成时跳回的节点 |
| `returnTargets` | array? | 当前可退回节点（`start` + 路径上已通过的 `approve`，排除进行中的临时加签） |
| `formValues` | object? | 详情 SchemaForm 模型（`title` / `category` / `reason` / `amount` 等） |

`steps[]` 关键字段：`key`、`title`、`status`（`pending` / `active` / `approved` / `rejected` / `canceled`）、`actor`、`actors`、`action`、`comment`、`time`、`order`、`children`、`kind`（`start` / `approve` / `cc` / `condition` / `end`）、`signMode`、`rollbackPoint`、`temporary`、`origin`（加签来源）、`approverPolicy`、`returnTarget`。

- `actor`：单数处理人，向后兼容。
- `actors`：可选会签 / 或签 / 依次名单。有 `actors.length` 时前端展示以名单为准，否则回落到 `actor`。每项 `{ id?, name?, status? }`。
- `tasks[]`：每人 `{ id, nodeKey, assignee, status, action?, comment?, actedAt?, origin? }`。`status` 含 `pending` / `active` / `approved` / `rejected` / `canceled` / `blocked`（前加签暂停）。
- `children`：并行 / 抄送 / 条件子树。**不要**把会签人做成 children（Viewer 会画成横向分支）。
- 临时加签节点：`temporary: true`，`origin.position` 为 `before` | `after`，插在实例树，不改已发布 definition。

前端把同一份 `steps` 交给 `WorkflowViewer` 与 `WorkflowTimeline`，不要再造第二套时间线。

分页使用 `PagedResponse<ApprovalListItem>`。

`ApproverSource`（解析入参）：`fixed`（`actors`）/ `self` / `starter_pick` / `role`（`key`）/ `group`（`key`）/ `dept_leader`（可选 `level`）/ `manager_chain`（可选 `upTo`）。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/approvals` | 登录 | Query：`lane` 默认 `todo`，取值 `todo` / `done` / `cc` / `started`；`keyword` 可选（标题 / 单号 / 发起人 / 处理人 / 工单号）；`page` 默认 `1`；`pageSize` 默认 `50`、范围 `1-200` | 分页列表 | `400` 无效 `lane` |
| `GET /api/approvals/contacts` | 登录 | 无 | Mock 通讯录：`users` / `depts` / `roles` / `groups` | — |
| `POST /api/approvals/resolve` | 登录 | Body：`source` 或 `sources`（`ApproverSource`）；可选 `starter`、`formValues`、`starterPick` | `{ actors: [{ id, name }] }` | — |
| `GET /api/approvals/{id}` | 登录 | Path：审批单号 | 详情（含 `steps` / `tasks` / `history` / `returnTargets`） | `404` 实例不存在 |
| `POST /api/approvals` | 登录 | Body：`title` 必填；`category`、`reason`、`amount`、`ticketId`、`assignee`、`cc` 可选；`useTasks` 可选（按人任务）；`template` 可选 `ticket`（默认）/ `countersign` / `sources`；`starterPick` 可选（自选审批人 / 会签名单） | 创建后的详情 | `400` 标题为空或过长；`201` 成功 |
| `POST /api/approvals/{id}/actions` | 登录 | Body：见下表 | 写回后的详情 | `400` 动作非法、已结束、缺必填字段、当前用户无任务；`404` 实例不存在 |

动作请求体：

| 字段 | 说明 |
| ---- | ---- |
| `action` | `approve` / `reject` / `transfer` / `addsign` / `return` / `cancel` / `withdraw`（= `cancel`）/ `comment` / `request_changes` |
| `comment` | 意见；`comment` 动作必填 |
| `transferTo` / `assignee` | 转交目标 |
| `addsignTo` / `assignees` | 加签对象（不可含当前操作人） |
| `position` | 加签 `before` \| `after`（默认 `before`）。或签节点禁用后加签；会签仅最后未批者可后加签 |
| `signMode` | 加签人数 ≥ 2 时的 `countersign` / `orsign` / `sequential` |
| `targetNodeKey` | 退回目标；`return` 必填 |
| `resume` | `resequence`（默认，从目标重走）/ `direct`（目标完成后直达退回点） |
| `taskId` / `nodeKey` | 可选，定位当前任务 |
| `formValues` | 可选。只接受当前节点 `fieldPermissions=editable` 的路径（金额仅财务节点） |

语义：

| 动作 | 写回 |
| ---- | ---- |
| `approve` | 当前任务通过；会签累计；或签关闭兄弟；依次唤醒下一个；节点全过才往下 |
| `reject` | 当前任务拒绝，**实例 `rejected`**（会签一人拒即整单失败） |
| `transfer` | 当前任务换人，**不推进节点** |
| `addsign` `before` | 当前任务 `blocked`，前方插入临时审批节点；临时节点通过后恢复 |
| `addsign` `after` | 当前任务视为通过；节点完成后插入临时节点（会签未齐则挂 `pendingAfterAddsign`） |
| `return` | cursor 跳到已通过节点 / 发起；活实例 |
| `request_changes` | `return` 到 `start` + `direct` |
| `cancel` / `withdraw` | 发起人结束本实例为 `canceled` |
| `comment` | 只追加 `history`（及当前步意见），不推进 |

演示身份：审批接口认 `X-Demo-Actor`（Mock 通讯录 id / username / 姓名）。只切换车道与写回操作人，不改登录会话。

种子数据（admin 登录可见）：`AP-1001` 待办且挂 `TK-2048`；`AP-1002` 已通过；`AP-1003` 抄送；`AP-1004` 我发起（处理人为 demo）；`AP-1005` 已驳回（含 rollbackPoint）；`AP-1006` 会签 1/3（`tasks[]`：admin 已签，demo / 王经理待办）；`AP-1007` 采购财务会签（金额仅财务可编，`ticketId` 在财务节点 `hidden`，待 `chen` / `zhao`）。

流程设计页 `/workflow-designer` 不走本组接口：本地 JSON 树 + 库 `validateWorkflowDesigner` 发布校验，草稿写入 `localStorage` 键 `tigercat-admin:workflow-designer-draft`，不写回引擎。
