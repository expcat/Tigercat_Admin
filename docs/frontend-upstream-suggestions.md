# Table 组件上游修改建议

本文件汇总本项目在使用 Tigercat UI `Table` / `DataTableWithToolbar` 过程中，需要外部 glue 规避、并希望上游在后续版本原生支持的能力。每条建议都标注了当前的临时规避方案，一旦上游补齐即可移除对应的项目侧代码。

## 一、锁定列背景色与暗色模式冲突

在 Tigercat UI 当前版本中，表格锁定列（`fixed: 'left'` 或 `fixed: 'right'`）与整行在不同状态下的背景色存在冲突，我们在本项目中采用了全局 CSS 覆盖属性选择器 `[style*="position: sticky"]` 的临时规避样式。为了以后能够更优雅地原生解决该问题，建议上游组件在未来版本中进行以下重构：

### 1. 引入表格组件专属语义化 Token (Component Tokens)

当前上游组件内部对固定/锁定列的单元格（`td`）硬编码了 `--tiger-surface` 变量（作为背景色）以及 `--tiger-surface-muted`（作为 hover 色）。但在系统暗色模式 `.dark` 配置中，这两个变量缺失了对应覆盖定义，导致在暗色模式下单元格退化为亮色背景（显示为刺眼的白色块）。

建议上游将 Table 组件内锁定列的背景色，改为读取组件专用变量，例如：
* **默认状态背景色**：`var(--tiger-component-table-bg, var(--tiger-bg-card, #ffffff))`
* **斑马偶数行背景色**：`var(--tiger-component-table-stripe-bg, var(--tiger-bg-page, #fafafa))`
* **悬停 hover 态背景色**：`var(--tiger-component-table-hover-bg, var(--tiger-bg-hover, #f0f9ff))`

这样无需在外部覆盖样式，锁定列背景便能完全跟随系统暗色模式及主题配置自适应切换。

### 2. 状态自适应继承机制

上游在渲染锁定列的单元格时，若该列为固定定位，可以根据父级行（`tr`）的实时状态（例如是否是偶数行、是否处于 `hover` 悬停触发状态）直接追加对应的行状态背景色，或者允许外部传入 `fixedClassName` 动态控制，而不是在锁定列单元格上强行写入不透明的固定背景类。

*一旦上游 UI 组件库在后续版本中整合并修复了此项缺陷，本项目可直接移除在 React 的 `index.css` 和 Vue 的 `style.css` 中追加的 `[style*="position: sticky"]` 样式覆盖规则，即可实现最干净的代码表现。*

---

## 二、`DataTableWithToolbar` 窄屏卡片模式无法自定义展示字段

> 本节针对复合组件 **`DataTableWithToolbar`**（`@expcat/tigercat-react` / `@expcat/tigercat-vue` v1.2.34），即本项目数据页面实际使用的表格。诉求是窄屏下卡片化的同时，**保留搜索/筛选条件与分页**，并能自定义卡片展示哪些字段。

### 现状（卡片模式已内建，搜索与分页天然保留）

`DataTableWithToolbar` 内部由「工具栏（搜索 / 筛选 / 批量操作） + `Table` + 分页」组合而成，已内置响应式卡片模式：

* prop：`responsiveMode?: 'card' | 'scroll'`，默认 `'scroll'`；该 prop 经 `...tableProps` 透传给内部 `Table`。
* 设为 `'card'` 时，**640px（Tailwind `sm` / `max-sm`）以下**：`<table>` 追加 `max-sm:hidden` 隐藏，卡片列表容器（`hidden max-sm:grid`）显示，每行渲染为一张卡片。纯 CSS 切换，无需 JS。
* **搜索 / 筛选工具栏**由复合组件在表格上方渲染，不随卡片模式隐藏，窄屏下始终可见。
* **分页**由内部 `Table` 在卡片分支内同样 `renderPagination` 渲染，卡片模式下保留。
* 卡片渲染逻辑：遍历**全部可见列** `displayColumns`，每列输出一行「标签（`column.title`） / 值（`column.render(record, index)` 或 `record[dataKey]`）」；行选择框、展开、空状态、loading 均已内建处理。

也就是说，「窄屏卡片 + 保留搜索条件 + 保留分页」靠 `responsiveMode="card"` 即可满足，**无需额外代码**。

### 问题（仍待上游）

`TableColumn` 没有任何「列在卡片模式下是否展示 / 优先级」的字段，卡片模式只能展示与桌面表格**完全相同**的可见列集合。窄屏卡片里通常希望只保留少数关键字段（如标识列、状态、操作），而把 ID、创建时间等次要列隐藏；目前无法在不影响桌面表格的前提下做到这一点。

### 建议上游支持

1. **列级响应式可见性（主诉求）**：为 `TableColumn` 增加卡片模式可见性开关，三选一或组合：
   * `hideInCard?: boolean` —— 卡片模式下隐藏该列；
   * `responsive?: { card?: boolean }` —— 更通用的按模式可见性配置；
   * `cardPriority?: number`（或 `responsivePriority`）—— 按优先级在窄屏自动裁剪列。
2. **保持搜索/筛选与分页不退化**：卡片模式下工具栏（搜索、筛选、批量操作）与分页必须继续渲染、可交互（当前已满足，作为不可回退项明确记录，避免后续版本在卡片模式下误隐藏）。
3. **卡片主字段（可选）**：允许指定某列作为卡片标题突出展示（如 `cardTitle?: boolean` 或组件级 `cardConfig`），使卡片不局限于 label/value 平铺，更接近真实的卡片信息层级。
4. **断点可配置（可选）**：当前切换断点硬编码为 640px（`max-sm`），建议暴露配置项，允许项目自定义卡片化触发宽度。

### 本项目当前规避方案（仅为补齐「自定义字段」缺口）

搜索条件与分页已由 `responsiveMode="card"` 原生保留，无需 glue。仅为实现「卡片只展示选定字段」，在应用层新增 `useIsNarrow`（基于 `window.matchMedia('(max-width: 639px)')`，对齐上游 `max-sm` 断点），窄屏时给 `DataTableWithToolbar` 传入一份**精简的 `columns` 子集**（如用户页保留 用户名 / 状态 / 角色 / 操作，去掉 ID、显示名、创建时间）。涉及页面：React 与 Vue 的 `UsersPage`、`RolesPage`。

*一旦上游为 `TableColumn` 提供列级卡片可见性（或卡片配置）能力，本项目即可移除 `useIsNarrow` 及各页面按窄屏切换 `columns` 子集的 glue 逻辑，直接以列配置声明卡片字段。*
