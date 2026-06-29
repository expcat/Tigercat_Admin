# Tigercat UI 上游修改建议

仅记录当前待上游改进的事项。已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## 当前状态

本次核查：当前仓库使用 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` 为 `1.5.0`（2026-06-29 核查）。下列事项在实现路线图「阶段 0 — 全局 Shell 增强」时发现，已在本项目用变通方式处理，建议上游后续完善；升级版本时需重新验证。

## 待上游改进

### 1. `Notification` 缺少内嵌操作按钮（toast 富交互）

- **现象**：`NotificationProps` 仅提供 `onClick`（整条点击）与 `onClose`，没有在 toast 内渲染一个或多个操作按钮的能力（如 `btn` / `actions` 插槽或数组）。路线图阶段 0 想要「带操作按钮的通知 toast」（例如「查看」「撤销」并存）无法实现。
- **建议**：为 `Notification` 增加 `actions`（按钮配置数组）或 `btn` 插槽，支持每条 toast 渲染若干操作按钮并带各自回调；保留现有 `onClick` 作为整条点击的兜底。
- **本项目处理**：消息铃铛点击单条通知时改用整条 `notification.*({ onClick })` 跳转通知中心；不在 toast 内渲染按钮。

---

### 2. `BackTop` 对非 `window` 滚动容器的定位需要 `!important` 覆盖

- **现象**：本项目的页面滚动发生在 `Content`（`overflow-auto`）而非 `window`。给 `BackTop` 传入 `target` 指向该容器后，组件会从 `backTopButtonClasses`（`fixed bottom-8 right-8`）切换为 `backTopContainerClasses`（`sticky bottom-4 ml-auto mr-4`）。`sticky + ml-auto` 依赖被放进特定的流式/弹性父容器才能靠右贴底，放在常规内容容器里难以稳定定位，且无法与右下角其它悬浮按钮错开。
- **根因**：`BackTop` 仅以「target 是否为 window」二选一地切换 `fixed` / `sticky` 定位类，没有暴露定位或偏移配置。
- **建议**：当 `target` 为容器元素时仍支持固定定位，或新增 `placement` / `offset`（或 `position`）props，让使用方显式控制悬浮位置，避免被迫用 `!fixed !bottom-* !left-*` 等 `!important` 覆盖内置 `sticky/ml-auto/mr-*` 类。
- **本项目处理**：`ShellQuickActions` 中给 `BackTop` 追加 `!fixed !bottom-6 !left-6 !right-auto !ml-0 !mr-0` 覆盖类，固定到左下角并保留 `target` 用于滚动检测。

---

### 3. 独立 `FloatButton` 无内置悬浮定位

- **现象**：`FloatButton` 仅渲染按钮本身（`inline-flex` 等外观类，无 `fixed` 定位）；只有 `FloatButtonGroup` 自带 `fixed right-6 bottom-6 z-50` 的悬浮容器。将单个 `FloatButton` 作为右下角悬浮入口（不放进 group）时，需要使用方自行包一层 `fixed` 容器。
- **建议**：为独立 `FloatButton` 提供可选的悬浮定位与偏移（或在文档中明确「独立按钮不负责定位，需自行包裹」），减少使用方重复编写定位 glue。
- **本项目处理**：`ChatDock` 将客服 `FloatButton`（含 `Badge`）包裹在 `fixed bottom-6 right-6 z-40` 容器中实现右下角悬浮。

---

*后续发现新的上游改进事项时，请同步更新本文档及 [frontend.md](frontend.md) 中的使用约定。*
