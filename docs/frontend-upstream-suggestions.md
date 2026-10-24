# Tigercat UI 上游修改建议

仅记录**当前仍开放**的上游改进指针。完整场景映射、对标、优先级和建议 API 以 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md) 为单一事实源，本文不复写细节。

已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## 当前状态

发布依赖清单与真实安装均为正式 npm `3.0.0-rc.3`，临时覆盖已移除，来源及完整静态 E2E 158/158 结果见 [rc.3 接入与验收](frontend-rc3-validation.md)。ADMIN-02 的 Upload、Funnel、FileManager、WorkflowActionBar 和 Tour 根因修复均已通过安装包消费与图审闭合，Tour 手机几何 UP07 已在 round-06 及正式包专项复验通过。下表仅保留现有业务组合之外的能力指针。

## 待上游改进

| 增强 | 状态 | 需求指针 |
| ---- | ---- | -------- |
| 通知铃铛组合扩展 | 官方组件暂不能承接单项 toast、批量已读和查看全部，保留本地薄组合 | [需求 2.3](tigercat-upstream-requirements.md#notification-bell-actions) |
| 通知 toast 整条点击 | rc.2 顶层 `onClick` 只生成兼容按钮，Admin 保留单个 `actions` 查看动作 | [需求 2.4](tigercat-upstream-requirements.md#notification-toast-click) |
| Cron 中文、范围摘要与草稿校验 | rc.2 摘要仍为英文且展开范围；非法数字草稿未进入组件校验，Admin 提交前已防护 | [需求 2.2](tigercat-upstream-requirements.md#cron-summary) |

SchemaForm 高级能力、人机验证码、图表基元精细联动仍推迟；不把已存在的 SchemaForm 渲染器列为缺口。

*新增缺口先写需求文档，再把开放项同步到本表；落地后从本表删除。*
