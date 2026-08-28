# Tigercat Admin 视觉缺陷修复计划

本文件取代已完成的视觉走查 1–27。问题清单只来自 [`docs/REVIEW-visual.md`](docs/REVIEW-visual.md)（记录于 `feat/visual-review` / `f3e1de5`）。实现落在 `feat/visual-fix`。

- Vue 与 React **同一条一起改**，除非 Review 写明单端。
- 只修 Review 已记的缺陷。不发明产品功能，不顺手重构。
- 走查「缺口 / 未取证 / 通过（信息）」不是缺陷，不修。
- 非视觉收尾仍见 [`docs/roadmap-followups.md`](docs/roadmap-followups.md)，本计划不纳入。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。

「修好」= 双端同一交互结果；中档不再出现 Review 描述的裁切 / 不可见 / 错绑 / 浅色砖。

---

## 不修（刻意排除）

| 原因 | 例子 |
| ---- | ---- |
| 走查未取证或缺口 | 图表 empty/error、Tour 全步、demo 直访 403、多数 375 折下未拍 |
| `docs/frontend.md` 允许的页面 glue 类名 | `p2-icon-chip` / `p2-text-primary` / `p2-page-accent` / `p2-action-tile` / `p2-muted-panel`（暗色已跟 `--tiger-bg-hover`） |
| 环境而非产品 | Redis in-memory 导致审计页 Alert |
| 上游无 labels 入口的组件内部英文 | 富文本 Bold/Italic、日历格 Sun–Sat 若包未暴露 locale |
| leftover 类名本身不挡功能 | Header 调色板原生 `<button>`、Watermark `relative relative` |

---

## 中 — 按模块

### V1. Vue 2FA 错码 / 重发 Message 不可见

- **错什么：** Review 2.20 / 2b.8 / 2b.99。`demo` 错码 `000000` 时 `POST /api/auth/two-factor/verify` 401，React 顶栏 toast「验证码错误」可见；Vue `#tiger-message-container` 空。重发 `Message.success` 同样 Vue 不可见、React 可见。
- **Vue：** `pages/LoginPage.vue`（必要时 `App.vue` 的 `MessageContainer` 叠层）
- **React：** `pages/LoginPage.tsx`（对齐：错码/重发都必须有可见反馈，不把 React 改坏）
- **修好：** 两端错码与重发都出现可见错误/成功提示（Message 和/或 OTP 卡内 Alert），文案含「验证码错误」/「已重新发送」。

### V2. 忘记密码窄屏 OTP 裁切 / 标签叠字

- **错什么：** Review 2.22 / 2b.17。375px 步骤 1：Vue 第六格被卡片 `overflow-hidden` 裁切，「手机号」的「号」叠进 OTP 行；React「验证码」标签几乎被 OTP 格挡住。
- **Vue：** `pages/ForgotPasswordPage.vue`（及该页 Guest 卡 `overflow-hidden`）
- **React：** `pages/ForgotPasswordPage.tsx`
- **修好：** 375px 六格 OTP 完整可见，标签与格不重叠、不裁切。登录/注册本条已通过，不要改坏。

### V3. Vue 紧凑密度开关不生效

- **错什么：** Review 3.2 / 3b.2。主题抽屉拨「紧凑密度」滑块可开，但不写 `compactMode`、不加 `html.compact`、侧栏仍 240px。根因：Vue `Switch` 契约是 `modelValue` / `update:modelValue`，抽屉绑了 `:checked` + `@update:checked`。React 已通过。
- **Vue：** `components/ThemeConfigDrawer.vue`（对照 `utils/theme.ts` `applyTheme`）
- **React：** 不改行为；仅当 Vue 绑定对齐时核对 `components/ThemeConfigDrawer.tsx` 仍走 `onChange` → `compactMode`
- **修好：** Vue 拨开后 `localStorage tigercat.admin.theme.compactMode=true`，`html` 有 `.compact`，侧栏按现有 `MainLayout` 折叠逻辑收起。

### V4. 仪表盘图表固定 320 宽 / 饼图裁切 / 30 日轴挤

- **错什么：** Review 4.3 / 4b.3。Line/Bar/Pie SVG 固定 320×220，折线/柱右侧空约 323px；30 日 X 轴 tick 重叠不可读；饼图外标签裁成「ctive 100.0%」/「Disable」。
- **Vue：** `pages/HomePage.vue`
- **React：** `pages/HomePage.tsx`
- **修好：** 图表随 Card 撑满；30 日轴可读（抽稀或旋转）；饼图外侧标签与图例不被 `overflow:hidden` 裁切。硬编码 `#3b82f6` 与英文 Active/Disabled 放 V12。

### V5. About / Analytics / Monitor `Card title` 只剩 tooltip

- **错什么：** Review 5.1 / 5b.1 / 6.2 / 6b.2 / 7.2–7.4。Tigercat `Card` 没有 `title` prop（Vue 走 `#header`，React 走 `header`）；`title="…"` 落到原生 tooltip。About 四卡、Analytics 十二张图卡 + 渠道明细、Monitor 水位/节点/事件同形。同页已有正确写法（如 Home 趋势卡 `#header`）。
- **Vue：** `pages/AboutPage.vue`、`pages/AnalyticsPage.vue`、`pages/MonitorPage.vue`（只改 Review 点名的 `Card title=`）
- **React：** `pages/AboutPage.tsx`、`pages/AnalyticsPage.tsx`、`pages/MonitorPage.tsx`
- **修好：** 卡顶出现可见标题（`Text weight="bold"` 放进 header），不再只靠 hover tooltip。不要扫全站其它未记入 Review 的 `title=`。

### V6. About 暗色 leftover 浅色砖

- **错什么：** Review 5.4 / 5b.4。`infoCards` / `highlights` / `stack` / `systemInfo` 使用 `border-slate-200`、`bg-slate-50/70`、`from-*-50 to-*-100`、`bg-*-100`、`bg-white/70`、`text-slate-800`，暗壳上整组浅砖；`text-slate-800` 压过 `--tiger-text`。
- **Vue：** `pages/AboutPage.vue`
- **React：** `pages/AboutPage.tsx`
- **修好：** 内格边/底/字走 `--tiger-border` / `--tiger-bg-card` 或 `--tiger-surface` / `--tiger-text`，`.dark` 下不再是浅色砖。

### V7. Analytics 折下图：Heatmap / ChartCanvas hex、OrgChart 裁切、固定宽不撑满

- **错什么：** Review 6.2–6.3 / 6b.2–6b.3。Heatmap 28 格写死浅蓝 hex、不跟 `--tiger-chart-*`；自定义 `ChartCanvas` 560×240 + series/legend `#3b82f6`；OrgChart SVG 720×240 塞进 ~477 卡，裁「运营中心」和底排组；首屏外固定 320/400/560 右侧空。
- **Vue：** `pages/AnalyticsPage.vue`
- **React：** `pages/AnalyticsPage.tsx`
- **修好：** Heatmap / ChartSeries / ChartLegend 走 `--tiger-chart-*` 或 `--tiger-primary`；OrgChart 在卡内完整可见（自适应宽或卡内可滚且底排不裁）；图表随卡宽。

### V8. Monitor 水位弧 / P95 线 / 320 轴挤 / ISO 时间 / 事件列撑高

- **错什么：** Review 7.2–7.4 / 7b.2–7b.4。Gauge 弧 `#22c55e/#f59e0b/#ef4444` 不跟 token（Analytics Gauge 已走 token）；P95 LineChart `#3b82f6` 对同排 QPS Area 的 `--tiger-primary`；QPS/延迟 SVG 320×140 右空、20 个 `HH:mm:ss` 重叠；事件时间为完整 ISO；20 条 feed 把右卡撑到 2445px、无卡内滚动，左列被撑出大块空。
- **Vue：** `pages/MonitorPage.vue`
- **React：** `pages/MonitorPage.tsx`
- **修好：** Gauge 弧走 `--tiger-success|warning|error` 或与 Analytics 相同 token；P95 走 `--tiger-primary`；曲线随卡宽、轴可读；事件时间为本地可读短格式；事件列限高 + 内部滚动，左右列不再被 20 条撑到整页。

### V9. Performance VirtualTable prop 错绑，万行从不渲染

- **错什么：** Review 8.3 / 8b.3。页面绑 `data` / `height` / `row-height`，包 2.1.1 接口是 `dataSource` / `virtualHeight` / `virtualItemHeight`。两端 Empty「暂无数据」，KPI 10,000 闲置，高度吃默认 400 不是 480。
- **Vue：** `pages/PerformancePage.vue`
- **React：** `pages/PerformancePage.tsx`
- **修好：** 万行进入表格（`aria-rowcount` 非 0），高度为页面 `TABLE_HEIGHT`（480），不再稳态 Empty。

### V10. 用户管理 375px 搜索钮叠搜索框 + 英文 Select

- **错什么：** Review 10.2。窄屏工具栏「搜索」蓝钮叠在搜索框上；卡片模式排序下拉 leftover 英文「Select an option」。React 10b 未 emulate 375，但双端同一工具栏必须一起改。
- **Vue：** `pages/UsersPage.vue`（及表格 `labels` / `locale` 若由此页传入）
- **React：** `pages/UsersPage.tsx`
- **修好：** 375px 搜索框与搜索钮不重叠、可点；卡片排序下拉中文（如「不排序」/「按 {column} 排序」，与 `tigercatText` 表文案一致）。

### V11. 通知中心时间完整 ISO

- **错什么：** Review 14。条目时间 `2026-08-27T13:13:57.6204372` 未格式化（与 Monitor 7.4 同类）。
- **Vue：** `pages/NotificationsPage.vue`（若时间在组件 props 上，则 `utils` 格式化函数）
- **React：** `pages/NotificationsPage.tsx`
- **修好：** 列表时间为本地可读短格式（与 V8 事件时间同一套工具函数，避免两端各写一套）。

### V12. 仪表盘图表色与饼图英文标签

- **错什么：** Review 4.3 / 4b.3 / 4.6。折线/饼/柱写死 `#3b82f6/#ef4444/#22c55e/#a855f7/#f97316`，不跟 `--tiger-primary`；饼图「Active / Disabled」英文。
- **Vue：** `pages/HomePage.vue`
- **React：** `pages/HomePage.tsx`
- **修好：** 序列色读 `--tiger-primary` / `--tiger-error` 等 token（或 `var(--tiger-chart-*)`）；饼图标签中文（如「启用 / 停用」）。

---

## 低 — 按模块

### V13. Guest 左栏卖点末字孤行 + 双端文案/Card 对齐

- **错什么：** Review 2.18 / 2b.12 / 2b.13 / 2b.15 / 2b.99。左栏第 2/3 条末字单独一行；RegisterSuccess Vue 无 transparent Card、副文「返回登录」vs React「跳转登录」；Forgot 左栏标题/色板不同（Vue 蓝紫「找回账号访问权限」vs React 青绿「重置您的登录密码」）；步骤 2 空校验 Vue「请输入新密码」vs React「密码长度不能少于 6 位」。品牌组件名（AppLogo vs LogoIcon）桌面已同形，不改。
- **Vue：** `pages/LoginPage.vue`、`pages/RegisterPage.vue`、`pages/RegisterSuccessPage.vue`、`pages/ForgotPasswordPage.vue`
- **React：** `pages/LoginPage.tsx`、`pages/RegisterPage.tsx`、`pages/RegisterSuccessPage.tsx`、`pages/ForgotPasswordPage.tsx`
- **修好：** 左栏卖点不再末字孤行（`text-pretty` 或改写短句）；RegisterSuccess 两端都包 transparent Card，副文与 Countdown 用同一套「即将返回登录」；Forgot 左栏标题/渐变/副文与步骤 2 空校验文案与 Vue 对齐（「找回账号访问权限」+「请输入新密码」）。

### V14. LockScreen 键盘中英混排 + 错 PIN overlay 滚动条

- **错什么：** Review 3.1 / 3b.1。NumberKeyboard `Delete` 英文、`确定` 中文；错 PIN 时 overlay `overflow:auto` 出现右侧滚动条（卡片略高于 800）。
- **Vue：** `components/LockScreen.vue`
- **React：** `components/LockScreen.tsx`
- **修好：** 删除键中文「删除」（或走 `labels`）；800 高视口错 PIN 不再出现 overlay 滚动条（缩小卡内间距 / overlay `overflow-hidden` 且卡可完整入视口）。

### V15. ChatDock ISO 时间、textarea 拖柄、输入区裁切、演示回复文案

- **错什么：** Review 3.5 / 3b.5。消息时间为 raw ISO；textarea 带 resize 拖柄；对话变长后输入区被裁；React 演示回复点名「客服坞」vs Vue「客服回复」。
- **Vue：** `components/ChatDock.vue`
- **React：** `components/ChatDock.tsx`
- **修好：** 时间短格式；textarea 不可拖拽撑破；底部输入区始终可见；演示回复文案两端同为「客服回复」。

### V16. Analytics 工具栏 DatePicker 把刷新/导出挤到下一行

- **错什么：** Review 6.1 / 6b.1。1280 下 DatePicker 约 409 宽，工具栏内层 98 高，刷新/导出落到 Segmented 下一行。
- **Vue：** `pages/AnalyticsPage.vue`
- **React：** `pages/AnalyticsPage.tsx`
- **修好：** 1280 工具栏一行能放下 Segmented + 范围 + 刷新 + 导出（允许 DatePicker 缩宽 / `flex-wrap` 有序，不再把主操作挤出首行）。

### V17. Performance 泳道 leftover hex

- **错什么：** Review 8.5 / 8b.5。泳道圆点前端 `#3b82f6`、后端 `#22c55e`，不跟 `--tiger-info` / `--tiger-success`（暗色更明显）。
- **Vue：** `pages/PerformancePage.vue`（`KANBAN_SWIMLANES`）
- **React：** `pages/PerformancePage.tsx`
- **修好：** 泳道色用 token（`var(--tiger-info)` / `var(--tiger-success)` 或与 Tag variant 同色）。

### V18. 双端默认态不一致

- **错什么：** Review 19「立即发布」React 默认勾、Vue 未勾；21 Import「追加」React 默认勾、Vue 未勾；22 JOB-1004 失败行 React switch checked、Vue 未勾。
- **Vue：** `pages/ContentPage.vue`、`pages/ImportPage.vue`、`pages/JobsPage.vue`
- **React：** `pages/ContentPage.tsx`、`pages/ImportPage.tsx`、`pages/JobsPage.tsx`
- **修好：** 以 Vue 走查画面为准对齐 React：立即发布默认关；追加默认不勾；失败任务开关关。

### V19. 英文 leftover（有文案入口的）

- **错什么：** Review 10.2 / 11.1 / 12 / 15 / 17 / 18。Settings ColorPicker「Pick color」；Roles 权限树分组 `setting/media/audit/…` 与搜索「Search...」；Tasks / Users「Select an option」与 Date「Show date picker」/ `MM/DD/YYYY`；Profile 签名「Clear」；Calendar 月标题「June 2026」。
- **Vue：** `pages/SettingsPage.vue`、`pages/RolesPage.vue`、`pages/TasksPage.vue`、`pages/ProfilePage.vue`、`pages/CalendarPage.vue`；共享 `utils/tigercatText.ts`
- **React：** 同名页面 + `utils/tigercatText.ts`
- **修好：** 能走 `labels` / `locale` / `defineText` 的改为中文。权限树分组名映射为中文（设置/媒体/审计/通知/任务）。日历月标题中文。无法从本仓库覆盖的上游内部字符串记入 FIX 状态，不改包。

### V20. 异常页有历史仍显示「没有可返回的历史记录」

- **错什么：** Review 26。从业务页进入 `/403` 仍显示 Empty「没有可返回的历史记录」。
- **Vue：** `pages/ExceptionPage.vue`
- **React：** `pages/ExceptionPage.tsx`
- **修好：** SPA 内有可返回历史时不显示该 Empty；无历史（直达/新标签）才显示。

### V21. React Steps 旁多独立数字

- **错什么：** Review 9b.2 / 25。React 项目详情与工单 Steps 旁多出 StaticText「3」「4」（/「5」），Vue 没有。
- **Vue：** 对照 `pages/ProjectDetailPage.vue`、`pages/TicketsPage.vue`（不改除非发现同源）
- **React：** `pages/ProjectDetailPage.tsx`、`pages/TicketsPage.tsx`
- **修好：** React Steps 不再渲染多余数字节点，与 Vue 同形。

### V22. Forgot / 2FA 说明句与发码 toast 对齐（低）

- **错什么：** Review 2b.7 / 2b.13。React 2FA Alert 无「验证通过后才会写入会话…」；发码 toast Vue「验证码已发送至 {sentTo}」vs React「验证码已发送」。
- **Vue：** `pages/LoginPage.vue`、`pages/ForgotPasswordPage.vue`
- **React：** `pages/LoginPage.tsx`、`pages/ForgotPasswordPage.tsx`
- **修好：** 2FA 说明句两端都有；发码成功文案两端同形（含 sentTo）。

---

## 实施顺序

按上面 V1 → V22。同一 Vn 双端同一 commit。V5 的三页 Card header 可同一 commit（同一根因）。V8 与 V11 若抽出共享时间格式函数，函数先随 V8 落地，V11 复用。

验证：改到的包跑现有 `pnpm --filter tigercat-admin-vue` / `tigercat-admin-react` 的 typecheck 或 `build` 切片；不新增测试框架。文档-only 不改本文件以外的专题，除非实现迫使 `docs/frontend.md` 补一句 Card `header` 用法。
)
