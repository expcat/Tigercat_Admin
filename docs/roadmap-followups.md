# 路线图收尾与待统一处理事项

本文集中记录执行 [Roadmap.md](../Roadmap.md) 各阶段时**主动推迟**的收尾、人工核验与 workaround 清理事项，统一在全部阶段完成后批量处理或验证，不在单个阶段内提前修复。

组件层面的上游缺口见 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)；本文聚焦本项目侧需要回头执行的事项。

> 处理约定：每完成一个阶段，把该阶段推迟的事项按下方结构追加；最终统一执行时逐条勾选。

---

## 阶段 0 — 全局 Shell 增强

### 人工核验（自动化 e2e 未覆盖）

- [ ] **移动端 375px**：命令面板、消息铃铛 Popover、在线客服 Drawer、悬浮按钮组、BackTop、Tour 在窄屏下不溢出、不互相遮挡；确认 Tour 在移动端已跳过依赖侧栏可见的步骤（已用 `skipWhen`，需目测确认）。
- [ ] **暗色模式（`.dark`）**：以上挂件 token 生效、文本可读、浮层背景不透出底层内容。
- [ ] **弹层焦点与键盘路径**：Spotlight / Popover / Drawer / Tour 的 Esc 与外部点击关闭、关闭后焦点恢复到触发器；`⌘/Ctrl+K` 打开后焦点进入搜索框。（demo e2e 已覆盖打开/关闭与跳转，焦点恢复尚未断言。）

### workaround 待清理（依赖上游，见 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)）

- [ ] **Notification 富交互**：上游补齐 `actions` / `btn` 后，把消息铃铛单条通知的「整条 `onClick` 跳转」回归为带操作按钮的 toast（upstream #1）。
- [ ] **BackTop 定位**：上游提供容器定位 props 后，移除 `ShellQuickActions` 中 `!fixed !bottom-6 !left-6 !right-auto !ml-0 !mr-0` 覆盖类（upstream #2）。
- [ ] **独立 FloatButton 定位**：上游提供悬浮定位/偏移后，移除 `ChatDock` 中自包的 `fixed bottom-6 right-6 z-40` 容器（upstream #3）。

### 可选增强

- [ ] demo e2e 目前仅在 Desktop Chrome 运行；如需，补移动视口 / 暗色 `colorScheme` 的 Playwright 断言（覆盖上述人工核验项）。

---

## 阶段 1 — 个人中心 / 数据分析

### 人工核验（自动化 e2e 未覆盖）

- [ ] **移动端 375px**：`/analytics` 图表网格、KPI 卡、工具栏（Segmented + DatePicker + ButtonGroup）与明细表分页在窄屏不溢出、不横向滚动溢出视口；`/profile` 的 Tabs 在窄屏可横向滑动/换行，QRCode、Signature 画布、ColorSwatch、Slider 不超出卡片。
- [ ] **暗色模式（`.dark`）**：两页所有图表（含 Heatmap/TreeMap/Sunburst/Gauge/Org 与图表基元自定义图）配色、坐标轴与文本在暗色下可读；Descriptions 边框、Timeline 连接线、Progress 轨道 token 生效。
- [ ] **弹层焦点与键盘路径**：`/profile` 的 DatePicker / TimePicker 浮层 Esc 与外部点击关闭、关闭后焦点恢复；Tabs 方向键切换；`/analytics` DatePicker 区间选择浮层同上。（demo e2e 已覆盖选项卡切换、头像下拉进入、Segmented 切换与图表渲染，焦点恢复尚未断言。）

### workaround / 点到为止待回访

- [ ] **图表基元自定义图（ChartCanvas + ChartAxis/Grid/Series/Legend/Tooltip）**：当前为「点到为止」演示，序列点用 `createBandScale`/`createLinearScale` 预映射为像素坐标，未做坐标系/坐标轴位置的精细对齐与交互式 Tooltip 联动；后续可视觉打磨或改用高层图表组件。
- [ ] **ScatterChart / HeatmapChart 视觉**：使用静态构造数据，未接入真实区间/坐标轴格式化，统一核验时确认坐标轴刻度与 tooltip 文案。

---

*后续阶段（2–6）的推迟项请按相同结构追加到本文。*
