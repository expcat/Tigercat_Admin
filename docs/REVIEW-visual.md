# Tigercat Admin 视觉走查记录

本文只追加走查事实。走查会话不改产品代码。第一期范围是 **Roadmap.md 项 1：三端启动+联调**，不做全站视觉。

**本期结论：不阻塞。** Api / Vue / React 均可访问，双端 `admin` 登录后进入 `/dashboard`，侧栏 + Header + TagsView 出现，Header 无「演示模式」Tag。后续视觉期可继续。未开始项 2–27。

---

## 环境与进程（已确认，未重启、未替换）

不是 Aspire，不是 MockApi，不是 `pnpm dev:demo`。Vite 配置未改。`VITE_TIGERCAT_DEMO` 未设置。

| 端 | 地址 | PID（观察时） | 启动方式 |
| -- | ---- | ------------- | -------- |
| Api | `http://127.0.0.1:5137` | 418315 | `cd Tigercat.Admin.Api && Infrastructure__UseInMemory=true ASPNETCORE_ENVIRONMENT=Development dotnet run --launch-profile http`。进程环境：`DOTNET_LAUNCH_PROFILE=http`，`ASPNETCORE_URLS=http://localhost:5137`。Kestrel `http` profile。 |
| Vue | `http://127.0.0.1:5173` | 421010 | 在 `Tigercat.Admin.Vue`：`VITE_API_URL=http://127.0.0.1:5137 pnpm exec vite --host 127.0.0.1 --port 5173` |
| React | `http://127.0.0.1:5174` | 421116 | 在 `Tigercat.Admin.React`：`VITE_API_URL=http://127.0.0.1:5137 pnpm exec vite --host 127.0.0.1 --port 5174` |

**Env notes（非缺陷）：**

- Redis 缺失，故 `Infrastructure__UseInMemory=true`。`/api/health` 中 `redis.target=in-memory`、`eventChannel.target=in-memory`，`database.target=Sqlite`。
- 双端 `VITE_API_URL=http://127.0.0.1:5137`。`VITE_TIGERCAT_DEMO` unset（进程环境无此变量）。
- 双端 `vite.config.js` 默认 proxy fallback 仍是 `http://127.0.0.1:5100`，**未编辑**；本次因 `VITE_API_URL` 指向 5137，实际 `/api` 打到 live Kestrel。
- 本机另有 `vite preview` 占用 `127.0.0.1:55173` / `55174`，**未使用**。

**账号：**

- 本期使用：`admin` / `admin123`（无 2FA）。
- 2FA 路径存在、本期未走完：`demo` / `demo`，验证码 `123456`。游客页（注册 / 忘记密码等）未走完，留给 Auth 期。

---

## 1. 三端启动+联调

### 1.1 curl 可达性

- **模块：** 三端 HTTP 健康与前端 `/api` 代理
- **端：** Vue / React / Api
- **视口：** 不适用
- **复现：**
  - `curl http://127.0.0.1:5137/` → **HTTP 404**（空 body；Api root 无页面，符合预期）。
  - `curl http://127.0.0.1:5137/health` → **HTTP 200**，body `Healthy`。
  - `curl http://127.0.0.1:5137/api/health` → **HTTP 200**，`data.status=healthy`；database Sqlite；redis / eventChannel `in-memory`；mediaStorage Local；configuration / security Development。
  - `curl http://127.0.0.1:5173/` → **HTTP 200**，Vite Vue HTML（含 `/@vite/client`）。
  - `curl http://127.0.0.1:5174/` → **HTTP 200**，Vite React HTML（含 `/@react-refresh`）。
  - `curl http://127.0.0.1:5173/api/health` → **HTTP 200**，响应与 Api `/api/health` 同形（timestamp 不同），证明 Vue 代理打到 live Api。
  - `curl http://127.0.0.1:5174/api/health` → **HTTP 200**，同上，React 代理打到 live Api。
- **严重度：** 通过（信息）

### 1.2 Vue admin 登录与 Shell

- **模块：** 登录后后台壳（侧栏 / Header / TagsView）
- **端：** Vue
- **视口：** Chrome DevTools 页约 **1042×632**（桌面宽度，高度偏矮）
- **复现：**
  1. Chrome DevTools MCP 先打开 `chrome://inspect/#remote-debugging`，勾选 “Allow remote debugging for this browser instance”。
  2. 打开 `http://127.0.0.1:5173/login`，标题 `tigercat-admin-vue`，游客登录卡「欢迎回来」。
  3. 填 `admin` / `admin123`，点「登录」。按钮短暂 `busy`/`disabled`。
  4. 登录后 URL：**`http://127.0.0.1:5173/dashboard`**。浏览器网络：`POST /api/auth/login` **200**，随后 `GET /api/home`、`/api/auth/permissions`、`/api/stats/overview`、`/api/notifications` 等均为 **200**（经 Vite `/api` 代理）。
  5. **侧栏**（complementary）：Tigercat 品牌；菜单 仪表盘 / 数据分析 / 协作 / 内容管理 / 项目 / 运维 / 帮助支持 / 系统管理；底部「关于」；「收起菜单」。
  6. **Header**（banner）：面包屑「管理中心 / 仪表盘」；主题配置；通知铃铛（未读 2）；账号 `admin`。Header 文案片段为「管理中心 / 仪表盘 / admin」，**无「演示模式」Tag**。DOM `innerText` 全文检索「演示模式」为 false。
  7. **TagsView**（`.p2-tags-view`）：选中标签「仪表盘」；右侧「标签操作」。
  8. 主区可见「欢迎回来，admin！」、KPI（总用户 2 / 活跃 2 / 角色 4 / 权限 22）。首登 **OnboardingTour** 弹层「欢迎使用管理中心」1/6 出现（本期未点完引导、未走菜单）。
- **严重度：** 通过（信息）。首登引导 overlay 属后续 Shell 期，不阻塞联调。

### 1.3 React admin 登录与 Shell

- **模块：** 登录后后台壳（侧栏 / Header / TagsView）
- **端：** React
- **视口：** 约 **1042×632**（与 Vue 同一 Chrome 窗口尺寸）
- **复现：**
  1. 独立浏览上下文打开 `http://127.0.0.1:5174/login`，标题 `tigercat-admin-react`。
  2. 同样 `admin` / `admin123`，点「登录」。
  3. 登录后 URL：**`http://127.0.0.1:5174/dashboard`**。网络：`POST /api/auth/login` **200**，以及 `/api/home`、`/api/auth/permissions`、`/api/stats/overview` 等 **200**。
  4. **侧栏 / Header / TagsView** 与 Vue 同结构：侧栏分组菜单 + 「关于」；Header 面包屑 / 主题 / 铃铛 / `admin`；TagsView 选中「仪表盘」。
  5. Header **无「演示模式」Tag**；页面文本检索「演示模式」为 false。
  6. 主区同样「欢迎回来，admin！」。首登 OnboardingTour 1/6 同样出现（未走完）。
- **严重度：** 通过（信息）

### 1.4 浏览器插件备注

- **模块：** 走查工具
- **端：** 环境
- **视口：** 不适用
- **复现：** `chrome-devtools-mcp` 可驱动页面，完成本期登录与壳确认。`browser-use` 两次 `ensure_daemon` 均报：已打开 `chrome://inspect/#remote-debugging`，需本机再点 Allow popup 才能挂 CDP。勾选 remote debugging 后该 MCP 仍未连上。本期登录/壳检查**不依赖** browser-use，未把联调标为阻塞。
- **严重度：** 环境备注（不阻塞项 1）

### 1.5 阻塞判定

- **模块：** 是否停止后续视觉期
- **端：** Vue / React / Api
- **视口：** 不适用
- **复现：** 三端进程仍在监听 5137 / 5173 / 5174。前端可打到 Api。双端 `admin` 可进 `/dashboard` 且 Shell 三件套可见。
- **严重度：** **不阻塞。** 后续视觉期不要因本期环境停下来。若之后 Api / Vue / React 任一挂掉，或 Header 出现「演示模式」，再记阻塞并停止。

---

## 未做（刻意）

- 未走全站菜单与业务页。
- 未完成游客页（注册 / 注册成功 / 忘记密码）。
- 未走 `demo` 2FA OTP（`123456`）与锁屏 PIN。
- 未切暗色 / 紧凑 / 移动视口（项 1 不做视觉清单）。
- 未改产品代码，未 commit / push / 开 PR。
