# Tigercat Admin 路线图

视觉走查 1–27 与对应修复已完成（`feat/visual-fix` 已合入）。本文只留**还可能回头做**的视觉残留，以及既有非视觉收尾入口。不发明产品功能。

非视觉推迟项仍只维护在 [`docs/roadmap-followups.md`](docs/roadmap-followups.md)。上游组件缺口见 [`docs/frontend-upstream-suggestions.md`](docs/frontend-upstream-suggestions.md)。走查剩余检查（缺口 / 未取证）见 [`docs/REVIEW-visual.md`](docs/REVIEW-visual.md)，那些不是实现清单。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。

---

## 视觉残留（包 API 盖不到）

上游补 `labels` / locale 键之后再动；本仓库不要为它们另造一套文案层。

| 项 | Vue | React | 修好看起来像 |
| -- | --- | ----- | ------------ |
| Settings ColorPicker「Pick color」 | `pages/SettingsPage.vue` | `pages/SettingsPage.tsx` | 选色按钮中文（等 ColorPicker 提供 labels） |
| Users / Tasks 卡片排序「Select an option」 | `pages/UsersPage.vue`、`pages/TasksPage.vue` | 同名 `.tsx` | 排序下拉中文 placeholder（等 `TigerLocaleSelect` 有键） |
| Content 工具条 Bold / Italic | `pages/ContentPage.vue` | `pages/ContentPage.tsx` | 工具条中文（等编辑器 labels） |

## 视觉口径（不修，除非产品改定义）

- Calendar「今日」KPI 与选中日列表条数可以不同（演示冻结 6 月）。`pages/CalendarPage.vue` / `.tsx`。
- Performance 低层看板第四列靠包内横向滚动，页级不横溢。`pages/PerformancePage.vue` / `.tsx`。
- `p2-*` glue 类、Header 调色板原生 `<button>`、Watermark `relative relative`：见 `docs/frontend.md`，不挡功能。
- 审计页 Redis in-memory Alert + Empty 同屏：环境，不是布局坏。

## 其它未来工作

继续用 [`docs/roadmap-followups.md`](docs/roadmap-followups.md) 勾选阶段 0 起推迟的人工核验与 workaround，不要把那些项再抄回这里。
