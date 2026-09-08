# Tigercat Admin 路线图

视觉走查 1–27 与对应修复已完成（`feat/visual-fix` 已合入）。本文只留**还可能回头做**的视觉残留，以及既有非视觉收尾入口。不发明产品功能。

> **中台递进（本轨例外）**：工作流 + 动态菜单演示按 [`docs/midplatform-roadmap.md`](docs/midplatform-roadmap.md) 执行（M1=2.3.2 起）。该轨的中台 demo 切片**覆盖**文首「不发明产品功能」冻结，仅限本 track；其它视觉残留 / followups 口径不变。

非视觉推迟项仍只维护在 [`docs/roadmap-followups.md`](docs/roadmap-followups.md)。上游组件缺口见 [`docs/tigercat-upstream-requirements.md`](docs/tigercat-upstream-requirements.md)（开放项短清单 [`docs/frontend-upstream-suggestions.md`](docs/frontend-upstream-suggestions.md)）。包 API / 口径残留见下文「视觉残留」与「视觉口径」。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。

---

## 视觉残留（包 API 盖不到）

原先因缺少 `labels` / locale 键而留下的 ColorPicker / Select / 编辑器英文 chrome，已随 Tigercat `v2.1.2` 在 `appText` 落地。当前无新的包 API 缺口。

## 视觉口径（不修，除非产品改定义）

- Calendar「今日」KPI 与选中日列表条数可以不同（演示冻结 6 月）。`pages/CalendarPage.vue` / `.tsx`。
- Performance 低层看板第四列靠包内横向滚动，页级不横溢。`pages/PerformancePage.vue` / `.tsx`。
- `p2-*` glue 类、Header 调色板原生 `<button>`、Watermark `relative relative`：见 `docs/frontend.md`，不挡功能。
- 审计页 Redis in-memory Alert + Empty 同屏：环境，不是布局坏。

## 视觉走查未再 live 复验（缺口，不是实现清单）

2026-08-28 会话只 live 走了游客 / Auth（空校验、错密、2FA 错码、注册成功 Result），均通过、不是缺陷。下面这些仍无本会话 live 证据，**不是**待实现功能。未重走原因写在各条。包 API / 口径 mismatch 见上文与 [`docs/frontend-upstream-suggestions.md`](docs/frontend-upstream-suggestions.md)，不当缺陷重走。

**Shell**（本会话未开登录后壳、未切 375 / 紧凑）

- ChatDock ~375px Drawer：Vue 3.5 / React 3b.5 原走查未走；本会话未进已登录壳、未 emulate 375。
- OnboardingTour 清 `tigercat-admin:onboarding-tour:done` 后完整 6 步；改密 Modal 校验；铃铛 Popover 细目（项 27）：项 27 从未作为独立走查面，本会话未登录。
- 游客页紧凑密度：游客页无主题抽屉，无法切 `.compact`。

**仪表盘**（本会话未进 `/dashboard`；拒绝停 Api）

- 图表 Empty / error / Loading 分支：live 数据态不会出现；不能停 Api 制造 5xx / 空数组。
- DataExport JSON / Excel 点击与失败 Message：原走查只点过 CSV；失败 toast 需要 5xx，拒绝杀 Api。
- Home 375 折下图表 / 快捷操作 / 系统信息：Vue 4.7 未滚；React 4b.7 写条时未滚。本会话未切 375。
- Home 375 暗色：本会话未切暗色、未切 375。

**About / Analytics / Monitor**（本会话未打开这些路由）

- About 失败 Alert「信息加载失败」：chrome-devtools 无安全的单上下文 URL-block；拒绝杀 Api / 全局 `/api` 拦截。
- About 点「技术栈」Link 后是否 smooth scroll 到 `#about-stack`：Vue 5.2 未点；本会话未开 `/about`。
- Analytics 375；切 7/90 天是否把明细 page 回 1：源码有重置，live 未点；本会话未开 `/analytics`、未切 375。
- Monitor empty/error（Api 活着未出现）；seed 首帧数字跳（immediate fetch 太快未截到）；375：拒绝停 Api；本会话未开 `/monitor`。

**Performance**（本会话未开 `/performance`）

- Vue 8.7 ~375 两场失败，原走查未取证；本会话未切 375。
- React 8b.7 只拍了 375 首屏；四 Tab / VirtualList / Kanban 折下未拍。
- live drag reorder、Kanban 跨列、与 `/tasks` TaskBoard 对照图：原走查未做；本会话未拖。
- React Tab 用 CDP click 切不过（Vue 可）；人工鼠标是否可切未断定。本会话未再试。

**业务页交互 · 暗色 · 375**（原走查多数只拍桌面浅色首屏；本会话未进已登录业务页、未切暗色、未切 375）

- Projects 详情动态/评论、锚点 smooth scroll、详情 375。
- Users 行右键 / 头像裁剪 / 导出 / 空表 / 暗色；375 卡片折下未拍全。
- Roles 删除 Popconfirm、导出、375 卡片、移动树是否可点；React 权限树未点。
- Settings 保存 / 恢复 / 校验 / 暗色 ColorPicker（未改值）。ColorPicker 触发器走 ConfigProvider `colorPicker` 文案（v2.1.2）。
- Files 上传 / 预览 / 右键 / 删除确认 / 移动列表。
- Notifications 创建广播表单 / 空 / 暗色。
- Tasks 拖拽 / 详情 Modal / 空列 / 375 横滚。
- AuditLogs 详情 JSON / 清理确认 / 移动。
- Profile 偏好 / 设备 / 暗色 375；React 安全 Tab 未点。
- Calendar 新建 Drawer / 暗色窄屏。「今日」KPI 口径见上文，不当缺陷重走。
- Content Markdown / 代码 / 发布 Result / 暗色。工具条文案走 ConfigProvider `richTextEditor` / `markdownEditor`（v2.1.2）。
- Gallery 灯箱 / 标注裁剪 Drawer / 移动。
- Import 步骤 2–4 / Result / 窄屏步骤条。
- Jobs 新建 Drawer / NumberKeyboard / 暗色时间轴。
- Reports 打印预览 / 暗色打印区。
- Help 移动吸顶。
- Tickets 新建 Drawer / 关闭确认 / 375 上下 Splitter。

**Exception**（本会话未切 `demo`、未直访未知路径）

- `demo` 直访 `/users` 进 403；未知路径 `*`；暗色移动。要走 403 需 `demo` 会话，本会话 Auth 核验用的是游客上下文，未把 `demo` 写成已登录态。

## 其它未来工作

继续用 [`docs/roadmap-followups.md`](docs/roadmap-followups.md) 勾选阶段 0 起推迟的人工核验与 workaround，不要把那些项再抄回这里。
