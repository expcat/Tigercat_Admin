# Copilot 指南

本文件用于约束 Copilot 在本仓库内的工作方式，并保持与 README 一致。开始任何编码、审查或重构任务前，请优先使用 karpathy-guidelines skill。

## 项目结构

```text
Tigercat_Admin/
├── Tigercat.Aspire/              # Aspire 主控项目 (.NET 10)
├── Tigercat.ServiceDefaults/     # Aspire 服务默认配置
├── Tigercat.Admin.Api/           # 后端 API (.NET 10 Minimal API)
├── Tigercat.Admin.Vue/           # Vue3 前端项目 (TypeScript)
└── Tigercat.Admin.React/         # React 前端项目 (TypeScript)
```

## 开发环境

- .NET 10 SDK
- Node.js 20.11+
- PNPM 10+

## 项目约定

- 先阅读相关文件，理解当前项目结构、既有风格和已有实现，再开始修改。
- 遵循现有命名、目录、格式和抽象层级，避免无关重构。
- 优先在对应子项目内修改与新增代码，避免跨项目耦合。
- 新增功能需要同步后端端点与两套前端实现。
- 添加或修改 API 端点时，必须同步更新 ../docs/api.md。
- 如发现无关问题，只在总结中说明，不在本次任务中顺手修改。

### 结构与职责

- Aspire 主控负责编排后端与前端服务，优先通过 Tigercat.Aspire 启动与调试。
- 后端 API 为 .NET 10 Minimal API，提供 /api/health 与 /api/info 等基础端点，语法与库版本以 .NET 10 最新内容为准。
- 前端同时维护 Vue3 与 React 两套实现，界面与交互逻辑需保持一致。

### 前端架构

- 全面使用 TypeScript 开发。
- React 项目使用 .tsx 文件，Vue 项目使用 script setup lang="ts"。
- 逻辑代码拆分至 src/utils/ 目录，按功能模块化。
- request.ts 负责统一 API 请求封装 apiRequest，并维护 ApiResponse<T> 类型。
- auth.ts 负责认证逻辑，包括 Session 解析与 getAuthHeaders()。
- types.ts 负责共享业务类型定义，如 RoleInfo、UserItem、RoleItem、PagedResult<T>。
- permission-helpers.ts 负责权限分组工具，如 buildPermissionGroups、toggleGroupPerms。
- validation.ts 负责表单验证逻辑 validate 与 AuthForm 类型。
- common.ts 负责通用工具函数，如 debounce。
- constants.ts 负责全局常量定义，如 SESSION_KEY。
- permission.ts 或 permission.tsx 负责权限控制，Vue 使用 v-permission 指令，React 使用 PermissionGuard 组件与 Context。
- index.ts 作为 barrel 导出，统一对外入口。
- components/MainLayout 是后台管理主布局，包含 Sidebar 与 Header，用于所有需认证页面。

### 代码复用与一致性

- 页面内业务类型必须定义在 utils/types.ts，禁止在页面文件中重复定义。
- getAuthHeaders()、权限分组等公共逻辑必须提取到 utils/ 对应模块，并保持双端实现一致。
- React 与 Vue 的状态变量、函数名必须保持一致，例如统一使用 permConfigRole，不要一端改名为 permEditingRole。
- Vue 端必须使用 common.ts 中的 debounce()，禁止手写 setTimeout 防抖。
- React 多个相关 useRef 应合并为单个 ref 对象，例如 queryRef = useRef({ page, pageSize, keyword })。
- 优先使用 PagedResult<T> 等泛型类型，避免以 any 降低类型安全。

## 组件与框架

- 前端使用 Vite 作为构建工具。
- 涉及 Tigercat UI 组件、属性、跨框架映射或最佳实践时，优先使用 tigercat skill 及其本地 references，减少读取网络文档。
- Vue 项目优先使用 @expcat/tigercat-vue。
- React 项目优先使用 @expcat/tigercat-react。
- Tailwind CSS v4 通过 CSS 入口接入 @plugin "@expcat/tigercat-core/tailwind/modern"，并使用 @source 扫描组件库产物。
- 尽量使用组件库原生能力，不添加过多多余样式。
- 仅在 tigercat skill 缺少所需信息，或需要核对最新 breaking change、迁移说明时，再读取官方在线文档。
- 若组件不满足需求或缺少功能，需在 ../docs/upstream-requirements.md 中详细记录对上游的需求。

## 运行与调试

- 推荐通过 Tigercat.Aspire 启动整个系统。
- 仅在需要隔离问题时，才使用单独运行方式调试某个项目。

## 验证

- 优先运行项目已有的测试、构建、格式化或静态检查命令。
- 修改 API 后，至少确认健康检查与信息端点仍可用。
- 修改前端后，至少确认本地开发服务器可正常启动。
- 如果没有可用检查，需明确说明已检查项目中未发现相关命令。
- 不要声称未运行的检查已经通过。

## 输出与沟通

- 简洁说明做了什么、为什么这样做，以及如何验证。
- 对未处理的限制、风险或后续事项要明确说明。
- 不夸大完成范围。

## 重复问题处理

当遇到已出现过或疑似重复的问题时：

1. 先判断原因，定位触发条件、影响范围与根因。
2. 记录解决方案，把原因、处理步骤与注意事项补充到本文件中。
3. 补充预防措施，如有必要增加校验、说明或约束，避免再次发生。

## 变更记录

- 仅在本仓库内新增或修改相关文件。
- 保持 README 与本文件信息一致。
