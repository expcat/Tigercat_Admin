# Tigercat UI 上游修改建议

仅记录当前待上游改进的事项（基线 `v1.2.37`）。已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## Table / DataTableWithToolbar 卡片模式（`responsiveMode="card"`）

1. **展开按钮文案未接入 i18n**：卡片中展开/收起按钮硬编码英文 `"Expand"` / `"Collapse"`（React、Vue 实现均如此），未读取组件 `locale` 或 `ConfigProvider` locale。
2. **缺少排序入口**：卡片模式下表头隐藏，`sortable` 列在窄屏失去排序能力。建议在 toolbar 增加排序选择器，或为卡片列表提供排序控件。
3. **选择框未主题化、缺少全选**：卡片的行选择使用原生 `<input type="checkbox/radio">` 而非主题 `Checkbox` 组件；窄屏无「全选」控件，批量操作需逐卡勾选。
4. **自定义能力有限**：空状态仅渲染 `emptyText` 纯文本（不走 `Empty` 组件）；卡片容器无 `cardClassName` 或自定义卡片渲染插槽（如 `renderCard`）。

不可回退项（当前已满足，记录以防后续版本回退）：卡片模式下工具栏（搜索、筛选、批量操作）与分页必须继续渲染、可交互。

## Table / DataTableWithToolbar 通用

1. **缺少列显隐能力**：Table 无 `hiddenColumnKeys` 之类的受控 prop，toolbar 也无列设置入口（`hiddenColumns` 仅存在于 TaskBoard）。本项目在用户/角色页自行过滤 `columns`，并用 `Popover` + `Checkbox` 搭建列显隐面板。建议 toolbar 内置列设置控件，或为 Table 提供受控的列显隐 prop。
2. **锁定列 sticky 单元格与行内弹层的层叠冲突**：操作列 `fixed` 时，行内展开的 `Dropdown` 菜单会被后续行的 sticky 单元格遮挡。本项目在双端全局 CSS 以 `tbody tr:has([aria-expanded="true"]) td { z-index: 100 !important; }` 绕过。建议组件对包含展开浮层的行自动提升层叠上下文，或将行内弹层渲染到 body 传送门。

## 国际化（TigerLocale）

1. **Table / TableToolbar 文案未接入 locale**：`TigerLocale` 缺少 table 分节；`TableToolbarProps.searchButtonText` 默认 `'搜索'`、`bulkActionsLabel` 默认 `'已选择'` 硬编码中文，与卡片模式展开/收起按钮硬编码英文（见上文卡片模式第 1 条）同根因。建议为 Table/TableToolbar 增加 locale 分节并统一收口到 `ConfigProvider` locale / `defineText`。

## Card

1. **缺少透明/无边框变体**：`CardVariant` 仅有 `default | bordered | shadow | elevated`。登录/注册页需要无边框透明卡片，目前手写 `div` 模拟（双端代码中均有 TODO 注释）。建议增加 `variant="transparent"` 或 `bordered={false}`。

## Popover / Dropdown（无障碍）

1. **关闭后不恢复触发器焦点**：经 Escape 或外部点击关闭后焦点落空（React/Vue 实现中均无焦点归还逻辑），使用方需借 `onOpenChange` / `@update:open` 自行恢复——本项目用户/角色页的列显隐面板即如此处理。建议组件在 Escape 关闭时将焦点还给触发器。

---

*上述事项在后续版本落地后，请同步更新本文档及 [frontend.md](frontend.md) 中的使用约定。*
