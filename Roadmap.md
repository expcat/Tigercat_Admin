# Tigercat Admin 功能路线图（v2）

本文规划 `Tigercat_Admin` 后续要新增的**示例功能**。v1 路线图（阶段 0–5，见「已完成归档」）以补齐 Tigercat 组件覆盖为纲，现已全部落地；v2 以**对照知名 Admin 竞品补齐场景完整性**为纲，竞品分析与差距结论见下节。

- **现状**：双端各 21 个页面（React 19 / Vue 3 等价实现），组件覆盖接近完成——组件库中明确未演示的仅剩 `VirtualList`、`VirtualTable`、`Drag`、`Kanban` 4 个（见文末勾选表）。
- **目标**：通过阶段 6–10，补上与主流 Admin 模板对照后缺失的标配展示功能（异常页、登录流程、多标签导航、监控页、列表-详情模板等），并顺带覆盖最后 4 个组件。
- **约束**（沿用 v1，已确认）：
  1. **双端对齐**：每个新功能在 React 与 Vue 两端等价实现，页面顺序、业务状态、函数命名、权限语义保持一致。
  2. **数据来源**：以展示组件用法为主，数据走 `Tigercat.Admin.MockApi` 或页面内静态/内存数据，**不新增真实 .NET 后端端点**。
  3. **导航归属**：按真实后台域归入菜单分组；Shell 级能力（多标签、锁屏、水印、主题抽屉）做成顶部/全局挂件，不进左侧菜单；异常页与登录流程页为独立/游客路由。
- **纪律**：每个功能落地前先读 [docs/frontend.md](docs/frontend.md)（Shell 蓝图、视觉 token、组件选择矩阵、双端映射、验收清单）；每完成一个阶段，回填 `docs/frontend.md` 的"组件选择矩阵"和本文末尾的「组件覆盖对照」勾选表，推迟项记入 [docs/roadmap-followups.md](docs/roadmap-followups.md)。

---

## 竞品对照与差距

对照五个主流 Admin 模板/规范：Ant Design Pro（ADP）、vue-element-admin（VEA）、Vben Admin 5、SoybeanAdmin、shadcn-admin。

**已具备、不再列入规划**：登录/注册、权限 RBAC（页面 + 指令/守卫 + 菜单过滤）、暗色/系统主题切换、新手引导 Tour、命令面板、富文本/Markdown/代码编辑器、全套图表看板、日历、工单、任务看板（TaskBoard）、文件管理、上传、数据导入向导、打印报表、审计日志、通知中心、帮助中心。

**缺失能力对照**（✓ = 该竞品具备）：

| 缺失能力 | ADP | VEA | Vben | Soybean | shadcn | 当前状态 | 归入阶段 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 独立异常页 403/404/500 | ✓ | ✓ | ✓ | ✓ | ✓ | 无，未知路由 `*` 直接跳 `/login` | 阶段 6 |
| 独立结果页（成功/失败路由） | ✓ | – | – | – | – | 仅页内 `Result` | 阶段 6 / 7 |
| 登录增强（忘记密码 / 两步验证 / 注册成功） | ✓ | ✓ | – | – | ✓ | 仅登录 + 注册两屏 | 阶段 7 |
| 多标签页路由导航（tags-view） | – | ✓ | ✓ | ✓ | – | 多标签已完成；锁屏/水印/主题抽屉未做 | 阶段 8 |
| 锁屏 | – | – | ✓ | – | – | 无 | 阶段 8 |
| 全局水印开关 | – | – | ✓ | – | – | `Watermark` 仅页内使用 | 阶段 8 |
| 主题/布局可视化配置面板 | – | ✓ | ✓ | ✓ | – | 有能力（`utils/theme.ts`）无面板 | 阶段 8 |
| 实时监控看板 | ✓ | – | – | – | ✓ | 无（`/analytics` 为静态 BI） | 阶段 9 |
| 列表→详情模板页（动态路由详情） | ✓ | – | – | – | ✓ | 21 页均为功能页，无 `/:id` 详情 | 阶段 9 |
| 大数据虚拟滚动 / 自由拖拽看板 | – | ✓ | – | – | – | v1 原阶段 6 未实现 | 阶段 10 |

**Non-goals**（对照竞品后刻意不做，勿当缺陷）：

- **i18n 多语言**：本项目刻意单语言中文，`utils/tigercatText.ts` 的 `defineText` 即单语言应用的推荐方式。
- **地理地图**：Tigercat 无地图组件，且不引入第三方地图/图表库。
- **真实后端端点**：沿用约束 2，演示数据一律 MockApi / 内存态。

---

## 已完成归档（阶段 0–5，v1）

| 阶段 | 主题 | 页面（路由） | 首次覆盖组件数 |
| --- | --- | --- | --- |
| 0 | 全局 Shell 增强 | 命令面板 ⌘K、消息铃铛、聊天坞、Tour、悬浮动作组、富交互 Notification（全局挂件，无独立路由） | 10 |
| 1 | 个人中心 + 数据分析 | `/profile`、`/analytics` | 31 |
| 2 | 协作沟通 | `/tickets`、`/calendar` | 8 |
| 3 | 内容与媒体 | `/content`、`/gallery` | 15 |
| 4 | 运维自动化 | `/jobs`、`/import` | 7 |
| 5 | 帮助与报表 | `/help`、`/reports` | 8（含 `InfiniteScroll`，v1 误挂原阶段 6，本版修正归位） |

功能细节以两端 `src/pages/` 源码与 `docs/frontend.md` 组件选择矩阵为准；首次覆盖组件明细见文末「组件覆盖对照」；各阶段推迟的收尾项见 [docs/roadmap-followups.md](docs/roadmap-followups.md)。

### v2 进度（持续回填）

| 阶段 | 主题 | 页面（路由） | 状态 |
| --- | --- | --- | --- |
| 6 | 异常页与路由健壮性 | `/403`、`/404`、`/500`（公共独立布局） | 已完成（无首次覆盖组件，全部复用；人工核验项见 followups） |
| 7 | 登录流程增强 | `/forgot-password`、两步验证（登录内步骤）、`/register-success` | 已完成（无首次覆盖组件，全部复用；人工核验项见 followups） |
| 8 | Shell 进阶 | 多标签页导航（锁屏 / 水印 / 主题抽屉未做） | 进行中：多标签已完成 |

---

## 阶段 6 — 异常页与路由健壮性（竞品全员标配，当前完全缺失）

### 12. 异常页 `/403` `/404` `/500`

三个独立路由页，采用轻量独立布局（居中内容，不套 `MainLayout` 侧栏）。

- **页面**：`Result` 全页形态（status 403 / 404 / 500）+ 操作组——返回首页、返回上一页；`/404` 用 `Countdown` 做"N 秒后自动回首页"演示。
- **路由接线**：
  - 未知路径 `*` 改指 `/404`（现为重定向 `/login`）；
  - 已登录但无权限直访受保护路由（如无 `user:view` 访问 `/users`）→ 重定向 `/403`，接现有 `PermissionGuard`（React）/ 路由守卫 + `permission-helpers.ts`（Vue）；
  - `/500` 作为全局错误兜底演示入口（会话异常、Mock 请求失败场景可跳转）。
- **组件**（全部复用）：`Result`、`Countdown`、`Button`、`Empty`。

---

## 阶段 7 — 登录流程增强（ADP 账户页组 / VEA 两步登录）

三条均为游客路由，扩展现有 `GuestRoute`（React）/ `GuestShell`（Vue）。

### 13. 忘记密码 `/forgot-password`

- **结构**：`Steps` 三步——验证身份（邮箱/手机 + 验证码）→ 设置新密码 → 完成（`Result`）。
- **组件**：`Steps`、`Input`、`InputGroup`、`Result`、`Button`。

### 14. 两步验证（登录后 OTP 步骤）

- **结构**：demo 账号中固定一个开启两步验证；其登录成功后进入 OTP 验证屏，6 位验证码分段输入（`Input` 组合或 `NumberKeyboard`），验证通过才写入会话。与 `/profile` 安全设置已有的 `QRCode` 绑定两步验证形成闭环。
- **组件**：`NumberKeyboard`、`Input`、`Countdown`（重发倒计时）、`Alert`。

### 15. 注册成功 `/register-success`

- **结构**：路由级 `Result` 成功页（阶段 6 模式），`Countdown` 自动跳转登录。

---

## 阶段 8 — Shell 进阶（VEA tags-view / Vben 锁屏水印 / Soybean 配置抽屉）

实现位置在 `MainHeader` / `MainLayout`（及 React 等价物）与 `shell-navigation`，对所有受保护页面通用。

| 能力 | 位置 | 主要组件 | 关键交互 |
| --- | --- | --- | --- |
| 多标签页导航 | 内容区顶部标签条 | `Tabs` 或 `Tag` 组合（实施时定） | 打开受保护路由即生成标签；关闭当前/其他/全部；活动标签高亮；刷新后保留（sessionStorage） |
| 锁屏 | 头像下拉「锁定屏幕」 | 全屏遮罩 + `NumberKeyboard`、`Avatar`、`Statistic`（时钟） | PIN 解锁（demo 固定 PIN），锁定期间内容不可达 |
| 全局水印开关 | Shell 内容区 | `Watermark` | `/settings` 加开关，水印为当前用户名 + 日期 |
| 主题配置抽屉 | Header 调色板入口 | `Drawer`、`ColorSwatch`、`RadioGroup`、`Switch`、`Segmented` | 可视化调明暗/系统、主色、紧凑密度，接 `utils/theme.ts` 现有能力 |

- 多标签导航状态归 Shell 层（不进页面组件），标签标题复用 `SHELL_MENU_ROUTES` 的路由→标题映射。
- **实施时确认 Shell 是否已有面包屑；若无，本阶段一并补。**

---

## 阶段 9 — 监控页与列表-详情模板（ADP 监控页 + 列表/详情页规范）

### 16. 实时监控 `/monitor`（入「数据分析」分组）

定时器驱动的 mock 实时刷新（2–5 秒 tick），带暂停/恢复控制；不加后端端点。

- **组件**：`GaugeChart`（资源水位）、`Statistic` + 迷你 `AreaChart`/`LineChart`（QPS/延迟滚动窗口）、`ActivityFeed`（实时事件流）、`Progress`、`Tag`/`Badge`（节点状态）、`Segmented`（刷新频率）。

### 17. 项目列表 `/projects` + 详情 `/projects/:id`（新分组「项目」）

标准「卡片列表 → 动态路由详情」模板，**本项目首个 `/:id` 详情页**。

- **列表**：卡片网格（`Card` + `Statistic` + `Tag` + `Avatar` 成员 + `Progress` 进度）、搜索（`Input`）与状态筛选（`Segmented`）、`Pagination`、`Empty`。
- **详情**：`Descriptions`（概要）+ `Steps`（里程碑）+ `Tabs`（概览/成员/动态）+ 页内 `Anchor`；`Timeline`（动态）、`CommentThread`（讨论）。
- **路由**：详情页不进菜单；列表菜单项在详情路由下保持高亮（`SHELL_ROUTE_TO_MENU` 支持前缀映射）。

---

## 阶段 10 — 大数据性能（原 v1 阶段 6 重编号）

### 18. 大数据演示 `/performance`（入「运维」分组）

- **组件**：`VirtualList`（万级日志流）、`VirtualTable`（万行多列）、`Drag`（自由拖拽/排序）、`Kanban`（低层看板，区别于已有的 `TaskBoard`）；数据页面内生成。
- `InfiniteScroll` 已于阶段 5 `/help` 覆盖，自本阶段清单移除。

---

## 实施约定（每个新功能双端统一遵循）

1. 在 `src/pages/` 新建页面（Vue `.vue` / React `.tsx`），首屏用 `PageHeader`，复用 `MetricGrid` + `MetricCard`、`MutedPanel`、`PageActionPanel`、`ChartEmptyState`、`Icon`。
2. 在 `router/index.ts`（Vue）/ React 路由注册；**注明路由归属**：受保护（`/monitor`、`/projects*`、`/performance`）、游客（`/forgot-password`、`/register-success`）、公共独立布局（`/403`、`/404`、`/500`）。
3. 在 [Tigercat.Admin.Vue/src/utils/shell-navigation.ts](Tigercat.Admin.Vue/src/utils/shell-navigation.ts)（及 React 等价物）新增分组/菜单项，同步更新 `ShellPageKey`、`ShellMenuKey`、`pageMenuItems`、`SHELL_MENU_ITEMS`、`SHELL_MENU_ROUTES`、`SHELL_ROUTE_TO_MENU`；按需配权限码（多数示例无入口权限）。
4. Shell 级能力（阶段 8）改 `MainHeader` / `MainLayout`，状态归 Shell 层或独立 store，不进页面组件、不进导航表。
5. 详情页动态路由参数：Vue `useRoute().params.id` / React `useParams()`，双端参数命名一致；`SHELL_ROUTE_TO_MENU` 对 `/projects/:id` 做前缀映射保持菜单高亮。
6. 重组件用子路径导入（`import { X } from '@expcat/tigercat-vue/X'`，React 同理）；新复合组件的文案补进 `utils/tigercatText.ts` 的 locale。
7. 数据：默认页面内静态/内存数据；需要分页/筛选/列表"类服务端"行为时，在 `Tigercat.Admin.MockApi` 加 mock handler，并在 [docs/api.md](docs/api.md) 标注为 demo/mock 契约；**不新增 .NET 端点**。
8. 满足 `docs/frontend.md` 验收：双端等价、移动端 375px 不溢出、暗色 token、弹层可关闭并恢复焦点、加载/空/错误/成功/确认状态完整。

---

## 验证

- **运行**：按 [docs/operations.md](docs/operations.md)，以 `VITE_TIGERCAT_DEMO=true`（MockApi 模式）启动 Vue 与 React 两端，逐页核对。
- **类型**：每个新页面跑 `pnpm dlx vue-tsc --noEmit`（Vue）/ `tsc --noEmit`（React）——构建本身不含类型检查，必须单独验证。
- **交互**：375px 移动端、暗色模式、弹层 Esc/外部点击关闭与焦点恢复、菜单不被锁定列遮挡、空/错误状态；异常页与登录流程页需额外核对未登录/无权限直访路径。
- **e2e**：在 `e2e/` 下按现有 Playwright 用例风格，为关键新页补冒烟用例（`playwright.demo.config.ts`）；异常路由重定向（`*`→404、无权限→403）适合 e2e 断言。
- **文档**：每完成一个阶段，更新 `docs/frontend.md` 的"组件选择矩阵"和下文「组件覆盖对照」勾选表。
- **收尾**：阶段内主动推迟的人工核验（移动端/暗色/弹层焦点）与 workaround 清理统一记入 [docs/roadmap-followups.md](docs/roadmap-followups.md)，全部阶段完成后批量处理。

---

## 组件覆盖对照（按阶段勾选，追踪进度）

> 勾选规则：组件首次在某新功能中被真实使用即可勾选。少数仅作"点到为止"演示的图表基元单独标注。

### 阶段 0 — 全局 Shell 增强
- [x] Spotlight
- [x] Tour
- [x] FloatButton
- [x] FloatButtonGroup
- [x] BackTop
- [x] Badge
- [x] Popover
- [x] Notification
- [x] ChatWindow（亦见阶段 2）
- [x] Drawer（已在 Shell 移动端用，全局聊天坞复用）

### 阶段 1 — 个人中心 / 数据分析
- [x] Tabs / TabPane
- [x] Descriptions
- [x] Radio / RadioGroup
- [x] Textarea
- [x] DatePicker
- [x] TimePicker
- [x] Slider
- [x] QRCode
- [x] Signature
- [x] Rate
- [x] Statistic
- [x] ColorSwatch
- [x] Divider
- [x] Space
- [x] AreaChart
- [x] DonutChart
- [x] FunnelChart
- [x] GaugeChart
- [x] HeatmapChart
- [x] RadarChart
- [x] ScatterChart
- [x] TreeMapChart
- [x] SunburstChart
- [x] OrgChart
- [x] Segmented
- [x] Skeleton
- [x] Progress
- [x] ButtonGroup
- [x] Pagination（原生）
- [x] Table（原生）
- [x] 图表基元：ChartCanvas / ChartAxis / ChartGrid / ChartSeries / ChartLegend / ChartTooltip（自定义图表演示，点到为止）

### 阶段 2 — 协作沟通
- [x] Splitter
- [x] Resizable
- [x] CommentThread
- [x] Mentions
- [x] Steps
- [x] List（首次用于阶段 1 个人中心登录设备）
- [x] Calendar
- [x] Countdown

### 阶段 3 — 内容与媒体
- [x] RichTextEditor
- [x] MarkdownEditor
- [x] CodeEditor
- [x] TreeSelect
- [x] Cascader
- [x] AutoComplete
- [x] Watermark
- [x] Result
- [x] Image
- [x] ImageGroup
- [x] ImagePreview
- [x] ImageViewer
- [x] ImageAnnotation
- [x] ImageCropper
- [x] Carousel

### 阶段 4 — 运维自动化
- [x] CronEditor
- [x] Stepper
- [x] InputGroup / InputGroupAddon
- [x] NumberKeyboard
- [x] Gantt
- [x] FormWizard
- [x] Transfer

### 阶段 5 — 帮助与报表
- [x] Anchor / AnchorLink
- [x] ScrollSpy
- [x] Affix
- [x] Collapse / CollapsePanel
- [x] Code
- [x] Link
- [x] PrintLayout
- [x] InfiniteScroll（v1 原挂阶段 6，实际已在 `/help` 使用，本版修正归位）

### 阶段 6–9 — 场景补全（无首次覆盖组件）

> 阶段 6–9 的目标是场景完整性，涉及组件全部为复用——`Result` 全页路由形态、`Countdown` 自动跳转、`NumberKeyboard` OTP/锁屏、`Watermark` 全局形态、`Drawer` 配置抽屉、`GaugeChart`/`ActivityFeed` 实时刷新、`Descriptions`/`Steps`/`Tabs`/`Anchor` 详情页等。按「首次真实使用才勾选」规则不新增勾选项。

### 阶段 10 — 大数据性能
- [ ] VirtualList
- [ ] VirtualTable
- [ ] Drag
- [ ] Kanban
