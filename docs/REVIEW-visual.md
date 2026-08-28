# Tigercat Admin 视觉走查 — 剩余项

全站 Vue + React 视觉走查已完成（记录于 `feat/visual-review`）。可修缺陷已在 `feat/visual-fix` 落地。本文只保留**仍未关账**的项：包 API 盖不到的英文、产品口径、允许的 leftover glue，以及走查当时标「缺口 / 未取证」的检查。不发明新产品功能。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。

---

## 包 API / 口径（本仓库盖不到或不宜当缺陷修）

| 项 | 端 | 说明 |
| -- | -- | ---- |
| Settings ColorPicker「Pick color」 | 双端 | `@expcat/tigercat-*` ColorPicker 无 labels / placeholder。Review 12。 |
| 表格卡片排序「Select an option」 | 双端 Users 10.2 / Tasks 15 | `TigerLocaleSelect` 只有 `doneText`，无 placeholder 键。 |
| 内容编辑器 Bold / Italic 等工具条文案 | 双端 Content 19 | 编辑器内部 chrome，页面无 labels。 |
| Calendar「今日」KPI=0 vs 选中日 2 条 | 双端 18 | 演示冻结 6 月与「今日」口径不同，不是布局坏。 |
| Performance Kanban 完成列需内层横滚 | 双端 8.5 | `.tiger-task-board` `scrollWidth=1324` / 卡槽 977；页级无横溢。包内 scroller。 |
| `p2-*` 页面 glue 类名 | 双端 | `docs/frontend.md` 允许：`p2-icon-chip` / `p2-text-primary` / `p2-page-accent` / `p2-action-tile` / `p2-muted-panel`。不挡功能，不改名。 |
| Header 调色板原生 `<button>` | 双端 3.2 | leftover 入口，功能正常。 |
| Watermark 宿主 `relative relative` | React 3b.3 | 组件总会加 `relative`，不挡点击。 |
| 审计页 Redis Alert | 双端 16 | 环境 `redis.target=in-memory`，布局按设计同时出 Alert + Empty。 |

---

## 缺口 / 未取证（走查没走完，不是已确认缺陷）

未再 live 复验；需要时另开走查，不要把缺口当成实现清单。

**游客 / Auth**

- Vue 早期 PNG 未拍到的空校验 / 错密 / 2FA 错码 toast / 注册成功 Result，后续 a11y 已补证；无需再当缺陷。

**Shell**

- ChatDock ~375px Drawer（Vue 3.5 / React 3b.5 未走）。
- OnboardingTour 清 `tigercat-admin:onboarding-tour:done` 后完整 6 步；改密 Modal 校验；铃铛 Popover 细目（项 27）。
- 游客页紧凑密度（无主题抽屉，未切 `.compact`）。

**仪表盘**

- 图表 Empty / error / Loading 分支（不能停 Api 制造）。
- DataExport JSON / Excel 点击与失败 Message（只点过 CSV）。
- Home 375 折下图表 / 快捷操作 / 系统信息（Vue 4.7 未滚；React 4b.7 写条时未滚）。
- Home 375 暗色。

**About / Analytics / Monitor**

- About 失败 Alert「信息加载失败」（拒绝杀 Api）。
- About 点「技术栈」Link 后是否 smooth scroll 到 `#about-stack`（Vue 5.2 未点）。
- Analytics 375；切 7/90 天是否把明细 page 回 1（源码有重置，live 未点）。
- Monitor empty/error（Api 活着未出现）；seed 首帧数字跳（immediate fetch 太快未截到）；375。

**Performance**

- Vue 8.7 ~375 两场失败，未取证。
- React 8b.7 只拍了 375 首屏；四 Tab / VirtualList / Kanban 折下未拍。
- live drag reorder、Kanban 跨列、与 `/tasks` TaskBoard 对照图。
- React Tab 用 CDP click 切不过（Vue 可）；人工鼠标是否可切未断定。

**业务页（多数只拍了桌面浅色首屏）**

- Projects 详情动态/评论、锚点 smooth scroll、详情 375。
- Users 行右键 / 头像裁剪 / 导出 / 空表 / 暗色；375 卡片折下未拍全。
- Roles 删除 Popconfirm、导出、375 卡片、移动树是否可点；React 权限树未点。
- Settings 保存 / 恢复 / 校验 / 暗色 ColorPicker（未改值）。
- Files 上传 / 预览 / 右键 / 删除确认 / 移动列表。
- Notifications 创建广播表单 / 空 / 暗色。
- Tasks 拖拽 / 详情 Modal / 空列 / 375 横滚。
- AuditLogs 详情 JSON / 清理确认 / 移动。
- Profile 偏好 / 设备 / 暗色 375；React 安全 Tab 未点。
- Calendar 新建 Drawer / 暗色窄屏。
- Content Markdown / 代码 / 发布 Result / 暗色。
- Gallery 灯箱 / 标注裁剪 Drawer / 移动。
- Import 步骤 2–4 / Result / 窄屏步骤条。
- Jobs 新建 Drawer / NumberKeyboard / 暗色时间轴。
- Reports 打印预览 / 暗色打印区。
- Help 移动吸顶。
- Tickets 新建 Drawer / 关闭确认 / 375 上下 Splitter。
- Exception：`demo` 直访 `/users` 进 403；未知路径 `*`；暗色移动。

---

走查当时标「通过（信息）」的项不再复述。已修缺陷的对照见已删除的实现日志（`feat/visual-fix` 提交历史）。
