# Agent 项目指南

本文件约束支持 `AGENT.md` 的代码代理在本仓库内的工作方式。开始任何编码、审查或重构任务前，先阅读相关文件，理解当前项目结构、既有风格和已有实现，再开始修改。

如果当前代理支持 skills 或类似的可加载规则集，开始任何编码、审查或重构任务前，请优先使用 `karpathy-guidelines`。涉及 Tigercat UI 组件、主题、跨框架迁移、属性映射或显示问题时，请同时使用 `skill:tigercat`，并按该 skill 的文档路由查阅对应 reference。若代理不支持 skills，则遵循下方的通用工作原则，并优先参考本仓库已有实现与 Tigercat 官方文档。

## 项目结构

```text
Tigercat_Admin/
├── Tigercat.Aspire/              # Aspire 主控项目 (.NET 10)
├── Tigercat.ServiceDefaults/     # Aspire 服务默认配置
├── Tigercat.Admin.Api/           # 后端 API (.NET 10 Minimal API)
├── Tigercat.Admin.Api.Tests/     # 后端测试项目
├── Tigercat.Admin.Vue/           # Vue3 前端项目 (TypeScript)
└── Tigercat.Admin.React/         # React 前端项目 (TypeScript)
```

## 开发环境

- .NET 10 SDK
- Node.js 20.11+
- PNPM 10+
- 前端依赖以仓库根目录的 `pnpm-lock.yaml` 为准，不要在 `Tigercat.Admin.Vue` 或 `Tigercat.Admin.React` 目录单独安装并提交漂移后的 lockfile。

## Agent 工作方式

- 先理解问题和现有代码，再动手修改；不要在上下文不足时凭猜测大改。
- 追求简单、直接、可读的实现，优先解决根因，避免炫技式抽象。
- 让改动尽量小，保持局部性；只在确实能降低复杂度或匹配既有模式时才新增抽象。
- 用可验证的反馈闭环工作：能运行测试、构建或静态检查时就运行，不能运行时说明原因。
- 明确区分事实、推断和假设；遇到不确定点时在总结中说清楚。
- 保持代码易读、易审查、易回滚，避免把无关格式化、重命名或机械改动混进功能变更。
- 优先使用 `rg` / `rg --files` 搜索文件和内容。
- 修改前先确认相关实现、调用方、测试和文档位置。
- 遵循现有命名、目录、格式和抽象层级，避免无关重构。
- 只修改与当前任务直接相关的文件；发现无关问题时，在总结中说明，不顺手改。
- 使用清晰、可审查的方式编辑文件，避免生成无关格式化或大范围机械改动。
- 不要覆盖或回退用户已有改动；如果遇到影响任务的未提交改动，先理解并基于现状继续。
- 不要声称未运行的检查已经通过。

## 项目约定

- 优先在对应子项目内修改与新增代码，避免跨项目耦合。
- 新增功能通常需要同步后端端点与 Vue、React 两套前端实现。
- 添加或修改 API 端点时，必须同步更新 `docs/api.md`。
- 保持 `README.md`、`DEVELOPMENT.md` 与本文件中的项目信息一致。
- 若组件库不满足需求或缺少功能，需在 `docs/upstream-requirements.md` 中详细记录对上游的需求。

## 结构与职责

- `Tigercat.Aspire` 负责编排后端与前端服务，优先通过 Aspire 启动与调试。
- `Tigercat.Admin.Api` 是 .NET 10 Minimal API 后端，提供 `/api/health`、`/api/info` 等基础端点。
- `Tigercat.Admin.Vue` 与 `Tigercat.Admin.React` 同时维护，界面、交互逻辑、状态命名和业务行为需保持一致。

## 前端架构

- 全面使用 TypeScript。
- React 项目使用 `.tsx` 文件。
- Vue 项目使用 `<script setup lang="ts">`。
- 逻辑代码拆分至 `src/utils/`，按功能模块化。
- `request.ts` 负责统一 API 请求封装 `apiRequest`，并维护 `ApiResponse<T>` 类型。
- `auth.ts` 负责认证逻辑，包括 Session 解析与 `getAuthHeaders()`。
- `types.ts` 负责共享业务类型定义，如 `RoleInfo`、`UserItem`、`RoleItem`、`PagedResult<T>`。
- `permission-helpers.ts` 负责权限分组工具，如 `buildPermissionGroups`、`toggleGroupPerms`。
- `validation.ts` 负责表单验证逻辑 `validate` 与 `AuthForm` 类型。
- `common.ts` 负责通用工具函数，如 `debounce`。
- `constants.ts` 负责全局常量定义，如 `SESSION_KEY`。
- `permission.ts` 或 `permission.tsx` 负责权限控制，Vue 使用 `v-permission` 指令，React 使用 `PermissionGuard` 组件与 Context。
- `index.ts` 作为 barrel 导出，统一对外入口。
- `components/MainLayout` 是后台管理主布局，包含 Sidebar 与 Header，用于所有需认证页面。

## 代码复用与一致性

- 页面内业务类型必须定义在 `utils/types.ts`，禁止在页面文件中重复定义。
- `getAuthHeaders()`、权限分组等公共逻辑必须提取到 `utils/` 对应模块，并保持双端实现一致。
- React 与 Vue 的状态变量、函数名必须保持一致，例如统一使用 `permConfigRole`，不要一端改名为 `permEditingRole`。
- Vue 端必须使用 `common.ts` 中的 `debounce()`，禁止手写 `setTimeout` 防抖。
- React 多个相关 `useRef` 应合并为单个 ref 对象，例如 `queryRef = useRef({ page, pageSize, keyword })`。
- 优先使用 `PagedResult<T>` 等泛型类型，避免以 `any` 降低类型安全。

## 组件与框架

- 前端使用 Vite 作为构建工具。
- Vue 项目优先使用 `@expcat/tigercat-vue`。
- React 项目优先使用 `@expcat/tigercat-react`。
- Tailwind CSS v4 通过 CSS 入口接入 `@plugin "@expcat/tigercat-core/tailwind/modern"`，并使用 `@source` 扫描组件库产物。
- 尽量使用 Tigercat UI 组件库原生能力，不添加过多冗余样式。
- 涉及 Tigercat UI 组件、属性、跨框架映射或最佳实践时，优先使用 `skill:tigercat`：
  - 查组件时先看 `component-index.md`，再按组件分类打开对应 examples、props 和类型来源。
  - 写 React / Vue 双端实现时，先看 `shared/patterns/common.md` 与 `shared/glossary.md`，确认 `v-model` / controlled props、事件命名、`open` 状态和 `class` / `className` 差异。
  - 涉及主题、token、可访问性、性能、SSR、i18n 或 release 事项时，打开 `skill:tigercat` 中对应 topic reference。
- 若当前环境不能加载 `skill:tigercat`，则优先读取本仓库已有实现和本地 Tigercat 文档；只有缺少信息或需要核对最新 breaking change、迁移说明时，再查阅官方在线文档。

## 运行与调试

- 推荐通过 `Tigercat.Aspire` 启动整个系统。
- 仅在需要隔离问题时，才单独运行某个项目。

常用命令：

```bash
pnpm install
dotnet build Tigercat.Admin.sln
pnpm build:all
cd Tigercat.Aspire && dotnet run
```

单独运行：

```bash
cd Tigercat.Admin.Api && dotnet run
cd Tigercat.Admin.Vue && pnpm dev
cd Tigercat.Admin.React && pnpm dev
```

## 验证

- 优先运行项目已有的测试、构建、格式化或静态检查命令。
- 修改 API 后，至少确认健康检查与信息端点仍可用。
- 修改前端后，至少确认对应本地开发服务器可正常启动，必要时用浏览器实际检查页面。
- 如果没有可用检查，需明确说明已检查项目中未发现相关命令。
- 输出总结中明确列出已运行和未运行的验证。

## 输出与沟通

- 简洁说明做了什么、为什么这样做，以及如何验证。
- 对未处理的限制、风险或后续事项要明确说明。
- 不夸大完成范围。
- 如果执行命令失败，说明失败命令、关键错误和下一步建议。

## 重复问题处理

当遇到已出现过或疑似重复的问题时：

1. 先判断原因，定位触发条件、影响范围与根因。
2. 记录解决方案，把原因、处理步骤与注意事项补充到本文件或更合适的项目文档中。
3. 补充预防措施，如有必要增加校验、说明或约束，避免再次发生。
