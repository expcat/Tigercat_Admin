# 上游组件需求文档

本文档用于记录 `@expcat/tigercat-vue` 和 `@expcat/tigercat-react` 仍需上游跟进的需求与缺陷。已修复、已接入或已确认属于现有 API 使用约定的问题，不再保留在此文档中。

## 📋 待跟进清单

| 类型 | 组件名称 | 平台 | 问题/需求描述 | 当前影响 | 优先级 | 状态 |
| :--- | :------- | :--- | :------------ | :------- | :----- | :--- |
| 交互增强 | Drawer | Vue / React | 移动端左侧抽屉需要支持“遮罩保持可点击关闭，同时面板按固定宽度滑入/滑出并在离场动画完成后卸载”的内置能力。建议提供类似 `preserveOnClose` / `afterLeave` 可控卸载、`mobileFullscreen={false}` 或 `fullscreenOnMobile` 开关、`panelClassName` / `panelStyle` 对称 API，避免应用层拆分 `rendered` 与 `open` 状态。 | 当前框架页为实现窄屏侧栏动画，需要在 Vue / React 两端自行维护挂载态、展开态、关闭计时、pending `requestAnimationFrame` 取消和焦点恢复；逻辑较重且容易产生竞态。 | P2 | 待上游评估 |
| 交互增强 | Sidebar | Vue / React | Sidebar 已支持 `collapsed`、`width`、`collapsedWidth` 以及宽度 transition；建议补充官方“后台 Shell 侧栏”示例，覆盖 Logo 文案、底部折叠按钮文案在收缩时的平滑淡出/位移动画，并明确推荐 class/token 写法。 | 当前项目需要自行在 `MainSidebar` 中维护文字 `max-width + opacity + transform` 动画；虽较轻量，但适合沉淀为组件示例或 preset，减少双端重复实现。 | P3 | 待上游评估 |
| 缺陷/交互增强 | Menu | Vue / React | 1. 当 Menu 折叠（`collapsed={true}`）时，其基类仍保留 `min-w-[200px]`，导致在收缩时菜单宽度无法缩减至 64px。<br>2. 在 `vertical` 模式下折缩时，SubMenu hover 弹出的二级菜单悬浮窗绝对定位在侧栏容器内部，导致容器被撑开出现横向滚动条。建议上游弹出层支持 Portal / body 挂载避免被父容器 overflow 裁剪。 | 当前项目：<br>1. 通过在 `Menu` 组件上添加 `!min-w-0` 规避 min-width 问题。<br>2. 统一将 `mode` 变更为 `inline` 以避免 hover 悬浮弹窗并消除滚动条，点击时向下折叠展开，并动态将 `inline-indent` 在收起时设为 0 以保持图标居中。 | P2 | 待上游评估 |

## 最近复核

- 2026-06-05 P4：框架页窄屏侧栏改为使用 Drawer 自带遮罩与 `maskClosable` 后，发现 Drawer 在 `open=false` 时会立即隐藏根节点，导致离场动画不可见；项目临时通过应用层拆分挂载态与展开态实现滑入/滑出，并补充移动端动画 E2E。该能力适合上游 Drawer API 支持，以便后续删除应用层状态补丁。
- 2026-06-05 P9：复核 Tigercat UI 1.2.16 的迁移说明、React / Vue API 映射、重组件子路径导入 and 双端构建体积后，未确认新的组件 API、交互、可访问性或性能缺口；无需新增上游待跟进项。
- 2026-06-05 P10：复核发现 Menu 组件在收缩状态下的样式与交互问题（min-w 冲突、hover 二级菜单导致容器出现横向滚动条）。已在 MainSidebar.vue/tsx 中统一指定 `mode="inline"`，并在折叠时将 `inline-indent` 设为 0、强制添加 `!min-w-0` 类，以实现点击向下展开、仅显示居中图标且无滚动条的体验，同时更新了上游需求列表。

## 💡 说明

- 请在开发前端功能时，优先使用 Tigercat UI 组件。
- 如新增需求或缺陷，请补充具体业务场景、期望行为、影响范围和临时规避方案。
- 尽量避免在本项目中编写复杂的自定义样式或交互逻辑来规避组件限制，应优先通过此文档推动上游改进。
