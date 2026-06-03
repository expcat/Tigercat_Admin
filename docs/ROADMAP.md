# Tigercat Admin 后续路线图

> 项目定位：以 .NET 10 Aspire + Tigercat UI 为基础，持续验证 Vue 3 与 React 双端后台管理体验，并把真实业务场景中的组件诉求反馈给上游。

最后更新：2026-06-03

---

## 文档边界

- 本文只维护尚未完成的后续计划、执行优先级和验证门禁。
- API 细节以 [api.md](api.md) 为准。
- 数据库 provider、连接串和回归方式以 [database.md](database.md) 为准。
- 发布、生产配置、CI 和部署策略以 [deployment.md](deployment.md) 为准。
- 组件缺口与上游诉求以 [upstream-requirements.md](upstream-requirements.md) 为准。
- 双端页面级组件使用盘点以 [component-inventory.md](component-inventory.md) 为准。
- E2E 回归规划已合并到本文，不再单独维护独立 Roadmap 类文档。
- Tigercat UI 最新使用方式以官方文档为准：[Vue 3](https://expcat.github.io/Tigercat/vue/) / [React](https://expcat.github.io/Tigercat/react/) / [迁移指南](https://raw.githubusercontent.com/expcat/Tigercat/main/docs/MIGRATION.md)。

## 规划基线

当前代码库已经具备后端 API、React / Vue 双端后台、Tigercat 1.2.16 组件接入、SQLite / PostgreSQL provider、Redis 缓存与事件通道、文件与媒体资源能力、配置化认证安全策略、审计敏感字段清理、Playwright 工作区基座、生产配置样例、部署说明、健康检查依赖明细和最小 CI 门禁。后续计划不再重复记录历史完成项，只围绕可继续推进的能力建设展开。

## 推进原则

1. 双端一致：新增页面、交互、状态变量和工具函数应在 React 与 Vue 中保持语义一致。
2. 后端优先定契约：涉及持久化、权限、审计、任务或文件能力时，先明确 API 与数据模型，再接前端。
3. 组件库优先：优先使用 Tigercat UI 原生能力；确认为上游缺口时，记录到 [upstream-requirements.md](upstream-requirements.md)。
4. 回归先行：核心流程扩展前先补自动化用例或明确手工验证门禁，避免双端行为漂移。
5. 文档瘦身：Roadmap 只保留未来计划；完成后的条目应从本文移除，必要经验沉淀到对应专题文档。

## 后续路线

### P2 显示与交互修复

目标：优先修复高频页面中的真实显示 bug 和双端交互漂移。

- 优先处理移动端溢出、弹层遮挡、表格/菜单 detach、暗色模式错色、焦点丢失、按钮不可点击和文本换行异常。
- 重点检查 `rounded-xl` / `rounded-2xl`、渐变背景、硬编码 `slate` / `blue` 色值、手写按钮、固定宽度菜单、移动端 sidebar 覆盖层和统计卡片。
- Vue 按 Tigercat 约定使用 `v-model`、`@update:*`、kebab-case events；React 使用 controlled props 与 `onXxx` callbacks。
- 弹层统一使用 `open` / `v-model:open`，不新增 `visible` 或 `onVisibleChange` 写法。
- 样式优先使用 Tigercat token、组件 props 和已有页面模式；只有组件无法表达时才保留局部 Tailwind。
- 成功标准：桌面与移动视口下无文本溢出、遮挡、不可点击、焦点丢失或暗色模式明显错色；双端同一业务页面的组件语义一致，差异仅限框架语法。

### P3 组件库化与性能优化

目标：在 P2 修复稳定后，收敛重复 UI，并控制重组件加载成本。

- 将重复手写统计块、操作区、提示区、筛选区优先收敛为 Tigercat 原生组件组合或轻量共享页面片段。
- 按 Tigercat performance 文档评估图表、文件、任务面板、弹层和编辑类重组件是否需要路由级懒加载或子路径导入。
- 对涉及组件库能力边界的场景，记录真实导入、构建结果、双端一致性和上游反馈结论。
- 成功标准：重复手写 UI 有明确减少，重组件加载策略有构建结果支撑，不引入与业务无关的抽象。

### 实施任务清单

1. 显示 bug 修复：按登录/注册、主布局、Users/Roles、Files/Tasks/Notifications、Home/AuditLogs/Settings 的顺序处理高频风险。
2. Tigercat 规范对齐：统一双端绑定、事件、弹层状态、主题 token 和组件 props 使用方式。
3. 回归与上游反馈：补充或更新 Playwright 覆盖；确认组件库缺口后同步 [upstream-requirements.md](upstream-requirements.md)。

### 公共接口与文档影响

- 本阶段默认不新增后端 API、数据库 schema 或业务数据契约。
- 前端组件优化若发现 API、数据库或部署前提变化，必须先更新对应专题文档，再进入实现。
- 上游组件缺口只记录确认后的组件 API、交互或可访问性问题，不记录普通业务样式调整。

## 验证门禁

| 改动类型            | 最小验证                                                      |
| ------------------- | ------------------------------------------------------------- |
| Roadmap / docs only | 检查链接、状态与当前代码一致；确认无重复 Roadmap 类文档       |
| React 前端改动      | `pnpm --filter tigercat-admin-react build`                    |
| Vue 前端改动        | `pnpm --filter tigercat-admin-vue build`                      |
| 双端前端改动        | `pnpm build`                                                  |
| 双端组件优化        | `pnpm build:frontend`；涉及主流程时补跑 `pnpm e2e:react` / `pnpm e2e:vue` |
| 响应式或显示 bug    | 桌面与移动视口截图或 Playwright 断言；确认无溢出、遮挡和不可点击 |
| 弹层/表单/菜单改动  | 键盘路径、焦点恢复、关闭行为和提交/取消路径检查                |
| 拖拽/通知/图表改动  | 覆盖核心交互；确认状态提示、键盘替代路径或记录明确限制         |
| 静态演示改动        | `pnpm build:demo`，必要时补跑 `pnpm e2e:demo`                 |
| API 改动            | `dotnet test Tigercat.Admin.sln`，并同步更新 [api.md](api.md) |
| 核心流程改动        | 对应补充或更新 `pnpm e2e:react` / `pnpm e2e:vue` 覆盖         |
| 数据库或部署改动    | 同步更新 [database.md](database.md) 或部署说明，并跑后端测试  |
| 组件能力复核或缺口  | 记录真实导入、构建结果、双端一致性；必要时更新上游需求文档    |

## 维护规则

- 本文不保留已完成清单；完成后的计划项应删除或沉淀到对应专题文档。
- 新增计划应写清目标、范围和验证方式，避免只写宽泛方向。
- 若新增独立专题文档，应说明它不是 Roadmap 的替代入口，并在本文保留唯一优先级来源。
- 计划涉及 API、数据库、上游组件诉求时，必须同步更新对应专题文档。
