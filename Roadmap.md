# Tigercat Admin ROADMAP

更新：2026-10-25。按用户要求升级全部页面与公共组件，评估当前 Tigercat 能力并新增有业务依据的页面。本文是计划、顺序和执行状态的唯一入口；演示边界与待验证分支见 [收尾清单](docs/roadmap-followups.md)。

2026-10-25 rc.3 接入：ADMIN-02 已实现并完成自动门禁及已授权的模型视觉 / 交互验收，17 个确认缺陷全部闭合（含 UP01–07）。React、Vue、MockApi 已固定正式 npm `3.0.0-rc.3`，移除临时覆盖，普通 / 冻结安装、包文件 integrity、框架 peer 与共享 Core 核验通过。正式包的类型检查、API / Mock / Pages 构建及完整静态 E2E 158/158 通过；22 个专项场景由首次 21 项通过及 Vue 320 定向重跑 1 项通过汇总，原始超时保留。此前 round-06 / `58b00c45` 的 296 条默认矩阵、74 项页面功能、43 个公共组件、React 167 / Vue 166 个库符号映射及最终游客主题 / 父控实际图审均保留历史来源；真实 API 28/28、后端 271/271 为此前独立验证，未冒称本轮重跑。实体触屏和物理打印为未实测边界，不新增人工验收门禁。提交、Pages 实际部署 SHA、线上复验与归档记录见 [rc.3 接入与验收](docs/frontend-rc3-validation.md) 的 registry 交付记录；以下 UP-01 至 UP-12 表保留当时状态。

## 任务开始时的基线

- 开始时分支为 `main`，工作区已有未提交的 `3.0.0-rc.2` 升级改动；本轮保留并在现状上继续。
- 开始时 React / Vue 各 34 个页面文件，公共组件分别为 20 / 23 个；拆分方式不同不等于功能缺失。
- 两端已安装的 `@expcat/tigercat-*` 为 `3.0.0-rc.2`。契约以包 exports、类型和当前源码为准，Tigercat MCP 用于补充核对。
- 已有 schema 动态菜单、page-map 懒加载、权限、命令面板、面包屑、标签持久化及主题机制；新增页面沿用这条路径。
- 开始时 Reports 预览为静态数据，Import 尚未解析实际文件，Gallery 裁剪 / 标注及 Content 附件尚未持久化。这些缺口已分别在 UP-04、UP-07、UP-08 实现并验证；Jobs 仍没有真实执行器。

本轮 UP-01 至 UP-12 已实现并由总控复核，最终覆盖 React / Vue 各 37 页及 43 个公共组件，共 117 项，见 [逐项覆盖表](artifacts/up12/coverage.md) 与 [收尾验收报告](artifacts/up12/report.md)。双端类型、生产 / 演示构建、271 项后端测试、114 项真实 HTTP 检查和 40 项浏览器检查通过；演示回归以首次全量 155/158 与修正后定向 4/4 合并覆盖 158 个场景。最新本地链接检查通过，完整链接门禁仍有 3 个 GitHub 外链返回 `Status: 0`；实体设备等最终人工验收待确认，未归档。

## 执行与状态

本对话负责总控。先建目标，再按 UP-01 → UP-12 逐个创建独立执行对话；每次只有一个批次写当前工作区，上一批结束并复核后再启动下一批。所有执行对话均为 `gpt-6.1-sol`、`max`。用户已授权逐批实施、修复和验证；提交、推送、发布不属于本轮任务。

每批读取 `AGENT.md`、本计划和相关专题，有 `.codegraph/` 时先查 CodeGraph。读完本批覆盖的双端页面及相关组件后，修复已证实的问题并实施明确列出的增强。已符合要求的实现记录“已核对，无需修改”，不为每个文件制造 diff。不新增生产依赖、第二套实现或完整测试体系。

状态分别记录为：`待执行`、`执行中`、`已实现`、`自动门禁通过`、`等待人工验收`、`已归档`。未经实际验证不能记录通过；触摸、打印等未完成项留在收尾清单。由总控更新队列，执行对话报告证据。已验收条目从活动队列移除，历史由 Git 保留；仍有验收缺口时不能直接归档。

## 顺序执行队列

表内页面指双端 `src/pages/` 同名文件。UP-01 至 UP-10 覆盖全部现有页面与公共组件；新增媒体详情、导入结果、我的工作台三个页面。

| 批次 | 范围与明确交付 | 验收重点 | 状态 / 执行对话 |
| ---- | -------------- | -------- | --------------- |
| UP-01 公共组件与 Shell | 核对全部公共组件；以官方 `FullscreenButton` 替换 Header 重复全屏实现；评估 `NotificationBell` 能否保留现有已读、跳转、查看全部和 toast 动作，满足才替换；清理已无必要的适配；修正实际导入与文档不一致处。统一公共状态、可访问名称、移动导航、主题与焦点。`AppShell` 不强制替换已有多标签 Shell。 | Shell、主题 / 水印、标签、锁屏、命令面板、通知、客服和移动 Drawer；既有入口与行为完整；首屏不误带重组件。 | 已实现，43 个组件已核对；类型、双端构建、44 + 2 项回归通过，完整链接检查已于 UP-04 通过；等待人工验收；`01a16407-6f45-7a20-9709-7b6016de82b9` |
| UP-02 认证、个人中心与异常页 | Login、Register、ForgotPassword、RegisterSuccess、Profile、Exception、Iframe。完善表单校验、提交 / 重发、会话恢复、安全返回、个人设置与异常恢复；复用现有表单反馈组件。 | 无效字段焦点、失败重试、取消 / 返回、403 / 404 / 500 与嵌入页空态；双端等价；不扩建短信 / 邮件系统。 | 已实现，14 页已核对；类型、双端生产 / 演示构建、定向 E2E 与 16 组浏览器检查通过，总控已复核；UP-12 已补验真实 .NET 2FA / 找回密码 / Header 改密与权限刷新；等待最终人工验收；`01a16425-a8c6-7d33-ab47-38380a774c74` |
| UP-03 系统管理工作台 | Users、Roles、Menus、PermissionDemo、Settings。落实 R3.1：先在用户页实现按账号隔离的命名筛选视图，保存查询 / 排序 / 列显隐，不保存行选择，复用 workbench；检查远程搜索分页、批量动作、权限预览、菜单元数据和设置保存。 | 视图切换 / 刷新恢复、无权限操作、远程分页一致、取消不写入、窄屏卡片和固定列。 | 已实现，10 页已核对；类型、双端生产 / 演示构建、40 项定向回归、44 组浏览器检查及本地链接通过，总控已复核；UP-12 已修复并验证 InMemory / SQLite 用户、会话及权限一致性与 Logo 上传；等待最终人工验收；`01a16453-c1f1-70d3-8468-eb33ff5b5d25` |
| UP-04 仪表盘、分析、监控与报表 | Home、Analytics、Monitor、Reports、AuditLogs。升级图表交互、筛选及加载 / 空 / 错误状态；落实 R4.2：报表预览、打印与导出使用同一已有 API 数据域及筛选，优先仪表盘统计 / overview；保留 rc.2 `customExport`；补审计目标定位边界。 | 图表、表格与导出一致；CSV / JSON / XLSX；监控暂停 / 恢复；A4 长表 PDF 分页与暗色纸面；未实际打印须记录。 | 已实现，10 页已核对；类型、双端生产 / 演示构建、264 项后端测试、30 项定向回归及完整链接通过；24 份导出、4 份 A4 PDF 与 30 张截图已由总控复核；等待人工验收，系统对话框 / 实体打印未验；`01a165fc-5a93-76e3-bc31-d733d254944b` |
| UP-05 项目、任务与日历 | Projects、ProjectDetail、Tasks、Calendar。升级查询 / 详情状态、流转 / 完成、日程创建；落实 R3.2 的任务按 ID 定位，覆盖不在结果集 / 不存在 / 无权限。`AssigneePicker` 仅接真实联系人，不由显示名捏造稳定 ID。 | 项目列表返回及未知 ID、任务写回 / 刷新、目标定位、日期 / 时区、新建取消、看板拖放和移动浮层。 | 已实现，8 页已核对；类型、双端生产 / 演示构建、264 项后端测试、22 项定向回归及完整链接通过；48 组浏览器记录、截图与 30 文件增量已由总控复核；等待人工验收，实体触屏未验；`01a1661f-093a-7321-898f-3aa3cf24d749` |
| UP-06 协作、审批、流程与通知 | Tickets、Approvals、ApprovalDetail、WorkflowDesigner、Notifications。核对工作流与 SchemaForm 当前契约；改进审批人选择、校验 / 提交反馈、工单主从导航和通知定位；Viewer 与 Designer 共用同一模型。 | 审批同意 / 拒绝 / 转交 / 加签 / 退回 / 撤回、必填意见、已结束 / 无权限动作、保存 / 发布校验；通知定位失败有明确反馈。 | 已实现，10 页已核对；类型、双端生产 / 演示构建、审批 36 项 API 与相关 E2E 通过；24 组浏览器场景、30 张页面截图及 29 文件增量已由总控复核；UP-12 已补验双端键盘选人、Esc 焦点恢复及真实转交；本地链接通过，完整外链检查遇 GitHub 超时；等待最终人工验收；`01a1664b-56d0-7151-93f1-bc18c7a6b9b2` |
| UP-07 内容、图库、文件与媒体详情 | Content、Gallery、Files。落实 R3.3：真实位图裁剪结果复用媒体上传并能刷新读取，附件引用与标注元数据只补闭环必需字段。新增 `/files/:id`，复用 `GET /api/media/{id}` 展示预览、元数据和引用，由列表进入；复用现有详情逻辑，避免第二套详情。评估 `Gallery` / `CopyButton`。 | 上传失败重试、裁剪尺寸 / 坐标、附件保存恢复与引用保护；详情直访 / 刷新 / 404 / 权限 / 返回；复制 URL、移动预览。 | 已实现，6 个原页面及 2 个详情页已核对；类型、双端生产 / 演示构建、265 项后端测试及完整链接通过；58 组浏览器场景、32 张截图和 46 文件增量已由总控复核；等待人工验收，rc.2 React Upload StrictMode 缺口已记录并沿用原生文件选择；`01a1666f-d674-7213-97ec-78d7e854e809` |
| UP-08 实际 CSV 导入与结果页 | Import 与必要 API / MockApi / 类型。落实 R4.1：先支持一个已有资源（用户）的 UTF-8 CSV，识别列、预览校验、实际写入、逐行成功 / 跳过 / 失败；按既有必填字段与权限定义映射，默认追加与冲突跳过。新增 `/import/:id` 可恢复结果页和失败行下载；进度基于真实处理数量。 | 混合合法 / 非法行、引号 / 换行 / BOM、重复用户名、权限 / 错误行；双端、MockApi 与 .NET 契约一致；不引入 Excel 引擎或任务框架。 | 已实现，双端导入及 2 个结果页已核对；类型、双端生产 / 演示构建、265 项后端测试、4 项定向 E2E、四组 API / Mock 浏览器及 SQLite 重启 / 故障恢复通过；52 张截图与 44 文件增量已由总控复核；本地链接通过，3 个 GitHub 外链超时；等待人工验收；`01a166b0-0d83-7801-8ee6-db77e7c619b4` |
| UP-09 运维与大数据 | Jobs、Performance。升级 CronEditor 消费、启停 / 参数校验、Gantt 空态和虚拟列表 / 表格 / 拖拽。重新核对 rc.2 中文 Cron 摘要；未解决则保留上游需求，不在 Admin 复制解析器。文案清楚区分演示配置与真实执行。 | 新建 / 编辑 / 启停及失败恢复；虚拟行高 / sticky / 内部滚动；useDrag 键与触摸释放；数据边界准确。 | 已实现，4 页已核对；类型、双端生产 / 演示构建、14 + 18 项回归及 2 项持久化补验、完整链接检查通过；56 张截图及 19 文件增量已复核；等待实体触屏与最终人工验收，未归档；`01a166de-ed7b-72c1-8b5f-8645720ee42e` |
| UP-10 帮助与关于 | Help、About。完善帮助搜索 / 分页 / 无结果、Shell 容器锚点、FAQ、复制体验；同步当前版本、已实现能力和新页面入口；复用 `CopyButton` / `NavigationMenu` 等现有组件。 | 搜索 / 下一页真实变化、长文定位、键盘菜单、复制反馈、窄屏与暗色；不另建组件文档站。 | 已实现，4 页已核对；类型、双端生产 / 演示构建、4 + 4 项回归、最终菜单 8 组和本地链接通过；10 文件增量与截图已复核；2 条既有 GitHub 外链 Status 0，等待最终人工验收；`01a16702-56e9-74e1-9882-bef1db042637` |
| UP-11 新增我的工作台 | 新增 `/workspace`，保留 `/dashboard` 为默认首页。聚合当前账号待办、未读通知与近期日程；审批只在对应数据源 / 权限可用时显示，并标出演示身份。复用既有 API、卡片 / 列表及目标跳转，不新增聚合服务。 | 各块独立加载 / 空 / 失败重试；无权限不请求；本人筛选、数量语义和详情目标正确；菜单 / 路由 / 面包屑 / 命令面板双端同步。 | 已实现，双端工作台及日历定位已核对；类型、双端生产 / 演示构建、267 项后端测试、58 + 4 项 API 回归、8 项 Mock 回归、最终认证 / 菜单 18 项及完整链接检查通过；28 组浏览器证据、32 张截图与 41 文件增量已由总控复核；等待最终人工验收，未归档；`01a1671a-c2f5-7643-8619-40ddd846f692` |
| UP-12 总体验收与收尾 | 复核所有现有页面、公共组件和三个新页面，处理跨批次问题；复核 InMemory provider 下认证与管理用户存储一致性、真实 .NET 认证链及权限变化；同步 frontend、API、蓝本复制清单和收尾清单；确认 CI 仍仅手动触发。 | 类型检查、双端生产构建、演示回归及受影响 .NET 测试；桌面 / 375px / 暗色、控制台与失败请求；分清实现、自动通过、人工验收、归档。 | 已实现；类型、双端生产 / 演示构建、271 项后端、114 项 HTTP、40 项浏览器检查及合并 158 项演示回归通过；117 项覆盖、14 张截图、29 文件增量及 115 份产物由总控复核；本地链接通过，完整门禁因 3 个 GitHub Status 0 尚未通过；隔离服务已清理；等待最终人工验收，未归档；[报告](artifacts/up12/report.md)；`01a16741-163a-72f1-9daa-5f4cbc8e4f43` |

## 页面与组件覆盖

页面名称省略 `.tsx` / `.vue`。两端同批升级，已有实现无需修改时也有核对结论。初始各 34 页，本轮各新增 3 页，最终各 37 页；逐文件哈希、专项证据和验证范围见 [117 项覆盖表](artifacts/up12/coverage.md)。

| 批次 | 页面文件名 | 数量 |
| ---- | ---------- | ---- |
| UP-02 | LoginPage、RegisterPage、ForgotPasswordPage、RegisterSuccessPage、ProfilePage、ExceptionPage、IframePage | 7 |
| UP-03 | UsersPage、RolesPage、MenusPage、PermissionDemoPage、SettingsPage | 5 |
| UP-04 | HomePage、AnalyticsPage、MonitorPage、ReportsPage、AuditLogsPage | 5 |
| UP-05 | ProjectsPage、ProjectDetailPage、TasksPage、CalendarPage | 4 |
| UP-06 | TicketsPage、ApprovalsPage、ApprovalDetailPage、WorkflowDesignerPage、NotificationsPage | 5 |
| UP-07 | ContentPage、GalleryPage、FilesPage、FileDetailPage（新增） | 4 |
| UP-08 | ImportPage、ImportResultPage（新增） | 2 |
| UP-09 | JobsPage、PerformancePage | 2 |
| UP-10 | HelpPage、AboutPage | 2 |
| UP-11 | WorkspacePage（新增） | 1 |
| 合计 | React / Vue 同时维护 | 37 / 37 |

UP-01 公共组件：两端同名 `ApprovalActorSwitcher`、`ChatDock`、`CommandPalette`、`LockScreen`、`MainHeader`、`MainLayout`、`MainSidebar`、`NotificationBell`、`OnboardingTour`、`PageHeader`、`ShellFooter`、`ShellQuickActions`、`TagsView`、`ThemeConfigDrawer`；React 另有 `GuestRoute`、`Icons`、`PageFragments`、`PermissionGuard`、`PermissionRoute`、`ProtectedRoute`；Vue 另有 `AppLogo`、`ChartEmptyState`、`GuestShell`、`Icon`、`MetricCard`、`MetricGrid`、`MutedPanel`、`PageActionPanel`、`ProtectedShell`。业务组件在相应页面批次再次核对行为。

## Tigercat 能力与新增页面判断

下表保留规划时依据安装包 exports / 类型及 MCP 返回作出的判断；实际交付见上方各批状态与最终覆盖表。组件存在只说明 UI 能力，不代表业务数据、权限或后端已实现。

| 能力 | 已核对事实 | 本轮决定 |
| ---- | ---------- | -------- |
| `FullscreenButton` / `useFullscreen` | 已发布，Header 仍自行管理全屏状态与事件 | UP-01 替换重复实现，保留名称、断点与测试入口。 |
| `NotificationBell` | 已发布；主要 props 为 `items`、`locale`、`onItemReadChange` | 先核对点击目标 / 查看全部 / toast；不足则保留薄组合并记录具体缺口，不删功能迁就组件。 |
| `AppShell` | 已发布，组合 sidebar / header / breadcrumb / tabs | 只有减少代码且完整保留当前动态菜单、权限、移动 Drawer、标签和锁屏时才采用，不机械迁移。 |
| `AssigneePicker` | 已发布，调用方传 options / selectedIds | 用于合适的审批 / 任务选人，先核对单多选与联系人来源。 |
| `Gallery` / `CopyButton` / `Inplace` | 已发布，当前有相近的页面组合逻辑 | 有实际删减收益才采用；无写入端点的项目详情不加 Inplace 编辑。 |
| FileManager / Descriptions / 图片预览 | 已存在，媒体详情 API 已含元数据与引用 | 支撑 UP-07 媒体详情页，可直访并分享站内链接。 |
| FormWizard / Upload / Transfer / Table / Result | 导入 UI 已有，缺实际文件处理与逐行结果 | 支撑 UP-08 导入结果页，先补业务闭环，不另造表单引擎。 |
| 任务 / 通知 / 日历 / 审批 | 各有读取接口，权限与身份语义不同 | 支撑 UP-11 我的工作台，分块读取，不以样例数量冒充本人待办。 |
| SankeyChart / WaterfallChart | 已发布，Admin 暂无独立流向 / 收支数据源 | 作为未来分析页面候选，本轮不新增缺乏数据依据的财务或流向业务页。 |
| Jobs 运行记录（原 R4.3） | 无真实执行器与运行记录 API | 待确定受控作业与执行方式后再建运行历史页，不把模拟状态称为真实执行。 |

旧计划对应关系：R3.1 → UP-03；R3.2 → UP-04 / 05 / 06；R3.3 → UP-07；R3.4 → UP-09；R4.1 → UP-08；R4.2 → UP-04；R4.3 留作上表待决策项。额外部门 / 岗位 / 字典 / 租户域、完整 BPM、表单设计器和运行时 i18n 暂无本轮必要性，不扩展。

## 每批验证

沿用 [AGENT.md](AGENT.md) 与 [operations](docs/operations.md)：先 diff / 类型，再相关现有测试和双端构建；文档修改跑 `pnpm run check:links`。显示变化实际检查桌面、375px、暗色；弹层 / 表单 / 菜单检查键盘、关闭、焦点恢复、提交 / 取消。API / 数据库变化同步 MockApi 与契约并运行必需的 .NET 测试。

优先现有测试；只有本次新增行为无法覆盖时，最多补一个主路径和一个必要失败路径，不补历史覆盖率。每批报告改动路径、实际验证、已核对无需修改的范围及限制。GitHub CI 继续仅 `workflow_dispatch`，不提交、不推送、不发布。活动清单不累加完成日志，上游需求只保留开放能力。
