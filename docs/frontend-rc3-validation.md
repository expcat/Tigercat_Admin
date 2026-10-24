# rc.3 接入与验收

更新：2026-10-25。ADMIN-02 的本地实现、自动门禁和已授权的模型视觉 / 交互验收完成，17 个确认缺陷全部闭合。当前已切换正式 npm `3.0.0-rc.3`；registry 复测与历史候选证据分别记录，提交和部署结果见本页的正式接入记录。

## 正式 registry 接入

React、Vue、MockApi 的依赖清单均固定正式 npm `3.0.0-rc.3`，已移除三个临时 `file:` overrides，同步 minimumReleaseAge 例外并重新安装 / 生成 lockfile。普通安装、冻结安装和双端类型检查、API / Mock / Pages 构建均通过。Core / React / Vue 的 74 / 534 / 532 个安装文件（含 package.json）全部匹配 registry tarball，归档 SHA512 与 registry 元数据及 lockfile 相同；框架 peers 与应用共用，五个 Core 解析入口指向同一个实际目录。

| 正式包 | Registry tarball SHA256 |
| --- | --- |
| Core | `172f332aa9e6bf5d2e77566522ea846e6aa98ca73ce60b069020c3021ad1a5ed` |
| React | `74dd3545e3bbbad808860425b9a0a47b550a5f7d686dd94dcc856032f68e8389` |
| Vue | `1b077b6e6c181d711ce336e7131ccd1659d6fd9fd179c94fd8624060b866f9c9` |

正式包由上游 `ca6fa5f2bd525152f461590f04dc10567f291c6d` 的 [Publish Packages](https://github.com/expcat/Tigercat/actions/runs/40106835987) 发布，标签为 `v3.0.0-rc.3`。registry 元数据没有 gitHead，因此源码 SHA 依据发布运行记录，安装实体依据 registry integrity。实测 `next=3.0.0-rc.3`、`latest=2.9.4`。

正式包与历史候选并非逐字节相同：Core `dist/index.js` 及 Vue Tour chunk 只有调用换行，后者使 chunk 改名并更新 Tour import；React 7 / Vue 143 个声明文件有生成顺序变化。逐文件 TypeScript AST 对 union、type literal 属性及 named imports 顺序规范化后全部等价，没有把构建字节差异推断为行为变更。详见 [正式包来源](../artifacts/admin-02/registry-rc3/package-provenance.json)、[声明差异核对](../artifacts/admin-02/registry-rc3/declaration-difference-review.json) 和 [框架 / Core 解析](../artifacts/admin-02/registry-rc3/peer-resolutions.json)。

正式包的现有静态 E2E 已完整重跑，158/158 通过，见 [运行记录](../artifacts/admin-02/registry-rc3/e2e.json)。本地 Pages 产物另完成双端 1440 浅色 / 375 暗色的登录与 Tour、用户批量状态、通知同步、FileManager、审批确认，以及双端 320 暗色登录与 Tour，共 22 个不同场景。首次 21/22 通过，Vue 320 登录按钮等待超时；调整验收脚本的 expect 等待时间后仅重跑该条件，1/1 通过，无页面异常、无产品源码改动。原始超时与定向通过分别保留，见 [专项验收汇总](../artifacts/admin-02/registry-rc3/local-critical-acceptance.json)。

正式包上的最终实测、提交 / Pages 状态见 [registry 交付记录](../artifacts/admin-02/registry-rc3/report.md)。以下 296 条默认矩阵与专项验收保留原来的来源、截图和判断，不改称 registry 全量重拍；真实 API 28/28 与后端 271/271 仍标为此前的独立验证。

## ADMIN-02 本地候选验收（历史）

历史本地候选的源码来源为上游 `58b00c4568941b7d5bc5c110f3f1ce74a4296066`（round-06），三包均为 `3.0.0-rc.3`。安装时已核验原始归档 SHA256 / SHA512、全部安装文件、框架 peer 与三个消费者共用的 Core，见 [历史包来源](../artifacts/admin-02/package-provenance.json) 和 [历史候选及复验](../artifacts/admin-02/current-candidate.json)。后续正式发布和归档恢复不改写这次消费的历史来源。

| 包 | 历史原始归档 SHA256 |
| --- | --- |
| Core | `10ddc11629586c2d5ba04eda0274386aebb1e298bf209c856a9abe6fb47131ab` |
| React | `e0c2e748491bcd94bf8bb2f3c8ef7c1af85732ee04951340ab8ce887da5b1176` |
| Vue | `2596bbdf03bb9414e3bf5ef766079fa63830579d486a598613ca3a1f3056015b` |

原始 tarball 已丢失；恢复包与原安装 payload 的全部文件逐字节一致，新归档 SHA256 / SHA512 单独记录，原归档未恢复，归档字节差异的具体原因未确定。见 [恢复记录](../artifacts/admin-02/tarball-restoration.json)。仅把 lock 的三条临时 file integrity 更新为 restoredIntegrity 后，`pnpm install --frozen-lockfile` 成功，没有进一步改锁；Core 74 / React 534 / Vue 532 个文件（含 package.json）、框架 peer、共享 Core 和当时的生产依赖清单保持不变，见 [恢复安装验收](../artifacts/admin-02/restored-install.json)。正式 registry 阶段的移除覆盖与重锁另记于上节。

逐页历史默认矩阵为 296 个条件：双端各 37 页 × 1440 / 375 × 浅色 / 暗色，均已捕获并实际看图，绑定原图、SHA256、审查记录和拍摄版本。其中 279 条来自 round-01，16 条来自 round-03，1 条来自 round-04；后续缺陷用独立专项复验闭合。最终游客页另有 32 条默认外观覆盖最新验收结论，原图、原版本和原始判断保留，没有宣称当前候选重拍全部 296 条。见 [默认矩阵](../artifacts/admin-02/default-matrix-acceptance.json)。

功能验收独立记录为 [74 个页面项](../artifacts/admin-02/functional-acceptance.json)，全部按实际用途验收，每项引用真实操作条件。[43 个公共组件](../artifacts/admin-02/component-acceptance.json)为 36 项实际交互、7 项结构宿主；[React 167 / Vue 166 个库符号](../artifacts/admin-02/symbol-acceptance.json)分别为 128 项交互、31 项展示 / 只读、8 / 7 项结构用途。Rate 实际禁用，面包屑仅展示文字，Gantt 暴露任务选择；不虚构修改、导航或拖动。320px、键盘 / 触摸、浮层、拖放、焦点与失败恢复按各专项的实际条件记录，总入口为 [覆盖记录](../artifacts/admin-02/coverage.json)、[图审索引](../artifacts/admin-02/reviews.json) 和 [统一报告](../artifacts/admin-02/report.md)。

上游 UP01–07 已全部闭合：Upload、Funnel、FileManager、WorkflowActionBar 与 Tour 均消费根因修复。Tour round-06 在双端 1440 浅色、375 / 320 暗色共 6 条件、56 张原图通过实际图审；桌面 / 375 的 14 个目标步骤无重叠，箭头横向 / 纵向偏差至多 1px。旧 round-05 的 6 张几何失败图仍保留。

Admin 已修动态 iframe、标签 / 侧栏可达性、SkipLink、密码字段与错误保留、Bell 同步、找回密码身份切换、共享 Mock 批量状态端点、异常页历史和 Vue 动态路由 query / hash / 访客回退问题。保存视图、头像 CropUpload、审批身份、批量取消 / 禁用 / 启用 / 400 恢复及 Gantt / Analytics 按钮组均已真实操作并看图，见 [17 项缺陷闭合](../artifacts/admin-02/closure-status.json)。

第 17 项修复游客页主色对比：8 处既有局部 token 用 `light-dark()` 配对主色 / 前景 / hover / disabled / focus，继承根 `color-scheme`，同时修复填充按钮、文字入口与描边按钮。浅色靛 / 紫的常态对比度为 6.2875 / 5.6986:1，暗色为 8.9552 / 9.6702:1。40 个页面条件、6 组原生 Countdown、8 个认证子状态和双端实际系统浅→暗→浅切换均通过，80 张最终原图已全部实际看过，见 [最终主题结果](../artifacts/admin-02/guest-theme-final/results.json) 与 [实际图审](../artifacts/admin-02/guest-theme-final/visual-review.json)。仅改白字的中间阶段仍保留为 partial，没有回写成最终通过。父控 Slider / Marquee / Countdown 的 32 张有效原图也已通过，等待项已清零。

320px 的验证码使用内部横滚；额外四条件验证双端浅 / 暗原生键入全部六位，第六位聚焦后滚入可视范围、下一步成功，document 宽度仍为 320，四张原图已看过。见 [窄屏 OTP 结果](../artifacts/admin-02/guest-320-otp-check/results.json)。

当前生产 Mock 预览为 React `56674`、Vue `56673`，均使用独立输出目录；HTTP 200、磁盘产物哈希和末轮 12 处源码哈希已核对，见 [预览来源](../artifacts/admin-02/preview-provenance-final.json)。真实 API 在隔离 SQLite / Redis 完成 28/28，见 [真实 API 结果](../artifacts/admin-02/real-api-parent/results.json)。Mock 与真实 API 结论分别保留。

最新类型检查、双端 API 生产构建和独立 Mock 构建通过，最终现有认证 / 异常 E2E 36/36、后端测试 271/271 通过。此前壳层 156 通过 / 2 失败由后续定向复验闭合，未宣称最终源码重跑整套 158 项。Content / Settings / Import 的完整操作和错误恢复见 [专项报告](../artifacts/admin-02/content-review/report.md)。实体触屏与系统打印对话框 / 物理打印属于未实测边界，不新增人工验收门禁；没有新增生产依赖、永久截图基线或 node_modules 补丁。

## 第一阶段候选与安装来源

Admin 起点为 `main` / `42259892db20d15ea3f407b637ffab2a2051f155`，起始工作区干净。上游为 `/Volumes/SSD/Code/Lib/Tigercat`，分支 `codex/visual-ui-rc3`，候选 SHA `f6892893f49f6851814d558fce3285f3f277086b`。

直接消费上游发布门禁产生的 tarball，没有重建上游、修改其源码或使用目录 dist。三包目录为 `/Volumes/SSD/Code/Lib/Tigercat/test-results/visual-rc.3/release-01/tarballs/`；元数据实际位于其父目录的 `package-contents.json`。

| 包文件（均为 `3.0.0-rc.3`） | SHA256 |
| --- | --- |
| `expcat-tigercat-core-3.0.0-rc.3.tgz` | `a448fdd8c03312ded86859630e2e5c475e1f70d04a05d7c5d32ed37d2a73cac9` |
| `expcat-tigercat-react-3.0.0-rc.3.tgz` | `f344cc5abf95ed0707cf17a838d6bc7fd8bdf4f08a989551a2ed7321fa6f093a` |
| `expcat-tigercat-vue-3.0.0-rc.3.tgz` | `ada6864af0ac9c351a778d1216eb86b7bbc3240fff7c941357fbde04f89ffd76` |

已独立核验三包 SHA256、SHA512 integrity，以及安装后的 Core 73、React 533、Vue 531 个非 package.json 文件与 tarball 逐字节一致。React、Vue、MockApi 解析到同一个 Core；框架组件解析到 Admin 自己的 React / ReactDOM / Vue。完整证据在 [package-provenance.json](../artifacts/rc3-stage1/package-provenance.json)。

临时来源只写根 workspace `overrides` 与 lockfile，三个应用包的发布版本清单仍为 rc.2。刷新方法见 [本地构建联调](operations.md#tigercat-本地构建联调)。上游发布 rc.3 后才移除覆盖、升级注册表依赖、重建并重新验证；本地引用不是最终发布配置。

## 新能力与现有功能的对照

rc.3 [迁移说明](https://github.com/expcat/Tigercat/blob/v3.0.0-rc.3/docs/MIGRATION.md#v300-rc3)没有删除或重命名组件 API，也没有新增组件。以下保留候选阶段按实际使用核对的结果，不为组件目录新增业务页面。

| 上游变化 | Admin 实际入口 | 本阶段处理 / 后续重点 |
| --- | --- | --- |
| AspectRatio 显式 fit 定位内容层、填满并裁切 | `/gallery` 卡片封面 | 双端显式 `fit="cover"`，删除比例盒重复 `overflow-hidden`；Image 自身包装层保留 `h-full w-full`。后续检查不同比例、灯箱、裁剪与标注。 |
| Menu 折叠宽度、图标居中、徽标与触控首击 | 全局 MainSidebar、`/menus` | 删除双端 `.menu-collapsed` 及其强制 CSS，用官方 collapsed 行为；保留应用 `!min-w-0`。后续检查首次触摸、徽标、展开 / 收缩和 popup 焦点。 |
| Sidebar 容器、Card、Code 与窄屏工具栏布局 | Shell、项目列表、Help、用户 / 角色 / 审批列表 | 现有组合与重组件子路径适用，无旧 display:contents 选择器或重复 toolbar 实现；后续检查滚动、长文本、列设置及卡片模式。 |
| Masonry source 纵向间距 | `/gallery` | 直接使用组件，未读取共享 helper 的旧键或手动补纵向间距；随候选安装获得修复。 |
| Modal / Drawer / Tour 属主 document、焦点、反向手势 | 全局主题 / 改密 / 导览、各编辑弹层 | 继续使用官方浮层与 after-close；后续检查嵌套选择器、Esc、外部点击、提交失败保留及焦点返回。 |
| Calendar / DatePicker 320px 紧凑布局 | `/calendar`、`/profile`、`/analytics` | 已传当前 locale，沿用公开日期 API；后续检查范围、键入、边界日及 Drawer 内日期 / 时间浮层。 |
| 图表轴、Heatmap / Radar 标签、Bar 顶部留白、Pie 自动拟合 | `/dashboard`、`/analytics`、`/monitor`、`/reports` | 图表从子路径懒加载；后续按真实数据检查 320px / 暗色标签、图例、tooltip 和图表基元。 |
| Drag bindings 含 style.touchAction；TaskBoard 触摸 tracker 修复 | `/performance`、`/tasks` | 现有渲染完整展开 getDragItemProps / getDragItemAttrs，包含 style 与数字 key 元数据；未复制 tracker。后续鼠标、键盘、触摸提交 / 取消 / 滚动 / 切 Tab。 |
| ImageAnnotation 触摸、MarkdownEditor 返回编辑恢复正文 | `/gallery`、`/content` | 沿用 lazyTigercat，后续复测笔迹、选择 / 删除、保存恢复及编辑器往返。 |
| FileManager 长文件名与窄屏布局 | `/files` 的 FileManager；[React 渲染源码](../Tigercat.Admin.React/src/pages/FilesPage.tsx)、[Vue 渲染源码](../Tigercat.Admin.Vue/src/pages/FilesPage.vue) | 双端均真实渲染 FileManager，传入列表模式、多选、搜索与打开详情事件；后续检查长文件名在 320px / 暗色下的展示、截断提示、布局与选择 / 打开，连同页面右键菜单及分页验收。 |
| 上游 Example 页面内部修复 | 无直接消费上游 Example 页面或 AppShell 的 Admin 实例 | 沿用 Admin 现有页面与 Shell，不新增替代页面；共享组件的变化仍在各自实际入口验收。 |
| 版本展示须与真实安装一致 | 页脚、`/about`、`/workflow-designer` | Vite 读取已安装框架包 version，统一注入 VITE_TIGERCAT_UI_VERSION；替换所有运行时代码中的 rc.2 常量，关于页复制内容同步。 |

3.0 既有新增组件也已按现有页面对照：CopyButton 用于关于 / 媒体详情，AssigneePicker 用于审批。双端源码均未导入或渲染 SankeyChart、WaterfallChart、Inplace：两类图表仍是未来候选，用户编辑保留现有 Modal 表单，这三项不列入当前组件验收范围。Gallery 的多动作与现有图库不等价，NotificationBell 缺少现有 Header 的完整业务回调，AppShell 缺少现有标签持久化 / 移动导航 / 锁屏组合；延续 [前端指南](frontend.md) 的现有选择。

主题仍使用 `createTigercatPlugin({ preset: modernTheme })`、组件 dist 的 Tailwind source 和 `ConfigProvider theme="modern"` / appLocale。框架组件、命令 API 与重组件使用子路径；类型 / 工具来自 Core，未恢复已移除的兼容入口。

## 第一阶段自动检查

| 检查 | 实际结果 / 证据 |
| --- | --- |
| 三包内容、peer 与 Core 来源 | 通过；[包来源记录](../artifacts/rc3-stage1/package-provenance.json) |
| `pnpm typecheck` | 双端通过；[类型日志](../artifacts/rc3-stage1/typecheck.log) |
| `pnpm build:frontend` | 双端 API 生产构建通过；[构建日志](../artifacts/rc3-stage1/build-frontend.log) |
| `pnpm build:demo` | 双端静态 Mock 构建通过；[演示构建日志](../artifacts/rc3-stage1/build-demo.log) |
| 现有定向 Playwright | 12 / 12 通过；核心页面加载、图库、设计器、Help / About 版本与失败重试、收缩侧栏 Enter / Escape 焦点；[结果](../artifacts/rc3-stage1/smoke-results.json) |
| 变更元素的布局断言 | 8 / 8 通过；React / Vue × 1280 / 320px × 浅色 / 暗色，仅检查本轮比例盒、侧栏和版本，无 pageerror；[结果](../artifacts/rc3-stage1/layout-smoke.json) |
| 本轮验收文档链接 | 全部通过；未推送 SHA 的 GitHub 404 已改为本地迁移说明；[定向链接日志](../artifacts/rc3-stage1/check-links-rc3.log) |
| 全量文档链接 | `pnpm run check:links` 末次未通过：既有 rc.2 GitHub 迁移指南与 `GHSA-v5pm-xwqc-g5wc` 公告返回 Status 0；先前全量曾通过，复跑的失败地址变化，另有 curl 连接超时。未改写或忽略这些外链；[末次全量日志](../artifacts/rc3-stage1/check-links.log) |
| 差异格式 | `git diff --check` 通过 |

构建保留 SignalR PURE 注解与超过 600 kB chunk 的提示，构建退出码均为 0。没有新增生产依赖、测试框架、node_modules 补丁、CSS 掩盖层或后端改动；未重跑与本轮前端接入无关的 .NET 测试。

## 可运行入口

从仓库根目录 `pnpm install` 后运行 `pnpm dev:demo:all`：React 默认 `http://localhost:5174/#/login`，Vue 默认 `http://localhost:5173/#/login`。本地账号 `admin / admin123`；需要开发模式时保留 React StrictMode。

当前验收快照可分别运行（仓库根目录）：

```bash
VITE_TIGERCAT_OUT_DIR="$PWD/artifacts/admin-02/dist-guest-theme/react" pnpm --filter tigercat-admin-react exec vite preview --host 127.0.0.1 --port 56674 --strictPort
VITE_TIGERCAT_OUT_DIR="$PWD/artifacts/admin-02/dist-guest-theme/vue" pnpm --filter tigercat-admin-vue exec vite preview --host 127.0.0.1 --port 56673 --strictPort
```

分别进入 `http://127.0.0.1:56674/#/login` 与 `http://127.0.0.1:56673/#/login`。普通页面直接替换 hash 后路径；媒体详情先上传一个文件再取返回 ID，导入结果先提交 CSV 后取任务 ID。项目种子为 `/projects/1001`，审批种子为 `/approvals/AP-1001`；iframe 需通过 `/menus` 创建带安全 iframeSrc 的菜单节点后进入该节点 path。

静态 Mock 覆盖可复现的演示流程，真实接口另按 [运行指南](operations.md#本地开发) 启动 .NET / 数据库；真实写入、导出与会话不能以 Mock 的通过替代。

## 全功能验收入口与覆盖范围

当前源码为 React / Vue 各 37 个页面文件，公共组件文件分别为 20 / 23，共 117 个文件项。直接与延迟导入的库组件 / API 标识符分别为 167 / 166，其中组件、命令、hooks、类型与图表 helper 按各自实际用途记录，类型不虚构运行时交互。完整逐文件导入与路由见 [源码 JSON](../artifacts/rc3-stage1/source-inventory.json) 和 [页面 / 组件清单](../artifacts/rc3-stage1/component-usage.md)。

下表保留验收范围，双端实际条件、图审与功能结果由上方中央记录逐项引用。详情页的正常 / 不存在 / 无权限及返回路径按各专项的真实记录核对。

| 页面文件 | 真实路由 / 入口 | 需检查的功能与交互 |
| --- | --- | --- |
| LoginPage | `/login` | 字段错误焦点、密码显隐、记住登录、2FA、返回原页 |
| RegisterPage | `/register` | 校验、密码规则、提交与重复账号、取消 |
| ForgotPasswordPage | `/forgot-password` | 发送 / 重发、校验、失败与返回 |
| RegisterSuccessPage | `/register-success` | 结果、登录返回、上下文丢失 |
| ExceptionPage | `/403`、`/404`、`/500`、未知路径 | 空态、返回首页、离开 Shell 后重新进入 |
| IframePage | 动态菜单 iframeSrc 节点 | 加载 / 空 / 非法 URL、菜单标题和权限 |
| HomePage | `/dashboard` | 指标、图表、筛选、导出、首屏懒加载 |
| WorkspacePage | `/workspace` | 任务 / 通知 / 日程 / 审批聚合、定位与已读 |
| AnalyticsPage | `/analytics` | 全部图表、基元、日期区间、图例 / 标签 / tooltip |
| MonitorPage | `/monitor` | 开始 / 暂停、刷新间隔、滚动曲线、事件与状态 |
| ProjectsPage | `/projects` | 查询 / 状态 / 分页、卡片与详情导航 |
| ProjectDetailPage | `/projects/:id` | Tabs、Anchor、成员、进度、评论与未知 ID |
| TasksPage | `/tasks` | 筛选、详情定位、新建 / 完成、TaskBoard 拖放与刷新 |
| TicketsPage | `/tickets` | Splitter / Resizable、列表详情、新建、动作、聊天与备注 |
| ApprovalsPage | `/approvals` | 四车道、演示身份、发起审批 SchemaForm |
| ApprovalDetailPage | `/approvals/:id` | 审批全动作、必填意见、AssigneePicker、字段权限、Viewer / Timeline |
| WorkflowDesignerPage | `/workflow-designer` | 四 Tab Inspector、条件 / 会签 / 抄送、保存 / 发布校验、同模型预览 |
| CalendarPage | `/calendar` | 月切换、格内事件、当日列表、新建 Drawer、日期 / 时间与取消 |
| ContentPage | `/content` | 三编辑器往返、草稿 / 发布、分类 / @、附件名额、上传重试取消与恢复 |
| GalleryPage | `/gallery` | 相册 / 空态、轮播 / Masonry、比例盒、预览 / 比较、标注 / 裁剪 / 保存 |
| FilesPage | `/files` | FileManager 默认列表、长文件名在窄屏 / 暗色下的展示与截断提示、搜索 / 多选 / 打开详情 / 右键、分页、上传 / 取消 / 重试、重复、引用保护删除 |
| FileDetailPage | `/files/:id` | 预览、元数据 / 标注 / 引用、复制与返回 |
| JobsPage | `/jobs` | Cron 草稿校验、新建 / 编辑 / 启停、数字键盘、Gantt、取消重开 |
| ImportPage | `/import` | UTF-8 CSV、映射 Select、校验预览、步骤焦点、取消与提交 |
| ImportResultPage | `/import/:id` | 进度、成功 / 跳过 / 失败、刷新恢复、失败行下载 |
| PerformancePage | `/performance` | 12k 列表 / 10k 表格首尾与滚动、排序、TaskBoard、各拖放退出路径 |
| ReportsPage | `/reports` | 范围 / 字段、预览和同源导出、打印 / 长表分页 / 水印 |
| UsersPage | `/users` | CRUD、命名视图、筛选 / 分页 / 排序 / 列设置、导出 / 头像 |
| RolesPage | `/roles` | CRUD、权限树、查询 / 导出、无权限动作 |
| MenusPage | `/menus` | schema CRUD、树 / 权限预览、动态路由 / iframe、错误反馈 |
| PermissionDemoPage | `/permission-demo` | 角色 / 权限状态、按钮 / 指令 / 路由访问 |
| SettingsPage | `/settings` | 分组编辑、Logo 上传 / 取消、保存确认与失败、Shell 水印 |
| NotificationsPage | `/notifications` | 分组 / 筛选、单项 / 批量已读、目标导航与失败 |
| AuditLogsPage | `/audit-logs` | 查询、详情、目标定位、表格 / 卡片与导出 |
| ProfilePage | `/profile` | Tabs、日期 / 时间、表单校验、2FA 与取消 |
| HelpPage | `/help` | Anchor / ScrollSpy、搜索 / 加载更多 / 空态、FAQ、代码复制 |
| AboutPage | `/about` | 服务重试、UI / API 版本区分、复制与分区键盘导航 |

公共组件逐项入口：MainLayout / MainHeader / MainSidebar / TagsView / ShellFooter 在所有受保护页；ThemeConfigDrawer、NotificationBell、ChatDock、CommandPalette、ShellQuickActions、OnboardingTour、LockScreen 从 Header 或快捷键进入；ApprovalActorSwitcher 在审批页；PageHeader、React PageFragments 及 Vue MetricGrid / MetricCard / ChartEmptyState / MutedPanel / PageActionPanel 在对应页面；React Icons 与 Vue Icon / AppLogo 随 Shell 与页面检查。React GuestRoute / ProtectedRoute / PermissionRoute / PermissionGuard 和 Vue GuestShell / ProtectedShell / permission 指令需覆盖游客、已登录、无权限及会话失效。共 43 个组件文件的名称与实际库导入已列在完整源码清单中。

跨页面维度包含桌面 1440 / 1280、窄屏 768 / 375 / 320，以及主题、键盘、浮层、焦点、鼠标 / 触摸拖放、loading / empty / error / disabled / readOnly、权限与刷新恢复。各维度只按实际专项条件记录；默认矩阵固定为 1440 / 375 × 浅暗。自动断言通过不等于模型视觉验收通过，浏览器模拟触摸也不等于实体触屏验收。

## 上游问题与下一步

本轮上游问题均通过重新打包、核验安装字节及消费复测闭合，Admin 未添加 Tour placement 或 CSS 掩盖层。既有 Cron 摘要 / 数字草稿、官方通知铃铛回调和 toast 整条点击仍在 [开放短清单](frontend-upstream-suggestions.md)，不影响当前已有业务组合的验收。

上述候选阶段在本地完成修复与验证，当时发布依赖清单仍为 rc.2，未进入提交、推送或发布。后续正式 registry 升级、复验及发布结果独立记录于本页开头。
