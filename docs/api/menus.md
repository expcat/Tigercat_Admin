# 动态菜单 schema API

返回结构、认证头和通用错误见 [../api.md](../api.md)。`GET /api/menus/schema` 只需登录（`RequireLogin`），供 Shell 拉完整树。节点 CRUD 按端点校验 `menu:*` 权限。

`GET /api/menus/schema` 的 `data` 是后端风格的 `MenuSchemaNode` 树（与 `@expcat/tigercat-core` 的 `MenuSchema` 对齐）。返回**完整**树，节点上的 `permission` 只声明所需权限码；前端用 `filterMenuByPermission` 按当前用户或预览角色权限过滤，再用 `menuSchemaToMenuItems` 转成现有 `Menu` 的 `items`。不要在服务端按用户裁剪后再让前端无法复现同一棵树。

侧栏分两棵：`items` 是主菜单，`bottomItems` 是底栏（关于）。个人中心等不进侧栏的页面不在本接口里，仍由前端 `SHELL_HIDDEN_MENU_SCHEMA` 解析标题和面包屑。

`path` 是站内路径。Shell 用 `schemaToRouteRecords` + `pageMap` 生成主要业务路由，点击侧栏按节点 `path` 跳转（`getShellNavigatePath`），不会把 `path` 写成 `MenuItem.href`，以免 hash 演示路由整页跳走。菜单管理轻页可增删改节点；新 key 若在 `pageMap` 里有对应页，或带安全 `iframeSrc`，会进入 mixed 路由；否则侧栏能显示但没有可挂载的页面。

schema 存在内存（.NET 进程内 `MenuSchemaStore`；MockApi 写入 `sessionStorage` 演示状态）。重启 .NET API 会回到种子树；Mock 演示刷新会话前会保留 CRUD 结果。

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
| `permission` | string? | 所需权限码；省略表示不限制。数组语义留给后续，当前种子与写入只用单码 |
| `hideInMenu` | boolean | 为 true 时过滤后不渲染本节点并提升子节点 |
| `hideInBreadcrumb` | boolean | 为 true 时应用应省略面包屑；`schemaToRouteRecords` 写入 route meta |
| `flatMenu` | boolean | 为 true 时菜单把子节点提到当前层，父级仍作叶子 |
| `iframeSrc` | string? | 嵌入页 URL，写入 route meta |
| `children` | array? | 子菜单 |

`MenuNodeWriteRequest`（创建 / 更新）：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `key` | string | 创建必填；更新忽略，以路径 `{key}` 为准 |
| `label` | string? | 显示名，最长 50 |
| `icon` | string? | 图标名，最长 32 |
| `path` | string? | 必须以 `/` 开头，最长 128 |
| `permission` | string? | 权限码，最长 64 |
| `hideInMenu` | boolean? | 默认 false |
| `hideInBreadcrumb` | boolean? | 默认 false |
| `flatMenu` | boolean? | 默认 false |
| `iframeSrc` | string? | 最长 512 |
| `parentKey` | string? | 空则挂到对应根；非空必须已存在 |
| `placement` | string? | `items` 或 `bottomItems`；仅 `parentKey` 为空时生效，默认 `items` |

`key` 需以字母开头，仅含字母、数字、下划线或连字符，最长 64。更新时若 `parentKey` / `placement` 变化则移动节点。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/menus/schema` | 登录 | 无 | 完整菜单 schema | 未登录 `401` |
| `POST /api/menus/nodes` | `menu:create` | Body：`MenuNodeWriteRequest`，`key` 必填 | 创建后的节点 | `400` 字段不合法 / 父节点不存在；`409` key 已存在；未登录 `401`；无权限 `403` |
| `PUT /api/menus/nodes/{key}` | `menu:edit` | Body：字段均可选 | 更新后的节点 | `400` 字段不合法 / 不能移到自身或子孙下；`404` 节点不存在 |
| `DELETE /api/menus/nodes/{key}` | `menu:delete` | Path：`key` | `{ message }` | `400` 不能删除仪表盘或仍有子节点；`404` 节点不存在 |

角色预览不走独立接口：管理页 `GET /api/roles/{id}` 取权限码，在前端调用 core `filterMenuByPermission`。

MockApi 与 .NET API 共用同一棵种子树（含系统管理下的「菜单管理」），CRUD 写回各自的内存 / 演示状态。
