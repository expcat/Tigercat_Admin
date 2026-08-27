# 项目 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

项目详情只读：本期没有编辑入口，因此不提供 `PUT /api/projects/{id}`。讨论走评论接口 `GET /api/comments?targetType=project&targetId=`。

## 对象

`ProjectResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 项目编号，如 `1001` |
| `name` | string | 名称 |
| `summary` | string | 摘要 |
| `owner` | string | 负责人 |
| `department` | string | 所属部门 |
| `status` | string | `planning`、`active`、`paused`、`done` |
| `progress` | number | 进度 0-100 |
| `milestone` | number | 当前里程碑下标（0-3：需求评审 / 开发实现 / 联调验收 / 发布上线） |
| `budget` | number | 预算（万元） |
| `startAt` | string | 开始日期 `YYYY-MM-DD` |
| `endAt` | string | 计划完成 `YYYY-MM-DD` |
| `members` | array | 成员，按展示顺序 |
| `activities` | array | 动态，按展示顺序 |

`members[]`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 成员 ID |
| `name` | string | 姓名 |
| `role` | string | 角色 |
| `color` | string | 头像色 |

`activities[]`（对齐 `Timeline` 节点）：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `key` | string | 节点 key |
| `label` | string | 时间标签 |
| `content` | string | 动态正文 |
| `color` | string | 标记色 |

分页使用 `PagedResponse<ProjectResponse>`。列表与详情返回同一对象形状。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/projects` | 登录 | Query：`page` 默认 `1`；`pageSize` 默认 `6`、范围 `1-200`；`status` 可选；`keyword` 可选（匹配名称 / 负责人 / 编号） | 分页项目（含 `members`、`activities`） | `400` 无效项目状态 |
| `GET /api/projects/{id}` | 登录 | Path：项目编号 | 项目对象 | `404` 项目不存在 |

列表按项目编号升序。评论不在项目对象内，详情页另调 `/api/comments?targetType=project&targetId=`。
