# 动态菜单 schema API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口只需登录（`RequireLogin`），不额外校验权限码。本阶段**没有**菜单 CRUD：不提供创建、更新、删除或排序接口。

`GET /api/menus/schema` 的 `data` 是后端风格的 `MenuSchemaNode` 树（与 `@expcat/tigercat-core` 的 `MenuSchema` 对齐）。返回**完整**树，节点上的 `permission` 只声明所需权限码；前端用 `filterMenuByPermission` 按当前用户权限过滤，再用 `menuSchemaToMenuItems` 转成现有 `Menu` 的 `items`。不要在服务端按用户裁剪后再让前端无法复现同一棵树。

侧栏分两棵：`items` 是主菜单，`bottomItems` 是底栏（关于）。个人中心等不进侧栏的页面不在本接口里，仍由前端 `SHELL_HIDDEN_MENU_SCHEMA` 解析标题和面包屑。

`path` 是站内路径，供契约与后续路由使用。当前 Shell 仍按菜单 `key` + `SHELL_MENU_ROUTES` 导航，不会把 `path` 写成 `MenuItem.href`，以免 hash 演示路由整页跳走。

## 对象

`MenuSchemaResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `items` | array | 主侧栏 `MenuSchemaNode[]`，至少含仪表盘 |
| `bottomItems` | array | 底栏 `MenuSchemaNode[]`，当前为「关于」 |

`MenuSchemaNode`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `key` | string | 稳定节点 id，对应 Shell 菜单 key |
| `label` | string? | 显示名 |
| `icon` | string? | 应用图标名（如 `dashboard`、`users`），不是框架节点 |
| `path` | string? | 站内路径，如 `/dashboard`、`/audit-logs` |
| `permission` | string? | 所需权限码；省略表示不限制。数组语义留给后续，当前种子只用单码 |
| `hideInMenu` | boolean | 为 true 时过滤后不渲染本节点并提升子节点 |
| `children` | array? | 子菜单 |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/menus/schema` | 登录 | 无 | 完整菜单 schema | 未登录 `401` |

MockApi 与 .NET API 返回同一棵静态种子树（内存常量，不落库）。
