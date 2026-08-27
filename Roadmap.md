# Tigercat Admin 全站视觉走查计划

对 **Vue + React** 全站做对照真实 `Tigercat.Admin.Api` 的视觉走查。每一条是一次后续 grok 会话；**Vue 与 React 必须同一期都走完**。

发现问题 **只追加写入** [`docs/REVIEW-visual.md`](docs/REVIEW-visual.md)。走查会话 **不改产品代码**（Vue / React / Api / MockApi / e2e / 样式 / 组件 / 路由），除非被明确阻塞且需另开实现会话。

- **只用真实 Api**：不要 MockApi，不要 `pnpm dev:demo` / `dev:demo:all`。
- **登录优先 `admin`**（默认关闭 2FA）。
- **2FA 路径**：`demo` / `demo`，验证码 `123456`（锁屏 PIN 同样是 `123456`）。
- **端口**：Api `5137`，Vue `5173`，React `5174`。
- 本文件取代旧 R1–R8 实施计划与「已完成基线 / 实施约定」。那些实现工作已不在本路线图范围内。

---

## 走查规则（每期强制）

1. 只连真实 Api + Vue + React。Vite 代理 `/api` → `http://127.0.0.1:5137`。
2. 每个模块双端都走：同一账号、同一路由、同一交互。
3. 发现只追加 `docs/REVIEW-visual.md`（模块标题、端、视口、复现、截图或描述、严重度）。不在走查会话里修代码。
4. 不启动、不依赖 MockApi / 静态演示模式。Header 若出现「演示模式」Tag，记为环境错误。
5. 通用视觉清单（每页 / 每个 overlay 都过）：布局、空态、错误、成功、暗色（`.dark`）、紧凑（`.compact`）、移动（`≤767px`）、Tigercat 组件 vs leftover 手写 CSS、弹层焦点与关闭、双端是否对齐。
6. 第一期只做联调，不做全站视觉。后续期默认假定三端已在跑；若 Api / Vue / React 任一挂掉，停下来记阻塞，不要硬走页面。

---

## 表面清单（以路由与菜单为准，不凭猜测）

来源：Vue `src/router/index.ts`、React `src/App.tsx`、双端 `src/utils/shell-navigation`、`docs/frontend.md` App Shell、双端 `src/pages` 与 `src/components`。`docs/frontend.md` 路由表未列全侧栏项（缺工单/日历/内容/图库/作业/导入/帮助/报表）；下表以代码为准。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。React 游客壳 / 受保护壳写在 `App.tsx`（`GuestLayout` / `ProtectedLayout`），Vue 为独立组件。

| 表面 | 路由 | Vue | React | 入口 | 用途 |
| ---- | ---- | --- | ----- | ---- | ---- |
| Login | `/login` | `pages/LoginPage.vue` + `components/GuestShell.vue` | `pages/LoginPage.tsx` + `App.tsx` `GuestLayout` | 游客；已登录会进 `/dashboard` | 账号密码登录；`demo` 进入 OTP 步（`InputOTP`，码 `123456`） |
| Register | `/register` | `pages/RegisterPage.vue` + GuestShell | `pages/RegisterPage.tsx` + GuestLayout | 游客 | 注册表单，成功进 `/register-success` |
| RegisterSuccess | `/register-success` | `pages/RegisterSuccessPage.vue` + GuestShell | `pages/RegisterSuccessPage.tsx` + GuestLayout | 游客（注册后） | 成功 Result + 倒计时回登录 |
| ForgotPassword | `/forgot-password` | `pages/ForgotPasswordPage.vue` + GuestShell | `pages/ForgotPasswordPage.tsx` + GuestLayout | 游客 | 三步重置：身份（邮箱 Input / 手机 MaskInput）→ OTP → 新密码 |
| Guest shell | 上述四条 | `components/GuestShell.vue` | `App.tsx` `GuestLayout` | 游客布局 | 居中 `Container` + transparent Card，不进后台 Shell |
| Home / Dashboard | `/dashboard`（Vue `/` 重定向至此；React `/` 去 `/login`） | `pages/HomePage.vue` | `pages/HomePage.tsx` | 侧栏 `home`（权限 `dashboard:view`） | 概览、图表、Marquee 公告、快捷跳转、概览导出 |
| Analytics | `/analytics` | `pages/AnalyticsPage.vue` | `pages/AnalyticsPage.tsx` | 侧栏分组「数据分析」 | BI 看板：KPI、多类型图表、明细分页 |
| Monitor | `/monitor` | `pages/MonitorPage.vue` | `pages/MonitorPage.tsx` | 侧栏分组「数据分析」 | 轮询监控快照：水位、QPS/延迟、节点、事件 |
| Projects | `/projects` | `pages/ProjectsPage.vue` | `pages/ProjectsPage.tsx` | 侧栏分组「项目」 | 项目卡片网格、筛选分页 |
| ProjectDetail | `/projects/:id` | `pages/ProjectDetailPage.vue` | `pages/ProjectDetailPage.tsx` | 列表进入；不进侧栏，菜单仍高亮「项目列表」 | 概览/成员/动态、评论；未知 id 页内空态 |
| Tickets | `/tickets` | `pages/TicketsPage.vue` | `pages/TicketsPage.tsx` | 侧栏分组「协作」 | 主从工单、生命周期、页内 ChatWindow、CommentThread |
| Calendar | `/calendar` | `pages/CalendarPage.vue` | `pages/CalendarPage.tsx` | 侧栏分组「协作」 | 月视图、倒计时、新建事件 Drawer |
| Content | `/content` | `pages/ContentPage.vue` | `pages/ContentPage.tsx` | 侧栏分组「内容管理」 | 三态编辑器、标签、发布 Result、页内草稿水印 |
| Gallery | `/gallery` | `pages/GalleryPage.vue` | `pages/GalleryPage.tsx` | 侧栏分组「内容管理」 | 瀑布流相册、灯箱、标注/裁剪 Drawer、ImageCompare |
| Jobs | `/jobs` | `pages/JobsPage.vue` | `pages/JobsPage.tsx` | 侧栏分组「运维」 | Cron、启停、Gantt、新建/编辑 Drawer |
| Import | `/import` | `pages/ImportPage.vue` | `pages/ImportPage.tsx` | 侧栏分组「运维」 | 分步导入向导 + 完成 Result |
| Performance | `/performance` | `pages/PerformancePage.vue` | `pages/PerformancePage.tsx` | 侧栏分组「运维」 | 万级 VirtualList/Table、useDrag、Kanban（页内造数） |
| Help | `/help` | `pages/HelpPage.vue` | `pages/HelpPage.tsx` | 侧栏分组「帮助支持」 | 锚点文档、FAQ、Kbd、Highlight、无限加载 |
| Reports | `/reports` | `pages/ReportsPage.vue` | `pages/ReportsPage.tsx` | 侧栏分组「帮助支持」 | A4 打印、页内水印、DataExport |
| Users | `/users` | `pages/UsersPage.vue` | `pages/UsersPage.tsx` | 侧栏「系统管理」；需 `user:view`，否则 `/403` | 用户表、右键菜单、裁剪头像、导出 |
| Roles | `/roles` | `pages/RolesPage.vue` | `pages/RolesPage.tsx` | 侧栏「系统管理」；需 `role:view`，否则 `/403` | 角色表、权限树、导出、窄屏卡片 |
| Settings | `/settings` | `pages/SettingsPage.vue` | `pages/SettingsPage.tsx` | 侧栏「系统管理」 | 分组设置、Logo、**全局水印开关** |
| Files | `/files` | `pages/FilesPage.vue` | `pages/FilesPage.tsx` | 侧栏「系统管理」；菜单需 `media:view` | FileManager、上传 SplitButton、行右键 |
| Notifications | `/notifications` | `pages/NotificationsPage.vue` | `pages/NotificationsPage.tsx` | 侧栏「系统管理」；铃铛也可进 | 通知中心、创建/广播、已读 |
| Tasks | `/tasks` | `pages/TasksPage.vue` | `pages/TasksPage.tsx` | 侧栏「系统管理」 | TaskBoard 拖拽、WIP、详情 Modal |
| AuditLogs | `/audit-logs` | `pages/AuditLogsPage.vue` | `pages/AuditLogsPage.tsx` | 侧栏「系统管理」`audit` | 活动流、时间线、导出、清理 |
| About | `/about` | `pages/AboutPage.vue` | `pages/AboutPage.tsx` | 侧栏底部 | 服务信息 / 特性 / 技术栈（页内 NavigationMenu） |
| Profile | `/profile` | `pages/ProfilePage.vue` | `pages/ProfilePage.tsx` | 头像下拉；不进侧栏 | 资料、2FA、签名、偏好、设备 |
| Exception 403 | `/403` | `pages/ExceptionPage.vue` | `pages/ExceptionPage.tsx` | 无菜单；无权限直访 `/users` `/roles` | 无权访问 Result |
| Exception 404 | `/404`（`*` 重定向） | 同上 | 同上 | 无菜单 | 页面不存在 + 倒计时回首页 |
| Exception 500 | `/500` | 同上 | 同上 | 无菜单（可手输） | 服务异常 Result |
| MainLayout / Shell | 所有受保护页 | `components/MainLayout.vue` + `ProtectedShell.vue` | `components/MainLayout.tsx` + `App.tsx` `ProtectedLayout` | 后台外框 | 侧栏 + Header + TagsView + Content；移动端侧栏 Drawer |
| MainSidebar | — | `components/MainSidebar.vue` | `components/MainSidebar.tsx` | 左侧 / 移动 Drawer | 分组菜单、折叠 240↔64 |
| MainHeader | — | `components/MainHeader.vue` | `components/MainHeader.tsx` | 顶栏 | 面包屑、主题按钮、铃铛、账号下拉 |
| TagsView | 受保护 Shell | `components/TagsView.vue` | `components/TagsView.tsx` | Header 与 Content 之间 | 多标签；仪表盘不可关；关尽回首页 |
| LockScreen | overlay | `components/LockScreen.vue` | `components/LockScreen.tsx` | 头像下拉「锁定屏幕」 | 全屏 PIN（`InputOTP` + 数字键盘），码 `123456` |
| ThemeConfigDrawer | overlay | `components/ThemeConfigDrawer.vue` | `components/ThemeConfigDrawer.tsx` | Header 调色板按钮 | 外观 / 主色 / 紧凑 |
| Watermark | overlay | `MainLayout.vue` + `utils/watermark.ts` | `MainLayout.tsx` + `utils/watermark.ts` | Settings `theme.watermark` | 用户名 + 日期叠在标签条与内容上 |
| ChatDock | overlay | `components/ChatDock.vue` | `components/ChatDock.tsx` | 右下 FloatButton；⌘K 也可开 | 全局客服坞，`/api/chat/messages` |
| CommandPalette | overlay | `components/CommandPalette.vue` | `components/CommandPalette.tsx` | ⌘K / Spotlight | 路由与动作搜索 |
| OnboardingTour | overlay | `components/OnboardingTour.vue` | `components/OnboardingTour.tsx` | 首登自动（`tigercat-admin:onboarding-tour:done`） | 侧栏 / 折叠 / 铃铛引导 |
| NotificationBell | overlay | `components/NotificationBell.vue` | `components/NotificationBell.tsx` | Header | 未读 Popover，跳转通知中心 |
| ShellQuickActions | overlay | `components/ShellQuickActions.vue` | `components/ShellQuickActions.tsx` | 右下 FloatButtonGroup + BackTop | 帮助（实际跳 `/about`）、反馈、回到顶部 |
| 修改密码 Modal | overlay | `components/ProtectedShell.vue` | `App.tsx` `ProtectedLayout` | 头像下拉 / ⌘K | 旧密 + 新密 |
| LoadingBar | overlay | `App.vue` + `router/index.ts` | `App.tsx` | 受保护路由切换 | 顶部进度；游客与异常页不显示 |
| PageHeader | 多数业务页 | `components/PageHeader.vue` | `components/PageHeader.tsx` | 页内第一块 | 官方 PageHeader 薄包装 |

权限相关：`demo` 无 `user:view` / `role:view`，直访用户/角色会进 `/403`，适合异常页。走查业务页默认用 `admin`。

---

## 计划项

每条 = 一次后续 grok 会话。标题不要改；难度按静态/表单表/复杂交互划分。

### 1. 三端启动+联调

- **难度：** 阻塞（不做视觉）
- **双端：** Vue + React 都要能连上真实 Api
- **范围：** 不走全站页面。只确认三端进程与登录壳。
- **要做：**
  - Api 监听 `http://127.0.0.1:5137`（`cd Tigercat.Admin.Api && dotnet run`，或 Aspire 编排）。
  - Vue `http://127.0.0.1:5173`（`pnpm dev:vue` / `Tigercat.Admin.Vue` `pnpm dev`）。
  - React `http://127.0.0.1:5174`（`pnpm dev:react`）。
  - 前端 `/api` 打到真实 Api，**不要** MockApi，**不要** `dev:demo`。
  - 双端用 **`admin` 登录** 进入 `/dashboard`，侧栏 + Header + TagsView 出现即可。
  - 记下 2FA 路径供后续 Auth 期：`demo` / `demo` + `123456`。不要在本期把所有游客页走完。
- **完成：** 三端可互相访问；Shell 能加载。任一端起不来或前端打不到 Api → **阻塞，停止后续视觉期**。
- **产出：** 只在 `docs/REVIEW-visual.md` 写联调结果（端口、账号、是否阻塞）。不改代码。

### 2. Auth guest：Login / Register / RegisterSuccess / ForgotPassword

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/login` `/register` `/register-success` `/forgot-password`；壳 `GuestShell.vue` / `GuestLayout`
- **看什么：**
  - Guest 居中布局、transparent Card、`p-0`、Vue `AppLogo` vs React 登录品牌区是否对齐。
  - `admin` 直接进后台；错误密码 Message；校验空态。
  - **2FA：** `demo` / `demo` → OTP 步、`InputOTP`、提示码 `123456`、错误码、60s 重发 Countdown、返回登录。
  - 注册成功 Result + 倒计时；忘记密码三步（邮箱 / 手机掩码、OTP、新密码、完成 Result）。
  - 暗色 / 移动 / 375px 不溢出；已登录访问游客路由应进仪表盘。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 3. Shell overlays：锁屏 / 主题抽屉 / 水印 / 多标签 / ChatDock

- **难度：** 高
- **双端：** Vue + React（登录后任意受保护页）
- **表面：**
  - LockScreen：头像下拉「锁定屏幕」；PIN `123456`；Esc / ⌘K 不能绕过。
  - ThemeConfigDrawer：Header 调色板；light / dark / system、主色、紧凑。
  - Watermark：`/settings` 开关；用户名 + 日期；`pointer-events: none`；不挡标签与锁屏。
  - TagsView：打开多页、关当前 / 其他 / 全部、刷新恢复、仪表盘不可关、`/projects/:id` 仍高亮列表。
  - ChatDock：右下客服坞；加载 / 发送 / 演示回复 / 未读 Badge / 移动端 Drawer。
- **看什么：** 叠层顺序（锁屏盖水印、水印不挡点击）、暗色紧凑移动、双端位置与 z-index、leftover CSS。LoadingBar 只在切受保护路由时出现。
- **产出：** 追加 `docs/REVIEW-visual.md`。本期不审 ⌘K / Tour / 铃铛 / 快捷按钮（见第 27 条）。

### 4. Home / Dashboard

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/dashboard`（`HomePage.vue` / `HomePage.tsx`）；侧栏「仪表盘」
- **看什么：** 欢迎区、Marquee 不挡统计卡、图表空/错/有数据、快捷操作、DataExport、暗色 token、移动单列、PageHeader 与 leftover。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 5. About

- **难度：** 低
- **双端：** Vue + React
- **页面 / 路由：** `/about`；侧栏底部「关于」
- **看什么：** NavigationMenu 滚到服务信息 / 特性 / 技术栈；加载失败 Alert；静态卡在暗色与移动是否齐。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 6. Analytics

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/analytics`；侧栏「数据分析 → 数据分析看板」
- **看什么：** 时间范围、KPI、各类图表与自定义 Chart 基元、明细表分页、Skeleton 加载、窄屏换行/溢出、暗色轴与图例。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 7. Monitor

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/monitor`；侧栏「数据分析 → 实时监控」
- **看什么：** 2s/3s/5s 与暂停、水位 Gauge、QPS/延迟曲线、节点、事件流、空/错、轮询时布局是否跳、移动。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 8. Performance

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/performance`；侧栏「运维 → 大数据演示」
- **看什么：** 四个分区切换；VirtualList / VirtualTable sticky；useDrag；Kanban vs 任务页 TaskBoard 视觉差；万级滚动卡顿或撑破 Shell；暗色。数据为页内造数，只审视觉不审后端。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 9. Projects + ProjectDetail

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/projects`、`/projects/:id`（`ProjectsPage` / `ProjectDetailPage`）
- **看什么：** 列表卡片网格、筛选分页、进详情；详情 Tabs/锚点/Steps/评论；**未知 id 空态且侧栏仍高亮项目列表**；标签条标题；移动主从。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 10. Users

- **难度：** 中
- **双端：** Vue + React（`admin`，需 `user:view`）
- **页面 / 路由：** `/users`
- **看什么：** DataTable 工具栏 SplitButton、行右键、新增/编辑 Modal、头像裁剪、批量、导出、空/错、**md 以下卡片模式**、固定列与菜单、暗色。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 11. Roles

- **难度：** 中
- **双端：** Vue + React（`admin`，需 `role:view`）
- **页面 / 路由：** `/roles`
- **看什么：** 表格与卡片模式、权限树 Modal、删除 Popconfirm、导出、空/错、移动树是否可点。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 12. Settings

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/settings`
- **看什么：** 分组 Card、Logo 上传、水印开关（立刻反映到 Shell，细看留给第 3 条）、保存确认、恢复默认、校验、暗色 ColorPicker。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 13. Files

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/files`（菜单 `media:view`）
- **看什么：** FileManager、上传 SplitButton、筛选、预览、行右键、删除确认、空库、移动列表。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 14. Notifications

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/notifications`（侧栏；Header 铃铛只作入口，铃铛 UI 见第 27 条）
- **看什么：** NotificationCenter、未读/已读、创建广播表单（`notification:create`）、空/错、Badge 与页内统计、暗色。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 15. Tasks

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/tasks`
- **看什么：** TaskBoard 列宽、拖拽、WIP、加卡片/加列、详情 Modal、空列、移动横向滚动。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 16. AuditLogs

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/audit-logs`
- **看什么：** 筛选、ActivityFeed / Timeline、详情 JSON、DataExport、清理确认、空/错、移动。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 17. Profile

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/profile`；头像下拉「个人中心」
- **看什么：** Tabs、资料 Descriptions、2FA 开关 + InputOTP、手机 MaskInput、签名、偏好（含 ColorSwatch 等）、设备列表、暗色移动。不要把本期做成改 2FA 实现；只看界面。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 18. Calendar

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/calendar`；侧栏「协作 → 团队日历」
- **看什么：** 月视图标记、当日列表、下一场 Countdown、新建 Drawer（日期/时间）、空月、Popover、暗色与窄屏日历。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 19. Content

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/content`；侧栏「内容管理 → 内容编辑」
- **看什么：** 富文本 / Markdown / 代码三态、草稿水印（页内，区别于 Shell 水印）、TagsInput、TreeSelect/Cascader、发布 Result、加载失败、编辑器暗色。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 20. Gallery

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/gallery`；侧栏「内容管理 → 媒体图库」
- **看什么：** Carousel、Masonry、AspectRatio、ImageCompare、灯箱/大图、标注与裁剪 Drawer、空相册 Empty、Skeleton、移动。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 21. Import

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/import`；侧栏「运维 → 数据导入」
- **看什么：** FormWizard 各步、Transfer、Upload、Cascader、Slider、进度、完成 Result、刷新恢复、窄屏步骤条。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 22. Jobs

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/jobs`；侧栏「运维 → 定时任务」
- **看什么：** 列表启停、CronEditor、Gantt、Stepper/超时、新建编辑 Drawer、NumberKeyboard、空/错、暗色时间轴。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 23. Reports

- **难度：** 中
- **双端：** Vue + React
- **页面 / 路由：** `/reports`；侧栏「帮助支持 → 报表打印」
- **看什么：** PrintLayout、页内水印、KPI/渠道表、类型切换、DataExport、Result、打印预览不撑破、暗色（打印区对比）。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 24. Help

- **难度：** 低
- **双端：** Vue + React
- **页面 / 路由：** `/help`；侧栏「帮助支持 → 帮助中心」
- **看什么：** Anchor / ScrollSpy / Affix（容器 `#main-content-scroll`）、FAQ Collapse、Kbd、Highlight「权限」「令牌」、FAQ/文章列表 ScrollArea 限高、InfiniteScroll、移动侧栏吸顶是否打架。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 25. Tickets（含页内聊天）

- **难度：** 高
- **双端：** Vue + React
- **页面 / 路由：** `/tickets`；侧栏「协作 → 工单中心」。**页内** `ChatWindow` + `CommentThread` + Mentions（全局 ChatDock 已在第 3 条）。
- **看什么：** 宽屏左右 / 窄屏上下 Splitter；列表空/选中；Steps 生命周期；对话发送；内部评论；新建 Drawer；关闭确认；附件区；Rate/Badge；暗色。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 26. Exception：403 / 404 / 500

- **难度：** 低
- **双端：** Vue + React
- **页面 / 路由：** `/403` `/404` `/500`（`ExceptionPage`）；未知路径 → `/404`。独立居中，**不套 MainLayout / TagsView**。
- **看什么：** 三态 Result 文案；返回首页 / 上一页；无历史时 Empty；404 倒计时；用 `demo` 直访 `/users` 或 `/roles` 应进 403；暗色移动。
- **产出：** 追加 `docs/REVIEW-visual.md`。

### 27. 额外 Shell 挂件：命令面板 / 引导 / 铃铛 / 快捷按钮 / 改密

盘点时多出来的、未并入第 3 条的受保护壳挂件。

- **难度：** 高
- **双端：** Vue + React
- **表面 / 入口：**
  - CommandPalette：⌘K；搜页面、开聊天、改密、退出。
  - OnboardingTour：清 `localStorage` 键 `tigercat-admin:onboarding-tour:done` 后刷新；移动跳过侧栏步。
  - NotificationBell：Header 铃铛 Popover、未读、跳 `/notifications`。
  - ShellQuickActions：右下「+」与 ChatDock 错位；帮助实际进 `/about`；BackTop 滚 `#main-content-scroll`。
  - 修改密码 Modal：头像下拉 / ⌘K；校验与成功/失败 Message。
  - 移动侧栏 Drawer、折叠菜单 popup、账号下拉（个人中心 / 主题循环 / 锁定 / 退出）。
- **看什么：** 与 ChatDock / 主题抽屉 / 锁屏叠层；焦点恢复；暗色紧凑移动；双端快捷按钮目标是否同为 `/about`。
- **产出：** 追加 `docs/REVIEW-visual.md`。

---

## 覆盖核对

走查全部完成后，`docs/REVIEW-visual.md` 里每个名字至少出现一次（Vue 与 React 都要写到）：

**游客：** Login，Register，RegisterSuccess，ForgotPassword，Guest shell

**业务页：** About，Analytics，AuditLogs，Calendar，Content，Exception（403 / 404 / 500），Files，Gallery，Help，Home/Dashboard，Import，Jobs，Monitor，Notifications，Performance，Profile，ProjectDetail，Projects，Reports，Roles，Settings，Tasks，Tickets，Users

**Shell / overlay：** MainLayout，MainSidebar，MainHeader，TagsView，LockScreen，ThemeConfigDrawer，Watermark，ChatDock，CommandPalette，OnboardingTour，NotificationBell，ShellQuickActions，修改密码 Modal，LoadingBar，移动侧栏 Drawer

缺一条就补对应期，不要另开产品实现。
