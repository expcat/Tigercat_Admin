# Tigercat UI 上游修改建议

仅记录**当前仍开放**的上游改进指针。完整场景映射、对标、优先级和建议 API 以 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md) 为单一事实源，本文不复写细节。

已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## 当前状态

当前仓库目标包版本 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` `3.0.0-preview.7`。

## 待上游改进

- **preview.7 运行时缺陷**：React OverlayPortal 注册时机与定位重试、双端 WorkflowActionBar 确认触发器尺寸、Vue Spotlight 挂载后聚焦，共四项，当前由根 `patches/` 修复。上游发版修复后移除补丁。见 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md)「运行时缺陷」。
- **Tabs 溢出菜单文案进 locale**：`navLabels.moreTabs` 目前由 Admin 直接改写。同上节。

schema 表单、人机验证码、图表基元精细联动按需求文档明确推迟，不在开放项。

*新增缺口先写需求文档，再把开放项同步到本表；落地后从本表删除。*
