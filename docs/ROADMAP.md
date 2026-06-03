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

### 前端静态演示部署系列

目标：使 React 与 Vue 前端可以脱离 API、数据库、Redis 和 Aspire 编排，独立构建并部署到静态空间，用于产品功能展示、组件交互预览和轻量演示。

范围：

- 提供前端演示模式，API 请求在前端侧使用模拟数据响应，不访问真实后端服务。
- Mock API 的参数、响应结构和示例数据应尽量来自同一份共享内容，并在构建时分别生成 React / Vue 可用的 mock 返回，避免双端重复维护。
- 模拟登录、菜单、权限、用户、角色、设置、通知、任务、文件和媒体等核心展示数据。
- 保持 React 与 Vue 双端页面结构、路由、交互状态和演示数据语义一致。
- 支持静态空间刷新深链页面，避免演示环境因 history fallback 或 base path 配置缺失而 404。
- 演示模式仅用于展示，不进行真实数据库写入、文件持久化、后台任务执行或审计落库。
- 演示环境应在界面状态、配置命名和构建命令上与真实联调环境清晰区分。

验收：

- React / Vue 均可在未启动 API、数据库和 Redis 的情况下完成生产构建并本地预览。
- 主要管理页面在演示模式下无阻塞性空白、未捕获请求错误或登录跳转死循环。
- 常见写操作在前端内给出可见反馈，并以会话级或内存级模拟状态呈现，不承诺持久保存。
- 静态部署产物可直接上传到对象存储、静态站点平台或 Nginx 静态目录进行展示。
- Roadmap 完成后，部署细节再沉淀到 [deployment.md](deployment.md)，API 约定变化再同步 [api.md](api.md)。

## 近期执行队列

1. 设计演示模式开关：约定环境变量、构建命令、运行时标识和双端一致的启停方式。
2. 梳理 API 调用边界：列出 React / Vue 现有请求入口，明确哪些接口需要 mock、哪些页面可以复用静态配置。
3. 建立共享模拟数据与契约来源：优先维护一份公共参数、响应结构和示例数据，再由构建流程分别产出 React / Vue mock API 所需内容。
4. 接入请求拦截或 mock adapter：在演示模式下拦截 API 请求并返回由共享内容生成的模拟响应，默认联调模式仍访问真实 API。
5. 完善演示写操作体验：为新增、编辑、删除、上传、状态切换等操作提供前端内反馈和临时状态更新。
6. 补齐静态部署配置：处理 base path、路由 fallback、资源路径和环境变量样例，确保产物适配常见静态空间。
7. 增加演示回归门禁：分别验证 React / Vue 演示构建、静态预览、登录流程、核心列表页和关键表单交互。
8. 沉淀部署说明：实现稳定后再更新部署文档，记录演示模式用途、限制、构建命令和静态站点发布方式。

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
