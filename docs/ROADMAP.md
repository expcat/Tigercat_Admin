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

当前暂无新的已确认里程碑。下一阶段计划应在明确业务目标、验收范围和验证门禁后补充到本文。

## 近期执行队列

暂无待执行队列。新增计划时应保持单一优先级来源，并同步对应专题文档。

## 验证门禁

| 改动类型            | 最小验证                                                      |
| ------------------- | ------------------------------------------------------------- |
| Roadmap / docs only | 检查链接、状态与当前代码一致；确认无重复 Roadmap 类文档       |
| React 前端改动      | `pnpm --filter tigercat-admin-react build`                    |
| Vue 前端改动        | `pnpm --filter tigercat-admin-vue build`                      |
| 双端前端改动        | `pnpm build`                                                  |
| API 改动            | `dotnet test Tigercat.Admin.sln`，并同步更新 [api.md](api.md) |
| 核心流程改动        | 对应补充或更新 `pnpm e2e:react` / `pnpm e2e:vue` 覆盖         |
| 数据库或部署改动    | 同步更新 [database.md](database.md) 或部署说明，并跑后端测试  |
| 组件能力复核或缺口  | 记录真实导入、构建结果、双端一致性；必要时更新上游需求文档    |

## 维护规则

- 本文不保留已完成清单；完成后的计划项应删除或沉淀到对应专题文档。
- 新增计划应写清目标、范围和验证方式，避免只写宽泛方向。
- 若新增独立专题文档，应说明它不是 Roadmap 的替代入口，并在本文保留唯一优先级来源。
- 计划涉及 API、数据库、上游组件诉求时，必须同步更新对应专题文档。
