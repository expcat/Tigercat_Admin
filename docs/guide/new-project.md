# 以本仓库为蓝本创建新的 Tigercat 后台项目

本文面向在**本仓库之外的目录**工作的 Agent 或开发者：以 Tigercat_Admin 为蓝本，从零创建一个基于 Tigercat UI 的 React 或 Vue 后台管理网站。

适用边界：

- 你需要能读取本仓库源码作为蓝本（clone 本仓库，或拥有本地路径访问权）。下文「蓝本文件」均指本仓库内的文件。
- 本仓库的 [AGENT.md](../../AGENT.md)、[operations.md](../operations.md) 和文档同步规则约束的是**维护本仓库**，对新项目**不适用**；新项目的完成标准以本文 [§6 验收清单](#6-验收清单) 为准。
- 组件用法、视觉规则、双端映射等前端模式的事实来源是 [frontend.md](../frontend.md)，本文按章节引用，不复写。

## 1. 技术选型与脚手架

先选定框架：React 或 Vue。两端能力等价（见 [frontend.md「React / Vue 映射」](../frontend.md#react--vue-映射)），按团队技术栈选择即可；只需要单端，不必像本仓库一样双端并行。

环境要求：Node.js 20.11+、PNPM 10+。

```bash
pnpm create vite my-admin --template react-ts   # React
pnpm create vite my-admin --template vue-ts     # Vue
```

依赖清单（版本以蓝本 [Tigercat.Admin.React/package.json](../../Tigercat.Admin.React/package.json) / [Tigercat.Admin.Vue/package.json](../../Tigercat.Admin.Vue/package.json) 为准，当前蓝本为 Tigercat `^1.2.43`）：

| 类别 | React 端 | Vue 端 | 说明 |
| ---- | -------- | ------ | ---- |
| Tigercat UI | `@expcat/tigercat-core` + `@expcat/tigercat-react` | `@expcat/tigercat-core` + `@expcat/tigercat-vue` | **core 与框架包必须同版本** |
| 样式 | `tailwindcss` + `@tailwindcss/postcss` + `postcss` + `autoprefixer` | 同左 | Tailwind 必须 v4 |
| 路由 | `react-router-dom ^7` | `vue-router ^5` | |
| 框架 | `react` / `react-dom ^19` | `vue ^3.5` | |
| 可选 | `cross-env` | 同左 | 仅在需要 demo/mock 构建脚本时 |

```bash
# React
pnpm add @expcat/tigercat-core @expcat/tigercat-react react-router-dom tailwindcss postcss autoprefixer
pnpm add -D @tailwindcss/postcss

# Vue
pnpm add @expcat/tigercat-core @expcat/tigercat-vue vue-router tailwindcss postcss autoprefixer
pnpm add -D @tailwindcss/postcss
```

**不要安装** `@tigercat-admin/mock-api`：它是本仓库的 `workspace:*` 内部包，npm 上不存在。需要纯前端演示时按 [backend.md 方案 C](backend.md#方案-c复用-mockapi-做纯前端演示) 处理。

## 2. 工程配置

以下配置均可从蓝本复制后按修改点调整；文档中的片段仅作导读，**以蓝本源文件为最终事实**。

### vite.config.js

复制 [Tigercat.Admin.React/vite.config.js](../../Tigercat.Admin.React/vite.config.js)（Vue 端同名文件，插件换 `@vitejs/plugin-vue`）。修改点：

- `server.port`：改为自己的端口。
- `server.proxy['/api'].target`：改为自己的后端地址（见 [backend.md](backend.md)）。
- `manualChunks` 中 `vendor-ui`（`@expcat/tigercat-*` 单独分包）建议保留，减小页面 chunk。
- `VITE_TIGERCAT_*` 环境变量分支（base path、router mode、demo）：不需要 demo/Pages 部署时可删。

### CSS 入口

复制蓝本 [Tigercat.Admin.React/src/index.css](../../Tigercat.Admin.React/src/index.css)（Vue 端为 [src/style.css](../../Tigercat.Admin.Vue/src/style.css)）。前四行是 Tigercat 接入的最小必需配置：

```css
@import "tailwindcss";
@plugin "@expcat/tigercat-core/tailwind/modern";

@source "../node_modules/@expcat/tigercat-react/dist/**/*.{js,mjs}";
@source "../node_modules/@expcat/tigercat-core/dist/**/*.{js,mjs}";
```

- Vue 端把第一个 `@source` 的 `tigercat-react` 换成 `tigercat-vue`。
- `.dark` 暗色 token 块和 `p2-*` 页面辅助类随文件一并复制（视觉规则见 [frontend.md「视觉与布局规则」](../frontend.md#视觉与布局规则)）。
- 机制说明见 [frontend.md「技术基线」](../frontend.md#技术基线)。

### 其余配置文件

从蓝本对应端复制：`postcss.config.js`、`tailwind.config.js`、`tsconfig.json`（React 另有 `tsconfig.node.json`）、`index.html`（改标题）、`eslint.config.js`（可选）。

## 3. App Shell 搭建：复制清单

新项目必须使用 TypeScript（React `.tsx`，Vue `<script setup lang="ts">`）。Shell 的交互细节（侧栏折叠、移动抽屉、Guest 页等）见 [frontend.md「App Shell 蓝图」](../frontend.md#app-shell-蓝图)，下表是从蓝本复制文件的清单与修改点：

| 蓝本文件（React 端 / Vue 端） | 用途 | 复制后修改点 |
| --- | --- | --- |
| `src/components/MainLayout.tsx` / `MainLayout.vue` | 后台 Shell 骨架（Sidebar + Header + Content） | 基本原样 |
| `src/components/MainSidebar.tsx` / `MainSidebar.vue` | 侧栏（240px / 折叠 64px、移动 Drawer） | 替换 Logo、品牌文案 |
| `src/components/MainHeader.tsx` / `MainHeader.vue` | 面包屑、主题切换、账号菜单 | 按需裁剪菜单项 |
| `src/components/Icons.tsx`（Vue：`Icon.vue` + `AppLogo.vue`） | 业务图标 | 按需增删 |
| `src/components/PageHeader.tsx` + `PageFragments.tsx`（Vue：`PageHeader.vue`、`MetricCard.vue`、`MetricGrid.vue`、`MutedPanel.vue`、`PageActionPanel.vue`、`ChartEmptyState.vue`） | 页面级片段组件 | 原样 |
| `src/components/ProtectedRoute.tsx` + `GuestRoute.tsx`（Vue：`ProtectedShell.vue` + `GuestShell.vue` + `src/router/index.ts`） | 路由守卫与路由表 | 路由表替换为自己的页面 |
| `src/components/PermissionGuard.tsx`（Vue：`src/directives/permission.ts` + `directives/index.ts`） | 权限控件 / 指令 | 原样 |
| `src/utils/`：`theme.ts`、`request.ts`、`auth.ts`、`permission.tsx`（Vue：`permission.ts`）、`permission-helpers.ts`、`types.ts`、`constants.ts`、`common.ts`、`hooks.ts`（Vue：`composables.ts`）、`shell-navigation.tsx`（Vue：`shell-navigation.ts`）、`tigercatText.ts`、`validation.ts` | 主题 / 请求 / 会话 / 权限 / 导航 / 文案 | `types.ts` 裁剪为自己的业务类型；`shell-navigation` 替换菜单表；`constants.ts` 检查 API 前缀 |
| `src/main.tsx` + `App.tsx`（Vue：`src/main.ts` + `App.vue`） | 应用入口（ConfigProvider locale、Router 模式） | **删除 `@tigercat-admin/mock-api` 的 import、`isTigercatDemoEnabled` 与 `installTigercatMockApi(...)` 调用**（除非选 backend.md 方案 C）；不需要 hash 路由时可删 `VITE_TIGERCAT_ROUTER_MODE` 分支 |

蓝本中 `src/utils/` 其余文件（`notifications.ts`、`task-board.ts`、`settings.ts`、`media.ts`、`export.ts`、`workbench.ts`）是具体业务页面的 API 包装，按你实际要做的页面选择性复制。

路由、菜单与权限：

- [frontend.md「App Shell 蓝图」](../frontend.md#app-shell-蓝图) 中的菜单-路由-权限表是**本仓库示例**；新项目复制其结构，把条目替换为自己的页面。
- 权限码沿用 `资源:动作` 命名约定（如 `user:view`、`role:edit`），菜单和按钮按权限隐藏。
- 主题与暗色模式：`utils/theme.ts` 切换根节点 `.dark` class，Tigercat token 自动生效；不要在页面内写孤立深色配色。

## 4. 页面生成模式

页面如何选组件、写表格、保持视觉一致，全部以 [frontend.md](../frontend.md) 为准：

- [组件选择矩阵](../frontend.md#组件选择矩阵)：每类页面用什么 Tigercat 组件，重组件的子路径导入写法。
- [表格使用约定（v1.2.43+）](../frontend.md#表格使用约定v1243)：`DataTableWithToolbar`、窄屏卡片模式、列显隐、锁定列。
- [视觉与布局规则](../frontend.md#视觉与布局规则)：token、`p2-*` 辅助类、`PageHeader` / `MetricGrid` 模式。
- [React / Vue 映射](../frontend.md#react--vue-映射)：跨框架属性 / 事件对照。

三类页面可直接以蓝本页面为模板（React `src/pages/*.tsx`，Vue `src/pages/*.vue`）：

| 页面类型 | 蓝本模板 | 覆盖的模式 |
| -------- | -------- | ---------- |
| 数据工作台（列表 + 搜索 + 批量 + 弹窗表单） | `UsersPage.*` | 分页、排序、列显隐、批量操作、sessionStorage 状态保留 |
| 仪表盘（指标 + 图表） | `HomePage.*` | `MetricGrid`、图表、空状态 |
| 访客页（登录 / 注册） | `LoginPage.*` | Guest shell、表单校验、登录态写入 |

## 5. API 对接

前端只依赖一个薄抽象层，对后端实现无要求：

- 请求统一走 `utils/request.ts` 的 `apiRequest`，认证头由 `getAuthHeaders()` 生成（`X-Token` 或 `Bearer`）。
- 返回包络为 `ApiResponse<T>`（`code` / `message` / `success` / `data`），分页用 `PagedResult<T>`。
- 会话存在 `SESSION_KEY`，权限列表从权限端点加载。

后端三种方案（对接任意自有后端 / 复用本仓库 .NET API / MockApi 纯前端演示）见 [backend.md](backend.md)。

## 6. 验收清单

基础项：满足 [frontend.md「页面生成验收」](../frontend.md#页面生成验收) 的全部条目；单端项目豁免「React / Vue 双端等价」一条。

新项目增量项：

- `pnpm build` 通过，无 TypeScript 错误。
- `package.json` 与代码中无 `@tigercat-admin/mock-api`、无 `workspace:*` 残留（方案 C 除外）。
- `pnpm-lock.yaml` 在新项目内独立生成，不沿用本仓库 lockfile。
- 开发期 `/api` 代理指向真实后端，或部署期由反向代理转发 `/api`。
- CSS 入口完整：`@plugin "@expcat/tigercat-core/tailwind/modern"` + 双 `@source`（指向所用框架包）。
- `@expcat/tigercat-core` 与 `@expcat/tigercat-react` / `-vue` 版本号一致。
