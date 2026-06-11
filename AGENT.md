# Agent 项目指南

本文件只约束**维护本仓库**的代码代理：编码、审查、重构或文档整理前，先阅读相关文件，理解当前结构、既有风格和已有实现，再开始修改。如果任务是以本仓库为蓝本在其他目录创建新项目，本文件不适用，请改走 [docs/guide/new-project.md](docs/guide/new-project.md)。

如果当前代理支持 skills 或类似规则集，优先使用 `karpathy-guidelines`。涉及 Tigercat UI 组件、主题、跨框架迁移、属性映射或显示问题时，优先参考 [docs/frontend.md](docs/frontend.md) 和仓库现有实现；涉及 `Table` / `DataTableWithToolbar`、Card 模式或卡片排列时，先读 [docs/frontend.md「表格使用约定」](docs/frontend.md#表格使用约定v1244)。只有缺少信息或需要核对最新 breaking change 时，再查阅 Tigercat 官方文档。

## 权威文档

| 文档 | 用途 |
| ---- | ---- |
| [docs/llm.md](docs/llm.md) | LLM 按需读取入口、任务路由、Skill 使用提示 |
| [README.md](README.md) | 项目入口、快速开始、文档地图 |
| [docs/frontend.md](docs/frontend.md) | 前端架构、Tigercat UI 用法、LLM 生成指南、组件缺口 |
| [docs/api.md](docs/api.md) | API 契约索引；细节分布在 [docs/api](docs/api) |
| [docs/operations.md](docs/operations.md) | 本地开发、数据库、部署、健康检查和 CI |
| [docs/guide/new-project.md](docs/guide/new-project.md) | 创建新项目线：bootstrap 指南（维护本仓库时也需保持其同步） |
| [docs/guide/backend.md](docs/guide/backend.md) | 创建新项目线：后端抽象契约与三种方案 |

## 工作方式

- 先理解问题和现有代码，再修改；不要在上下文不足时凭猜测大改。
- 追求简单、直接、可读的实现，优先解决根因，避免炫技式抽象。
- 只修改与当前任务直接相关的文件；发现无关问题时在总结中说明。
- 不覆盖、不回退用户已有改动；遇到影响任务的未提交改动时，先理解并基于现状继续。
- 优先使用 `rg` / `rg --files` 搜索文件和内容。
- 修改前确认相关实现、调用方、测试和文档位置。
- 使用清晰、可审查的方式编辑文件，避免无关格式化或大范围机械改动。
- 明确区分事实、推断和假设；不要声称未运行的检查已经通过。

## 项目边界

- `Tigercat.Aspire` 负责编排后端、前端和 Redis。
- `Tigercat.Admin.Api` 是 .NET 10 Minimal API 后端。
- `Tigercat.Admin.React` 与 `Tigercat.Admin.Vue` 同时维护，界面、交互逻辑、状态命名和业务行为需保持一致。
- `Tigercat.Admin.MockApi` 支撑前端静态演示模式。

## Skill 使用

- 支持 skills 时，编码、审查、重构和文档整理优先使用 `karpathy-guidelines`。
- 涉及 Tigercat UI、主题、跨框架迁移、组件属性映射或显示问题时，先读 [docs/frontend.md](docs/frontend.md)，再查现有 React / Vue 实现；表格、Card 模式和卡片排列以 [表格使用约定](docs/frontend.md#表格使用约定v1244) 为入口。
- 只有缺少本仓库事实或需要核对最新 breaking change 时，才查 Tigercat 官方文档。
- 使用 Skill 后仍以仓库现有代码、专题文档、已安装或已核验的 Tigercat 类型为事实来源，不新增未经验证的接口或行为。

## 前端规则

- 前端必须使用 TypeScript；React 使用 `.tsx`，Vue 使用 `<script setup lang="ts">`。
- 新增或调整前端页面前，先读 [docs/frontend.md](docs/frontend.md)。
- 优先使用 `@expcat/tigercat-react` / `@expcat/tigercat-vue` 组件和 `@expcat/tigercat-core` 类型。
- 重组件继续使用子路径导入，例如 `@expcat/tigercat-react/TaskBoard` 或 `@expcat/tigercat-vue/TaskBoard`。
- 公共业务类型放在双端各自的 `src/utils/types.ts`，避免页面内重复定义。
- API 请求走 `apiRequest`，认证头走 `getAuthHeaders()`，权限判断走现有 `permission` 工具。
- React 与 Vue 的状态变量、函数名和业务语义保持一致。
- 移动端、暗色模式、弹层、菜单、表格固定列和焦点路径必须按现有 shell 与页面模式处理。

## 后续文档同步

- 新增或修改 API 端点、请求/响应字段、权限、错误码、事件、分页/排序规则时，必须同步更新 [docs/api.md](docs/api.md) 和对应 [docs/api](docs/api) 专题；没有合适专题时新增专题文档。
- 新增或修改前端页面、路由、菜单、权限入口、Tigercat UI 用法、双端映射、组件缺口或页面生成规则时，必须同步更新 [docs/frontend.md](docs/frontend.md)；独立主题可新增 `docs/frontend-*.md`，并在 [docs/llm.md](docs/llm.md) 与 [README.md](README.md) 登记。
- 修改数据库、Redis、媒体存储、部署、CI、健康检查、观测、Docker、发布 smoke 或回滚流程时，必须同步更新 [docs/operations.md](docs/operations.md)；内容过长时拆出专题并在入口文档链接。
- 修改脚手架步骤、依赖版本策略、App Shell 复制清单（页面/组件/工具文件的增删改名）或后端方案时，必须同步更新 [docs/guide/new-project.md](docs/guide/new-project.md) 或 [docs/guide/backend.md](docs/guide/backend.md)；升级 `@expcat/tigercat-*` 版本时更新 new-project.md 的「当前蓝本版本」。
- 新增跨领域能力时，先更新 [docs/llm.md](docs/llm.md) 的按需读取路由，再更新或新增对应专题文档。
- 文档更新优先复用现有专题，避免同一事实在多个文件重复维护；入口文件只写导航和决策规则。

## 验证要求

| 改动类型 | 最小验证 |
| -------- | -------- |
| 文档 only | `pnpm run check:links`；必要时 `rg` 检查旧链接 |
| React 前端 | `pnpm --filter tigercat-admin-react build` |
| Vue 前端 | `pnpm --filter tigercat-admin-vue build` |
| 双端前端 | `pnpm build:frontend` |
| 响应式或显示问题 | 桌面与移动视口截图或 Playwright 断言 |
| 弹层、表单、菜单 | 键盘路径、焦点恢复、关闭和提交/取消路径 |
| API 或数据库 | `dotnet test Tigercat.Admin.sln` |
| 发布或部署链路 | [docs/operations.md](docs/operations.md) 中对应 smoke 和门禁 |

如果验证命令失败，说明失败命令、关键错误和下一步建议。无法运行时说明原因。

## 输出要求

- 简洁说明做了什么、为什么这样做，以及如何验证。
- 对未处理的限制、风险或后续事项要明确说明。
- 不夸大完成范围；不把未运行的检查描述为通过。
