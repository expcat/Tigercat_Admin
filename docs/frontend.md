# 前端与 Tigercat UI 指南

本文是 Tigercat 前端模式的单一事实来源，服务两条文档线：维护本仓库时，它是 React / Vue 双端的权威指南；以本仓库为蓝本创建新项目时，由 [guide/new-project.md](guide/new-project.md) 按章节引用本文，不另行复写。接口字段与返回结构以 [api.md](api.md) 为准，运行、部署和验证命令以 [operations.md](operations.md) 为准。

## LLM 读取顺序

按任务进入本专题：

```text
维护本仓库：  docs/llm.md -> docs/frontend.md -> docs/api.md
创建新项目：  docs/guide/new-project.md -> docs/frontend.md（按引用章节） -> docs/guide/backend.md
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

- 外层：`Layout` 横向布局，左侧 `MainSidebar`，右侧 `MainHeader + TagsView + Content`。Vue 根 `RouterView` 必须包在真实 DOM 节点里（不要直接作为 `ConfigProvider` `contents` 根的兄弟被 overlay-host 插入），否则离开 Shell 进 403/404 时 Vue `insertBefore` 会把页面卸空。回归见 [e2e/overlay-focus.spec.ts](../e2e/overlay-focus.spec.ts)：登录 → `/users` → `/404` → `/403` → 再回 `/users` → 退出，断言应用根不是空 ConfigProvider。
- 桌面侧栏：宽 `240px`，折叠宽 `64px`，使用 `Sidebar`、`Menu`、`SubMenu`、`MenuItem`。
- 桌面侧栏主菜单保持 `mode="inline"`；折叠态继续传 `collapsed` 并开启 `popupPortal`，由上游在收缩时自动退化为 popup 子菜单，不再手动切换 `vertical`。
- 移动侧栏：使用 `Drawer placement="left"`，宽 `240px`，遮罩可点击关闭；Esc 关闭为 Drawer 内置行为（经 `onClose/@close` 回调），不要再手动监听 keydown。`destroyOnClose` 会等关场过渡后再卸载；焦点恢复用 `onAfterClose` / `@after-close`。不要再传已删除的 `destroyOnCloseAfterLeave` / `onAfterLeave` / `@after-leave`。
- Header：使用 `Header`、`Breadcrumb`、`Button`、`Dropdown`、`Avatar`、`Tag`、`Icon`，包含侧栏开关、面包屑、主题配置抽屉入口、内容区全屏（浏览器 Fullscreen API，无包级 Fullscreen 组件）、主题切换、修改密码、锁定屏幕和退出。
- 侧栏菜单：展开态开启 `Menu searchable`（`searchPlaceholder="搜索菜单"`）；折叠到 64px 时关闭搜索，避免挤占迷你栏。登录后 `GET /api/menus/schema` 拉 `MenuSchemaNode` 树，经 `filterMenuByPermission` 与 `menuSchemaToMenuItems` 喂给现有 `Menu`（不要自写第二套菜单渲染）。失败时回退 `shell-navigation` 里的打包 schema。壳主要业务路由是 mixed：`schemaToRouteRecords` + `utils/page-map` 懒加载页面（Vue `router/index.ts` 初始绑定打包树，live schema 再 `addRoute`；React 按 live schema 渲染 `<Route>` 元素，不要再包一层非 Route 组件，否则 React Router 7 会拒绝）。导航走 schema `path`（`getShellNavigatePath`），不要把 `path` 写成 `MenuItem.href`（hash 演示路由会整页跳走）。游客 / 403·404·500 / `projects/:id` / `approvals/:id` 仍是静态路由。无 pageMap 但有安全 `iframeSrc` 的节点走通用嵌入页。菜单管理轻页在系统管理下（`/menus`，`menu:view`），对 schema 做 CRUD，并用角色权限做过滤预览。
- 中台演示：协作下「审批中心」`/approvals`（待办 / 已办 / 抄送 / 我发起的）+ `/approvals/:id`。详情把同一份 mock `steps` 交给 `WorkflowViewer` 与 `WorkflowTimeline`，`WorkflowActionBar` 的同意 / 驳回 / 转交走 `POST /api/approvals/{id}/actions` 写回实例（不是 toast-only）。工单详情仍用 Timeline + ActionBar，动作写回工单 `PUT`；完整实例状态机以审批中心为准。不要接 Flowable/Camunda，也不要自写第二套 Timeline。
- 页脚：`Content` 滚动区内、页面主体之后渲染 `Footer`（`ShellFooter`），随内容滚动，不占固定视口高度。
- 路由进度：受保护路由切换时用 `LoadingBar.start()` / `LoadingBar.finish()` 驱动顶部进度条（失败或 `next(false)` 也要 `finish`）；根节点挂载 `#tiger-loading-bar-container-root`，由 `LoadingBar` 把 `LoadingBarContainer` 挂进去（子路径 `/LoadingBar` 与 `/LoadingBarContainer` 分开）。游客页与独立异常页不显示。
- 命令面板：`Spotlight` 默认 `hotkey` 已绑定 ⌘K / Ctrl+K，不要再在 App 里叠一层 keydown 开关，否则受控 `open` 会被两次 toggle 抵消。
- 多标签（tags-view）：受保护 Shell 在 Header 与 Content 之间显示标签条（`TagsView`）。打开受保护路由即生成标签；标题复用 `getShellPageTitle`，路由映射复用 `resolveShellPageKey`（先精确查 `SHELL_ROUTE_TO_MENU` 的 path，再按前缀映射，使 `/projects/:id` 仍高亮列表菜单 `projects`）。侧栏跳转走 `getShellNavigatePath`（schema `path`，缺失时回退 `SHELL_MENU_ROUTES`）。仪表盘（`home`）固定在最前且不可关闭；关闭当前时跳到相邻标签，关尽后回到仪表盘。刷新后从 `sessionStorage` 键 `tigercat-admin:tags-view` 恢复（损坏/缺失 JSON 时回退为仅仪表盘）。游客页与 `/403` `/404` `/500` 不套 `MainLayout`，因此不显示标签条。面包屑仍由 `MainHeader` + `getShellBreadcrumbItems` 负责，不要在标签条重复实现。
- 锁屏：头像下拉「锁定屏幕」打开全屏遮罩（`LockScreen`），覆盖侧栏、标签条与内容；含当前用户 `Avatar`、`Statistic` 实时时钟、`NumberKeyboard` PIN 输入。演示 PIN 固定 `123456`（与登录 OTP 相同）。正确 PIN 关闭遮罩并留在当前路由；错误 PIN 提示后清空输入；Esc / ⌘K 不能绕过 PIN。锁定标记写入 `sessionStorage` 键 `tigercat-admin:lock-screen`。不进左侧菜单。
- 全局水印：`/settings` 的 `theme.watermark` 开关控制是否在 Header 下方内容区（多标签条 + 页面出口）叠一层 Tigercat `Watermark`。水印文案为两行数组：当前用户名、当天日期 `YYYY-MM-DD`（如 `admin` / `2026-08-23`）。开关立即生效，写入 `localStorage` 键 `tigercat-admin:watermark`（无新 API 端点）。关闭时不渲染 Shell `Watermark`；内容编辑页 / 报表页的页内水印演示保持独立。覆盖层外框是 `absolute inset-0` 且 `pointer-events: none`；`Watermark` 本身保持 `relative h-full w-full`（组件总会加上 `relative`，不要把 `absolute` 写在 Watermark 上，否则与组件 class 冲突后高度为 0）。锁屏遮罩仍覆盖水印层。
- 主题配置抽屉：Header 通知铃铛旁的调色板按钮打开右侧 `Drawer`。控件接 `utils/theme.ts`：`Segmented` 切换 light / dark / system，`ColorSwatch` 选 `COLOR_PRESETS` 主色，`Switch` 控制 `compactMode`。变更立即 `saveThemePreferences` + `applyTheme`（含根节点 `.dark` 与 `.compact`）。头像下拉「主题模式」循环切换仍保留。不进左侧菜单。
- 消息铃铛 toast：点击 Popover 内单条通知时用 `notification.*({ title, description, actions, onClick })`。`actions` 渲染「查看」按钮（`closeOnClick: true`），整条 `onClick` 仍跳转 `/notifications`；不要只靠整条点击、也不要自绘 toast 按钮。
- 回到顶部：`BackTop` 的 `target` 指向 `#main-content-scroll`（页面滚在 `Content` 而非 `window`）。容器滚动时显式传 `position="fixed"`、`placement="bottom-left"`、`offset={24}`（Vue `:offset="24"`），不要再用 `!fixed !bottom-*` 覆盖内置 sticky 类。
- 右下悬浮：独立客服 `FloatButton` 传 `floating` + `placement="bottom-right"` + `offset={24}`，未读 `Badge` 用 `standalone` 绝对定位叠在按钮内，不要再包一层 `fixed` 容器。`FloatButtonGroup` 用同一套 `placement` / `offset`（本项目 `offset.y: '6.5rem'`）避开客服坞，不要写 `style.bottom`。
- Content：`min-h-0 overflow-auto p-3 sm:p-4 md:p-6`，底部再留 `pb-28` / `md:pb-32`，右侧再留 `pe-24` / `md:pe-28`，避免表格操作列和列表状态 Tag 被右下角客服与快捷按钮挡住；内部最大宽度 `max-w-7xl`。
- 访客页：登录、注册、忘记密码与注册成功使用居中 Guest shell，不进入后台布局；表单卡片用 `Card variant="transparent"`（v1.2.39+），不再用 `className` 手写透明/无边框/无阴影样式。由于 transparent 变体仍保留组件 size 内边距，Guest 页继续保留 `className="p-0"` / `class="p-0"`。

路由与菜单（下表为本仓库示例；新项目按 [guide/new-project.md](guide/new-project.md) 复制结构、替换条目）：

| 菜单 key | 路径 | 页面 | 权限 |
| -------- | ---- | ---- | ---- |
| `home` | `/dashboard` | 仪表盘 | `dashboard:view` |
| `analytics` | `/analytics` | 数据分析（分组「数据分析」） | 无入口权限 |
| `monitor` | `/monitor` | 实时监控（分组「数据分析」） | 无入口权限 |
| `projects` | `/projects` | 项目列表（分组「项目」） | 无入口权限 |
| — | `/projects/:id` | 项目详情（动态参数 `id`，不进侧栏；列表菜单保持高亮） | 无入口权限 |
| `tickets` | `/tickets` | 工单中心（分组「协作」） | 无入口权限 |
| `approvals` | `/approvals` | 审批中心（分组「协作」） | 无入口权限 |
| — | `/approvals/:id` | 审批详情（动态参数 `id`，不进侧栏；列表菜单保持高亮） | 无入口权限 |
| `performance` | `/performance` | 大数据演示（分组「运维」） | 无入口权限 |
| `users` | `/users` | 用户管理 | `user:view` |
| `roles` | `/roles` | 角色管理 | `role:view` |
| `menus` | `/menus` | 菜单管理（分组「系统管理」） | `menu:view` |
| `permissionDemo` | `/permission-demo` | 按钮权限演示（分组「系统管理」） | 无入口权限 |
| `settings` | `/settings` | 系统设置 | 无入口权限 |
| `files` | `/files` | 文件管理 | `media:view` |
| `notifications` | `/notifications` | 通知中心 | 无入口权限 |
| `tasks` | `/tasks` | 任务面板 | 无入口权限 |
| `audit` | `/audit-logs` | 审计日志 | 无入口权限 |
| `about` | `/about` | 关于 | 无入口权限 |
| `profile` | `/profile` | 个人中心（头像下拉进入，不在左侧菜单） | 无入口权限 |
| — | `/403` `/404` `/500` | 异常页（公共独立布局，不进菜单） | 无（独立兜底页） |
| — | `/login` `/register` `/forgot-password` `/register-success` | 游客认证页（Guest shell，不进菜单） | 无（游客路由） |

React 通过 `ProtectedRoute` / `GuestRoute` / `PermissionRoute` 和 `react-router-dom` 管路由；Vue 通过 `vue-router`、`ProtectedShell`、`GuestShell` 与路由 meta `requiresPermission` 守卫管理。业务页 path / permission 来自 schema 记录（`home` 仍不把 `dashboard:view` 写成路由守卫，以免权限接口失败时仪表盘进不去）。未知路径统一重定向 `/404`；已登录但缺少入口权限（`/users` 需 `user:view`、`/roles` 需 `role:view`、`/menus` 需 `menu:view`、`/files` 需 `media:view`）重定向 `/403`，权限加载完成前守卫保持加载态避免误判。刷新后都从 `SESSION_KEY` 读取会话并加载权限；MockApi 演示账号 `demo` 为只读权限（无 `user:view`/`role:view`/`menu:view`/`media:view`），用于演示 403 场景。项目详情与审批详情都是动态参数路由：双端参数名均为 `id`（React `useParams().id`，Vue `useRoute().params.id`）；未知 id 渲染页内空态，不跳出 Shell。审批详情高亮侧栏 `approvals`。

## 视觉与布局规则

- 主色、背景、文本、边框、阴影优先使用 Tigercat token：`--tiger-primary`、`--tiger-bg-page`、`--tiger-bg-card`、`--tiger-bg-hover`、`--tiger-text`、`--tiger-text-secondary`、`--tiger-border`。
- 页面级辅助类可复用 `p2-text-primary`、`p2-page-accent`、`p2-muted-panel`、`p2-soft-surface`、`p2-icon-chip`、`p2-action-tile`、`p2-checkbox-row`、`p2-modal-scroll`。
- 页面第一块通常使用本地 `PageHeader`（`src/components/PageHeader`，官方 `PageHeader` 的薄包装，调用面仍是 `title` / `subtitle` / `icon` / `tags`）：左侧图标芯片、标题、说明，右侧标签只在 `sm` 以上显示；`tags` 使用 `{ label, variant }`，`variant` 取 Tigercat `Tag` 支持的 `default` / `primary` / `success` / `warning` / `danger` / `info`。业务页继续写 `import PageHeader from '../components/PageHeader'`（React 具名导入保持现有风格）。
- `Tag` 只使用 `variant` 表达状态，不使用 `color`；历史颜色名映射为 `green -> success`、`red/rose -> danger`、`orange -> warning`、`blue -> primary`、`gray -> default`、`purple -> info`。
- `Button` 不使用 `color`：主色用 `variant`（`primary` / `secondary` / `outline` / `ghost` / `link`，默认 `primary`），危险/删除操作改用布尔属性 `danger`（与 `variant` 叠加，如 `variant="ghost" danger`）。
- 指标区使用 `MetricGrid` + `MetricCard`，桌面 3 或 4 列，移动端 1 列。
- 页面操作说明使用 `PageActionPanel`，提示或说明用 `MutedPanel`，图表无数据用 `ChartEmptyState`。
- 弹层内容长时使用 `p2-modal-scroll`，确认类操作优先用 Tigercat `Modal`、`Popconfirm`、`Message`。
- 表格工具栏、批量操作、列开关和导出字段必须保证移动端可换行、不遮挡、不溢出。
- 暗色模式通过根节点 `.dark` 和 Tigercat token 生效，不在页面内写孤立深色配色。

## 组件选择矩阵

| 页面/区域 | 主要 Tigercat 组件 | 关键交互 |
| --------- | ------------------ | -------- |
| Shell | `Layout`、`Content`、`Header`、`Footer`、`Sidebar`、`Drawer`、`Menu`、`Breadcrumb`、`Dropdown`、`Avatar`、`Tag`、`Statistic`、`NumberKeyboard`、`Watermark`、`ColorSwatch`、`Segmented`、`Switch`、`LoadingBar`、`LoadingBarContainer`、`Icon` | 折叠菜单、展开态菜单搜索、移动抽屉、主题切换、账号菜单、内容区全屏、页脚版权条、多标签条（打开/关闭当前·其他·全部、sessionStorage 恢复）、锁屏全屏遮罩（头像下拉锁定，demo PIN 解锁）、全局内容水印（`/settings` 开关，用户名 + 日期）、主题配置抽屉（外观 / 主色 / 紧凑密度，接 `utils/theme.ts`）、受保护路由切换顶部 LoadingBar（落地或失败后消失） |
| Shell 全局挂件 | `Spotlight`、`Tour`、`FloatButton`/`FloatButtonGroup`、`BackTop`、`Badge`、`Popover`、`Drawer`、`ChatWindow`、`Notification` | 命令面板 ⌘K、首登引导、右下快捷动作/回到顶部、消息铃铛（toast 用 `actions` 渲染「查看」并保留整条 `onClick` 兜底）、在线客服坞（`ChatDock` 发送仍走 `POST /api/chat/messages`，已登录时连 `/hubs/chat` 收完整列表 fan-out；Mock/无 WS 时只 REST。不要把 hub 事件当成 `Message` toast） |
| 登录/注册 | `Card`、`Form`、`FormItem`、`Input`、`Button`、`Message` | 表单校验、成功跳转、错误提示 |
| 仪表盘 | `Alert`、`Card`、`Text`、`Tag`、`Select`、`Statistic`、`Loading`、`Empty`、`LineChart`、`BarChart`、`PieChart`、`Marquee`、`DataExport`、`Row`/`Col` | 概览指标、图表空状态、快捷跳转、统计区上方运维公告跑马灯（文档流，不遮挡指标卡片）、概览区按 `trendDays` 导出当前统计与趋势（`GET /api/export/overview` Blob，不用页面 JSON.stringify）、系统信息栅格 |
| 用户管理 | `DataTableWithToolbar`、`Avatar`、`Button`、`ContextMenu`、`Input`、`Modal`、`Form`、`Select`、`Tag`、`Tooltip`、`Checkbox`、`CropUpload` | 分页搜索、排序、列显隐、批量状态、头像裁剪、角色选择、窄屏卡片模式、行右键菜单（编辑 / 启停 / 删除，权限不足隐藏或禁用）、工具栏独立 `导出` / `新增用户` 按钮 |
| 角色管理 | `DataTableWithToolbar`、`Tree`、`Checkbox`、`Modal`、`Popconfirm`、`Select`、`Tag` | 权限树、角色用户配置、导出字段、删除确认、窄屏卡片模式 |
| 菜单管理 | `Tree`、`Menu`、`Card`、`Modal`、`Form`、`Select`、`Switch`、`Popconfirm`、`Empty` | schema 树 CRUD（`/api/menus/schema` + `/api/menus/nodes`）、按角色 `filterMenuByPermission` 预览、`schemaToRouteRecords` 计数。不要自写第二套菜单渲染 |
| 按钮权限 | `Button`、`Card`、`Tag`、`Text` | `/permission-demo` 演示按钮级隐藏：React `PermissionGuard`（含 fallback / `mode="any"|"all"`），Vue `v-permission` / `v-permission.any` 与 `usePermission` fallback。点击只 toast |
| 系统设置 | `Card`、`Input`、`InputNumber`、`ColorPicker`、`Segmented`、`Switch`、`Upload`、`Modal`、`Collapse`/`CollapsePanel`、`Skeleton` | 分组设置（Collapse 手风琴，默认全部展开）、加载骨架、Logo 上传、保存确认、恢复默认值、全局内容水印开关（`theme.watermark`，本机立即生效）。ColorPicker 触发器/面板文案走 `appText.colorPicker`（「选择颜色」等），不要包一层假文案 |
| 文件管理 | `FileManager`、`SplitButton`、`ContextMenu`、`Button`、`Select`、`Tag`、`Modal`、`Message` | 上传（`SplitButton` 主按钮上传、菜单选择文件）、类型筛选、选择、普通删除、强制删除、文件行右键菜单（预览 / 打开 / 删除，删除仍走确认与 `media:delete`） |
| 通知中心 | `NotificationCenter`、`Badge`、`Statistic`、`Card`、`Button`、`notification` | 已读/未读、批量已读、站内跳转、创建/广播 `POST /api/notifications`（`notification:create`）；列表/已读接口不变。铃铛点单条时 `notification.*({ actions, onClick })`，按钮与整条点击都进 `/notifications` |
| 任务面板 | `TaskBoard`、`Statistic`、`Card`、`Input`、`Tag`、`Modal`、`notification` | 拖拽流转、WIP 限制、详情、完成确认 |
| 审计日志 | `ActivityFeed`、`Timeline`、`Input`、`Select`、`Statistic`、`Empty`、`Modal`、`DataExport`、`CheckboxGroup`、`Code` | 筛选、详情、JSON 预览（`Code copyable`，不要手写 `<pre>`）、`DataExport` 导出 csv/json/xlsx（带当前筛选与字段勾选，`GET /api/audit-logs/export` Blob，权限 `audit:export`）、保留清理 |
| 个人中心 | `Tabs`/`TabPane`、`Descriptions`、`Avatar`、`Badge`、`Statistic`、`Rate`、`QRCode`、`Signature`、`InputOTP`、`MaskInput`、`ColorSwatch`、`Radio`/`RadioGroup`、`Slider`、`DatePicker`、`TimePicker`、`Textarea`、`Switch`、`Divider`、`Space`、`Timeline`、`List`、`Row`/`Col`、`Icon` | 选项卡分区、资料只读视图、KPI 栅格、两步验证开关对接 enable/disable、`InputOTP` 绑定确认、手机号掩码演示、电子签名、偏好设置、登录设备与历史 |
| 数据分析 | `Segmented`、`DatePicker`、`ButtonGroup`、`Statistic`、`Progress`、`Skeleton`、`AreaChart`、`DonutChart`、`FunnelChart`、`GaugeChart`、`HeatmapChart`、`RadarChart`、`ScatterChart`、`TreeMapChart`、`SunburstChart`、`OrgChart`、`ChartCanvas`/`ChartAxis`/`ChartGrid`/`ChartSeries`/`ChartLegend`/`ChartTooltip`、`Table`、`Pagination` | 时间范围切换、KPI 进度、多类型图表、组织分布、图表基元自定义、明细分页 |
| 实时监控 | `Segmented`、`Statistic`、`GaugeChart`、`AreaChart`、`LineChart`、`ActivityFeed`、`Progress`、`Tag`、`Badge` | 优先 SignalR `/hubs/monitor` 按 2s / 3s / 5s（默认 3s）推送同一份 snapshot JSON；暂停后停止推送；连接失败或 Mock 演示回退轮询 `GET /api/monitor/snapshot`；CPU/内存/磁盘水位、QPS/延迟滚动窗口、节点状态、事件流封顶 |
| 项目列表 | `Card`、`Statistic`、`Tag`、`Avatar`/`AvatarGroup`、`Progress`、`Input`、`Segmented`、`Pagination`、`Empty`、`Row`/`Col` | 卡片网格（`Row`/`Col` 响应式 span）、名称/负责人/编号搜索、状态分段筛选（规划中/进行中/已暂停/已完成）、分页、点击卡片或「查看详情」进入 `/projects/:id`；列表筛选/分页接 `GET /api/projects` |
| 项目详情 | `Descriptions`、`Steps`/`StepsItem`、`Tabs`/`TabPane`、`Anchor`/`AnchorLink`、`Timeline`、`CommentThread`、`Empty`、`Progress`、`Avatar`/`AvatarGroup` | 动态路由 `:id`、概览/成员/动态、页内锚点切 Tab、未知 id 空态仍保持列表菜单高亮；详情接 `GET /api/projects/{id}`，讨论接 `GET /api/comments?targetType=project` |
| 工单中心 | `Splitter`、`Resizable`、`Steps`/`StepsItem`、`WorkflowTimeline`/`WorkflowActionBar`、`ChatWindow`、`CommentThread`、`Mentions`、`Descriptions`、`Rate`、`Badge`、`Tag`、`Popover`、`Drawer`、`Upload`、`Textarea`、`RadioGroup`/`Radio`、`Input`、`Divider` | 主从分栏（宽屏左右 / 窄屏上下）、工单生命周期、展示用审批时间线（步骤由工单状态派生）、对话、内部 @ 协作、附件、关闭确认、新建工单；列表/详情/关闭/对话接 `/api/tickets`，内部备注接 `/api/comments?targetType=ticket`。ActionBar 同意/驳回写回工单状态，转交/评论写回一条对话（不改状态），撤销禁用；完整待办实例见审批中心 |
| 审批中心 | `DataTableWithToolbar`、`Segmented`、`Descriptions`、`WorkflowViewer`、`WorkflowTimeline`/`WorkflowActionBar`、`Modal`、`Form`、`Select`、`Tag` | 四条列表车道、发起审批、详情表单 + Viewer/Timeline + ActionBar 确认配方。同意/驳回/转交写回 `/api/approvals/{id}/actions`；同一份 `steps`，不要第二套 Timeline。无 BPM |
| 团队日历 | `Calendar`、`Countdown`、`Statistic`、`Badge`、`Popover`、`Tag`、`List`、`Drawer`、`DatePicker`、`TimePicker`、`RadioGroup`/`Radio`、`Input` | 月视图 `events` + React `dateCellRender` / Vue `#dateCell` 在格子内标色点和数量；点击日期看右侧当日详情与即将到来列表、新建事件。不要自绘第二套格内事件层。可见月与即将到来接 `GET /api/calendar/events`，Drawer 创建接 `POST /api/calendar/events` |
| 内容编辑 | `Segmented`、`RichTextEditor`、`MarkdownEditor`、`CodeEditor`、`Watermark`、`Switch`、`Space`、`TreeSelect`、`Cascader`、`TagsInput`、`Mentions`、`Upload`、`Result`、`Tag`、`AutoComplete` | 编辑器三态切换、标题 `AutoComplete`（`allowFreeInput`，可输入未列出的标题）、草稿水印、分类树/栏目级联、`TagsInput` 多标签、@ 协作者、附件上传、立即发布开关、发布成功结果页；挂载加载种子文章 `a1`，保存草稿 / 发布接 `PUT /api/content/articles/{id}`，刷新后从接口恢复。协作者与附件仍本页本地。工具条「加粗 / 斜体」等走 `appText.richTextEditor` / `markdownEditor`，不要自绘一套工具条 |
| 媒体图库 | `Carousel`、`ImageGroup`、`Image`、`ImagePreview`、`ImageViewer`、`ImageAnnotation`、`ImageCropper`、`Masonry`、`AspectRatio`、`ImageCompare`、`Segmented`、`Skeleton`、`Empty`、`Tag`、`Drawer` | 精选轮播、相册切换、瀑布流网格、固定比例封面、版本前后对比、网格灯箱预览、大图查看（缩放/旋转/导航）、矩形/椭圆标注、16:9 裁剪、刷新骨架屏、空相册空态 |
| 定时任务 | `CronEditor`、`Stepper`、`InputGroup`/`InputGroupAddon`、`NumberKeyboard`、`Gantt`、`Switch`、`Progress`、`Steps`/`StepsItem`、`Badge`、`Tag`、`Drawer`、原生 `Table` | 调度表达式编辑、并发数步进、超时数值+单位、批量条数数字键盘、执行时间轴、启停切换、执行进度、运行阶段、新建/编辑任务；列表 / 启停 / 新建编辑接 `/api/jobs`，Gantt 使用返回的 `start` / `end` / `progress` / `color` |
| 数据导入 | `FormWizard`、`Transfer`、`Upload`、`Cascader`、`Slider`、`RadioGroup`/`Radio`、`Progress`、`Result`、`Descriptions` | 分步向导、字段映射穿梭框、文件上传、目标表级联、批量大小滑块、导入模式/冲突策略、导入进度、确认摘要、完成结果页；前三步仍本地，完成时 `POST /api/import-jobs` 并轮询 `GET` 直到完成，最近任务 ID 写入 `sessionStorage` 键 `tigercat-admin:last-import-job` 以便刷新恢复 Result |
| 大数据演示 | `VirtualList`、`VirtualTable`、`useDrag`、`Kanban`、`Tabs`/`TabPane`、`Tag`、`Card` | 万级日志流虚拟滚动、万行多列表格（stickyHeader + 固定行高）、`useDrag` 自由排序（无 `/Drag` 子路径组件）、低层看板（区别于任务面板 `TaskBoard`）；数据页面内生成 |
| 帮助中心 | `Anchor`/`AnchorLink`、`ScrollSpy`、`Affix`、`Collapse`/`CollapsePanel`、`Code`、`Kbd`、`Link`、`List`、`InfiniteScroll`、`ScrollArea`、`Highlight`、`Card`、`BackTop`（全局） | 长文档章节锚点导航（`getContainer` 指向 `#main-content-scroll`）、横向滚动高亮、侧栏吸顶、FAQ 手风琴、可复制代码块、快捷键 `Kbd`、内联链接、关键字高亮（「权限」「令牌」）、`ScrollArea` 只包 FAQ 答案与更多文章列表（`maxHeight` 240 / 320 写在视口上，根 class 用 `className` / `viewportClassName` 区分，不包整篇以免抢走主内容滚动）、更多文章无限加载、回到顶部 |
| 报表打印 | `PrintLayout`/`PrintPageBreak`、`Watermark`、`Descriptions`、`Statistic`、`QRCode`、`Result`、`Segmented`、`Divider`、原生 `Table`、`DataExport`、`CheckboxGroup` | A4 打印布局、草稿水印、报表元信息、KPI 汇总、渠道明细、分页分隔、二维码校验、报表类型切换、`window.print()` 输出、打印旁 `DataExport` 导出 csv/json/xlsx（`CheckboxGroup` 勾选 KPI/渠道字段，`GET /api/export/reports` Blob） |
| 异常页 | `Result`、`Countdown`、`Button`、`Empty` | 403/404/500 独立居中布局、返回首页/上一页、404 倒计时自动回首页、无历史记录时 Empty 提示、无权限路由重定向 `/403` |
| 登录流程增强 | `Steps`、`Input`、`MaskInput`、`InputOTP`、`Countdown`、`Alert`、`Result`、`Button` | 忘记密码三步重置（邮箱 `Input` / 手机 `MaskInput` → `InputOTP` 验证码 → 新密码 → 完成）、账号两步验证 `InputOTP`（验证通过才写会话、60s 重发倒计时）、注册成功结果页与倒计时回登录 |
| 关于 | `Alert`、`Card`、`Text`、`Tag`、`NavigationMenu`/`NavigationMenuList`/`NavigationMenuContent`/`NavigationMenuItem`/`NavigationMenuLink`/`NavigationMenuTrigger` | 技术栈和版本信息、页内分区跳转（服务信息 / 特性 / 技术栈）。默认点击 / Enter / Space / ArrowDown 才开层面板，不要依赖悬停；根菜单自行命名（`aria-label="关于分区"`），不要假设默认 `Main`。 |

组件一律使用 PascalCase 子路径导入，不要从包根 barrel 拉组件（会拖进 `vendor-ui`）：

```ts
import { Button } from '@expcat/tigercat-react/Button';
import { Layout } from '@expcat/tigercat-react/Layout';
import { Content } from '@expcat/tigercat-react/Content';
import { TaskBoard } from '@expcat/tigercat-react/TaskBoard';
import { NotificationCenter } from '@expcat/tigercat-react/NotificationCenter';
import { FileManager } from '@expcat/tigercat-react/FileManager';
import { ActivityFeed } from '@expcat/tigercat-react/ActivityFeed';
import { Timeline } from '@expcat/tigercat-react/Timeline';
import { WorkflowTimeline } from '@expcat/tigercat-react/WorkflowTimeline';
import { WorkflowViewer } from '@expcat/tigercat-react/WorkflowViewer';
import { Upload } from '@expcat/tigercat-react/Upload';
import { CropUpload } from '@expcat/tigercat-react/CropUpload';
import { ColorPicker } from '@expcat/tigercat-react/ColorPicker';
import { VirtualList } from '@expcat/tigercat-react/VirtualList';
import { VirtualTable } from '@expcat/tigercat-react/VirtualTable';
import { Kanban } from '@expcat/tigercat-react/Kanban';
import { useDrag } from '@expcat/tigercat-react/useDrag';
import { Message } from '@expcat/tigercat-react/Message';
import { LoadingBar } from '@expcat/tigercat-react/LoadingBar';
import { LoadingBarContainer } from '@expcat/tigercat-react/LoadingBarContainer';
import { ContextMenu, ContextMenuItem, ContextMenuMenu, ContextMenuSub } from '@expcat/tigercat-react/ContextMenu';
import { SplitButton } from '@expcat/tigercat-react/SplitButton';
import { NavigationMenu } from '@expcat/tigercat-react/NavigationMenu';
import { PageHeader } from '@expcat/tigercat-react/PageHeader';
import { Kbd } from '@expcat/tigercat-react/Kbd';
import { Masonry } from '@expcat/tigercat-react/Masonry';
import { AspectRatio } from '@expcat/tigercat-react/AspectRatio';
import { ImageCompare } from '@expcat/tigercat-react/ImageCompare';
import { ScrollArea } from '@expcat/tigercat-react/ScrollArea';
import { Highlight } from '@expcat/tigercat-react/Highlight';
import { AutoComplete } from '@expcat/tigercat-react/AutoComplete';
import { Footer } from '@expcat/tigercat-react/Footer';
import { Icon } from '@expcat/tigercat-react/Icon';
import { Row } from '@expcat/tigercat-react/Row';
import { Col } from '@expcat/tigercat-react/Col';
import { Skeleton } from '@expcat/tigercat-react/Skeleton';
import { Marquee } from '@expcat/tigercat-react/Marquee';
import { DataExport } from '@expcat/tigercat-react/DataExport';
import { CheckboxGroup } from '@expcat/tigercat-react/CheckboxGroup';
import { Checkbox } from '@expcat/tigercat-react/Checkbox';
```

Vue 端将包名替换为 `@expcat/tigercat-vue/...`。没有 `/Drag` 组件，拖拽走 hook 子路径 `/useDrag`；React 用 `getDragItemProps`，Vue 用 `getDragItemAttrs`。命令式 `notification` 没有公开子路径，允许从包根导入。`Message` 用 `/Message`。

同文件族可从父路径一起导入（`Dropdown`/`DropdownMenu`/`DropdownItem`、`Menu`/`MenuItem`/`SubMenu`、`Tabs`/`TabPane`、`Steps`/`StepsItem`、`ContextMenu*`、`NavigationMenu*`、`WorkflowTimeline`/`WorkflowActionBar`）。`WorkflowViewer` 是独立入口 `@expcat/tigercat-react/WorkflowViewer`（Vue 换包名）。`FormItem`、`AvatarGroup`、`RadioGroup` 是独立入口，不要从 `Form`/`Avatar`/`Radio` 再导出。

页面已按路由 `lazy` / `() => import(...)` 拆包。图表、编辑器、裁剪/标注、Gantt 再按交互边界懒加载：双端从 `src/utils/lazyTigercat` 引入（React `lazy` + `Suspense`，Vue `defineAsyncComponent`）。仪表盘 / 监控 / 数据分析懒加载图表；内容页只加载当前编辑器；图库裁剪/标注在抽屉打开后加载；用户头像 `CropUpload` 在编辑弹层出现后加载；定时任务 `Gantt` 随页面异步加载。不要把这些重入口静态写进 Shell。Vite `manualChunks` 只把**静态可达**的 `@expcat/tigercat-*` 放进 `vendor-ui`，避免把懒加载模块打回同一 chunk。

文案只加载 `zhCN`：`import { zhCN } from '@expcat/tigercat-core/locales/zh-CN'`，再与 `appText` overlay 合成 `appLocale`。不要 import `@expcat/tigercat-core/datepicker-locales/registry`（会带上全部 DatePicker 语言包）。

`DataExport` 2.1.1 官方格式只有 `xlsx` / `markdown`，组件会先在客户端序列化再触发 `onExport`。报表 / 审计 / 仪表盘用它做 csv/json/xlsx 触发按钮（`labels.xlsxText`），`cellFormatter` 跳过客户端文件，实际字节来自导出 API Blob。字段勾选走 `CheckboxGroup`。用户 / 角色页现有导出弹层不改。

### 表格使用约定（v1.2.44+）

- **窄屏卡片模式**：用户/角色页的 `DataTableWithToolbar` 启用 `responsiveMode="card"` + `cardBreakpoint="md"`（Vue 为 `responsive-mode="card"` + `card-breakpoint="md"`），与 Shell 左侧菜单隐藏断点 `(max-width: 767px)` 对齐；低于 `md` 时表格渲染为堆叠卡片。列级配置：`id` → `hideInCard: true`（卡片省略）、`username`/`name` → `cardTitle: true`（卡片标题），其余列保持原顺序（可用 `cardPriority` 调整权重）。卡片模式下行选择、列 `render`、分页均可用，`fixed` 固定列配置自动失效。`v1.2.39` 起卡片增强为上游内置，无需页面适配：展开/收起、全选、排序文案走 locale；存在 `sortable` 列时卡片列表上方自动渲染排序 `Select`；行选择为主题 `Checkbox`/`Radio` 并带「全选」控件；空状态走 `Empty` 组件渲染 `emptyText`。需要深度定制时可用 `cardClassName` / `renderCard`（本项目暂未使用）。
- **卡片排列**：`v1.2.44` 起 Card 模式支持网格排列。常规数据工作台先用默认顺序 + `hideInCard` / `cardTitle` / `cardPriority`；需要二维排布时优先在列配置里使用 `cardGrid`；需要跨页面复用或集中覆盖时使用表级 `cardLayout`（React prop 为 `cardLayout`，Vue 为 `:card-layout`）。`cardGrid` 与 `cardLayout` 都支持 `colSpan`（1-12）、`rowSpan`（1-6）、`hideLabel`、`labelPosition: 'left' | 'top'`；列级 `cardGrid` 双端都写在 `columns` 内，表级 `cardLayout` 通过 `key` 指向目标列。用户/角色页已用表级 `cardLayout` 在窄屏卡片中启用紧凑信息行：字段全宽、标签和值左右排列，操作区整行展示并隐藏字段标签。
- **表格文案**：Table / DataTableWithToolbar 文案统一走 ConfigProvider locale 的 `table` 分节。双端 `src/utils/tigercatText.ts` 导出 `appLocale`（官方 `zhCN` + `appText` overlay），根节点 `ConfigProvider locale={appLocale}`。不要把 `defineText` overlay 单独当完整语言包（v2.1.3 缺键回落 en-US）。卡片排序 Select 的占位与空列表走 locale `select.placeholder` / `emptyText`（「请选择」/「暂无选项」），不要在 Users / Tasks 页硬编码覆盖。页面级覆盖业务文案用 `emptyText`（如「暂无用户数据」）或 `labels` prop；不要再在 toolbar 上硬编码 `searchButtonText` / `bulkActionsLabel` 通用文案，业务化的 `searchPlaceholder`（如「搜索用户名或显示名...」）保留在页面。
- **锁定列背景**：上游锁定列背景读组件 Token 链 `--tiger-table-bg → --tiger-component-table-bg → --tiger-surface`（stripe/hover/header 同理），`v1.2.43+` 已对 `striped + fixed` 单元格使用不透明 `color-mix(...)` 背景，避免横向滚动时透出下层内容。本项目在双端全局 CSS 的 `.dark` 块中将 `--tiger-component-table-bg/stripe-bg/hover-bg/header-bg` 映射到 `--tiger-bg-card`/`--tiger-bg-page`/`--tiger-bg-hover`，不再使用 `[style*="position: sticky"]` 全局覆盖。需要进一步定制时使用列级 `fixedClassName` / `fixedHeaderClassName`。
- **列显隐面板**：用户/角色页在 `DataTableWithToolbar` 的 `toolbar` 中启用 `showColumnSettings: true`，并使用 Table 受控隐藏列能力保存状态：React 传 `hiddenColumnKeys` + `onHiddenColumnKeysChange`，Vue 传 `:hidden-column-keys` + `@hidden-column-keys-change`。不要再自建 `Popover + Checkbox` 列显隐面板，也不要在页面侧过滤 `columns`；隐藏列由上游 Table 统一处理，sessionStorage 仍保存 `hiddenColumnKeys`。
- **搜索/筛选/分页（v2.1.3）**：搜索、筛选、批量动作回调写在 `toolbar` 上（React `toolbar.onSearchChange` / `onSearch` / `onFiltersChange` / `onBulkAction`；Vue 仍可用 `@search-change` / `@search` / `@filters-change` / `@bulk-action`）。Vue `DataTableWithToolbar` 会同时调用 toolbar 回调并 emit 同名事件，用户/角色页只绑 toolbar 的 `onSearchChange` / `onSearch`，不要再叠 `@search-change` / `@search`，否则 `handleSearch` 会触发两次。筛选/批量动作 Vue 继续用 `@filters-change` / `@bulk-action`（toolbar 上未再写一份）。用户/角色页是服务端分页，必须 `toolbar.searchMode: 'remote'`，不要用默认 `local` 去筛当前页。`onPageChange` / `onPageSizeChange` 与 Table 同签名：`({ current, pageSize })`；改页尺寸只发 `onPageSizeChange`。

## React / Vue 映射

| 语义 | React | Vue |
| ---- | ----- | --- |
| 样式属性 | `className` | `class` 或组件要求的 `class-name` |
| 受控值 | `value` + `onChange` | `:model-value` + `@update:model-value` 或 `v-model`（Switch / RadioGroup / 编辑器族走默认 `v-model`，不要 `v-model:checked` / `v-model:value`） |
| 弹层开关 | `open` + `onOpenChange` / `onClose` | `:open` + `@update:open` / `@close`（不要 `visible` / `onVisibleChange`） |
| 事件命名 | camelCase props | kebab-case emits |
| 权限包装 | `PermissionGuard` / `usePermission` | `v-permission` / `usePermission` |
| 路由跳转 | `useNavigate()` | `useRouter().push()` |
| 派生状态 | `useMemo` | `computed` |
| 副作用 | `useEffect` | `watch` / lifecycle hooks |

## 数据、权限与状态

- API 调用统一走双端 `src/utils/request.ts` 的 `apiRequest`。
- 会话存在 `SESSION_KEY`，认证头由 `getAuthHeaders()` 或等价工具生成。Monitor / Chat 实时连接用 `utils/realtime.ts`（`@microsoft/signalr` 动态导入），token 走 `getSessionToken()`；演示模式（`VITE_TIGERCAT_DEMO`）不连 hub。
- API 返回结构使用 `ApiResponse<T>`；分页列表使用 `PagedResult<T>`。
- 权限列表从 `/api/auth/permissions` 加载，菜单和按钮按权限隐藏。按钮级演示在 `/permission-demo`：React 用 `PermissionGuard` / `usePermission`，Vue 用 `v-permission` / `usePermission`。不要新增 Tigercat 权限组件，也不要自写第二套权限指令。
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

本项目此前记录的上游诉求已经补齐（Shell 相关于 `v1.2.23`，表格/卡片/弹层相关于 `v1.2.37`–`v1.2.44`，通知 toast 操作按钮于 `v2.1.2`）。当前蓝本为 Tigercat `^2.3.2`。尚未提供或不够用的包能力见 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md)；开放项短清单见 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)。

| 组件 | 平台 | 上游现状 | 本项目保留的布局 glue |
| ---- | ---- | -------- | --------------------- |
| `Sidebar` | React / Vue | 上游 `LayoutDemo` 已提供官方后台 Shell 侧栏示例，覆盖 Logo 文案、主菜单和底部折叠按钮的组合用法。 | `MainSidebar` 继续保留 `max-width + opacity + transform` 的品牌文案和折叠按钮动画。 |
| `Menu` | React / Vue | 上游在 `inline + collapsed + popupPortal` 下会自动退化为 popup 子菜单，并补充了双端测试。 | 主菜单保持 `mode="inline"`，继续保留 `!min-w-0` 作为 flex / overflow 容器下的布局 glue。 |
| `Table` / `DataTableWithToolbar` | React / Vue | `v1.2.37` 起锁定列背景改读组件 Token 链（`--tiger-component-table-*`），并新增窄屏卡片模式（`responsiveMode="card"` + `cardBreakpoint` + 列级 `hideInCard`/`cardTitle`/`cardPriority`）。`v1.2.39` 起新增 `locale`/`labels` props 与 `TigerLocale.table` 分节，卡片模式补齐 i18n 文案、主题化选择框、全选、排序 Select、`Empty` 空状态与 `cardClassName`/`renderCard`。`v1.2.41` 起新增 `hiddenColumnKeys` / `defaultHiddenColumnKeys` 与 toolbar `showColumnSettings` 列设置面板，并统一浮层 z-index，使 Dropdown / Popover 高于表格 sticky 层。`v1.2.43` 起 `striped + fixed` 单元格改用不透明混合背景，避免斑马纹锁定列透出下层内容。`v1.2.44` 起 Card 模式新增列级 `cardGrid` 和表级 `cardLayout`，可控制 `colSpan`、`rowSpan`、`hideLabel`、`labelPosition`。 | 使用方式见上文「表格使用约定」；用户/角色页仅保留 sessionStorage 状态同步，不再自建列显隐面板或 sticky 层叠 CSS workaround，并通过表级 `cardLayout` 在窄屏卡片中启用紧凑信息行排列。 |
| `Card` | React / Vue | `v1.2.39` 起新增 `variant="transparent"`（透明、无边框、无阴影）。 | 登录/注册页改用该变体，并保留 `p-0` 类以延续页面级布局约定。 |
| `Popover` / `Dropdown` | React / Vue | `v1.2.39` 起经 Escape 或外部点击关闭后自动恢复触发器焦点；`v1.2.41` 起浮层统一高于表格 sticky 层。 | 行内操作菜单直接使用上游浮层层级，不再添加全局行 z-index 覆盖。 |
| `Notification` | React / Vue | `v2.1.2` 起 imperative API 支持 `actions`（`label` / `type` / `closeOnClick` / `onClick`），整条 `onClick` 仍可用。 | 消息铃铛点单条通知时传 `actions: [{ label: '查看', type: 'primary', closeOnClick: true }]`，并保留整条点击跳转通知中心。 |
| `BackTop` | React / Vue | `v2.1.2` 起支持 `position`（`auto` / `fixed` / `sticky`）、`placement`、`offset`。`auto` 在非 window `target` 时仍走 sticky。 | `ShellQuickActions` 对内容容器滚动使用 `position="fixed"` + `placement="bottom-left"` + `offset={24}`，不再写 `!important` 覆盖类。 |
| `FloatButton` | React / Vue | `v2.1.2` 起独立按钮可选 `floating` + `placement` + `offset`；`FloatButtonGroup` 同步支持 `placement` / `offset`。 | `ChatDock` 用 `floating` 贴右下角，未读 `Badge` 叠在按钮内；快捷组用 `offset.y: '6.5rem'` 上移，不再自包 `fixed` 容器或写 `style.bottom`。 |
| `ColorPicker` | React / Vue | `v2.1.2` 起支持 `labels`（`trigger` / `panelTitle` / `clear` 等）与 ConfigProvider `colorPicker` 分节。 | 中文站点在 `tigercatText.ts` 的 `appText.colorPicker` 提供文案；Settings 页不另造触发器文案层。 |
| `Select` | React / Vue | `v2.1.2` 起 `TigerLocaleSelect` 增加 `placeholder` / `emptyText`，并随 zh 语言包给出中文默认值。 | 卡片排序等未传 `placeholder` 的 Select 读 `appText.select`（「请选择」/「暂无选项」）；业务 Select 仍可在页面上传入具体 `placeholder`。 |
| `RichTextEditor` / `MarkdownEditor` | React / Vue | `v2.1.2` 起内置工具条读 ConfigProvider `richTextEditor` / `markdownEditor` 分节，也可用组件 `labels` 覆盖。`v2.1.3` 起 Vue 三个编辑器走默认 `v-model`（`modelValue` / `update:modelValue`）。 | 在 `tigercatText.ts` 提供加粗、斜体、标题、列表等中文；Content 页不另包自定义工具条，Vue 不要再写 `v-model:value`。 |
| `Drawer` / overlay | React / Vue | `v2.1.3` 删除 `deferDestroyOnClose` / `destroyOnCloseAfterLeave`；`destroyOnClose` 自己等关场。焦点恢复用 `onAfterClose` / `@after-close`。Alert / Tag / ChartTooltip 可见性是 `open`，不是 `visible`。 | 移动侧栏 Drawer 只传 `destroyOnClose` + `onAfterClose`；图表基元 `ChartTooltip` 用 `open={false}`。 |
| `DataTableWithToolbar` | React / Vue | `v2.1.3` 搜索/筛选默认写进当前表（`searchMode: 'local'`）；`onPageChange` 与 Table 同为对象签名。 | 用户/角色页 `toolbar.searchMode: 'remote'`，分页回调吃 `{ current, pageSize }`。 |
| `NavigationMenu` | React / Vue | `v2.1.3` 默认点击才开层；`NavigationMenuList` 进根入口；不再默认 `aria-label="Main"`。 | About 页包 `NavigationMenuList` 并自行命名。 |
| `Transfer` / `TreeSelect` | React / Vue | 搜索开关统一 `searchable`，旧 `showSearch` 已删。 | 导入穿梭框与内容分类树用 `searchable`。 |
| `List` | React / Vue | `bordered` 是外框布尔，不再接受 `'bordered' \| 'divided' \| 'none'`。 | 个人中心设备列表写 `bordered`。 |
| `ImageCropper` / `CropUpload` | React / Vue | `v2.1.4` 起 ResizeObserver 只量父级宽度，拟合尺寸写内层 stage，裁剪画布不再越缩越小。无新必填 prop。 | Gallery 裁剪抽屉和 Users 头像 CropUpload 不另加高度 workaround。 |
| `SplitButton` | React / Vue | `v2.1.4` 主按钮与 chevron 同高。 | Files 页上传继续用 SplitButton。 |
| `MenuSchema` | core | `v2.3.0` 起 `MenuSchemaNode` + `filterMenuByPermission` / `menuSchemaToMenuItems`，映射到现有 `Menu`，无新必填 prop。`v2.3.2` 起 schema 元数据 `hideInBreadcrumb` / `flatMenu` / `badge` / `iframeSrc` 与 `schemaToRouteRecords`。 | Shell 侧栏与命令面板用 schema 过滤后的 `items`；主要业务路由用 `schemaToRouteRecords` + `page-map` 懒加载（见上文 mixed 路由）。应用图标名仍走本地 Icon 映射。菜单管理轻页 CRUD 这些字段，并用角色权限预览过滤结果。 |
| `WorkflowTimeline` / `WorkflowActionBar` | React / Vue | `v2.3.0` 起审批步骤时间线 + 操作条，映射到现有 `Timeline`，无 BPM 引擎。`v2.3.1` 起状态 Tag 读 `locale.workflowTimeline` / `labels`（zh-CN 已通过/进行中/待处理/已驳回/已撤销）。`v2.3.2` 起 ActionBar 可选 `confirm` 确认配方。 | 工单详情用工单状态派生步骤，同意/驳回写回工单 `PUT`。审批中心详情用接口返回的 `steps`，ActionBar `confirm` 后 `POST /api/approvals/{id}/actions`。中文站点走 `appLocale`。 |
| `WorkflowViewer` | React / Vue | `v2.3.2` 起只读钉钉风审批树，复用 `WorkflowTimelineStep`（含 children / 会签 / 抄送 / 条件 stub），不是第二套 Timeline。 | 审批详情与 Timeline 共用同一 `steps`；不要自绘树或再包一层 Timeline。 |
| `Calendar` | React / Vue | `v2.2.0` 起月视图 `events`、React `dateCellRender(date, extra)`、Vue `#dateCell="{ date, events, extra }"`，格子 `aria-label` 含当天事件数。 | `/calendar` 把接口事件映射为 `events` 并走格内渲染；右侧当日列表只做选中日详情，不再当格内事件的唯一展示。 |
