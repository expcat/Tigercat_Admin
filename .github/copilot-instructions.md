# Copilot 指南

> 说明：本文件用于辅助 Copilot 在本仓库内保持一致的结构与开发规范，内容参考 README。

## 🏗️ 项目结构

```
Tigercat_Admin/
├── Tigercat.Aspire/              # Aspire 主控项目 (.NET 10)
├── Tigercat.ServiceDefaults/     # Aspire 服务默认配置
├── Tigercat.Admin.Api/           # 后端 API (.NET 10 Minimal API)
├── Tigercat.Admin.Vue/           # Vue3 前端项目 (TypeScript)
└── Tigercat.Admin.React/         # React 前端项目 (TypeScript)
```

## 🔧 开发环境

- .NET 10 SDK
- Node.js 18+
- PNPM 8+

## ✅ 开发规范

### 结构与职责

- **Aspire 主控**：负责编排后端与前端服务，优先通过 Aspire 启动与调试。
- **后端 API**：.NET 10 Minimal API，提供 `/api/health` 与 `/api/info` 等基础端点。API 端语法与库版本以 .NET 10 最新内容为准。
- **前端**：Vue3 与 React 两套实现需保持界面与交互一致。

### 前端架构 (TypeScript)

- **语言**：全面使用 TypeScript 进行开发。
- **组件开发**：
  - React 项目使用 `.tsx` 文件。
  - Vue 项目使用 `<script setup lang="ts">`。
- **工具函数**：逻辑代码拆分至 `src/utils/` 目录，按功能模块化：
  - `request.ts`：统一 API 请求封装 (`apiRequest`)，包含类型定义 (`ApiResponse<T>`)。
  - `auth.ts`：认证逻辑 (Session 解析、`getAuthHeaders()`)。
  - `types.ts`：共享业务类型定义 (`RoleInfo`, `UserItem`, `RoleItem`, `PagedResult<T>` 等)。
  - `permission-helpers.ts`：权限分组工具 (`buildPermissionGroups`, `toggleGroupPerms` 等)。
  - `validation.ts`：表单验证逻辑 (`validate`) 与类型定义 (`AuthForm`)。
  - `common.ts`：通用工具函数 (如 `debounce`)。
  - `constants.ts`：全局常量定义 (`SESSION_KEY` 等)。
  - `permission.ts(x)`：权限控制 (Vue: `v-permission` 指令; React: `PermissionGuard` 组件 + Context)。
  - `index.ts`：barrel 导出，统一对外入口。

- **常用公共组件**：
  - `components/MainLayout`：后台管理主布局（包含 Sidebar 与 Header），用于所有需认证页面。

### 代码复用与一致性

- **类型集中**：页面内业务类型必须定义在 `utils/types.ts`，禁止在页面文件中重复定义。
- **公共逻辑提取**：如 `getAuthHeaders()`、权限分组等逻辑提取到 `utils/` 对应模块，双端保持相同代码。
- **命名对齐**：React 与 Vue 的状态变量、函数名必须保持一致（如统一用 `permConfigRole` 而非一端叫 `permEditingRole`）。
- **使用工具函数**：Vue 端使用 `common.ts` 的 `debounce()` 函数，禁止手写 `setTimeout` 防抖。
- **Ref 合并**：React 多个相关 `useRef` 合并为单个 ref 对象（如 `queryRef = useRef({ page, pageSize, keyword })`）。
- **泛型优先**：使用 `PagedResult<T>` 而非 `PagedResult` + `any`，提升类型安全。

### 代码与改动范围

- 优先在对应子项目内修改与新增代码，避免跨项目耦合。
- 保持现有目录结构与命名风格，避免无关重构。
- 新增功能需要同步后端端点与两套前端实现。
- 接口文档统一维护在 [docs/api.md](../docs/api.md)，用于前端对接参考；添加或修改 API 端点时必须同步更新。

### 运行与调试建议

- **推荐方式**：通过 Aspire 启动（Tigercat.Aspire）。
- **单项目调试**：仅在需要隔离问题时使用单独运行方式。

## 🧩 组件与框架

- 前端使用 Vite 作为构建工具。
- **UI 组件库**：
  - Vue 项目：优先使用 `@expcat/tigercat-vue` ([组件文档](https://raw.githubusercontent.com/expcat/Tigercat/refs/heads/main/docs/components-vue.md))。
  - React 项目：优先使用 `@expcat/tigercat-react` ([组件文档](https://raw.githubusercontent.com/expcat/Tigercat/refs/heads/main/docs/components-react.md))。
  - **约束**：尽量使用组件库原生能力，不添加过多多余的样式。
  - **需求反馈**：若组件不满足需求或缺少功能，需在 [docs/upstream-requirements.md](docs/upstream-requirements.md) 中详细记录，说明需要上游提供什么功能或新增什么组件。
- 保持两端界面与交互逻辑高度一致。

## 🧪 测试与验证

- 修改 API 后需确认健康检查与信息端点仍可用。
- 修改前端后需确认本地开发服务器可正常启动。

## 🔁 重复问题处理（必做）

当遇到已出现过或疑似重复的问题时：

1. **先判断原因**：定位触发条件、影响范围与根因。
2. **记录解决方案**：把原因、处理步骤与注意事项补充到本文件中。
3. **补充预防措施**：如有必要，增加校验、说明或约束，避免再次发生。

## 📌 变更记录

- 仅在本仓库内新增或修改相关文件。
- 请保持 README 与本文件信息一致。
