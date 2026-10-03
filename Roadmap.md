# Tigercat Admin 路线图

本文只留**还可能回头做**的残留与待验证项。不发明产品功能。

非视觉推迟项仍只维护在 [`docs/roadmap-followups.md`](docs/roadmap-followups.md)。上游组件缺口见 [`docs/tigercat-upstream-requirements.md`](docs/tigercat-upstream-requirements.md)（开放项短清单 [`docs/frontend-upstream-suggestions.md`](docs/frontend-upstream-suggestions.md)）。视觉口径见下文。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。

---

## 视觉口径（不修，除非产品改定义）

- Calendar「今日」KPI 与选中日列表条数可以不同（演示冻结 6 月）。`pages/CalendarPage.vue` / `.tsx`。
- Performance 低层看板第四列靠包内横向滚动，页级不横溢。`pages/PerformancePage.vue` / `.tsx`。
- `p2-*` glue 类、Header 调色板原生 `<button>`、Watermark `relative relative`：见 `docs/frontend.md`，不挡功能。
- 审计页 Redis in-memory Alert + Empty 同屏：环境，不是布局坏。

## 待验证分支（2026-10-03 走查的验证边界）

当前页面已通过双端类型检查、API / Mock 构建与定向 e2e；升级到 `3.0.0-preview.8` 后，浮层、焦点、标签导航、审批流程、窄屏和暗色回归也已通过。最终设计仍等待用户人工验收。以下分支尚无完整实测证据，不能据此声称所有功能分支已逐一人工通过：

- 单个接口的 5xx、空数组与加载失败状态未逐一注入；页面正常数据态、已有未知项目/审批空态和公共异常页已检查。
- Performance 自由队列的鼠标重排已在两端复验，Performance 看板与 Tasks 的鼠标和键盘跨列也均通过；手机触摸拖放尚未单独实测。
- Reports 已检查白纸预览、类型切换、暗色可读性和手机横滚；尚未验证浏览器打印对话框及实际 PDF 输出。

## 其它未来工作

继续用 [`docs/roadmap-followups.md`](docs/roadmap-followups.md) 勾选阶段 0 起推迟的人工核验与 workaround，不要把那些项再抄回这里。
