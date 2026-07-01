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

- 外层：`Layout` 横向布局，左侧 `MainSidebar`，右侧 `MainHeader + Content`。
- 桌面侧栏：宽 `240px`，折叠宽 `64px`，使用 `Sidebar`、`Menu`、`SubMenu`、`MenuItem`。
- 桌面侧栏主菜单保持 `mode="inline"`；折叠态继续传 `collapsed` 并开启 `popupPortal`，由上游在收缩时自动退化为 popup 子菜单，不再手动切换 `vertical`。
- 移动侧栏：使用 `Drawer placement="left"`，宽 `240px`，遮罩可点击关闭；Esc 关闭为 Drawer 内置行为（经 `onClose/@close` 回调），不要再手动监听 keydown。依赖 `destroyOnClose + destroyOnCloseAfterLeave + onAfterLeave/@after-leave` 完成离场后卸载与焦点恢复。
- Header：使用 `Header`、`Breadcrumb`、`Button`、`Dropdown`、`Avatar`、`Tag`，包含侧栏开关、面包屑、主题切换、修改密码和退出。
- Content：`min-h-0 overflow-auto p-3 sm:p-4 md:p-6`，内部最大宽度 `max-w-7xl`。
- 访客页：登录和注册使用居中 Guest shell，不进入后台布局；表单卡片用 `Card variant="transparent"`（v1.2.39+），不再用 `className` 手写透明/无边框/无阴影样式。由于 transparent 变体仍保留组件 size 内边距，Guest 页继续保留 `className="p-0"` / `class="p-0"`。

路由与菜单（下表为本仓库示例；新项目按 [guide/new-project.md](guide/new-project.md) 复制结构、替换条目）：

| 菜单 key | 路径 | 页面 | 权限 |
| -------- | ---- | ---- | ---- |
| `home` | `/dashboard` | 仪表盘 | `dashboard:view` |
| `analytics` | `/analytics` | 数据分析（分组「数据分析」） | 无入口权限 |
| `users` | `/users` | 用户管理 | `user:view` |
| `roles` | `/roles` | 角色管理 | `role:view` |
| `settings` | `/settings` | 系统设置 | 无入口权限 |
| `files` | `/files` | 文件管理 | `media:view` |
| `notifications` | `/notifications` | 通知中心 | 无入口权限 |
| `tasks` | `/tasks` | 任务面板 | 无入口权限 |
| `audit` | `/audit-logs` | 审计日志 | 无入口权限 |
| `about` | `/about` | 关于 | 无入口权限 |
| `profile` | `/profile` | 个人中心（头像下拉进入，不在左侧菜单） | 无入口权限 |

React 通过 `ProtectedRoute` / `GuestRoute` 和 `react-router-dom` 管路由；Vue 通过 `vue-router`、`ProtectedShell`、`GuestShell` 管路由。刷新后都从 `SESSION_KEY` 读取会话并加载权限。

## 视觉与布局规则

- 主色、背景、文本、边框、阴影优先使用 Tigercat token：`--tiger-primary`、`--tiger-bg-page`、`--tiger-bg-card`、`--tiger-bg-hover`、`--tiger-text`、`--tiger-text-secondary`、`--tiger-border`。
- 页面级辅助类可复用 `p2-text-primary`、`p2-page-accent`、`p2-muted-panel`、`p2-soft-surface`、`p2-icon-chip`、`p2-action-tile`、`p2-checkbox-row`、`p2-modal-scroll`。
- 页面第一块通常使用 `PageHeader`：左侧图标芯片、标题、说明，右侧标签只在 `sm` 以上显示；`tags` 使用 `{ label, variant }`，`variant` 取 Tigercat `Tag` 支持的 `default` / `primary` / `success` / `warning` / `danger` / `info`。
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
| Shell | `Layout`、`Content`、`Header`、`Sidebar`、`Drawer`、`Menu`、`Breadcrumb`、`Dropdown`、`Avatar`、`Tag` | 折叠菜单、移动抽屉、主题切换、账号菜单 |
| Shell 全局挂件 | `Spotlight`、`Tour`、`FloatButton`/`FloatButtonGroup`、`BackTop`、`Badge`、`Popover`、`Drawer`、`ChatWindow`、`Notification` | 命令面板 ⌘K、首登引导、右下快捷动作/回到顶部、消息铃铛、在线客服坞、富交互提示 |
| 登录/注册 | `Card`、`Form`、`FormItem`、`Input`、`Button`、`Message` | 表单校验、成功跳转、错误提示 |
| 仪表盘 | `Alert`、`Card`、`Text`、`Tag`、`Select`、`Statistic`、`Loading`、`Empty`、`LineChart`、`BarChart`、`PieChart` | 概览指标、图表空状态、快捷跳转 |
| 用户管理 | `DataTableWithToolbar`、`Avatar`、`Button`、`Input`、`Modal`、`Form`、`Select`、`Tag`、`Tooltip`、`Checkbox`、`CropUpload` | 分页搜索、排序、列显隐、批量状态、头像裁剪、角色选择、窄屏卡片模式 |
| 角色管理 | `DataTableWithToolbar`、`Tree`、`Checkbox`、`Modal`、`Popconfirm`、`Select`、`Tag` | 权限树、角色用户配置、导出字段、删除确认、窄屏卡片模式 |
| 系统设置 | `Card`、`Input`、`InputNumber`、`ColorPicker`、`Segmented`、`Switch`、`Upload`、`Modal` | 分组设置、Logo 上传、保存确认、恢复默认值 |
| 文件管理 | `FileManager`、`Upload`、`Button`、`Select`、`Tag`、`Modal`、`Message` | 上传、类型筛选、选择、普通删除、强制删除 |
| 通知中心 | `NotificationCenter`、`Badge`、`Statistic`、`Card`、`Button`、`notification` | 已读/未读、批量已读、站内跳转 |
| 任务面板 | `TaskBoard`、`Statistic`、`Card`、`Input`、`Tag`、`Modal`、`notification` | 拖拽流转、WIP 限制、详情、完成确认 |
| 审计日志 | `ActivityFeed`、`Timeline`、`Input`、`Select`、`Statistic`、`Empty`、`Modal` | 筛选、详情、JSON 预览、CSV 导出、保留清理 |
| 个人中心 | `Tabs`/`TabPane`、`Descriptions`、`Avatar`、`Badge`、`Statistic`、`Rate`、`QRCode`、`Signature`、`ColorSwatch`、`Radio`/`RadioGroup`、`Slider`、`DatePicker`、`TimePicker`、`Textarea`、`Switch`、`Divider`、`Space`、`Timeline`、`List` | 选项卡分区、资料只读视图、两步验证绑定、电子签名、偏好设置、登录设备与历史 |
| 数据分析 | `Segmented`、`DatePicker`、`ButtonGroup`、`Statistic`、`Progress`、`Skeleton`、`AreaChart`、`DonutChart`、`FunnelChart`、`GaugeChart`、`HeatmapChart`、`RadarChart`、`ScatterChart`、`TreeMapChart`、`SunburstChart`、`OrgChart`、`ChartCanvas`/`ChartAxis`/`ChartGrid`/`ChartSeries`/`ChartLegend`/`ChartTooltip`、`Table`、`Pagination` | 时间范围切换、KPI 进度、多类型图表、组织分布、图表基元自定义、明细分页 |
| 工单中心 | `Splitter`、`Resizable`、`Steps`/`StepsItem`、`ChatWindow`、`CommentThread`、`Mentions`、`Descriptions`、`Rate`、`Badge`、`Tag`、`Popover`、`Drawer`、`Upload`、`Textarea`、`RadioGroup`/`Radio`、`Input`、`Divider` | 主从分栏（宽屏左右 / 窄屏上下）、工单生命周期、对话、内部 @ 协作、附件、关闭确认、新建工单 |
| 团队日历 | `Calendar`、`Countdown`、`Statistic`、`Badge`、`Popover`、`Tag`、`List`、`Drawer`、`DatePicker`、`TimePicker`、`RadioGroup`/`Radio`、`Input` | 月视图选择、下一日程倒计时、当日日程标记与详情、即将到来列表、新建事件 |
| 内容编辑 | `Segmented`、`RichTextEditor`、`MarkdownEditor`、`CodeEditor`、`Watermark`、`Switch`、`Space`、`TreeSelect`、`Cascader`、`AutoComplete`、`Mentions`、`Upload`、`Result`、`Tag`、`Input` | 编辑器三态切换、草稿水印、分类树/栏目级联/标签自动完成、@ 协作者、附件上传、立即发布开关、发布成功结果页 |
| 媒体图库 | `Carousel`、`ImageGroup`、`Image`、`ImagePreview`、`ImageViewer`、`ImageAnnotation`、`ImageCropper`、`Segmented`、`Skeleton`、`Empty`、`Tag`、`Drawer` | 精选轮播、相册切换、网格灯箱预览、大图查看（缩放/旋转/导航）、矩形/椭圆标注、16:9 裁剪、刷新骨架屏、空相册空态 |
| 定时任务 | `CronEditor`、`Stepper`、`InputGroup`/`InputGroupAddon`、`NumberKeyboard`、`Gantt`、`Switch`、`Progress`、`Steps`/`StepsItem`、`Badge`、`Tag`、`Drawer`、原生 `Table` | 调度表达式编辑、并发数步进、超时数值+单位、批量条数数字键盘、执行时间轴、启停切换、执行进度、运行阶段、新建/编辑任务 |
| 数据导入 | `FormWizard`、`Transfer`、`Upload`、`Cascader`、`Slider`、`RadioGroup`/`Radio`、`Progress`、`Result`、`Descriptions` | 分步向导、字段映射穿梭框、文件上传、目标表级联、批量大小滑块、导入模式/冲突策略、导入进度、确认摘要、完成结果页 |
| 帮助中心 | `Anchor`/`AnchorLink`、`ScrollSpy`、`Affix`、`Collapse`/`CollapsePanel`、`Code`、`Link`、`List`、`InfiniteScroll`、`Card`、`BackTop`（全局） | 长文档章节锚点导航（`getContainer` 指向 `#main-content-scroll`）、横向滚动高亮、侧栏吸顶、FAQ 手风琴、可复制代码块、内联链接、更多文章无限加载、回到顶部 |
| 报表打印 | `PrintLayout`/`PrintPageBreak`、`Watermark`、`Descriptions`、`Statistic`、`QRCode`、`Result`、`Segmented`、`Divider`、原生 `Table` | A4 打印布局、草稿水印、报表元信息、KPI 汇总、渠道明细、分页分隔、二维码校验、报表类型切换、`window.print()` 输出 |
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

### 表格使用约定（v1.2.44+）

- **窄屏卡片模式**：用户/角色页的 `DataTableWithToolbar` 启用 `responsiveMode="card"` + `cardBreakpoint="md"`（Vue 为 `responsive-mode="card"` + `card-breakpoint="md"`），与 Shell 左侧菜单隐藏断点 `(max-width: 767px)` 对齐；低于 `md` 时表格渲染为堆叠卡片。列级配置：`id` → `hideInCard: true`（卡片省略）、`username`/`name` → `cardTitle: true`（卡片标题），其余列保持原顺序（可用 `cardPriority` 调整权重）。卡片模式下行选择、列 `render`、分页均可用，`fixed` 固定列配置自动失效。`v1.2.39` 起卡片增强为上游内置，无需页面适配：展开/收起、全选、排序文案走 locale；存在 `sortable` 列时卡片列表上方自动渲染排序 `Select`；行选择为主题 `Checkbox`/`Radio` 并带「全选」控件；空状态走 `Empty` 组件渲染 `emptyText`。需要深度定制时可用 `cardClassName` / `renderCard`（本项目暂未使用）。
- **卡片排列**：`v1.2.44` 起 Card 模式支持网格排列。常规数据工作台先用默认顺序 + `hideInCard` / `cardTitle` / `cardPriority`；需要二维排布时优先在列配置里使用 `cardGrid`；需要跨页面复用或集中覆盖时使用表级 `cardLayout`（React prop 为 `cardLayout`，Vue 为 `:card-layout`）。`cardGrid` 与 `cardLayout` 都支持 `colSpan`（1-12）、`rowSpan`（1-6）、`hideLabel`、`labelPosition: 'left' | 'top'`；列级 `cardGrid` 双端都写在 `columns` 内，表级 `cardLayout` 通过 `key` 指向目标列。用户/角色页已用表级 `cardLayout` 在窄屏卡片中启用紧凑信息行：字段全宽、标签和值左右排列，操作区整行展示并隐藏字段标签。
- **表格文案**：Table / DataTableWithToolbar 文案统一走 ConfigProvider locale 的 `table` 分节（见双端 `src/utils/tigercatText.ts` 的 `appText.table`，覆盖空状态、展开/收起、全选、排序、搜索按钮、列设置、已选择等 key）。页面级覆盖业务文案用 `emptyText`（如「暂无用户数据」）或 `labels` prop；不要再在 toolbar 上硬编码 `searchButtonText` / `bulkActionsLabel` 通用文案，业务化的 `searchPlaceholder`（如「搜索用户名或显示名...」）保留在页面。
- **锁定列背景**：上游锁定列背景读组件 Token 链 `--tiger-table-bg → --tiger-component-table-bg → --tiger-surface`（stripe/hover/header 同理），`v1.2.43+` 已对 `striped + fixed` 单元格使用不透明 `color-mix(...)` 背景，避免横向滚动时透出下层内容。本项目在双端全局 CSS 的 `.dark` 块中将 `--tiger-component-table-bg/stripe-bg/hover-bg/header-bg` 映射到 `--tiger-bg-card`/`--tiger-bg-page`/`--tiger-bg-hover`，不再使用 `[style*="position: sticky"]` 全局覆盖。需要进一步定制时使用列级 `fixedClassName` / `fixedHeaderClassName`。
- **列显隐面板**：用户/角色页在 `DataTableWithToolbar` 的 `toolbar` 中启用 `showColumnSettings: true`，并使用 Table 受控隐藏列能力保存状态：React 传 `hiddenColumnKeys` + `onHiddenColumnKeysChange`，Vue 传 `:hidden-column-keys` + `@hidden-column-keys-change`。不要再自建 `Popover + Checkbox` 列显隐面板，也不要在页面侧过滤 `columns`；隐藏列由上游 Table 统一处理，sessionStorage 仍保存 `hiddenColumnKeys`。

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

本项目此前记录的上游诉求已经补齐（Shell 相关于 `v1.2.23`，表格/卡片/弹层相关于 `v1.2.37`–`v1.2.44`）：

| 组件 | 平台 | 上游现状 | 本项目保留的布局 glue |
| ---- | ---- | -------- | --------------------- |
| `Sidebar` | React / Vue | 上游 `LayoutDemo` 已提供官方后台 Shell 侧栏示例，覆盖 Logo 文案、主菜单和底部折叠按钮的组合用法。 | `MainSidebar` 继续保留 `max-width + opacity + transform` 的品牌文案和折叠按钮动画。 |
| `Menu` | React / Vue | 上游在 `inline + collapsed + popupPortal` 下会自动退化为 popup 子菜单，并补充了双端测试。 | 主菜单保持 `mode="inline"`，继续保留 `!min-w-0` 作为 flex / overflow 容器下的布局 glue。 |
| `Table` / `DataTableWithToolbar` | React / Vue | `v1.2.37` 起锁定列背景改读组件 Token 链（`--tiger-component-table-*`），并新增窄屏卡片模式（`responsiveMode="card"` + `cardBreakpoint` + 列级 `hideInCard`/`cardTitle`/`cardPriority`）。`v1.2.39` 起新增 `locale`/`labels` props 与 `TigerLocale.table` 分节，卡片模式补齐 i18n 文案、主题化选择框、全选、排序 Select、`Empty` 空状态与 `cardClassName`/`renderCard`。`v1.2.41` 起新增 `hiddenColumnKeys` / `defaultHiddenColumnKeys` 与 toolbar `showColumnSettings` 列设置面板，并统一浮层 z-index，使 Dropdown / Popover 高于表格 sticky 层。`v1.2.43` 起 `striped + fixed` 单元格改用不透明混合背景，避免斑马纹锁定列透出下层内容。`v1.2.44` 起 Card 模式新增列级 `cardGrid` 和表级 `cardLayout`，可控制 `colSpan`、`rowSpan`、`hideLabel`、`labelPosition`。 | 使用方式见上文「表格使用约定」；用户/角色页仅保留 sessionStorage 状态同步，不再自建列显隐面板或 sticky 层叠 CSS workaround，并通过表级 `cardLayout` 在窄屏卡片中启用紧凑信息行排列。 |
| `Card` | React / Vue | `v1.2.39` 起新增 `variant="transparent"`（透明、无边框、无阴影）。 | 登录/注册页改用该变体，并保留 `p-0` 类以延续页面级布局约定。 |
| `Popover` / `Dropdown` | React / Vue | `v1.2.39` 起经 Escape 或外部点击关闭后自动恢复触发器焦点；`v1.2.41` 起浮层统一高于表格 sticky 层。 | 行内操作菜单直接使用上游浮层层级，不再添加全局行 z-index 覆盖。 |
