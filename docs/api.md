# API 契约索引

本文只保留通用契约和端点索引。按需读取具体资源域，避免一次性加载所有 API 细节。运行、部署和健康检查背景见 [operations.md](operations.md)。

## 通用返回

JSON API 默认返回 `ApiResponse<T>`：

| 字段 | 说明 |
| ---- | ---- |
| `code` | 业务状态码；成功为 `200`，失败为 HTTP/业务错误码 |
| `message` | 提示信息 |
| `success` | 是否成功 |
| `data` | 具体数据；失败时通常为 `null` |

```json
{
  "code": 200,
  "message": "Success",
  "success": true,
  "data": {}
}
```

分页响应使用 `PagedResponse<T>`：`items`、`total`、`page`、`pageSize`。

## 认证

需要登录的接口支持任一请求头：

- `X-Token: <TOKEN>`
- `Authorization: Bearer <TOKEN>`

未登录通常返回 `401`，权限不足返回 `403`。权限码和入口权限见各专题。

## OpenAPI

开发环境提供：

- OpenAPI JSON：`/openapi/v1.json`
- Scalar UI：`/scalar`

## 通用错误

| 状态码 | 常见含义 |
| ------ | -------- |
| `400` | 请求参数、枚举值、长度、格式或业务前置条件不合法 |
| `401` | 未登录、Token 无效、账号密码错误 |
| `403` | 登录用户缺少所需权限 |
| `404` | 资源不存在 |
| `409` | 唯一冲突、重复资源或被引用资源不能删除 |
| `429` | 登录失败次数过多，进入锁定窗口 |
| `503` | Redis、审计日志或依赖暂不可用 |

典型错误：

```json
{
  "code": 404,
  "message": "资源不存在",
  "success": false,
  "data": null
}
```

## 专题文档

| 资源域 | 文档 | 端点概览 |
| ------ | ---- | -------- |
| 健康、应用信息、认证、权限 | [api/auth.md](api/auth.md) | `/api/health`、`/api/info`、`/api/auth/*`、`/api/home` |
| 用户管理 | [api/users.md](api/users.md) | `/api/users`、批量删除、批量状态 |
| 角色与权限 | [api/roles.md](api/roles.md) | `/api/roles`、角色权限、角色用户、权限列表 |
| 仪表盘统计、导出 | [api/dashboard-export.md](api/dashboard-export.md) | `/api/stats/*`、`/api/export/*` |
| 审计日志 | [api/audit.md](api/audit.md) | `/api/audit-logs`、导出、保留策略、清理 |
| 通知中心 | [api/notifications.md](api/notifications.md) | `/api/notifications`、已读、批量已读 |
| 任务面板 | [api/tasks.md](api/tasks.md) | `/api/tasks`、流转、完成 |
| 系统设置 | [api/settings.md](api/settings.md) | `/api/settings` |
| 媒体资源 | [api/media.md](api/media.md) | `/api/media`、内容读取、删除、孤儿清理 |

## 维护规则

- 新增或修改 API 端点、请求/响应字段、权限、错误码、事件、分页/排序规则时，同步更新本索引和对应专题。
- 没有合适专题时新增 `docs/api/*.md`，并在本索引与 [llm.md](llm.md) 登记。
- 不在 README 或 AGENT 中重复 API 细节；入口只保留导航和同步规则。
