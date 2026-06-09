# Table 组件锁定列上游修改建议

在 Tigercat UI 当前版本中，表格锁定列（`fixed: 'left'` 或 `fixed: 'right'`）与整行在不同状态下的背景色存在冲突，我们在本项目中采用了全局 CSS 覆盖属性选择器 `[style*="position: sticky"]` 的临时规避样式。为了以后能够更优雅地原生解决该问题，建议上游组件在未来版本中进行以下重构：

## 1. 引入表格组件专属语义化 Token (Component Tokens)

当前上游组件内部对固定/锁定列的单元格（`td`）硬编码了 `--tiger-surface` 变量（作为背景色）以及 `--tiger-surface-muted`（作为 hover 色）。但在系统暗色模式 `.dark` 配置中，这两个变量缺失了对应覆盖定义，导致在暗色模式下单元格退化为亮色背景（显示为刺眼的白色块）。

建议上游将 Table 组件内锁定列的背景色，改为读取组件专用变量，例如：
* **默认状态背景色**：`var(--tiger-component-table-bg, var(--tiger-bg-card, #ffffff))`
* **斑马偶数行背景色**：`var(--tiger-component-table-stripe-bg, var(--tiger-bg-page, #fafafa))`
* **悬停 hover 态背景色**：`var(--tiger-component-table-hover-bg, var(--tiger-bg-hover, #f0f9ff))`

这样无需在外部覆盖样式，锁定列背景便能完全跟随系统暗色模式及主题配置自适应切换。

## 2. 状态自适应继承机制

上游在渲染锁定列的单元格时，若该列为固定定位，可以根据父级行（`tr`）的实时状态（例如是否是偶数行、是否处于 `hover` 悬停触发状态）直接追加对应的行状态背景色，或者允许外部传入 `fixedClassName` 动态控制，而不是在锁定列单元格上强行写入不透明的固定背景类。

---

*一旦上游 UI 组件库在后续版本中整合并修复了此项缺陷，本项目可直接移除在 React 的 `index.css` 和 Vue 的 `style.css` 中追加的 `[style*="position: sticky"]` 样式覆盖规则，即可实现最干净的代码表现。*
