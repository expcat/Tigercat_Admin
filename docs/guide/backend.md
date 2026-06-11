# 新项目的后端方案

本文配合 [new-project.md](new-project.md)，说明新建的 Tigercat 前端项目如何获得后端：实现抽象契约对接任意后端（方案 A）、复用本仓库 .NET API（方案 B）、或用 MockApi 做纯前端演示（方案 C）。

## 前端依赖的抽象契约

蓝本前端对后端只有以下要求（细节字段以 [api.md](../api.md) 与 [docs/api](../api) 各专题为参考实现契约，本文不复写字段）：

- **返回包络** `ApiResponse<T>`：`code`（成功 `200`）、`message`、`success`、`data`。
- **分页结构** `PagedResponse<T>`：`items`、`total`、`page`、`pageSize`。
- **认证头**：`X-Token: <TOKEN>` 或 `Authorization: Bearer <TOKEN>`；未登录返回 `401`，权限不足返回 `403`。
- **最小端点集**：登录端点（返回 token 与用户信息）、权限列表端点（如 `/api/auth/permissions`，返回当前用户权限码数组），以及你的页面所需的资源端点。
- **权限码**：`资源:动作` 格式（如 `user:view`），与前端 `permission-helpers` 中的判断对齐。

## 方案 A：对接任意自有后端

1. 后端按上述契约实现端点；或保持后端原样，在前端 `utils/request.ts` 的 `apiRequest` 中做一层包络适配（把自有响应结构转成 `ApiResponse<T>`）。
2. 登录成功后把 token 写入 `SESSION_KEY` 会话（沿用蓝本 `utils/auth.ts`）。
3. 提供权限列表端点，或在前端登录响应中直接返回权限码数组并调整 `permission` 工具的加载逻辑。
4. 开发期把 vite `/api` 代理指向自有后端；部署期由反向代理转发 `/api`。

## 方案 B：复用本仓库 .NET API

适合想直接获得完整后端（用户、角色、权限、审计、通知、任务、设置、媒体）的场景：

1. clone 本仓库，启动 API（默认端口 `5137`）：

   ```bash
   cd Tigercat.Admin.Api && dotnet run
   ```

2. 新项目 vite 代理 `/api` 指向 `http://127.0.0.1:5137`。
3. 数据库选择（SQLite / PostgreSQL / InMemory）与连接串配置见 [operations.md「数据库」](../operations.md#数据库)。
4. 跨域与生产部署（`Cors__AllowedOrigins`、`AllowedHosts`、`BootstrapAdmin__Password` 等）见 [operations.md「生产配置」](../operations.md#生产配置)。
5. 各端点契约按需读取 [api.md](../api.md) 与 [docs/api](../api) 专题。

## 方案 C：复用 MockApi 做纯前端演示

`@tigercat-admin/mock-api`（[Tigercat.Admin.MockApi](../../Tigercat.Admin.MockApi)）是本仓库的浏览器内 Mock：拦截 `/api` 请求并返回内存数据，无需任何后端，适合静态托管演示。

1. 把 [Tigercat.Admin.MockApi/src](../../Tigercat.Admin.MockApi/src) 复制进新项目（如 `src/mock-api/`），或以本地包形式引用。
2. 在应用入口安装（蓝本 `src/main.tsx` / `src/main.ts` 的用法）：

   ```ts
   import { installTigercatMockApi, isTigercatDemoEnabled } from './mock-api';

   const demoEnabled = isTigercatDemoEnabled(import.meta.env.VITE_TIGERCAT_DEMO);
   installTigercatMockApi({ enabled: demoEnabled });
   ```

3. 用环境变量开关：`VITE_TIGERCAT_DEMO=true`（参考蓝本 `dev:demo` / `build:demo` 脚本，配合 `cross-env`）；静态托管时路由建议 hash 模式。
4. Mock 数据与端点覆盖范围以 MockApi 源码为准；裁剪页面时同步裁剪不需要的 mock 模块。
