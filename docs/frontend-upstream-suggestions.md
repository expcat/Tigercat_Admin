# Tigercat UI 上游修改建议

仅记录**当前仍开放**的上游改进指针。完整场景映射、对标、优先级和建议 API 以 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md) 为单一事实源，本文不复写细节。

已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## 当前状态

当前仓库包版本 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` `3.0.0-preview.9`。

## 待上游改进

本轮已复现的组件回归统一由 [修复需求与发布验收](visual-review/2026-10-04/tigercat-fix-request.md) 跟踪，状态和证据见 [视觉 Review](frontend-visual-review.md)，不再维护重复候选表。

| 增强 | 状态 | 需求指针 |
| ---- | ---- | -------- |
| Cron 中文与范围摘要 | 后续增强，显示溢出已修复 | [需求 2.2](tigercat-upstream-requirements.md#cron-summary) |

SchemaForm 高级能力、人机验证码、图表基元精细联动仍推迟；不把已存在的 SchemaForm 渲染器列为缺口。

*新增缺口先写需求文档，再把开放项同步到本表；落地后从本表删除。*
