# 上游组件需求文档

本文档用于记录在开发过程中发现的 `@expcat/tigercat-vue` 和 `@expcat/tigercat-react` 组件库中不满足需求、无法实现的功能，或需要新增的组件需求。

## 2026-05-28 组件复核快照

基于 Tigercat 1.2.0 的首轮代码复核与双端生产构建验证，以下历史关注组件已确认可在当前仓库正常接入，不再按“缺失能力”登记为上游需求。

| 组件名称 | Vue | React | 当前结论 | 验证方式 |
| :------- | :-- | :---- | :------- | :------- |
| Layout | 已接入 | 已接入 | 可用于后台主布局 | 源码导入 + `pnpm --filter tigercat-admin-react build` + `pnpm --filter tigercat-admin-vue build` |
| Sidebar | 已接入 | 已接入 | 可用于后台侧栏 | 源码导入 + `pnpm --filter tigercat-admin-react build` + `pnpm --filter tigercat-admin-vue build` |
| SubMenu | 已接入 | 已接入 | 可用于权限菜单分组 | 源码导入 + `pnpm --filter tigercat-admin-react build` + `pnpm --filter tigercat-admin-vue build` |
| InputNumber | 已接入 | 已接入 | 可用于系统设置数值输入 | 源码导入 + `pnpm --filter tigercat-admin-react build` + `pnpm --filter tigercat-admin-vue build` |

本次复核同时发现：若在子项目目录单独维护安装状态，可能出现实际 node_modules 版本落后于根 workspace lockfile 的情况。当前以仓库根目录的 `pnpm-lock.yaml` 为准进行安装与验证。

当前未发现需要因上述 4 个组件继续向上游登记的新缺口；后续若在交互、API 一致性或可访问性方面出现问题，再补充到下方需求列表。

## 📋 需求列表

| 组件名称 | 平台 (Vue/React) | 需求描述 | 优先级 | 状态 |
| :------- | :--------------- | :------- | :----- | :--- |

## 💡 说明

- 请在开发前端功能时，优先使用 Tigercat UI 组件。
- 如果现有组件无法满足特定业务场景，请详细描述所需的参数、事件或交互特性。
- 尽量避免在本项目中编写复杂的自定义样式来规避组件限制，应通过此文档推动上游改进。
