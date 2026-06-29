# Tigercat 组件示例功能路线图

本文规划 `Tigercat_Admin` 后续要新增的**示例功能**，目标是用更贴近真实后台的场景，展示尚未在现有页面中出现的 Tigercat 组件用法。

- **现状**：当前 11 个页面（仪表盘、用户、角色、设置、文件、通知、任务、审计、关于、登录、注册）已覆盖约 **57 / 144** 个组件；还有约 **87** 个组件（大量图表类型、沟通类复合组件、日历/折叠/倒计时、以及一长串表单控件）从未在示例中出现。
- **目标**：通过下文阶段 0–6 的新功能，把剩余组件以"真实功能而非纯画廊"的方式逐步覆盖完。
- **约束**（已确认）：
  1. **双端对齐**：每个新功能在 React 与 Vue 两端等价实现，页面顺序、业务状态、函数命名、权限语义保持一致。
  2. **数据来源**：以展示组件用法为主，数据走 `Tigercat.Admin.MockApi` 或页面内静态/内存数据，**不新增真实 .NET 后端端点**。
  3. **导航归属**：按真实后台域新建多个功能菜单分组；部分能力做成全局/顶部/右侧挂件（聊天、消息通知、命令面板等），不只放进左侧菜单。
- **纪律**：每个功能落地前先读 [docs/frontend.md](docs/frontend.md)（Shell 蓝图、视觉 token、组件选择矩阵、双端映射、验收清单）；每完成一个阶段，回填 `docs/frontend.md` 的"组件选择矩阵"和本文末尾的「组件覆盖对照」勾选表。

---

## 阶段 0 — 全局 Shell 增强（顶部 / 右侧 / 全局，不进左侧菜单）

实现位置在 `MainHeader` / `MainLayout`（及 React 等价物），对所有受保护页面通用。

| 能力 | 位置 | 主要组件 | 关键交互 |
| --- | --- | --- | --- |
| 命令面板 | 全局 `⌘/Ctrl+K` | `Spotlight` | 快速跳转路由、执行动作、模糊搜索 |
| 顶部消息铃铛 | Header 右侧 | `Badge` + `Popover`/`Dropdown` + `NotificationCenter` | 未读角标、快捷标记已读、跳转通知中心 |
| 右侧聊天坞 | 右下 `FloatButton` → `Drawer` | `FloatButton`、`Drawer`、`ChatWindow` | 客服/团队即时沟通，未读提示 |
| 新手引导 | 首次登录触发 | `Tour` | 高亮侧栏 / 头部 / 内容区，分步讲解 |
| 全局快捷动作 | 右下 | `FloatButtonGroup`、`BackTop` | 返回顶部、反馈、帮助入口 |
| 富交互提示 | 全局 | `Notification`（与现有 `Message` 并存） | 带操作按钮的通知 toast |

**覆盖组件**：Spotlight、Tour、FloatButton、FloatButtonGroup、BackTop、Badge、Popover、Drawer、ChatWindow、Notification。

---

## 阶段 1 — 个人中心 + 数据分析（高价值，优先）

### 1. 个人中心 `/profile`

入口为 Header 头像下拉「个人中心」+ 独立路由，不进系统管理菜单。

- **结构**：选项卡——基本资料 / 安全设置 / 偏好 / 登录设备。
- **组件**：`Tabs`/`TabPane`、`Descriptions`（资料只读视图）、`Avatar`、`Radio`/`RadioGroup`、`Textarea`、`DatePicker`、`TimePicker`、`Switch`、`Slider`、`QRCode`（绑定两步验证）、`Signature`（电子签名）、`Rate`、`Statistic`、`Badge`、`ColorSwatch`（主题色偏好）、`Timeline`（登录历史）、`Divider`、`Space`。
- **数据**：复用现有 session/user；安全、偏好、设备用页面内静态数据。

### 2. 数据分析 `/analytics`（新分组「数据分析」）

一站式 BI 看板，集中展示尚未用到的图表类型。

- **组件**：`AreaChart`、`DonutChart`、`FunnelChart`、`GaugeChart`、`HeatmapChart`、`RadarChart`、`ScatterChart`、`TreeMapChart`、`SunburstChart`；图表基元组合（`ChartCanvas`/`ChartAxis`/`ChartGrid`/`ChartSeries`/`ChartLegend`/`ChartTooltip` 做一个"自定义图表"卡片）；`OrgChart`（组织/渠道分布）；`Statistic`、`Segmented`（时间范围）、`DatePicker`（区间）、`Skeleton`（加载）、`Progress`（KPI 进度）、`ButtonGroup`、`Pagination` + 原生 `Table`（明细）。
- **数据**：MockApi 或页面内多套静态数据集。

---

## 阶段 2 — 协作沟通（新分组「协作」）

### 3. 工单中心 `/tickets`

左右主从布局：左列表、右详情。

- **组件**：`Splitter`/`Resizable`（主从分栏）、`ChatWindow`（对话）、`CommentThread`（内部备注）、`Mentions`（@指派人）、`Steps`（工单生命周期）、`Drawer`（新建工单）、`Tag`、`Badge`、`Rate`（满意度）、`Upload`（附件）、`Popover`、`Descriptions`、`List`。

### 4. 团队日历 `/calendar`

- **组件**：`Calendar`（事件视图）、`Countdown`（下一日程倒计时）、`Popover`（事件详情）、`Badge`（事件标记）、`DatePicker`、`TimePicker`、`Drawer`（新建事件）、`List`（日程清单）。

---

## 阶段 3 — 内容与媒体（新分组「内容管理」）

### 5. 内容编辑 `/content`

文章/页面编辑，多编辑器切换。

- **组件**：`RichTextEditor` / `MarkdownEditor` / `CodeEditor`（用 `Tabs`/`Segmented` 切换）、`TreeSelect`（分类）、`Cascader`（栏目层级）、`AutoComplete`（标签）、`Mentions`、`Upload`、`Result`（发布成功）、`Watermark`（草稿水印）、`Switch`、`Space`。

### 6. 媒体图库 `/gallery`

- **组件**：`Image`、`ImageGroup`、`ImagePreview`、`ImageViewer`、`ImageAnnotation`、`ImageCropper`、`Carousel`、`Empty`、`Skeleton`。

---

## 阶段 4 — 运维自动化（新分组「运维」）

### 7. 定时任务 `/jobs`

- **组件**：`CronEditor`（调度表达式）、`Stepper`（并发数）、`Switch`（启停）、`Progress`（执行进度）、`Gantt`（执行时间轴）、`InputGroup`/`InputGroupAddon`（数值 + 单位）、`NumberKeyboard`（执行窗口）、原生 `Table`、`Tag`、`Badge`、`Steps`（运行阶段）。

### 8. 数据导入向导 `/import`

- **组件**：`FormWizard` / `Steps`（分步）、`Upload`（上传文件）、`Transfer`（字段映射）、`Cascader`、`Slider`、`Radio`、`Progress`、`Result`、`Descriptions`（确认页）。

---

## 阶段 5 — 帮助与报表（新分组「帮助支持」）

### 9. 帮助中心 `/help`

长文档 + 侧边锚点导航。

- **组件**：`Anchor`/`AnchorLink`、`ScrollSpy`、`Affix`、`BackTop`、`Collapse`/`CollapsePanel`（FAQ 手风琴）、`List`、`Code`、`Link`、`Card`、`FloatButton`、`InfiniteScroll`（加载更多）。

### 10. 报表打印 `/reports`

- **组件**：`PrintLayout`、`Descriptions`、原生 `Table`、`Watermark`、`QRCode`、`Result`、`Statistic`、`Divider`。

---

## 阶段 6（可选）— 性能 / 进阶演示

### 11. 大数据演示 `/performance`

- **组件**：`VirtualList`、`VirtualTable`、`InfiniteScroll`、`Drag`（自由拖拽/排序）、`Kanban`（低层看板，区别于已有的 `TaskBoard`）。

---

## 实施约定（每个新功能双端统一遵循）

1. 在 `src/pages/` 新建页面（Vue `.vue` / React `.tsx`），首屏用 `PageHeader`，复用 `MetricGrid` + `MetricCard`、`MutedPanel`、`PageActionPanel`、`ChartEmptyState`、`Icon`。
2. 在 `router/index.ts`（Vue）/ React 路由注册受保护路由。
3. 在 [Tigercat.Admin.Vue/src/utils/shell-navigation.ts](Tigercat.Admin.Vue/src/utils/shell-navigation.ts)（及 React 等价物）新增分组/菜单项，同步更新 `ShellPageKey`、`ShellMenuKey`、`pageMenuItems`、`SHELL_MENU_ITEMS`、`SHELL_MENU_ROUTES`、`SHELL_ROUTE_TO_MENU`；按需配权限码（多数示例无入口权限）。
4. 全局挂件（阶段 0）改 `MainHeader` / `MainLayout`，而非导航表。
5. 重组件用子路径导入（`import { X } from '@expcat/tigercat-vue/X'`，React 同理）；新复合组件的文案补进 `utils/tigercatText.ts` 的 locale（如 ChatWindow / CommentThread / FormWizard / Calendar / Steps / Tour / Spotlight）。
6. 数据：默认页面内静态/内存数据；需要分页/筛选/列表"类服务端"行为时，在 `Tigercat.Admin.MockApi` 加 mock handler，并在 [docs/api.md](docs/api.md) 标注为 demo/mock 契约；**不新增 .NET 端点**。
7. 满足 `docs/frontend.md` 验收：双端等价、移动端 375px 不溢出、暗色 token、弹层可关闭并恢复焦点、加载/空/错误/成功/确认状态完整。

---

## 验证

- **运行**：按 [docs/operations.md](docs/operations.md)，以 `VITE_TIGERCAT_DEMO=true`（MockApi 模式）启动 Vue 与 React 两端，逐页核对。
- **类型**：每个新页面跑 `pnpm dlx vue-tsc --noEmit`（Vue）/ `tsc --noEmit`（React）——构建本身不含类型检查，必须单独验证。
- **交互**：375px 移动端、暗色模式、弹层 Esc/外部点击关闭与焦点恢复、菜单不被锁定列遮挡、空/错误状态。
- **e2e**：在 `e2e/` 下按现有 Playwright 用例风格，为关键新页补冒烟用例（`playwright.demo.config.ts`）。
- **文档**：每完成一个阶段，更新 `docs/frontend.md` 的"组件选择矩阵"和下文「组件覆盖对照」勾选表。

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
- [ ] Tabs / TabPane
- [ ] Descriptions
- [ ] Radio / RadioGroup
- [ ] Textarea
- [ ] DatePicker
- [ ] TimePicker
- [ ] Slider
- [ ] QRCode
- [ ] Signature
- [ ] Rate
- [ ] Statistic
- [ ] ColorSwatch
- [ ] Divider
- [ ] Space
- [ ] AreaChart
- [ ] DonutChart
- [ ] FunnelChart
- [ ] GaugeChart
- [ ] HeatmapChart
- [ ] RadarChart
- [ ] ScatterChart
- [ ] TreeMapChart
- [ ] SunburstChart
- [ ] OrgChart
- [ ] Segmented
- [ ] Skeleton
- [ ] Progress
- [ ] ButtonGroup
- [ ] Pagination（原生）
- [ ] Table（原生）
- [ ] 图表基元：ChartCanvas / ChartAxis / ChartGrid / ChartSeries / ChartLegend / ChartTooltip（自定义图表演示，点到为止）

### 阶段 2 — 协作沟通
- [ ] Splitter
- [ ] Resizable
- [ ] CommentThread
- [ ] Mentions
- [ ] Steps
- [ ] List
- [ ] Calendar
- [ ] Countdown

### 阶段 3 — 内容与媒体
- [ ] RichTextEditor
- [ ] MarkdownEditor
- [ ] CodeEditor
- [ ] TreeSelect
- [ ] Cascader
- [ ] AutoComplete
- [ ] Watermark
- [ ] Result
- [ ] Image
- [ ] ImageGroup
- [ ] ImagePreview
- [ ] ImageViewer
- [ ] ImageAnnotation
- [ ] ImageCropper
- [ ] Carousel

### 阶段 4 — 运维自动化
- [ ] CronEditor
- [ ] Stepper
- [ ] InputGroup / InputGroupAddon
- [ ] NumberKeyboard
- [ ] Gantt
- [ ] FormWizard
- [ ] Transfer

### 阶段 5 — 帮助与报表
- [ ] Anchor / AnchorLink
- [ ] ScrollSpy
- [ ] Affix
- [ ] Collapse / CollapsePanel
- [ ] Code
- [ ] Link
- [ ] PrintLayout

### 阶段 6（可选）— 性能 / 进阶
- [ ] VirtualList
- [ ] VirtualTable
- [ ] InfiniteScroll
- [ ] Drag
- [ ] Kanban
