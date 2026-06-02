# Tigercat Admin 后续路线图

> 项目定位：以 .NET 10 Aspire + Tigercat UI 为基础，持续验证 Vue 3 与 React 双端后台管理体验，并把真实业务场景中的组件诉求反馈给上游。

最后更新：2026-06-02

---

## 文档边界

- 本文只维护尚未完成的后续计划、执行优先级和验证门禁。
- API 细节以 [api.md](api.md) 为准。
- 数据库 provider、连接串和回归方式以 [database.md](database.md) 为准。
- 组件缺口与上游诉求以 [upstream-requirements.md](upstream-requirements.md) 为准。
- E2E 回归规划已合并到本文，不再单独维护独立 Roadmap 类文档。
- Tigercat UI 最新使用方式以官方文档为准：[Vue 3](https://expcat.github.io/Tigercat/vue/) / [React](https://expcat.github.io/Tigercat/react/) / [迁移指南](https://raw.githubusercontent.com/expcat/Tigercat/main/docs/MIGRATION.md)。

## 规划基线

当前代码库已经具备后端 API、React / Vue 双端后台、Tigercat 1.2.16 组件接入、SQLite / PostgreSQL provider、Redis 缓存与事件通道、文件与媒体资源能力，以及 Playwright 工作区基座。后续计划不再重复记录历史完成项，只围绕可继续推进的能力建设展开。

## 推进原则

1. 双端一致：新增页面、交互、状态变量和工具函数应在 React 与 Vue 中保持语义一致。
2. 后端优先定契约：涉及持久化、权限、审计、任务或文件能力时，先明确 API 与数据模型，再接前端。
3. 组件库优先：优先使用 Tigercat UI 原生能力；确认为上游缺口时，记录到 [upstream-requirements.md](upstream-requirements.md)。
4. 回归先行：核心流程扩展前先补自动化用例或明确手工验证门禁，避免双端行为漂移。
5. 文档瘦身：Roadmap 只保留未来计划；完成后的条目应从本文移除，必要经验沉淀到对应专题文档。

## 后续路线

### Milestone H：运维工作流后端化

目标：让审计日志、通知中心和任务面板从演示型页面变成可持续使用的运维工作流。

范围：

- 审计日志增加分页、筛选、详情查看、导出和保留策略配置。
- 通知中心接入后端数据源，支持未读状态持久化、按类型分组和批量已读。
- 任务面板接入后端任务模型，支持任务创建、状态流转、负责人、截止时间和审计事件。
- 将 Redis Streams 事件消费与 API 查询边界整理清楚，避免页面直接依赖临时本地状态。
- 增加失败重试、空状态和权限不足状态的双端一致体验。

验证：

- `dotnet test Tigercat.Admin.sln`
- `pnpm build`
- 针对审计、通知、任务各补一条关键 E2E 或手工回归脚本。

### Milestone I：权限、安全与会话体验

目标：降低后台管理的权限误配风险，并补齐长期使用时的会话与安全体验。

范围：

- 明确权限种子数据版本策略，避免新增权限后旧数据库缺项。
- 为系统角色、危险操作和批量操作补充后端测试与前端权限守卫回归。
- 完善会话过期提示、重新登录后返回原目标页、跨标签页退出同步。
- 增加密码策略、修改密码错误提示和登录失败节流的配置化能力。
- 梳理审计事件中的敏感字段，避免记录密码、令牌或不必要的个人信息。

验证：

- `dotnet test Tigercat.Admin.sln`
- `pnpm e2e:react`
- `pnpm e2e:vue`

### Milestone J：发布与生产化基线

目标：把项目从本地验证样板推进到可部署、可配置、可观测的后台基线。

范围：

- 补充生产环境配置样例：PostgreSQL、Redis、前端 API 地址、CORS、日志级别和密钥来源。
- 增加 Docker 或部署文档，明确 Aspire、本地开发和独立部署的差异。
- 完善健康检查：数据库、Redis、事件通道和关键配置缺失的可诊断输出。
- 建立最小 CI 门禁：后端测试、双端构建、E2E 烟测和 Markdown 链接检查。
- 明确数据库迁移、种子数据和回滚策略。

验证：

- 干净环境按文档启动成功。
- `dotnet test Tigercat.Admin.sln`
- `pnpm build`
- `pnpm e2e`

## 近期执行队列

1. 将任务面板从本地看板状态迁移到后端任务模型。
2. 审计日志增加分页、筛选、详情查看、导出和保留策略配置。
3. 通知中心接入后端数据源并持久化未读状态。

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
