# Tigercat Admin 功能路线图

本文是后续可执行计划，从 **R1** 重新编号。每一期必须能在一次后续 grok 对话里做完，且 **Vue 与 React 必须同时交付**。当前工作分支为 `feat/roadmap-r1`，`@expcat/tigercat-core` / `tigercat-vue` / `tigercat-react` 已对齐 **2.1.1**。

目标有两层：

1. 把 Tigercat 2.1 公开组件接到现有页面，做成可对照的双端演示。
2. 把仍停在页面内存态的协作/内容/运维演示接到 `Tigercat.Admin.Api` 与 `Tigercat.Admin.MockApi`，让组件能力跑完整路径。

约束：

- **双端对齐**：同一期改动覆盖 Vue 与 React；状态名、函数名、权限语义、路由与空/错/成功路径保持一致。
- **后端可进 ROADMAP**：旧约束「不新增真实 .NET 端点」已废弃。需要把演示跑通时，Api 与 MockApi 必须同契约落地，并同步 [docs/api.md](docs/api.md) 与对应专题。
- **接入现有页面，不新开清单页**：不要为 `Col` / `Row` / `Footer` / 官方 `Icon` 单开一期；不要把组件名堆成勾选表。
- **演示域权限**：当前无入口权限的示例页（工单、聊天坞、日历、项目、内容、作业、导入、监控）新增接口默认「登录即可」，不为此膨胀权限矩阵。已有权限的域（通知、导出、审计）沿用并按需增码。
- **先读再改**：落地前读 [docs/frontend.md](docs/frontend.md) 与本期允许改的双端同名文件；重组件继续子路径导入。

---

## 已完成基线

v1 组件覆盖与 v2 场景补全（异常页、登录流程、多标签导航、锁屏、水印、主题抽屉、`/monitor`、`/projects*`、`/performance`）均已落地，不再作为规划项。双端现有页面：About、Analytics、AuditLogs、Calendar、Content、Exception、Files、ForgotPassword、Gallery、Help、Home、Import、Jobs、Login、Monitor、Notifications、Performance、Profile、ProjectDetail、Projects、Register、RegisterSuccess、Reports、Roles、Settings、Tasks、Tickets、Users。已有 Api + MockApi 域：auth（login/register/change-password/logout/permissions）、users、roles、settings、media、notifications（list/read）、tasks、audit、stats、export、home。ChatDock、工单、日历、内容、图库标注、作业、导入、报表、帮助文章、监控指标、项目、个人中心签名与 OTP 目前仍是前端内存态或仅 MockApi 契约。

---

## 实施约定

1. 每期只改「范围」列出的双端文件，以及契约要求的 Api / MockApi / 文档 / 测试。
2. 公共类型放各自 `src/utils/types.ts`；请求走 `apiRequest` 与 `getAuthHeaders()`。
3. 新复合组件文案补进双端 `src/utils/tigercatText.ts`。
4. 新端点在 `Tigercat.Admin.Api/Endpoints/` 按现有 `IEndpointDefinition` 注册，`Program.cs` `MapEndpoint`，`AppJsonContext` 补序列化类型；MockApi 在 `Tigercat.Admin.MockApi/src/index.ts` 同步 handler。
5. 关系库变更走 EF 实体 + Migration + `DbInitializer` 种子；演示数据给 2–5 条即可，不造生产级工作流。
6. 每期回填 [docs/frontend.md](docs/frontend.md) 组件选择矩阵中受影响的行，以及 [docs/api.md](docs/api.md) / 对应专题；跨域新资源在 [docs/llm.md](docs/llm.md) 登记。
7. 不在本期顺手改无关页面、不合并 `main`、不升级无关依赖。

---

## R1 — 2.1 表单与 Auth（OTP / 掩码 / 标签）

- **目标：** 用 `InputOTP`、`MaskInput`、`TagsInput` 替换现有登录两步验证、锁屏 PIN、忘记密码身份输入、个人中心 2FA 与内容标签的临时拼装；把忘记密码与 2FA 从「仅 MockApi」补成 **Api + MockApi 同契约**。演示验证码固定 `123456`，不引入第三方 TOTP 库。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - 页面：`LoginPage`、`ForgotPasswordPage`、`ProfilePage`、`ContentPage`
  - 组件：`LockScreen`；Vue `utils/lock-screen.ts` 与 React 等价物
  - 工具：双端 `src/utils/tigercatText.ts`、`src/utils/types.ts`；如需抽出 2FA/忘记密码请求辅助函数，放现有 `src/utils`（不要新建无关目录）
  - 登录 OTP：用 `InputOTP` 取代 `NumberKeyboard` 作为主输入；忘记密码验证码同样改 `InputOTP`
  - 忘记密码身份步：手机号用 `MaskInput`（大陆 11 位掩码），邮箱保持普通 `Input`，渠道仍按是否含 `@` 推断
  - 个人中心安全设置：2FA 开关对接真实 enable/disable；验证码绑定用 `InputOTP`；可补只读/可编辑手机号 `MaskInput`（本期不必持久化手机号）
  - 内容页：文章标签从 `AutoComplete` 单值改为 `TagsInput` 多标签
  - 锁屏：PIN 主输入改 `InputOTP`（长度仍为现有 `LOCK_SCREEN_PIN_LENGTH`，demo PIN 不变）；可保留 `NumberKeyboard` 作为辅助，但验收以 OTP 槽位为准
  - e2e：`e2e/auth-flows.spec.ts`、`e2e/lock-screen.spec.ts` 中按 `[data-key]` 点数字键盘的步骤必须改成 `InputOTP` 可稳定定位的方式
- **后端（Api + MockApi）：**
  - **已有 MockApi + `docs/api/auth.md`，本期补真实 Api 并对齐：**
    - 扩展现有 `POST /api/auth/login`：开启 2FA 的账号校验密码成功后 **不发 token**，返回 `requiresTwoFactor: true`、`username`（可附 `challengeId`）。真实端点路径已存在，缺的是该分支。
    - `POST /api/auth/two-factor/verify`：`username` + `code`（+ 可选 `challengeId`）通过后发会话
    - `POST /api/auth/forgot-password/code`：`channel`（`email`/`phone`）+ `target` → `{ sentTo }`
    - `POST /api/auth/forgot-password`：`channel` + `target` + `code` + `password` → 重置成功
  - **以下为新契约，本期同时加 MockApi / Api / 文档：**
    - `GET /api/auth/two-factor`（需登录）：当前用户 `{ enabled }`
    - `PUT /api/auth/two-factor`（需登录）：`{ enabled }`；开启后该账号下次登录走 OTP
  - 用户表增加 `TwoFactorEnabled`（默认 `false`）；Migration + `IUserStore`/`EfUserStore`/`InMemoryUserStore` 能读改该字段
  - 种子一个与 MockApi 一致的 `demo` / `demo` 账号（2FA 默认开启、只读权限集保持现有 403 演示语义）；`admin` 默认关闭 2FA
  - 验证码与重置码用现有 `ICacheService` 短 TTL（建议 5 分钟）；演示环境固定码 `123456`
  - 目标用户不存在时忘记密码仍返回成功，避免账号枚举；存在则 `UpdatePasswordAsync`
  - 更新 `AuthModels`、`AppJsonContext`、`docs/api/auth.md`、`docs/api.md`
  - 在 `Tigercat.Admin.Api.Tests` 补登录 2FA 与忘记密码的最小用例
- **验收命令：**
  - `dotnet test Tigercat.Admin.sln`
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
  - 有 Playwright 环境时：`pnpm e2e:demo -- e2e/auth-flows.spec.ts e2e/lock-screen.spec.ts`（或仓库等价命令）
- **完成标准：**
  - `demo/demo` 在 Api 与 MockApi 都会进入两步验证；`123456` 通过后写入会话；错误码提示 401
  - 忘记密码三步在 Api 与 MockApi 都能走完；手机号掩码可见
  - Profile 关闭 2FA 后该账号登录不再要 OTP；再开启则要
  - Content 标签可增删多个 tag，双端字段名一致
  - 锁屏仍用原 demo PIN 解锁，e2e 不再依赖数字键盘 `data-key`
  - `docs/frontend.md` 登录流程 / 个人中心 / 内容编辑三行矩阵已写入新组件

---

## R2 — 2.1 导航与反馈（进度条 / 菜单 / 页头 / 快捷键）

- **目标：** 把路由切换、列表主操作、右键菜单、帮助快捷键和页头接到 2.1 组件：`LoadingBar`+`LoadingBarContainer`、`ContextMenu`（含 Item/Menu/Sub）、`SplitButton`、`Kbd`、`NavigationMenu`（含 Content/Item/Link/Trigger），以及用官方 `PageHeader` 替换本地 Card 包装。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - Shell：Vue `App.vue` + `router/index.ts` + `MainLayout.vue`；React `App.tsx` + `MainLayout.tsx`。路由开始/结束驱动 `LoadingBar`，根节点挂 `LoadingBarContainer`；切页失败也要结束进度
  - `FilesPage`：文件行右键 `ContextMenu`（预览 / 下载或打开 / 删除，删除仍走现有确认与权限 `media:delete`）；主操作「上传」改为 `SplitButton`（主按钮上传，菜单可放「选择文件」或现有次要上传入口，不新造无后端的动作）
  - `UsersPage`：表格行右键 `ContextMenu`（编辑 / 启停 / 删除，动作复用现有函数与 `user:edit`/`user:delete`）；工具栏主按钮「新增用户」改为 `SplitButton`（主按钮新增，菜单可挂「导出」——导出仍走现有 `exportData`，不重做导出弹层）
  - `HelpPage`：快捷键表的按键展示改为 `Kbd`，语义与现有 `SHORTCUTS` 一致
  - `AboutPage`：用 `NavigationMenu` 做页内分区跳转（服务信息 / 特性 / 技术栈），点击滚动到已有锚点，不新开路由
  - 本地 `components/PageHeader.vue` 与 `components/PageHeader.tsx`：改为官方 `PageHeader` 的薄包装，**保留现有 `title` / `subtitle` / `icon` / `tags` 调用面**，避免 20+ 页面同时改 props。视觉仍遵守 [docs/frontend.md](docs/frontend.md) 页头规则（图标芯片、说明、`sm` 以上才显示 tags）
  - 本期核对该包装的页面：`About`、`Help`、`Files`、`Users`（不必巡检全部业务页）
  - `tigercatText.ts` 补新组件文案
- **后端（Api + MockApi）：** 无
- **验收命令：**
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
- **完成标准：**
  - 受保护路由切换时双端都能看到顶部/全局 LoadingBar，落地后消失
  - Files / Users 右键菜单与工具栏 SplitButton 的动作与改前等价，权限不足时入口仍隐藏或禁用
  - Help 快捷键用 `Kbd` 渲染；About 的 NavigationMenu 能跳到页内对应区块
  - 业务页仍写 `import PageHeader from '../components/PageHeader'`（React 具名导入保持现有风格），但实现已基于官方组件；About/Help/Files/Users 页头在桌面与窄屏不溢出
  - `docs/frontend.md` 的 Shell、用户、文件、帮助、关于矩阵行已更新

---

## R3 — 2.1 布局与媒体（瀑布流 / 对比 / 滚动 / 跑马灯）

- **目标：** 在现有 Gallery / Help / Home 上演示 `Masonry`、`AspectRatio`、`ImageCompare`、`ScrollArea`、`Highlight`、`Marquee`。图库标注、帮助文章数据仍为前端内存态。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - `GalleryPage`：相册网格改 `Masonry`；卡片图用 `AspectRatio` 固定比例（与现有 16:9 裁剪演示不冲突）；新增一组「版本对比」用 `ImageCompare`（可用现有 SVG placeholder 生成 before/after，不接媒体上传）
  - `HelpPage`：长文档正文套 `ScrollArea`（容器高度跟随主内容区，不破坏现有 `Anchor`/`ScrollSpy`/`Affix` 的 `#main-content-scroll` 约定；若冲突，ScrollArea 只包文章列表或 FAQ 内长文本，并在完成标准写明选择）；检索关键字用 `Highlight`（可复用现有章节/FAQ 文本，关键词固定如「权限」「令牌」）
  - `HomePage`：在统计区上方加 `Marquee` 公告条（2–4 条运维公告文案，静态即可）。不要改图表请求逻辑
  - 双端 `tigercatText.ts` 仅补这些组件需要的文案
- **后端（Api + MockApi）：** 无
- **验收命令：**
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
- **完成标准：**
  - Gallery 在「全部/产品/团队」筛选下瀑布流排列；空相册仍是 Empty；ImageCompare 可拖动对比
  - Help 的 Highlight 能看见关键字高亮；ScrollArea 在桌面与 375px 不撑破 Shell
  - Home 公告 Marquee 在暗色模式下用 token 颜色，不遮挡统计卡片
  - `docs/frontend.md` 媒体图库 / 帮助中心 / 仪表盘三行已更新

---

## R4 — 数据导出组件对接已有导出 API

- **目标：** 在 Reports / AuditLogs / Home 接入官方 `DataExport`，必要字段筛选用 `CheckboxGroup`；下载走已有或补齐的导出流，而不是 `JSON.stringify` 假下载。Users/Roles 现有导出弹层 **不在本期重写**。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - `ReportsPage`：打印旁增加 `DataExport`（格式 csv/json/xlsx，字段用 `CheckboxGroup` 勾选 KPI/渠道列）
  - `AuditLogsPage`：用 `DataExport` 替换或包裹现有「导出 CSV」按钮；筛选条件（keyword/category 等）作为导出 query 一并带上；权限仍为 `audit:export`
  - `HomePage`：在概览区提供 `DataExport`，导出当前统计概览 + 趋势（天数沿用页上 `trendDays`）
  - 双端 `src/utils/export.ts`、`src/utils/types.ts`：扩展实体类型，保持 Blob 下载工具可复用
  - `tigercatText.ts` 补 DataExport / CheckboxGroup 文案
- **后端（Api + MockApi）：**
  - 审计：沿用 `GET /api/audit-logs/export`；若 `DataExport` 需要 json/xlsx，将该端点扩展为 `format=csv|json|xlsx`（默认 csv，权限与条数上限不变），更新 [docs/api/audit.md](docs/api/audit.md)
  - 报表：新增 `GET /api/export/reports?type=daily|weekly|monthly&format=csv|json|xlsx&fields=`，需登录；返回文件流。数据与当前页 KPI/渠道演示表一致即可（Api 可用静态表，MockApi 同结构）
  - 首页：新增 `GET /api/export/overview?format=csv|json|xlsx&days=`，需登录，基于现有 `/api/stats/overview` 与 `/api/stats/trend` 生成文件
  - 在 `ExportEndpoints`（或审计文件）注册；`AppJsonContext` 仅在错误 JSON 需要时补充；MockApi `/api/export/reports`、`/api/export/overview` 与审计导出 format 对齐
  - 更新 [docs/api/dashboard-export.md](docs/api/dashboard-export.md)、[docs/api.md](docs/api.md)
  - Api.Tests 各补一条导出 200 + 非法 format 400
- **验收命令：**
  - `dotnet test Tigercat.Admin.sln`
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
- **完成标准：**
  - 三页都能选出字段并下载文件；未登录/无 `audit:export` 时审计导出失败路径与现网一致
  - MockApi 与 Api 的 query/format 行为一致
  - Users/Roles 原导出弹层仍可用
  - `docs/frontend.md` 仪表盘 / 审计 / 报表矩阵行已写入 `DataExport`、`CheckboxGroup`

---

## R5 — 协作后端化（工单 / 聊天坞 / 评论）

- **目标：** 把 `TicketsPage`、全局 `ChatDock`、以及工单里的 `CommentThread` 从内存态改为 Api + MockApi。评论做成通用资源，供 R6 项目详情复用。聊天保持请求-响应（发送后服务端回一条演示回复），不做 WebSocket。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - 页面：`TicketsPage`
  - 组件：`ChatDock`、`MainLayout`（只改聊天坞数据来源，不改开合位置）
  - 工具：双端 `src/utils/types.ts`；可新增 `src/utils/tickets.ts`、`src/utils/chat.ts`、`src/utils/comments.ts`（两端同名）
  - 工单列表/详情/生命周期/对话/`CommentThread`/`Mentions` 仍用现有 UI，数据改为请求结果
  - 空、加载、失败、创建、关闭确认路径必须保留
- **后端（Api + MockApi）：**
  - 工单（登录即可）：
    - `GET /api/tickets` 分页/状态筛选
    - `GET /api/tickets/{id}`
    - `POST /api/tickets`
    - `PUT /api/tickets/{id}`（含 status 流转）
    - `POST /api/tickets/{id}/messages`（工单内 ChatWindow 消息）
  - 聊天坞（登录即可，单会话）：
    - `GET /api/chat/messages`
    - `POST /api/chat/messages`（body 文本；服务端追加 self，并生成 other 演示回复）
  - 评论（登录即可，通用）：
    - `GET /api/comments?targetType=ticket|project&targetId=`
    - `POST /api/comments`（`targetType`、`targetId`、`body`）
  - EF 实体 + Migration + 种子 2–3 条工单（含几条消息与评论）；聊天种子 1 条客服欢迎语
  - `Program.cs` 注册新 Endpoint 类；MockApi 用内存数组模拟
  - 新增 [docs/api/tickets.md](docs/api/tickets.md)、[docs/api/chat.md](docs/api/chat.md)、[docs/api/comments.md](docs/api/comments.md)，并在 [docs/api.md](docs/api.md)、[docs/llm.md](docs/llm.md) 登记
  - Api.Tests：列表、创建、发消息、评论各 1 条正向；不存在工单 404
- **验收命令：**
  - `dotnet test Tigercat.Admin.sln`
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
- **完成标准：**
  - 刷新页面后工单、工单对话、内部评论、ChatDock 记录仍在（Api 模式走库，MockApi 走其现有 persistence）
  - 双端字段与状态机与改前 UI 一致（open/accepted/progress/resolved/closed）
  - 项目详情本期仍用静态评论；只要求 comments API 已存在且工单已调用
  - `docs/frontend.md` 工单中心 / Shell 聊天坞行改为「接 API」

---

## R6 — 项目与日历后端化

- **目标：** `ProjectsPage` / `ProjectDetailPage` / `CalendarPage` 改为读写真后端。项目详情的 `CommentThread` 改调 R5 的 `targetType=project` 评论接口。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - 页面：`ProjectsPage`、`ProjectDetailPage`、`CalendarPage`
  - 工具：双端 `src/utils/projects.ts`（静态 `PROJECTS` 改为 API 映射/筛选辅助，保留进度与状态 meta）、可新增 `src/utils/calendar.ts`、`src/utils/types.ts`
  - 路由 `/projects/:id`、未知 id 空态、菜单高亮行为保持不变
  - 日历现有月视图、Drawer 新建、Countdown、当日列表交互保持，数据改 API
- **后端（Api + MockApi）：**
  - 项目（登录即可）：
    - `GET /api/projects`（keyword、status、page、pageSize）
    - `GET /api/projects/{id}`
    - `PUT /api/projects/{id}` 仅当现有 UI 已有编辑入口；若详情目前只读，则本期只做 GET + 种子，不发明编辑表单
  - 日历（登录即可）：
    - `GET /api/calendar/events?from=&to=`
    - `POST /api/calendar/events`
    - `DELETE /api/calendar/events/{id}`（若页上已有删除；没有则不做）
  - 实体含列表页已展示字段：名称、状态、进度、负责人、成员摘要、里程碑；日历含 date/start/end/title/type/location
  - 种子与当前静态演示条数相当（约 6–8 个项目、若干事件）
  - 项目详情评论只调 `/api/comments?targetType=project`
  - 文档：[docs/api/projects.md](docs/api/projects.md)、[docs/api/calendar.md](docs/api/calendar.md)，并登记索引与 llm 路由
  - Api.Tests：项目列表/详情 200、未知 id 404、创建日历事件 200
- **验收命令：**
  - `dotnet test Tigercat.Admin.sln`
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
- **完成标准：**
  - 项目列表筛选/分页结果来自服务端；详情刷新不丢评论
  - 日历新建事件刷新后仍在；类型色标与现 UI 一致
  - `docs/frontend.md` 项目列表/详情、团队日历行改为接 API

---

## R7 — 内容、作业与导入后端化

- **目标：** 把 `ContentPage`、`JobsPage`、`ImportPage` 的演示数据写成 Api + MockApi。继续用现有编辑器/Cron/向导组件，不新做 CMS 权限模型。图库标注与帮助文章仍内存态。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - 页面：`ContentPage`、`JobsPage`、`ImportPage`
  - 工具：双端 `src/utils/types.ts`；可新增 `content.ts` / `jobs.ts` / `import-jobs.ts`
  - 内容：保存草稿/发布走 API；编辑器三态、分类树、栏目级联、`TagsInput`（R1 已接）保留
  - 作业：列表、启停、Cron、并发/超时字段读写 API；Gantt 用返回的任务时间
  - 导入：向导最后一步 `POST` 创建导入任务并轮询状态，直到完成 Result；中间步仍可本地，但提交后必须落库
- **后端（Api + MockApi）：**
  - 内容：
    - `GET /api/content/articles`
    - `GET /api/content/articles/{id}`
    - `PUT /api/content/articles/{id}`（title、editorType、body、tags、category、column、published）
    - 种子 1 篇草稿即可
  - 作业：
    - `GET /api/jobs`
    - `POST /api/jobs`
    - `PUT /api/jobs/{id}`（含 enabled/status/cron/concurrency 等现有字段）
    - 种子与当前页 3 条演示相当
  - 导入：
    - `POST /api/import-jobs`（source、target、mappings、mode、conflict）
    - `GET /api/import-jobs/{id}`（status、progress、result）
    - 服务端可用短循环/计数把 progress 推到 100%（MockApi 用 setTimeout 模拟亦可，但 GET 必须能观察到进展）
  - 文档：`docs/api/content.md`、`docs/api/jobs.md`、`docs/api/import.md`，并登记索引与 llm
  - Api.Tests：文章保存、作业启停、导入创建+查询各 1 条
- **验收命令：**
  - `dotnet test Tigercat.Admin.sln`
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
- **完成标准：**
  - 内容保存后刷新仍在；作业启停刷新不丢；导入向导完成态可从 GET 恢复
  - 双端请求字段名一致
  - `docs/frontend.md` 内容编辑 / 定时任务 / 数据导入行改为接 API

---

## R8 — 监控快照与通知广播

- **目标：** `MonitorPage` 不再用纯前端随机数冒充指标，改为轮询快照 API；`NotificationsPage` 支持创建/广播，把 `NotificationCenter` 的写入能力跑通（现有只读 list/read）。
- **范围（Vue+React 允许改的文件/页面/组件）：**
  - 页面：`MonitorPage`、`NotificationsPage`
  - 组件：`NotificationBell` 仅当创建后需要刷新未读数时改请求；不要重做铃铛 UI
  - 工具：双端 `src/utils/types.ts`、`src/utils/notifications.ts`
  - 监控：保留 2/3/5 秒间隔与暂停/继续，但每 tick `GET` 快照；序列窗口可在前端按返回点拼接，或由 API 直接给最近 N 点
  - 通知：页头动作增加「创建通知」表单（title、description、groupKey、toastType、可选 linkUrl）；提交后列表与铃铛未读数更新
- **后端（Api + MockApi）：**
  - 监控（登录即可）：
    - `GET /api/monitor/snapshot` → CPU/内存/磁盘、QPS、延迟、nodes、events、serverTime
    - 服务端生成合理随机/步进数据即可，不要接真实主机指标
  - 通知：
    - `POST /api/notifications`，权限 `notification:create`（种子给 Admin；Editor 可给或不给，Viewer 不给）
    - body：`groupKey`、`title`、`description`、`toastType`、`linkUrl?`、`meta?`
    - 当前通知实体是全局列表而非按用户分发：创建即插入一条，前端当「广播」演示
    - `DbInitializer` 增加权限码并 bump `PermissionSeedVersion`
  - 文档：[docs/api/notifications.md](docs/api/notifications.md) 补创建；新增 [docs/api/monitor.md](docs/api/monitor.md)；更新 [docs/api.md](docs/api.md)、[docs/llm.md](docs/llm.md)
  - Api.Tests：snapshot 200；创建通知 200；Viewer 无 `notification:create` 时 403
- **验收命令：**
  - `dotnet test Tigercat.Admin.sln`
  - `pnpm --filter tigercat-admin-vue typecheck`
  - `pnpm --filter tigercat-admin-react typecheck`
  - `pnpm build:frontend`
  - `pnpm run check:links`
- **完成标准：**
  - 监控暂停后不再发请求；继续后曲线与事件流会增长
  - Admin 创建通知后 NotificationCenter 立即可见，标记已读仍走现有接口
  - MockApi 与 Api 字段一致
  - `docs/frontend.md` 实时监控 / 通知中心行已更新

---

## 非目标

- 不做 i18n；继续单语言中文与 `defineText`。
- 不做地图，不引入第三方地图/图表库。
- 不在执行某期时改该期范围外的业务代码。
- 不合并 `main`，不在路线图任务里 commit / push。
- 不把 `Col` / `Row` / `Footer` / 官方 `Icon` 单独做一期。
- 个人中心电子签名、图库标注、帮助文章正文继续前端内存态，不单开一期。
- 聊天不做 WebSocket / SignalR；监控不接真实主机指标。
