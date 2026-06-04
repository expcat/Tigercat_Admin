# Tigercat Admin 后续路线图

> 项目定位：以 .NET 10 Aspire + Tigercat UI 为基础，持续验证 Vue 3 与 React 双端后台管理体验，并把真实业务场景中的组件诉求反馈给上游。

最后更新：2026-06-04

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

当前代码库已经具备后端 API、React / Vue 双端后台、Tigercat 1.2.16 组件接入、SQLite / PostgreSQL provider、Redis 缓存与事件通道、文件与媒体资源能力、配置化认证安全策略、审计敏感字段清理、双端共享页面片段、重组件子路径导入验证、Playwright 工作区基座、生产配置样例、部署说明、健康检查依赖明细和最小 CI 门禁。P1-P3 的组件盘点、显示门禁、共享页面片段和子路径导入复核已经沉淀到 [component-inventory.md](component-inventory.md)。后续计划不再重复记录历史完成项，只围绕可继续推进的能力建设展开。

## 推进原则

1. 双端一致：新增页面、交互、状态变量和工具函数应在 React 与 Vue 中保持语义一致。
2. 后端优先定契约：涉及持久化、权限、审计、任务或文件能力时，先明确 API 与数据模型，再接前端。
3. 组件库优先：优先使用 Tigercat UI 原生能力；确认为上游缺口时，记录到 [upstream-requirements.md](upstream-requirements.md)。
4. 回归先行：核心流程扩展前先补自动化用例或明确手工验证门禁，避免双端行为漂移。
5. 文档瘦身：Roadmap 只保留未来计划；完成后的条目应从本文移除，必要经验沉淀到对应专题文档。

## 后续优先级总览

| 优先级 | 主题 | 目标 | 主要验证 |
| ------ | ---- | ---- | -------- |
| P4 | 可访问性与响应式硬化 | 把已识别的表格、弹层、菜单、移动端布局风险收口为可重复验证的质量门禁 | `pnpm build:frontend`、`pnpm e2e:react`、`pnpm e2e:vue`、桌面/移动截图与键盘路径复核 |
| P5 | 数据工作台增强 | 提升用户、角色、文件、审计等高频数据页的筛选、批量操作、导出和状态保留体验 | 双端 E2E 主流程、导出 smoke、权限组合回归 |
| P6 | 运维工作流闭环 | 将通知、任务、审计和设置从独立页面推进为可追踪、可联动、可治理的后台工作流 | API 测试、运维 E2E、Redis/数据库健康检查 |
| P7 | 媒体与品牌资源生产化 | 扩展媒体存储、引用校验、Logo/头像生命周期和生产资源配置 | 后端媒体测试、双端上传/删除 smoke、部署文档复核 |
| P8 | 发布、部署与观测增强 | 固化容器化、迁移 SQL、发布门禁、运行时观测和回滚演练 | `dotnet test Tigercat.Admin.sln`、`pnpm build`、`pnpm e2e`、部署 smoke |
| P9 | Tigercat UI 升级与上游反馈循环 | 建立组件库版本升级、API 迁移、性能体积和上游缺口登记的固定流程 | 双端构建、组件盘点更新、上游需求文档更新 |

## P4：可访问性与响应式硬化

目标：基于 P2/P3 已暴露的显示风险，补齐后台高频页面在移动端、键盘操作、焦点恢复、暗色模式和弹层交互上的可验证质量线。

范围：

- Users / Roles：复核 `DataTableWithToolbar` 固定列、列开关、批量操作区、角色多选下拉、权限树弹层和行操作菜单 detach；确保移动端不出现不可达操作。
- Files / Settings：复核上传、删除确认、类型筛选、Logo 预览、保存确认弹层和恢复默认值路径；移动端按钮区允许换行但不能遮挡内容。
- MainLayout / MainHeader / MainSidebar：复核 375px 移动视口下 sidebar 打开/关闭、菜单点击后关闭、面包屑溢出、用户菜单定位和内容滚动。
- 全局键盘路径：按 Tigercat accessibility 基线覆盖 `Tab`、`Shift+Tab`、`Enter`、`Space`、`Esc`、方向键和焦点恢复；高级拖拽组件若暂无键盘替代路径，需在文档中记录限制。
- 视觉 token：减少页面级硬编码色、渐变和过大圆角；优先使用 Tigercat token 与组件原生 variant。

交付物：

- 更新或新增 `e2e/display-p2.spec.ts` 中的响应式、弹层和键盘断言。
- 必要时把手工复核结果沉淀到 [component-inventory.md](component-inventory.md)。
- 如确认属于组件 API 或可访问性缺口，更新 [upstream-requirements.md](upstream-requirements.md)。

验收门禁：

- `pnpm build:frontend`
- `pnpm e2e:react`
- `pnpm e2e:vue`
- 至少覆盖桌面、375px 移动视口和暗色模式截图或等价 Playwright 断言。

## P5：数据工作台增强

目标：把现有用户、角色、文件、审计页面从“可用 CRUD”推进到更接近真实后台的高频操作工作台。

范围：

- 表格状态保留：分页、排序、搜索、筛选、列显示、选中状态和返回页面后的查询状态保持，React / Vue 使用一致的状态命名和工具函数。
- 批量操作：用户批量删除已具备基础能力，后续优先补批量禁用/启用、角色批量导出、文件批量删除和审计筛选导出前确认。
- 导出体验：统一导出字段选择、格式选择、空结果提示、权限不足提示和大数据量上限提示；必要时将同步下载升级为后端导出任务。
- 权限组合：有限权限用户在列表、行操作、批量操作、导出、设置保存中的可见性和 API 403 表现保持一致。
- 空态与加载态：使用 Tigercat `Empty`、`Skeleton`、`Loading`、`Result` 等原生能力替代页面级临时提示。

交付物：

- 双端共享业务类型继续沉淀到 `utils/types.ts`，查询和导出工具沉淀到对应 `utils/` 模块。
- 涉及 API 契约变化时同步 [api.md](api.md)。
- 涉及组件行为缺口时同步 [upstream-requirements.md](upstream-requirements.md)。

验收门禁：

- `dotnet test Tigercat.Admin.sln`（涉及 API 时）
- `pnpm build:frontend`
- `pnpm e2e:react --grep 用户管理` / `pnpm e2e:vue --grep 用户管理`
- `pnpm e2e:react --grep 角色` / `pnpm e2e:vue --grep 角色`
- 文件、审计和导出路径补充 smoke 或专项 E2E。

## P6：运维工作流闭环

目标：把通知中心、任务面板、审计日志和系统设置串成真实可用的后台运营闭环，而不是彼此独立的展示页。

范围：

- 事件到通知：将关键审计事件、任务状态变更、媒体删除失败、设置保存等事件转化为通知，并保留 `groupKey`、`linkUrl` 和元数据。
- 通知到行动：通知点击跳转到相关用户、角色、文件、任务或审计详情；无权限时给出明确提示。
- 任务治理：补任务详情、负责人筛选、截止时间筛选、阻塞原因、完成确认和任务变更审计。
- 审计治理：保留策略从配置项推进到可执行清理流程，确保敏感字段清理覆盖导出与详情。
- 设置联动：认证安全策略、审计保留天数、站点品牌设置变更后触发审计与通知。

交付物：

- 后端补齐事件、通知、任务和审计之间的契约与测试。
- 双端补齐通知跳转、任务详情和审计详情入口。
- 同步更新 [api.md](api.md)、[database.md](database.md) 和 [deployment.md](deployment.md) 中相关说明。

验收门禁：

- `dotnet test Tigercat.Admin.sln`
- `pnpm build:frontend`
- `pnpm e2e:react --grep 运维` / `pnpm e2e:vue --grep 运维`
- Redis 不可用、权限不足、空数据和过期会话场景 smoke。

## P7：媒体与品牌资源生产化

目标：让媒体资源能力从本地文件管理扩展到可生产部署的资源生命周期管理。

范围：

- 存储 provider：在 `IMediaStorageProvider` 之上扩展对象存储或可替换 provider 配置，保留本地 provider 作为开发默认值。
- 引用完整性：删除媒体前检查用户头像、站点 Logo、设置引用和后续业务引用；阻止误删或提供强制删除审计。
- 资源治理：补上传大小、MIME、扩展名、图片尺寸、重复文件、孤儿文件清理和 publicId 访问策略。
- 双端体验：文件管理页补预览、复制 URL、引用来源、删除影响提示和上传失败细分提示。
- 生产配置：补充静态资源域名、反向代理缓存、备份恢复和对象存储密钥注入说明。

交付物：

- API、数据模型和媒体测试补齐。
- 双端文件管理和 Logo/头像路径保持一致。
- 同步更新 [api.md](api.md)、[database.md](database.md) 和 [deployment.md](deployment.md)。

验收门禁：

- `dotnet test Tigercat.Admin.sln`
- `pnpm build:frontend`
- `pnpm e2e:react --grep 运维` / `pnpm e2e:vue --grep 运维`
- 上传、预览、引用校验、删除和 404 内容读取 smoke。

## P8：发布、部署与观测增强

目标：把当前发布说明推进为可重复执行的生产交付基线，覆盖容器、迁移、配置、观测和回滚。

范围：

- 容器化：补 API、React、Vue 的生产 Dockerfile 或等价发布脚本，明确镜像构建上下文、静态资源服务和健康检查。
- 数据库迁移：为 PostgreSQL 生产发布补迁移 SQL 生成、评审、执行和回滚流程，避免只依赖启动时建表。
- CI 门禁：在最小 CI 基础上分层加入后端测试、前端构建、静态演示、E2E、链接检查和产物上传。
- 观测：补结构化日志、健康检查明细、Redis 事件通道状态、关键业务事件指标和部署 smoke 清单。
- 配置安全：补生产密钥注入、CORS 白名单、Redis TLS、数据库 TLS、默认管理员密码轮换和会话策略检查。

交付物：

- 更新 [deployment.md](deployment.md)，必要时新增脚本或 CI workflow。
- 保持 `README.md`、`DEVELOPMENT.md`、`AGENT.md` 中入口命令一致。
- 若新增部署模式，不把它做成新的 Roadmap 入口，只在本文保留优先级。

验收门禁：

- `dotnet test Tigercat.Admin.sln`
- `pnpm build`
- `pnpm build:demo`
- `pnpm e2e:demo`
- `pnpm e2e`
- `pnpm run check:links`

## P9：Tigercat UI 升级与上游反馈循环

目标：建立组件库升级、性能复核和上游反馈的固定节奏，避免双端实现长期停留在一次性接入状态。

范围：

- 版本升级：每次升级 `@expcat/tigercat-core`、`@expcat/tigercat-vue`、`@expcat/tigercat-react` 时，先阅读 Tigercat 迁移说明，再统一升级三包版本。
- API 映射：按 Tigercat skill 的 Vue / React 映射复核 `open`、`modelValue` / `value`、`@update:*` / `on*Change`、`class` / `className` 等差异。
- 性能复核：保持普通组件包级导入、重组件子路径导入；图表、TaskBoard、NotificationCenter、FileManager、ActivityFeed、Timeline、ColorPicker、Upload、CropUpload 等继续按 route 或 interaction 边界控制。
- 组件盘点：升级或大规模页面改动后更新 [component-inventory.md](component-inventory.md)，记录真实导入、双端差异、构建体积和显示风险。
- 上游反馈：只有确认属于 Tigercat 组件 API、交互、可访问性或性能能力的问题，才登记到 [upstream-requirements.md](upstream-requirements.md)，并写清复现路径和临时方案。

交付物：

- 依赖升级 PR 或变更记录。
- 组件盘点与上游需求文档同步。
- 必要时补充最小复现或示例页面。

验收门禁：

- `pnpm build:frontend`
- `pnpm e2e:react`
- `pnpm e2e:vue`
- 重点页面 chunk 体积对比和重组件导入路径复核。

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
