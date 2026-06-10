# Tigercat UI 上游修改建议

仅记录当前待上游改进的事项（基线 `v1.2.39`）。已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## Table / DataTableWithToolbar 通用

1. **缺少列显隐能力**：Table 无 `hiddenColumnKeys` 之类的受控 prop，toolbar 也无列设置入口（`hiddenColumns` 仅存在于 TaskBoard）。本项目在用户/角色页自行过滤 `columns`，并用 `Popover` + `Checkbox` 搭建列显隐面板。建议 toolbar 内置列设置控件，或为 Table 提供受控的列显隐 prop。
2. **锁定列 sticky 单元格与行内弹层的层叠冲突**：操作列 `fixed` 时，行内展开的 `Dropdown` 菜单会被后续行的 sticky 单元格遮挡。本项目在双端全局 CSS 以 `tbody tr:has([aria-expanded="true"]) td { z-index: 100 !important; }` 绕过。建议组件对包含展开浮层的行自动提升层叠上下文，或将行内弹层渲染到 body 传送门。

---

*上述事项在后续版本落地后，请同步更新本文档及 [frontend.md](frontend.md) 中的使用约定。*
