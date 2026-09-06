# Tigercat UI 上游修改建议

仅记录**当前仍开放**的上游改进指针。完整场景映射、对标、优先级和建议 API 以 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md) 为单一事实源，本文不复写细节。

已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## 当前状态

当前仓库使用 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` `2.1.4`。此前 suggestions 清单中的项已在上游落地。

## 待上游改进

| 优先级 | 缺口 | 详见 |
| ------ | ---- | ---- |
| P1 | Calendar 单元格事件插槽 | [需求 1.1](tigercat-upstream-requirements.md#11-calendar-单元格事件插槽--p1) |
| P1 | Text 可复制 | [需求 1.2](tigercat-upstream-requirements.md#12-text-可复制--p1) |
| P1 | 滚动祖先自动探测 | [需求 2.1](tigercat-upstream-requirements.md#21-滚动祖先自动探测--p1) |
| P1 | Icon 覆盖面 | [需求 4.3](tigercat-upstream-requirements.md#43-icon-覆盖面--p1) |
| P2 | Code 语法高亮 | [需求 1.3](tigercat-upstream-requirements.md#13-code-语法高亮--p2) |
| P2 | 内置全屏控件 | [需求 4.1](tigercat-upstream-requirements.md#41-内置全屏控件--p2) |
| P2 | Menu 折叠态搜索 | [需求 4.2](tigercat-upstream-requirements.md#42-menu-搜索在折叠态--p2) |
| P2 | 独立 Drag 组件 | [需求 5.1](tigercat-upstream-requirements.md#51-独立-drag-组件--p2) |
| P2 | 编辑器可插拔 engine | [需求 5.2](tigercat-upstream-requirements.md#52-编辑器可插拔-engine--p2) |

*新增缺口先写需求文档，再把开放项同步到本表；落地后从本表删除。*
