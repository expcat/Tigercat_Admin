# 路线图收尾与待统一处理事项

本文集中记录执行 [Roadmap.md](../Roadmap.md) 各阶段时**主动推迟**的收尾、人工核验与 workaround 清理事项，统一在全部阶段完成后批量处理或验证，不在单个阶段内提前修复。

组件层面的上游缺口见 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md)（开放项短清单：[frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)）；本文聚焦本项目侧需要回头执行的事项。

> 处理约定：每完成一个阶段，把该阶段推迟的事项按下方结构追加；最终统一执行时逐条勾选。

---

## 阶段 0 — 全局 Shell 增强

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：命令面板、消息铃铛 Popover、在线客服 Drawer 在窄屏不溢出视口（`e2e/viewport-a11y.spec.ts` `@mobile`）。Tour 仍用 `skipWhen` 跳过依赖侧栏的步骤；BackTop 仅滚动后出现，未做重叠像素断言。
- [x] **暗色模式（`.dark`）**：Playwright `colorScheme: dark` 项目覆盖 Shell 挂件打开路径（同上 spec `@dark`）。浮层不透出底层的像素对比仍可目测。
- [x] **弹层焦点与键盘路径**：Spotlight / 通知 Popover / 主题 Drawer / 锁屏 PIN 关闭后焦点回到触发器（`e2e/overlay-focus.spec.ts`）。`⌘/Ctrl+K` 打开后焦点进入搜索框。Tour 未另加焦点断言。

### workaround 待清理（依赖上游，见 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)）

- [x] **Notification 富交互**：铃铛单条通知 toast 使用 `actions`（「查看」）并保留整条 `onClick` 跳转通知中心（v2.1.2）。
- [x] **BackTop 定位**：`ShellQuickActions` 使用 `position="fixed"` + `placement="bottom-left"` + `offset={24}`，不再用 `!important` 覆盖类（v2.1.2）。
- [x] **独立 FloatButton 定位**：`ChatDock` 使用 `floating` + `placement="bottom-right"` + `offset={24}`，未读 `Badge` 叠在按钮内；快捷组用 `offset.y: '6.5rem'` 错开（v2.1.2）。

### 可选增强

- [x] Playwright 已为 API 与 demo 配置增加 375 视口 / `colorScheme: dark` project；`@mobile` / `@dark` 标注用例不进入 Desktop 套件（`e2e/playwright-projects.ts`）。

---

## 阶段 1 — 个人中心 / 数据分析

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：`/analytics` 与 `/profile` 标题可见且页面不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`）。图表网格/Tabs/QRCode/Signature 像素级不超出卡片仍可目测。
- [x] **暗色模式（`.dark`）**：两页标题在 `colorScheme: dark` 下可见（同上 spec `@dark`）。图表轴刻度、Descriptions/Timeline/Progress 像素对比仍可目测。
- [x] **弹层焦点与键盘路径**：`/profile` 的 DatePicker / TimePicker 浮层 Esc 与外部点击关闭、关闭后焦点回到页面（不困在浮层）；Tabs 方向键切换；`/analytics` DatePicker 区间选择浮层同上（`e2e/overlay-focus.spec.ts`）。

### workaround / 点到为止待回访

- [ ] **图表基元自定义图（ChartCanvas + ChartAxis/Grid/Series/Legend/Tooltip）**：当前为「点到为止」演示，序列点用 `createBandScale`/`createLinearScale` 预映射为像素坐标，未做坐标系/坐标轴位置的精细对齐与交互式 Tooltip 联动；后续可视觉打磨或改用高层图表组件。
- [ ] **ScatterChart / HeatmapChart 视觉**：使用静态构造数据，未接入真实区间/坐标轴格式化，统一核验时确认坐标轴刻度与 tooltip 文案。

---

## 阶段 2 — 协作沟通（工单中心 / 团队日历）

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px（工单 Splitter）**：`/tickets` 窄屏 `data-direction="vertical"`，列表/详情标题、ActionBar、ChatWindow 可见且页面不横向溢出；窄屏不挂 `Resizable`（`e2e/viewport-a11y.spec.ts` `@mobile`）。`/calendar` 月视图标题与「新建事件」可见、页面不横向溢出（同上 spec）。`/approvals/:id` ActionBar + 时间线可见、不横向溢出。
- [x] **暗色模式（工单）**：`/tickets` 在 `colorScheme: dark` 下标题、生命周期、ActionBar、ChatWindow 可见（同上 spec `@dark`）。`/calendar` 标题可见。`/approvals/:id` ActionBar 可见。Calendar 单元格与评论分隔线像素对比仍可目测。
- [x] **弹层焦点与键盘路径（新建 Drawer）**：`/tickets` 「新建工单」、`/calendar` 「新建事件」Drawer Esc 关闭后焦点回到触发器（`e2e/overlay-focus.spec.ts`）。关闭工单 Drawer、日程 Popover、Drawer 内 DatePicker/TimePicker 焦点仍可目测。

### workaround / 点到为止待回访

- [x] **Calendar 格内事件标记**：已用 `events` + React `dateCellRender` / Vue `#dateCell` 在格子内标色点与数量；右侧当日列表只做选中日详情（M2）。
- [x] **协作对话与日历已接 API**：`/tickets` 列表/详情/对话接 `/api/tickets`，内部备注接 `/api/comments?targetType=ticket`，`/calendar` 接 `/api/calendar/events`（刷新后由 MockApi / 后端恢复）。新建工单附件仍 `autoUpload=false`，与内容/导入演示一致。
- [x] **Resizable 对话面板**：宽屏 `/tickets` 对话区仍用 `Resizable`（`axis=vertical`，`minHeight=200` / `maxHeight=460`），ChatWindow 填满并内部滚动，`textarea` `resize-none` 避免与底手柄冲突。窄屏去掉 Resizable、固定高度，避免与垂直 Splitter 叠拖（`e2e/viewport-a11y.spec.ts` `@mobile` 断言无 `[data-resizable]`；桌面 demo 断言有）。审批详情同屏用 `min-w-0` + ActionBar wrap，Viewer/Timeline 可横向滚但不撑破页面。

---

## 阶段 3 — 内容与媒体（内容编辑 / 媒体图库）

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：`/content` 与 `/gallery` 标题可见且页面不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`）。编辑器工具条、灯箱与标注 Drawer 像素级不超出仍可目测。
- [x] **暗色模式（`.dark`）**：两页标题在 `colorScheme: dark` 下可见（同上 spec `@dark`）。编辑器边框、水印、灯箱遮罩像素对比仍可目测。
- [x] **弹层焦点与键盘路径**：`/content` `TreeSelect`/`Cascader`/`AutoComplete` 下拉浮层 Esc 与外部点击关闭、关闭后焦点不困在浮层；`/gallery` `ImageViewer`/`ImagePreview` 与标注/裁剪 `Drawer` 的 Esc 关闭后焦点回到触发器（`e2e/overlay-focus.spec.ts`）。

### workaround / 点到为止待回访

- [ ] **编辑器为内置演示引擎**：`RichTextEditor`/`MarkdownEditor`/`CodeEditor` 使用组件内置引擎（contenteditable / 内置高亮），未接 Quill/TipTap/Prism 等可插拔 `engine`/`highlighter`；如需富功能再按上游 `engine` 接口替换。
- [ ] **图片为 SVG 占位**：`/gallery` 图片用内联 SVG data-URI 占位（离线、确定性、e2e 友好）；`ImageAnnotation`/`ImageCropper` 基于该占位图演示，统一核验时确认换用真实位图后裁剪输出（`getCropResult` 的 canvas/blob）与标注坐标无异常。
- [ ] **内容与图库数据为内存态**：`/content` 草稿正文、标签、协作者与 `/gallery` 标注/裁剪结果均为页面内内存数据（与阶段 1–2 一致，未接 MockApi/真实端点），刷新后重置；如需持久化或“类服务端”分页/筛选，再按 [api.md](api.md) 约定补 demo/mock 契约。
- [ ] **Upload 未接后端**：`/content` 附件 `Upload` 设为 `autoUpload=false` 仅做选择演示，不触发上传请求；接入真实存储时再补 `customRequest`/`action`。

---

## 阶段 4 — 运维自动化（定时任务 / 数据导入）

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：`/jobs` 与 `/import` 标题/关键控件可见且页面不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`）。表格/Gantt 允许横向滚动；Drawer 内 CronEditor/NumberKeyboard 像素级不超出仍可目测。
- [x] **暗色模式（`.dark`）**：两页标题在 `colorScheme: dark` 下可见（同上 spec `@dark`）。Gantt 色条、NumberKeyboard、Transfer 边框像素对比仍可目测。
- [x] **弹层焦点与键盘路径（新建任务 Drawer）**：`/jobs` 「新建任务」Drawer Esc 关闭后焦点回到触发器（`e2e/overlay-focus.spec.ts`）。CronEditor/Import Cascader 浮层与 FormWizard 步进键盘细节仍可目测。

### workaround / 点到为止待回访

- [ ] **调度与执行数据为内存态**：`/jobs` 任务列表、启停、进度、运行阶段与 `/import` 向导选择均为页面内内存数据（与阶段 1–3 一致，未接 MockApi/真实端点），刷新后重置；如需“类服务端”分页/筛选或持久化，再按 [api.md](api.md) 约定补 demo/mock 契约。
- [ ] **Gantt 为静态运行窗口**：`/jobs` 执行时间轴用手工构造的近一周窗口（`scale=day`），未接真实执行历史；接入真实运行记录后确认时间轴刻度、依赖连线与今日参考线对齐。
- [ ] **Upload 未接后端**：`/import` 文件 `Upload` 设为 `autoUpload=false` 仅做选择演示，不触发上传/解析请求；示例数据用于字段映射与预览。接入真实存储/解析时再补 `customRequest`/`action` 与源字段动态探测。
- [ ] **导入执行为定时器模拟**：`/import` 「开始导入」用 `setInterval` 按批推进 `Progress` 到 100% 后展示 `Result`，非真实批处理；接入真实导入时改为按后端进度回调驱动。

---

## 阶段 5 — 帮助与报表（帮助中心 / 报表打印）

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：`/help` 与 `/reports` 标题可见且页面不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`）。Affix 目录隐藏、PrintLayout 页边与 QRCode 像素级仍可目测。
- [x] **暗色模式（`.dark`）**：两页标题在 `colorScheme: dark` 下可见（同上 spec `@dark`）。Code/Collapse/PrintLayout/QRCode 像素对比仍可目测。
- [x] **弹层焦点与键盘路径**：`/help` FAQ Collapse 可键盘展开；`/reports` Segmented 可切换类型（`e2e/overlay-focus.spec.ts`）。Anchor/ScrollSpy 细节仍可目测。

### workaround / 点到为止待回访

- [ ] **锚点滚动容器耦合 Shell**：`/help` 的 `Anchor`/`ScrollSpy` 通过 `getContainer` 指向 `#main-content-scroll`（Shell 内容滚动区）、`Affix` 通过 `target="#main-content-scroll"` 吸顶。若上游支持组件内部自动探测最近滚动祖先或 Shell 改为 window 滚动，可移除该显式绑定。
- [ ] **Anchor 与 ScrollSpy 双导航为点到为止**：同一批章节同时用侧栏 `Anchor`（纵向目录）与顶部 `ScrollSpy`（横向章节条）演示，功能重叠；真实项目二选一即可。
- [ ] **帮助/报表数据为内存态**：`/help` 文章列表、FAQ 与 `/reports` 报表指标/明细均为页面内静态数据（与阶段 1–4 一致，未接 MockApi/真实端点），`InfiniteScroll` 用 `setTimeout` 模拟分页，刷新后重置。
- [ ] **打印依赖 `window.print()`**：`/reports` 「打印」直接调用浏览器打印；`PrintLayout` 的 A4/页眉页脚/分页仅在打印介质（或另存 PDF）下完整生效，屏幕预览为近似呈现。统一核验时确认打印分页 `PrintPageBreak` 与水印在实际输出中的位置。
- [ ] **Code 无语法高亮**：当前 `Code` 版本仅提供纯文本代码块 + 复制，未暴露 `language` 高亮参数；如需高亮再按上游接口补充。

---

## 阶段 6 — 异常页与路由健壮性

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：`/403` `/404` `/500` 独立居中布局在窄屏标题与返回按钮可见、页面不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`）。
- [x] **暗色模式（`.dark`）**：三页在 `colorScheme: dark` 下标题可见（同上 spec `@dark`）。图标/插画像素对比仍可目测。
- [x] **键盘路径与真实历史栈**：返回首页/返回上一页按钮可聚焦后 Enter 触发；从 `/settings` 进未知路径后 404 不显示 Empty，「返回上一页」回到设置页（`e2e/exception-routes.spec.ts`，demo）。直开 `/404` 的 Empty 仍按无历史处理。倒计时自动跳转仍由原用例覆盖。
- [ ] **无权限直访刷新场景**：demo e2e 已覆盖登录后直访 `/users` → 403；直开受限路由并整页刷新（权限需守卫内补偿加载）的场景建议人工在 api 模式（真实后端）复核一次。

### 说明
- **MockApi `demo` 账号权限收窄**：静态演示模式下 `demo`/`demo` 现返回只读权限集（无 `user:view`/`role:view`/`media:view`），用于演示 403；`admin`/`admin123` 与真实 .NET 端行为不变。
- **`/500` 为演示入口**：按 Roadmap 定义仅提供直访演示，未接入全局错误边界/请求失败自动跳转；后续如需真实兜底，在两端 request 层或错误边界统一处理。

### 阶段内已处理（审查修复）

- **权限加载失败不再误判 403**：React `PermissionRoute` 与 Vue `requiresPermission` 守卫在权限尚未 `loaded` 时保持加载/取消导航，而不是当成无权限。
- **MockApi 权限按会话 token 解析用户名**：演示 token 形如 `demo-static-token:<username>`，避免多标签页共享 sessionStorage 时串权限。
- **返回上一页不再依赖 `window.history.length`**：React 用 `useNavigationType() === 'PUSH'`，Vue 用 `history.state.back`；直开标签页才显示 Empty。
- **返回上一页与 catch-all replace 对齐**：React 改为读 `history.state.idx > 0`（未知路径 `Navigate replace` 的 navigationType 是 REPLACE，但上一页仍在栈里）；Vue 继续用 `history.state.back`。
- **权限加载失败**：Vue 直开受限路由且权限接口失败时改回首页，避免 `next(false)` 取消首次导航留下空白页。
- **`/files`（`media:view`）路由级 403**：已与 `/users` / `/roles` 同一权限守卫（React `PermissionRoute`，Vue `requiresPermission`）。MockApi `demo` 账号无 `media:view`；直访 `/files` 进 `/403`。未把其余无入口权限的菜单页全部铺开。

---

## 阶段 7 — 登录流程增强（忘记密码 / 两步验证 / 注册成功）

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px（登录 OTP）**：两步验证 OTP 数字格在窄屏可见、不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`，仅 demo）。忘记密码三步与注册成功仍待核验。
- [x] **暗色模式（登录 OTP）**：OTP 页在 `colorScheme: dark` 下标题与数字格可见（同上 spec `@dark`）。忘记密码 Steps / 注册成功 Result 像素对比仍可目测。
- [x] **键盘路径（忘记密码 Steps）**：忘记密码「获取验证码」「下一步」可聚焦后 Enter 提交（`e2e/auth-flows.spec.ts`）。OTP 不足 6 位禁用「验证」已有用例。`NumberKeyboard` 按键 Tab 与 60s 重发像素/计时仍可目测。
- [ ] **api 模式复核**：真实后端无 2FA/forgot 端点，`demo` 账号登录走原直通流程；建议在 api 模式人工登录一次确认游客路由（`/forgot-password`、`/register-success`）在真实后端下正常渲染。

### 说明

- **两步验证仅 MockApi 演示**：`demo`/`demo` 在静态演示模式返回 `requiresTwoFactor`，验证码固定 `123456`；真实 .NET 后端未加对应端点（Roadmap 约束 2，契约见 [api/auth.md](api/auth.md) 的 MockApi 标注）。
- **忘记密码不真正改密**：Mock 契约只校验验证码与密码长度并返回成功，不落库；表单行为是演示目的。

### 阶段内已处理

- **双端文案与交互对齐**：忘记密码第二步按钮统一为「重置密码」，新密码占位符统一为「请输入新密码 / 请再次输入新密码」；OTP 不足 6 位时「验证」按钮双端统一禁用，重发按钮文案统一为「重新发送验证码」，一套 e2e 用例双端复用。
- **主 e2e 套件排除 hash 用例**：`playwright.config.ts` 的 `testIgnore` 补齐阶段 6 遗留缺口（`exception-routes`）并加入 `auth-flows`，这两类 hash 路由 + MockApi 用例只在 demo 配置运行。

---

## 阶段 8 — Shell 进阶（多标签、锁屏、水印 / 主题抽屉已完成）

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：标签条与锁屏遮罩在窄屏可见、页面不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`）。标签操作下拉裁切与 PIN 键盘像素级仍可目测。
- [x] **暗色模式（`.dark`）**：标签条在 `colorScheme: dark` 下可见（同上 spec `@dark`）。活动/非活动 Tag 与锁屏键盘像素对比仍可目测。
- [x] **键盘路径（锁屏 / 主题抽屉 / 标签条）**：锁屏正确 PIN 解锁后焦点回到账户按钮；主题抽屉 Esc 关闭后焦点回到 Header 调色板触发器（`e2e/overlay-focus.spec.ts`）。标签条 Enter 切换；「标签操作」菜单可打开（`e2e/tags-view.spec.ts`）。锁屏 Esc / ⌘K 不可绕过 PIN（`e2e/lock-screen.spec.ts`）。

### 说明

- 多标签、锁屏、全局水印开关和主题配置抽屉均已落地。水印与主题抽屉的自动化覆盖见 [e2e/shell-watermark-theme.spec.ts](../e2e/shell-watermark-theme.spec.ts)（设置页开关、刷新保留、不挡住多标签与锁屏；Header 打开主题抽屉并切换外观）。375px / `.dark` / 焦点恢复见 [e2e/viewport-a11y.spec.ts](../e2e/viewport-a11y.spec.ts) 与 [e2e/overlay-focus.spec.ts](../e2e/overlay-focus.spec.ts)，不当新功能重做。

---

## 阶段 10 — 大数据性能（`/performance`）

### 人工核验（自动化 e2e 未覆盖）

- [x] **移动端 375px**：`/performance` 标题与 VirtualList 区域可见、页面不横向溢出（`e2e/viewport-a11y.spec.ts` `@mobile`）。VirtualTable 横向滚动、Kanban 列与侧栏重叠像素级仍可目测。
- [x] **暗色模式（`.dark`）**：页面标题在 `colorScheme: dark` 下可见（同上 spec `@dark`）。日志行、斑马纹、Kanban 分隔线像素对比仍可目测。
- [x] **键盘路径（恢复顺序）**：「恢复顺序」按钮可键盘聚焦（`e2e/overlay-focus.spec.ts`）。`useDrag` / Kanban 拖放结果与 Tabs 方向键仍可目测。

### workaround / 点到为止待回访

- [ ] **造数为页面内存态**：日志 12,000 行、表格 10,000 行、拖拽队列与看板卡片均为页面内生成（未接 MockApi / 真实端点），刷新后重置。
- [ ] **Drag 以 `useDrag` 演示**：Tigercat v1.5.0 没有 `/Drag` 子路径组件，排序演示走包入口 `useDrag`（React `getDragItemProps` / Vue `getDragItemAttrs`）；若上游后续提供独立 Drag 组件，再评估是否替换。
- [ ] **Kanban 区别于 TaskBoard**：本页使用低层 `Kanban`（含泳道），`/tasks` 仍走 `TaskBoard` 接任务工作流。统一核验时确认两侧文案与交互不会被当成同一块。
- [ ] **万级数据首次进入**：VirtualList / VirtualTable 在选项卡首次激活时挂载（`lazy`）；统一核验时确认切到「万行多列」后表头吸顶与滚动窗口稳定。

---

*后续阶段如有推迟项，请按相同结构追加到本文。*
