# 工单 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

## 对象

`TicketResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 工单号，如 `TK-2048` |
| `title` | string | 标题，最长 120 |
| `requester` | string | 提交人；创建时取当前用户显示名，否则用户名 |
| `category` | string | 分类，最长 40，默认 `缺陷` |
| `priority` | string | `high`、`medium`、`low` |
| `status` | string | `open`、`accepted`、`progress`、`resolved`、`closed` |
| `createdAt` | string | 展示时间 `yyyy-MM-dd HH:mm` |
| `updatedAt` | string | 展示时间 `yyyy-MM-dd HH:mm` |
| `satisfaction` | number | 满意度 `0-5` |
| `description` | string | 描述，最长 2000；空则存 `（无描述）` |
| `messages` | array | 工单对话，按时间升序 |

`messages[]`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 消息 ID |
| `content` | string | 正文，最长 2000 |
| `direction` | string | `self` 或 `other` |
| `time` | string | 展示时间 `yyyy-MM-dd HH:mm` |

分页使用 `PagedResponse<TicketResponse>`。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/tickets` | 登录 | Query：`page` 默认 `1`；`pageSize` 默认 `50`、范围 `1-200`；`status` 可选；`keyword` 可选（匹配标题 / 提交人 / 工单号） | 分页工单（含 `messages`） | `400` 无效工单状态 |
| `GET /api/tickets/{id}` | 登录 | Path：工单号 | 工单对象 | `404` 工单不存在 |
| `POST /api/tickets` | 登录 | Body：`title` 必填；`category`、`priority`、`description` 可选 | 创建后的工单对象 | `400` 标题为空、长度或优先级非法 |
| `PUT /api/tickets/{id}` | 登录 | Body：`title`、`category`、`priority`、`status`、`description`、`satisfaction` 均可选 | 更新后的工单对象 | `400` 字段或枚举非法；`404` 工单不存在 |
| `POST /api/tickets/{id}/messages` | 登录 | Body：`content` | 更新后的工单对象（含 self 消息与一条 other 演示回复） | `400` 内容为空或过长；`404` 工单不存在 |

新建工单号按现有 `TK-*` 数字递增。关闭确认路径使用 `PUT` 且 `status=closed`。

工单契约尚无附件字段或上传关联。双端新建表单明确说明只保存标题、分类、优先级与描述，不显示无法写入的文件选择器。

审批中心 mock 实例可挂 `ticketId`；同意/驳回写回实例时会同步本接口的工单 `status`（见 [approvals.md](approvals.md)）。工单详情 ActionBar 自己的同意/驳回也走 `PUT`。

前端列表按 50 条分页，并提供全部五种状态筛选；`/tickets?ticket=ID` 通过单项 GET 独立定位详情，目标不在筛选结果中也可打开，未知或无权目标在页内显示原因并可重试。详情与内部备注独立加载，备注失败保留详情并可重试；备注读取期间禁添加，避免旧 GET 覆盖新 POST。写入期间锁定动作及聊天 / 备注输入，成功写回状态后刷新当前列表；新建失败保留输入，关闭成功后恢复触发器焦点。`@` 仅提及同事，不修改负责人。
