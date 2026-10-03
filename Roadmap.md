# Tigercat Admin 路线图

本文只留**还可能回头做**的残留与待验证项。不发明产品功能。

非视觉推迟项仍只维护在 [`docs/roadmap-followups.md`](docs/roadmap-followups.md)。上游组件缺口见 [`docs/tigercat-upstream-requirements.md`](docs/tigercat-upstream-requirements.md)（开放项短清单 [`docs/frontend-upstream-suggestions.md`](docs/frontend-upstream-suggestions.md)）。包 API / 口径残留见下文「视觉残留」与「视觉口径」。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。

---

## 视觉残留（包 API 盖不到）

原先因缺少 `labels` / locale 键而留下的 ColorPicker / Select / 编辑器英文 chrome，已随 Tigercat `v2.1.2` 在 `appText` 落地。当前残留一项：Tabs 溢出菜单的 `navLabels.moreTabs` 未接入 locale，两端在 `utils/tigercatText.ts` 直接改写为「更多」；上游进语言包后移除该赋值。

## 视觉口径（不修，除非产品改定义）

- Calendar「今日」KPI 与选中日列表条数可以不同（演示冻结 6 月）。`pages/CalendarPage.vue` / `.tsx`。
- Performance 低层看板第四列靠包内横向滚动，页级不横溢。`pages/PerformancePage.vue` / `.tsx`。
- `p2-*` glue 类、Header 调色板原生 `<button>`、Watermark `relative relative`：见 `docs/frontend.md`，不挡功能。
- 审计页 Redis in-memory Alert + Empty 同屏：环境，不是布局坏。

## 待验证分支（2026-10-03 走查的验证边界）

该轮修复（Shell 导航/焦点/手机客服、弹层定位、任务筛选与完成反馈、手机审批详情、图表绘制与资源进度、深色主题、手机报表横滚、自由拖拽重排等）已通过双端类型检查、构建与定向 e2e 并入库，等待用户对最终设计的人工验收。以下分支尚无完整实测证据，不能据此声称所有功能分支已逐一人工通过：

- 单个接口的 5xx、空数组与加载失败状态未逐一注入；页面正常数据态、已有未知项目/审批空态和公共异常页已检查。
- Performance 自由队列的鼠标重排已在两端复验，Performance 看板与 Tasks 的鼠标和键盘跨列也均通过；手机触摸拖放尚未单独实测。
- Reports 已检查白纸预览、类型切换、暗色可读性和手机横滚；尚未验证浏览器打印对话框及实际 PDF 输出。

## 其它未来工作

继续用 [`docs/roadmap-followups.md`](docs/roadmap-followups.md) 勾选阶段 0 起推迟的人工核验与 workaround，不要把那些项再抄回这里。
