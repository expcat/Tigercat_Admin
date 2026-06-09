# 前端与 Tigercat UI 指南

本文是 React / Vue 双端前端的权威指南，也是 LLM 基于 Tigercat UI 生成相似 Admin 界面的主要入口。接口字段与返回结构以 [api.md](api.md) 为准，运行、部署和验证命令以 [operations.md](operations.md) 为准。

## LLM 读取顺序

生成或改造前端时先经过按需入口，再读取本专题：

```text
docs/llm.md -> docs/frontend.md -> docs/api.md
```

实现时遵循：

- 先复用现有 shell、页面结构、`utils` 类型和 API 封装，再新增页面逻辑。
- React 与 Vue 双端保持页面顺序、业务状态、函数命名、权限语义和交互路径一致。
- 优先使用 Tigercat UI 组件；只有布局 glue、页面片段或明确组件缺口才写少量自定义样式。
- 新组件、页面、工具函数在两端使用同名业务概念，避免一端发明另一套命名。
- 移动端、暗色模式、弹层焦点、菜单关闭、空状态和错误提示都视为功能的一部分。

## 技术基线

| 项目 | React | Vue |
| ---- | ----- | --- |
| 目录 | `Tigercat.Admin.React` | `Tigercat.Admin.Vue` |
| 入口 | `src/main.tsx`、`src/App.tsx` | `src/main.ts`、`src/App.vue`、`src/router/index.ts` |
| 页面 | `src/pages/*.tsx` | `src/pages/*.vue` |
| 布局 | `src/components/MainLayout.tsx` | `src/components/MainLayout.vue` |
| 工具 | `src/utils/*.ts` / `*.tsx` | `src/utils/*.ts` |
| UI 包 | `@expcat/tigercat-react` | `@expcat/tigercat-vue` |
| 共享类型 | `@expcat/tigercat-core` | `@expcat/tigercat-core` |

Tailwind CSS v4 样式入口必须保留 Tigercat modern 插件和组件 source 扫描：

```css
@import "tailwindcss";
@plugin "@expcat/tigercat-core/tailwind/modern";
@source "../node_modules/@expcat/tigercat-react/dist/**/*.{js,mjs}";
@source "../node_modules/@expcat/tigercat-core/dist/**/*.{js,mjs}";
```

Vue 端将 `@expcat/tigercat-react` 替换为 `@expcat/tigercat-vue`。

## App Shell 蓝图

受保护页面统一使用后台 shell：

- 外层：`Layout` 横向布局，左侧 `MainSidebar`，右侧 `MainHeader + Content`。
- 桌面侧栏：宽 `240px`，折叠宽 `64px`，使用 `Sidebar`、`Menu`、`SubMenu`、`MenuItem`。
- 桌面侧栏主菜单保持 `mode="inline"`；折叠态继续传 `collapsed` 并开启 `popupPortal`，由上游在收缩时自动退化为 popup 子菜单，不再手动切换 `vertical`。
- 移动侧栏：使用 `Drawer placement="left"`，宽 `240px`，遮罩可点击关闭，Esc 关闭；依赖 `destroyOnClose + destroyOnCloseAfterLeave + onAfterLeave/@after-leave` 完成离场后卸载与焦点恢复。
- Header：使用 `Header`、`Breadcrumb`、`Button`、`Dropdown`、`Avatar`、`Tag`，包含侧栏开关、面包屑、主题切换、修改密码和退出。
- Content：`min-h-0 overflow-auto p-3 sm:p-4 md:p-6`，内部最大宽度 `max-w-7xl`。
- 访客页：登录和注册使用居中 Guest shell，不进入后台布局。

路由与菜单：

| 菜单 key | 路径 | 页面 | 权限 |
| -------- | ---- | ---- | ---- |
| `home` | `/dashboard` | 仪表盘 | `dashboard:view` |
| `users` | `/users` | 用户管理 | `user:view` |
| `roles` | `/roles` | 角色管理 | `role:view` |
| `settings` | `/settings` | 系统设置 | 无入口权限 |
| `files` | `/files` | 文件管理 | `media:view` |
| `notifications` | `/notifications` | 通知中心 | 无入口权限 |
| `tasks` | `/tasks` | 任务面板 | 无入口权限 |
| `audit` | `/audit-logs` | 审计日志 | 无入口权限 |
| `about` | `/about` | 关于 | 无入口权限 |

React 通过 `ProtectedRoute` / `GuestRoute` 和 `react-router-dom` 管路由；Vue 通过 `vue-router`、`ProtectedShell`、`GuestShell` 管路由。刷新后都从 `SESSION_KEY` 读取会话并加载权限。

## 视觉与布局规则

- 主色、背景、文本、边框、阴影优先使用 Tigercat token：`--tiger-primary`、`--tiger-bg-page`、`--tiger-bg-card`、`--tiger-bg-hover`、`--tiger-text`、`--tiger-text-secondary`、`--tiger-border`。
- 页面级辅助类可复用 `p2-text-primary`、`p2-page-accent`、`p2-muted-panel`、`p2-soft-surface`、`p2-icon-chip`、`p2-action-tile`、`p2-checkbox-row`、`p2-modal-scroll`。
- 页面第一块通常使用 `PageHeader`：左侧图标芯片、标题、说明，右侧标签只在 `sm` 以上显示。
- 指标区使用 `MetricGrid` + `MetricCard`，桌面 3 或 4 列，移动端 1 列。
- 页面操作说明使用 `PageActionPanel`，提示或说明用 `MutedPanel`，图表无数据用 `ChartEmptyState`。
- 弹层内容长时使用 `p2-modal-scroll`，确认类操作优先用 Tigercat `Modal`、`Popconfirm`、`Message`。
- 表格工具栏、批量操作、列开关和导出字段必须保证移动端可换行、不遮挡、不溢出。
- 暗色模式通过根节点 `.dark` 和 Tigercat token 生效，不在页面内写孤立深色配色。

## 组件选择矩阵

| 页面/区域 | 主要 Tigercat 组件 | 关键交互 |
| --------- | ------------------ | -------- |
| Shell | `Layout`、`Content`、`Header`、`Sidebar`、`Drawer`、`Menu`、`Breadcrumb`、`Dropdown`、`Avatar`、`Tag` | 折叠菜单、移动抽屉、主题切换、账号菜单 |
| 登录/注册 | `Card`、`Form`、`FormItem`、`Input`、`Button`、`Message` | 表单校验、成功跳转、错误提示 |
| 仪表盘 | `Alert`、`Card`、`Text`、`Tag`、`Select`、`Statistic`、`Loading`、`Empty`、`LineChart`、`BarChart`、`PieChart` | 概览指标、图表空状态、快捷跳转 |
| 用户管理 | `DataTableWithToolbar`、`Avatar`、`Button`、`Input`、`Modal`、`Form`、`Select`、`Tag`、`Tooltip`、`Popover`、`Checkbox`、`CropUpload` | 分页搜索、排序、列显隐、批量状态、头像裁剪、角色选择 |
| 角色管理 | `DataTableWithToolbar`、`Tree`、`Checkbox`、`Modal`、`Popconfirm`、`Select`、`Tag`、`Popover` | 权限树、角色用户配置、导出字段、删除确认 |
| 系统设置 | `Card`、`Input`、`InputNumber`、`ColorPicker`、`Segmented`、`Switch`、`Upload`、`Modal` | 分组设置、Logo 上传、保存确认、恢复默认值 |
| 文件管理 | `FileManager`、`Upload`、`Button`、`Select`、`Tag`、`Modal`、`Message` | 上传、类型筛选、选择、普通删除、强制删除 |
| 通知中心 | `NotificationCenter`、`Badge`、`Statistic`、`Card`、`Button`、`notification` | 已读/未读、批量已读、站内跳转 |
| 任务面板 | `TaskBoard`、`Statistic`、`Card`、`Input`、`Tag`、`Modal`、`notification` | 拖拽流转、WIP 限制、详情、完成确认 |
| 审计日志 | `ActivityFeed`、`Timeline`、`Input`、`Select`、`Statistic`、`Empty`、`Modal` | 筛选、详情、JSON 预览、CSV 导出、保留清理 |
| 关于 | `Alert`、`Card`、`Text`、`Tag` | 技术栈和版本信息 |

重组件使用子路径导入，减少页面 chunk 压力：

```ts
import { TaskBoard } from '@expcat/tigercat-react/TaskBoard';
import { NotificationCenter } from '@expcat/tigercat-react/NotificationCenter';
import { FileManager } from '@expcat/tigercat-react/FileManager';
import { ActivityFeed } from '@expcat/tigercat-react/ActivityFeed';
import { Timeline } from '@expcat/tigercat-react/Timeline';
import { Upload } from '@expcat/tigercat-react/Upload';
import { CropUpload } from '@expcat/tigercat-react/CropUpload';
import { ColorPicker } from '@expcat/tigercat-react/ColorPicker';
```

Vue 端将包名替换为 `@expcat/tigercat-vue/...`。

## React / Vue 映射

| 语义 | React | Vue |
| ---- | ----- | --- |
| 样式属性 | `className` | `class` 或组件要求的 `class-name` |
| 受控值 | `value` + `onChange` | `:model-value` + `@update:model-value` 或 `v-model` |
| 弹层开关 | `open` + `onOpenChange` / `onClose` | `:open` + `@update:open` / `@close` |
| 事件命名 | camelCase props | kebab-case emits |
| 权限包装 | `PermissionGuard` / `usePermission` | `v-permission` / `usePermission` |
| 路由跳转 | `useNavigate()` | `useRouter().push()` |
| 派生状态 | `useMemo` | `computed` |
| 副作用 | `useEffect` | `watch` / lifecycle hooks |

## 数据、权限与状态

- API 调用统一走双端 `src/utils/request.ts` 的 `apiRequest`。
- 会话存在 `SESSION_KEY`，认证头由 `getAuthHeaders()` 或等价工具生成。
- API 返回结构使用 `ApiResponse<T>`；分页列表使用 `PagedResult<T>`。
- 权限列表从 `/api/auth/permissions` 加载，菜单和按钮按权限隐藏。
- 用户、角色、文件、审计等数据工作台使用 sessionStorage 保留查询、排序、选中行、隐藏列和导出状态。
- 通知 `linkUrl` 只允许站内路径，跳转前检查目标页面权限。

## 页面生成验收

LLM 生成新页面或复刻页面时，至少满足：

- 页面在 React / Vue 两端都有等价实现。
- 菜单、路由、面包屑、权限入口和页面标题一致。
- 使用 Tigercat 组件完成主体控件，手写样式只负责布局 glue。
- 加载、空数据、错误、成功、确认、取消状态完整。
- 移动端 375px 不溢出、不遮挡，桌面布局不跳动。
- 暗色模式 token 生效，文本可读。
- 弹层可关闭，菜单不被固定列遮挡，键盘路径不破坏焦点。
- 新增 API 能在 [api.md](api.md) 找到契约。

## 已对齐的上游能力

截至 Tigercat UI `v1.2.23`，本项目此前记录的 Shell 相关上游诉求已经补齐：

| 组件 | 平台 | 上游现状 | 本项目保留的布局 glue |
| ---- | ---- | -------- | --------------------- |
| `Sidebar` | React / Vue | 上游 `LayoutDemo` 已提供官方后台 Shell 侧栏示例，覆盖 Logo 文案、主菜单和底部折叠按钮的组合用法。 | `MainSidebar` 继续保留 `max-width + opacity + transform` 的品牌文案和折叠按钮动画。 |
| `Menu` | React / Vue | 上游在 `inline + collapsed + popupPortal` 下会自动退化为 popup 子菜单，并补充了双端测试。 | 主菜单保持 `mode="inline"`，继续保留 `!min-w-0` 作为 flex / overflow 容器下的布局 glue。 |
| `Table` | React / Vue | 锁定列硬编码了背景类名，在暗色模式、hover 或 striped 下与整行背景色存在显示冲突。 | 本项目通过全局 CSS 覆盖解决冲突，详情与上游重构方案参见 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)。 |
