# Tigercat UI 上游修改建议

仅记录当前待上游改进的事项（基线 `v1.2.37`）。已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## Table / DataTableWithToolbar 卡片模式（`responsiveMode="card"`）

1. **展开按钮文案未接入 i18n**：卡片中展开/收起按钮硬编码英文 `"Expand"` / `"Collapse"`（React、Vue 实现均如此），未读取组件 `locale` 或 `ConfigProvider` locale。
2. **缺少排序入口**：卡片模式下表头隐藏，`sortable` 列在窄屏失去排序能力。建议在 toolbar 增加排序选择器，或为卡片列表提供排序控件。
3. **选择框未主题化、缺少全选**：卡片的行选择使用原生 `<input type="checkbox/radio">` 而非主题 `Checkbox` 组件；窄屏无「全选」控件，批量操作需逐卡勾选。
4. **自定义能力有限**：空状态仅渲染 `emptyText` 纯文本（不走 `Empty` 组件）；卡片容器无 `cardClassName` 或自定义卡片渲染插槽（如 `renderCard`）。

---

*上述事项在后续版本落地后，请同步更新本文档及 [frontend.md](frontend.md) 中的使用约定。*
