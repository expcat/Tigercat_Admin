# Tigercat Admin 视觉走查记录

本文只追加走查事实。走查会话不改产品代码。第一期范围是 **Roadmap.md 项 1：三端启动+联调**，不做全站视觉。

**本期结论：不阻塞。** Vue 与 React 两端联调均通过。Api / Vue / React 均可访问，双端用 `admin` / `admin123` 登录后进入 `/dashboard`，侧栏 + Header + TagsView 出现，Header 无「演示模式」Tag。后续视觉期可继续。未开始项 2–27。

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
- 双端 `VITE_API_URL=http://127.0.0.1:5137`。`VITE_TIGERCAT_DEMO` unset。
- 双端 `vite.config.js` 默认 proxy fallback 仍是 `http://127.0.0.1:5100`，**未编辑**；本次因 `VITE_API_URL` 指向 5137，实际 `/api` 打到 live Kestrel。
- 本机另有 `vite preview` 占用 `127.0.0.1:55173` / `55174`，**未使用**。

**账号：**

- 本期使用：`admin` / `admin123`（无 2FA）。`POST /api/auth/login` 返回 `requiresTwoFactor: false` + token。
- 2FA 路径存在、本期未走完：`demo` / `demo`，验证码 `123456`。同一接口对 `demo`/`demo` 返回 `requiresTwoFactor: true` 与 `challengeId`。游客页（注册 / 忘记密码等）未走完，留给 Auth 期。

---

## 1. 三端启动+联调

### 1.1 curl 可达性

- **模块：** 三端 HTTP 健康与前端 `/api` 代理
- **端：** Vue / React / Api
- **视口：** 不适用
- **复现：**
  - `curl http://127.0.0.1:5137/health` → **HTTP 200**，body `Healthy`。
  - `curl http://127.0.0.1:5137/api/health` 与双端 `http://127.0.0.1:5173/api/health`、`http://127.0.0.1:5174/api/health` → **HTTP 200**，`data.status=healthy`；database Sqlite；redis / eventChannel `in-memory`；mediaStorage Local；configuration / security Development。Vue / React 代理响应与 Api 同形（timestamp 不同），证明 `/api` 打到 live Kestrel，不是 MockApi。
  - `curl http://127.0.0.1:5173/` → **HTTP 200**（Vite Vue）。
  - `curl http://127.0.0.1:5174/` → **HTTP 200**（Vite React）。
- **严重度：** 通过（信息）

### 1.2 Vue admin 登录与 Shell

- **模块：** 登录后后台壳（侧栏 / Header / TagsView）
- **端：** Vue
- **视口：** 桌面 **1280×656**
- **复现：**
  1. 先打开 `chrome://inspect/#remote-debugging`，勾选 “Allow remote debugging for this browser instance”。
  2. 打开 `http://127.0.0.1:5173/login`，标题 `tigercat-admin-vue`，游客登录卡「欢迎回来」。
  3. 填 `admin` / `admin123`，点「登录」。
  4. 登录后 URL：**`http://127.0.0.1:5173/dashboard`**。
  5. **侧栏：** Tigercat 品牌；菜单 仪表盘 / 数据分析 / 协作 / 内容管理 / 项目 / 运维 / 帮助支持 / 系统管理；底部「关于」；「收起菜单」。
  6. **Header：** 面包屑「管理中心 / 仪表盘」；主题配置；通知铃铛（未读 2）；账号 `admin`。Header 文案为「管理中心 / 仪表盘 / admin」，**无「演示模式」Tag**。`document.body.innerText` 检索「演示模式」为 false（跑马灯里的「演示环境」是公告文案，不是 Header Tag）。
  7. **TagsView：** 选中标签「仪表盘」；右侧「标签操作」。
  8. 主区「欢迎回来，admin！」；KPI 总用户 2 / 活跃 2 / 角色 4 / 权限 22；页脚「API 状态 在线」「运行环境 .NET 10 + Vue 3」。首登 **OnboardingTour** 弹层「欢迎使用管理中心」1/6 出现（本期关掉引导以便看清壳，未走菜单）。
- **严重度：** 通过（信息）。首登引导 overlay 属后续 Shell 期，不阻塞联调。

### 1.3 React admin 登录与 Shell

- **模块：** 登录后后台壳（侧栏 / Header / TagsView）
- **端：** React
- **视口：** 桌面 **1280×656**（与 Vue 同一 Chrome 窗口）
- **复现：**
  1. 新标签打开 `http://127.0.0.1:5174/login`，标题 `tigercat-admin-react`。与 Vue 游客卡同一布局（欢迎回来 / 用户名 / 密码 / 登录）。
  2. 同样 `admin` / `admin123`，点「登录」。
  3. 登录后 URL：**`http://127.0.0.1:5174/dashboard`**。
  4. **侧栏 / Header / TagsView** 与 Vue 同结构：侧栏分组菜单 + 「关于」；Header 面包屑 / 主题 / 铃铛 / `admin`；TagsView 选中「仪表盘」。
  5. Header **无「演示模式」Tag**；页面文本检索「演示模式」为 false。
  6. 主区同样「欢迎回来，admin！」；KPI 数字与 Vue 一致（2 / 2 / 4 / 22）；「运行环境 .NET 10 + React 19」「API 状态 在线」。首登 OnboardingTour 1/6 同样出现（关掉后看清壳，未走完）。
- **严重度：** 通过（信息）

### 1.4 浏览器工具备注

- **模块：** 走查工具
- **端：** 环境
- **视口：** 不适用
- **复现：** 本机 Chrome 已带 `--remote-debugging-port=9227`。`chrome-devtools-mcp` 的 `list_pages` / `new_page` 因同一 `chrome-profile` 被第二份 MCP 抢占而失败。`browser-use` MCP 的 `ensure_daemon` 会先打开 `chrome://inspect/#remote-debugging` 并要求 Allow popup。实际走查用 `BU_CDP_URL=http://127.0.0.1:9227` 的 browser-use CLI：先打开 inspect 页并勾选 Allow，再人工点击登录。未把联调标为阻塞。
- **严重度：** 环境备注（不阻塞项 1）

### 1.5 阻塞判定

- **模块：** 是否停止后续视觉期
- **端：** Vue / React / Api
- **视口：** 不适用
- **复现：** 三端进程仍在监听 5137 / 5173 / 5174。前端 `/api` 打到 live Api。双端 `admin` 可进 `/dashboard` 且 Shell 三件套可见。两端联调均通过。
- **严重度：** **不阻塞。** 后续视觉期不要因本期环境停下来。若之后 Api / Vue / React 任一挂掉，或 Header 出现「演示模式」，再记阻塞并停止。

---

## 未做（刻意）

- 未走全站菜单与业务页。
- 未完成游客页（注册 / 注册成功 / 忘记密码）。
- 未走 `demo` 2FA OTP（`123456`）与锁屏 PIN（接口已确认 `requiresTwoFactor: true`）。
- 未切暗色 / 紧凑 / 移动视口（项 1 不做视觉清单）。
- 未改产品代码，未 commit / push / 开 PR。

---

## 2. Auth guest (Vue)

本期只读既有 PNG，未再走 Vue UI、未开 React、未启动服务、未改产品代码。上下文（图中无地址栏，不从像素发明 URL）：Vue `http://127.0.0.1:5173`；`admin` / `admin123` 无 2FA；`demo` / `demo` + `123456`。13 张图均为 **1280×800**、浅色页底，无 `.dark`、无移动视口。无 Vue 2FA 成功 PNG、无 Vue admin 登录成功 PNG。

### 2.1 截图可读性

- **模块：** Auth guest 截图清单
- **端：** Vue
- **视口：** 桌面 **1280×800**（13 张 PNG 像素尺寸相同）
- **复现：** 13 张均能打开、内容可读。各文件**实际画面**（不以文件名为准）：
  | 文件 | 画面 |
  | ---- | ---- |
  | `/tmp/vue-login-desktop.png` | 游客登录卡，用户名/密码为空 |
  | `/tmp/vue-login-empty-validation.png` | 登录卡；用户名 `a`，密码 1 个掩码点；无红字 |
  | `/tmp/vue-login-wrong-password.png` | 登录卡；用户名 `admin`，密码已填；无 Message |
  | `/tmp/vue-2fa-otp-step.png` | 两步验证；OTP 空；倒计时 **48** 秒 |
  | `/tmp/vue-2fa-wrong-code.png` | 两步验证；OTP `000000`；「重新发送验证码」；无错误文案 |
  | `/tmp/vue-2fa-resend.png` | 两步验证；OTP 空；倒计时 **54** 秒 |
  | `/tmp/vue-register-desktop.png` | 注册卡；空字段红框 + 红字校验 |
  | `/tmp/vue-register-success.png` | **登录卡「欢迎回来」**，不是注册成功 Result |
  | `/tmp/vue-forgot-step1.png` | 忘记密码步骤 1；账号空、红框红字 |
  | `/tmp/vue-forgot-phone-mask.png` | 忘记密码步骤 1；账号明文 `138` |
  | `/tmp/vue-forgot-code-sent.png` | 忘记密码步骤 1；邮箱已填，倒计时 **49** 秒 |
  | `/tmp/vue-forgot-step2.png` | 忘记密码步骤 2；新密码空校验 |
  | `/tmp/vue-forgot-success.png` | 忘记密码步骤 3；「密码已重置」Result |
- **严重度：** 通过（信息）。文件齐、可读。

### 2.2 Guest shell

- **模块：** Guest shell
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** 登录 / 2FA / 注册 / 忘记密码各图同一壳：浅灰页底上居中圆角双栏卡，左栏品牌渐变铺满左半、右栏白底表单，卡外大量留白。无侧栏、无 Header、无 TagsView、无「演示模式」Tag。左上圆角「T」+「Tigercat Admin」；左下「© 2026 Tigercat Team. All rights reserved.」。卡片内容贴齐圆角边，符合 Roadmap 居中 + 无内边距双栏。本批图未见溢出画布。
- **严重度：** 通过（信息）。Vue AppLogo 与 React 品牌区是否对齐留给 React 期。

### 2.3 Login 空表单

- **模块：** Login
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-login-desktop.png`。左栏标题「极速、精美的全栈管理系统解决方案」，编号 1/2/3 卖点。右栏「欢迎回来」「请输入您的凭据登录系统」；用户名/密码为空占位「请输入用户名」「请输入密码」；「忘记密码？」；主按钮「登录」；「还没有账号？立即注册」。字段无红框、无红字。
- **严重度：** 通过（信息）

### 2.4 Login 空态校验

- **模块：** Login 空态校验
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-login-empty-validation.png` 并非空表单：用户名为 `a`，密码为 1 个 `•`，描边为默认灰，无红色辅助文案，无顶栏 toast。页顶约 80px 为均匀浅底，无 Message 色块。Roadmap 要求的登录空态校验 **本图未取证**。
- **严重度：** 未取证（本会话）

### 2.5 Login 错误密码

- **模块：** Login 错误密码 Message
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-login-wrong-password.png`。用户名 `admin`，密码为掩码点（光标在密码框，紫描边）。无红框、无红字、无 toast。Roadmap 要求的错误密码 Message **本图未取证**。
- **严重度：** 未取证（本会话）

### 2.6 Login admin 成功

- **模块：** Login `admin` 直进后台
- **端：** Vue
- **视口：** 不适用（无对应图）
- **复现：** 清单无 Vue admin 登录成功 PNG。13 张图均为游客卡，未见 `/dashboard` 或后台壳。项 1 已另记 `admin` 进仪表盘；**本会话未再取证**。
- **严重度：** 未取证（本会话）

### 2.7 2FA OTP 步

- **模块：** Login 2FA OTP
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-2fa-otp-step.png`。标题「两步验证」，副文「请输入账号 demo 的 6 位验证码」。信息条「演示验证码：123456」，说明「验证通过后才会写入会话，返回登录可重新输入凭据。」6 个 OTP 空格，第一格紫描边。其下「验证码已发送」「**48** 秒后可重发」。主按钮「验证」为浅色禁用态。「返回登录」链接。
- **严重度：** 通过（信息）

### 2.8 2FA 错误码

- **模块：** Login 2FA 错误码
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-2fa-wrong-code.png`。同一两步验证卡。OTP 六格均为 `0`（与同卡提示 `123456` 不同）。倒计时消失，代以「重新发送验证码」链接。「验证」为实心可点。无红字、无 toast。错误码失败 UI **本图未取证**。
- **严重度：** 未取证（本会话）

### 2.9 2FA 重发 Countdown

- **模块：** Login 2FA 重发
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-2fa-resend.png`。OTP 再次为空（六格均无焦点环）。「验证码已发送」「**54** 秒后可重发」。「验证」浅色禁用。「返回登录」仍在。与 OTP 步相比，倒计时从 48 变为 54，符合重发后回到接近 60 秒（Roadmap 写 60s；本图拍到 54，未拍到正好 60）。
- **严重度：** 通过（信息）

### 2.10 2FA 成功

- **模块：** Login 2FA 成功
- **端：** Vue
- **视口：** 不适用（无对应图）
- **复现：** 清单无 Vue 2FA 成功 PNG。三张 2FA 图均停在游客「两步验证」卡，未见写入会话后的后台壳。
- **严重度：** 未取证（本会话）

### 2.11 Register 表单与空校验

- **模块：** Register
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-register-desktop.png`。左栏标题改为「创建您的管理账号」，卖点为勾选而非 1/2/3，渐变偏品红（登录/2FA/忘记密码左栏为蓝紫）。右栏「创建账号」「注册 Tigercat Admin 账号」。用户名、密码均为空占位，**红框** + 红字「请输入用户名」「请输入密码」。主按钮「注册」；「已有账号？立即登录」。
- **严重度：** 通过（信息）。空校验在本图可见。

### 2.12 RegisterSuccess

- **模块：** RegisterSuccess Result + 倒计时
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-register-success.png` 画面是游客登录卡「欢迎回来」（空用户名/密码、「登录」「立即注册」），**不是**成功 Result，也**没有**倒计时。与 `/tmp/vue-login-desktop.png` 为同一 UI（像素仅左栏有极小色差）。Roadmap 的注册成功 Result + 倒计时 **本会话未取证**。
- **严重度：** 未取证（本会话）

### 2.13 ForgotPassword 步骤 1（空校验）

- **模块：** ForgotPassword 验证身份
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-forgot-step1.png`。左栏「找回账号访问权限」+ 编号 1/2/3。右栏「忘记密码」「通过邮箱或手机号重置登录密码」。步骤条：当前 **1 验证身份**（邮箱 / 手机号），2 设置新密码，3 完成。账号框空、**红框** + 红字「请输入邮箱或手机号」。其下 6 个空 OTP 格、「获取验证码」、「下一步」、「返回登录」。OTP 与身份在同一步，不是单独步骤页。
- **严重度：** 通过（信息）

### 2.14 ForgotPassword 手机掩码

- **模块：** ForgotPassword 手机 MaskInput
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-forgot-phone-mask.png`。仍在步骤 1。账号框显示明文 **`138`**，无空格、横线、星号或掩码槽。OTP 空；「获取验证码」仍在。Roadmap 的手机掩码完成态 **本图未取证**（三位数中间态，不能据此断定 MaskInput 损坏）。
- **严重度：** 未取证（本会话）

### 2.15 ForgotPassword 邮箱已发码

- **模块：** ForgotPassword 邮箱 + OTP 倒计时
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-forgot-code-sent.png`。仍在步骤 1。账号为 `rv2.throwaway@example.test`（邮箱明文，无掩码）。OTP 空。原「获取验证码」改为倒计时「**49** 秒」。「下一步」「返回登录」仍在。
- **严重度：** 通过（信息）

### 2.16 ForgotPassword 步骤 2

- **模块：** ForgotPassword 设置新密码
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-forgot-step2.png`。步骤 1 为勾，当前 **2 设置新密码**，3 未完成。新密码空、**红框** + 红字「请输入新密码」。确认密码空占位「请再次输入新密码」，无红框红字。主按钮「重置密码」；描边按钮「上一步」。本图无「返回登录」。
- **严重度：** 通过（信息）

### 2.17 ForgotPassword 完成 Result

- **模块：** ForgotPassword 完成
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** `/tmp/vue-forgot-success.png`。步骤 1、2 为勾，当前 **3 完成**。绿色圆勾 Result：「密码已重置」「请使用新密码登录系统」。实心按钮「返回登录」。无倒计时数字（Roadmap 只要求完成 Result，未要求倒计时）。
- **严重度：** 通过（信息）

### 2.18 左栏卖点末字换行

- **模块：** Guest shell 左栏文案
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：** 登录与两张 2FA 图左栏第 2 条末字「模式」、第 3 条末字「验」单独一行；注册图左栏第 3 条末字「略」单独一行。忘记密码左栏三条未出现同样孤字。卡片本身未溢出 1280×800 画布。
- **严重度：** 低（视觉，不阻塞）

### 2.19 暗色 / 移动 / 已登录游客路由

- **模块：** Auth guest 通用清单
- **端：** Vue
- **视口：** 未拍（仅 13 张浅色桌面 PNG 时）
- **复现：** 上列 13 张均为浅色 **1280×800**。暗色 / 375px / 已登录重定向见 **2.20–2.22**（同会话后续补：chrome-devtools 走查 + CDP 隔离上下文）。
- **严重度：** 见 2.20–2.22

### 2.20 Vue 走查补证（a11y / 网络 / 交互，不只 PNG）

上列 2.3–2.12 若干条标「未取证」是因为 PNG 没拍到 toast/成功页。下列来自同一 Vue 走查会话的 a11y 快照与网络，不是猜图。

- **模块：** Login 空校验 / 错密 / admin 成功 / 已登录重定向
- **端：** Vue
- **视口：** 1280×800，隔离上下文 `vue-auth-review`
- **复现：**
  1. 空表单击「登录」：用户名/密码 `invalid=true`，live 区 **请输入用户名**、**请输入密码**。`/tmp/vue-login-empty-validation.png` 是随后 `fill_form` 只写入首字符后的误拍。
  2. `admin` + `wrongpass`：按钮 busy/disabled；`#tiger-message-container` alert **用户名或密码错误**。PNG 拍晚，toast 已消失。
  3. `admin` / `admin123` → `http://127.0.0.1:5173/dashboard`，「欢迎回来，admin！」，Header `admin`，无「演示模式」。
  4. 同一会话再打开 `/login` `/register` `/forgot-password` `/register-success`，`location.href` 均为 `/dashboard`。
- **严重度：** 通过（信息）

- **模块：** 2FA 错码 Message / 成功
- **端：** Vue
- **视口：** 1280×800，`vue-guest-2fa`
- **复现：**
  1. 错码 `000000`：`POST /api/auth/two-factor/verify` **401** `message=验证码错误`（多次）。`#tiger-message-container` 无子节点（MutationObserver 空）。PNG 无 toast 与网络一致。
  2. 重发：OTP 清空，Countdown 回到约 54s；`Message.success` 同样未进容器。
  3. 「返回登录」后用户名仍 `demo`。再登录填 `123456` → `/dashboard`，「欢迎回来，demo！」。
- **严重度：** 2FA 错码/重发 **Message 不可见**：**中**。成功路径通过。

- **模块：** RegisterSuccess Result + 倒计时
- **端：** Vue
- **视口：** 1280×800，`vue-guest-rest`
- **复现：** 唯一用户名 `rv2vue0827` / `Walk2vue!` → URL `/register-success`。a11y：Result **注册成功** / 「账号已创建，即将返回登录页」；Countdown「即将自动返回登录」当时 **3秒**；「立即登录」。右栏 Result **未**包 Tigercat transparent Card。倒计时结束后自动 `/login`。故 `/tmp/vue-register-success.png` 是跳转后的登录卡。
- **严重度：** 通过（信息）

- **模块：** ForgotPassword MaskInput
- **端：** Vue
- **视口：** 1280×800
- **复现：** 输入 `138` 后 DOM 出现 `data-testid="forgot-phone-mask"`，mask `### #### ####`，值为 `"138 "`（尾空格）。PNG 只显示 `138`。邮箱路径用一次性 `rv2.throwaway@example.test`，未改 admin 密码。
- **严重度：** 通过（信息）

- **模块：** leftover CSS vs Tigercat
- **端：** Vue
- **视口：** 1280×800
- **复现：** 外框 leftover（`shadow-2xl`、`animate-fade-in-up`、`dark:border-slate-850`、`dark:bg-slate-900/90`、渐变左栏）。内层表单是 Tigercat `Card variant="transparent"` + `p-0`。
- **严重度：** 低（信息）

### 2.21 Vue 暗色

- **模块：** 游客页 `.dark`
- **端：** Vue
- **视口：** 1280×800 暗色（隔离上下文，只 reload 游客页，未再登录）
- **复现：** `localStorage tigercat.admin.theme mode=dark` 后 reload。`html.dark`。Guest 背景 `rgb(13, 17, 23)`，右栏 `rgb(22, 27, 34)`，输入暗底。左栏渐变仍亮。无横向溢出。无「演示模式」。`/tmp/vue-login-dark.png` `/tmp/vue-forgot-dark.png`
- **严重度：** 通过（信息）。游客页无主题抽屉，紧凑未切。

### 2.22 Vue 移动 ~375px

- **模块：** 游客页 375px 溢出
- **端：** Vue
- **视口：** **375×812** 暗色
- **复现：**
  1. 登录：左渐变 `display:none`，顶栏 AppLogo + 「Tigercat Admin」居中。`scrollWidth=375`，无横溢。`/tmp/vue-login-mobile-375.png`
  2. 注册：同样单栏，无横溢。`/tmp/vue-register-mobile-375.png`
  3. 忘记密码：Steps 仍完整。**InputOTP 第六格被卡片 `overflow-hidden` 裁切**；「手机号」的「号」叠进 OTP 行。`scrollWidth===clientWidth`（裁切而非可滑）。`/tmp/vue-forgot-mobile-375.png`
- **严重度：** 忘记密码 375px OTP 裁切 / 标签叠字：**中**。登录/注册通过。

---

## 2b. Auth guest (React)

本期只走 React `http://127.0.0.1:5174`。未开 Vue `5173` 页面、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（Allow 已勾选），再在隔离上下文 `react-auth-review` 打开登录页，避免项 1 留下的 admin 会话与 OnboardingTour。账号：`admin` / `admin123`（无 2FA）；`demo` / `demo` + OTP `123456`。

### 2b.1 Guest shell

- **模块：** GuestLayout / 登录卡壳
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-auth-review`，浅色
- **复现：**
  1. `http://127.0.0.1:5174/login`，标题 `tigercat-admin-react`。
  2. 浅灰页底上居中圆角双栏卡（约 896×500，左右留白）。无侧栏、无 Header、无 TagsView、无「演示模式」Tag。`scrollWidth===clientWidth`（1280），无横溢。
  3. 左栏蓝紫渐变铺满左半：圆角 SVG 标 +「Tigercat Admin」；标题「极速、精美的全栈管理系统解决方案」；编号 1/2/3 卖点；左下「© 2026 Tigercat Team. All rights reserved.」。第 2 条末字「模式」、第 3 条末字「验」单独一行（与 Vue 2.18 同形）。
  4. 右栏白底：「欢迎回来」「请输入您的凭据登录系统」；用户名/密码空占位；「忘记密码？」；主按钮「登录」；「还没有账号？立即注册」。
  5. 外框 leftover（`shadow-2xl`、`animate-fade-in-up`、`dark:border-slate-850`、`dark:bg-slate-900/90`、渐变左栏）。内层表单是 Tigercat `Card variant="transparent"` + `p-0`。`GuestLayout` 为居中 `min-h-screen` + `Container`，卡贴齐圆角边。
  6. **品牌 vs Vue AppLogo：** React 左栏用 `LogoIcon` SVG（44×44，`shadow-lg rounded-xl`），不是 Vue `AppLogo` 组件。桌面观感与 Vue 游客卡同布局（圆角「T」形标 + 文案）。右栏另有一份 `md:hidden` 的 48px `LogoIcon`，桌面尺寸为 0。截图 `/tmp/react-login-desktop.png`。
- **严重度：** 通过（信息）。双端壳对齐；品牌组件名不同、画面同形。

### 2b.2 Login 空表单

- **模块：** Login
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：** 用户名/密码为空占位「请输入用户名」「请输入密码」。字段无红框、无红字、无 toast。主按钮可点。
- **严重度：** 通过（信息）

### 2b.3 Login 空态校验

- **模块：** Login 空态校验
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：** 空表单击「登录」。用户名/密码 `aria-invalid=true`，描边 `border-red-500`，红字 **请输入用户名**、**请输入密码**（live 区）。无网络请求、无 Message。`/tmp/react-login-empty-validation.png`。
- **双端：** Vue 2.4 PNG 未拍到空校验；Vue 2.20 后补 a11y 同文案。React 本会话红框+红字均可见。
- **严重度：** 通过（信息）

### 2b.4 Login 错误密码 Message

- **模块：** Login 错误密码 Message
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `Target.createBrowserContext`（`browserContextId=8EE1A1AE…`），浅色。chrome-devtools-mcp `list_pages` 因第二份 MCP 占用 `chrome-profile` 失败；先开 `chrome://inspect/#remote-debugging`（Allow 已勾选，CDP `127.0.0.1:9227`），再用 browser-use CLI。
- **复现：**
  1. 填 `admin` / `wrongpass`，点「登录」。
  2. 顶栏居中白底 toast：红圈叉 + **用户名或密码错误**（`role=alert` / live 区同文案）。字段无红框。仍停在 `/login`。
  3. `#tiger-message-container` 为空（与 Vue 2.20 容器不同；React toast 不进该节点，但画面可见）。截图 `/tmp/react-r2-login-wrong-password.png`。旧图 `/tmp/react-login-wrong-password.png` 拍晚、无 toast。
- **双端：** Vue 错密 Message 在 `#tiger-message-container`；React 同文案为顶栏 toast。两端均可见错误。
- **严重度：** 通过（信息）

### 2b.5 Login admin 成功

- **模块：** Login `admin` 直进后台
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：** 同一游客上下文改密码为 `admin123` 再点「登录」。URL **`http://127.0.0.1:5174/dashboard`**。「欢迎回来，admin !」；Header `admin`；侧栏 + TagsView「仪表盘」；无「演示模式」Tag。首登 OnboardingTour 1/6 overlay 出现（点 × 可关）。截图 `/tmp/react-r2-login-admin-dash.png`。
- **严重度：** 通过（信息）。Tour overlay 属 Shell 期，不阻塞 Auth。

### 2b.6 已登录游客路由重定向

- **模块：** 已登录访问 `/login`
- **端：** React
- **视口：** 桌面 **1280×800**（admin 会话未清）
- **复现：** 登录后依次打开 `/login` `/register` `/forgot-password` `/register-success`，`location.href` 均为 `http://127.0.0.1:5174/dashboard`。
- **双端：** 与 Vue 2.20 一致。
- **严重度：** 通过（信息）

### 2b.7 2FA OTP 步

- **模块：** Login 2FA OTP
- **端：** React
- **视口：** 桌面 **1280×800**，新隔离上下文（guest，无 cookie / localStorage）
- **复现：** `demo` / `demo` 登录后停在 `/login` 两步验证卡。副文「请输入账号 demo 的 6 位验证码」。Alert「演示验证码：123456」。6 格 InputOTP 空；「验证」禁用。Countdown「验证码已发送」「**59** 秒后可重发」（`OTP_RESEND_MS=60000`；首帧拍到 59，未拍到正好 60）。「返回登录」链接。无横溢。截图 `/tmp/react-r2-2fa-otp-step.png`。
- **双端：** 与 Vue 2.7 同形（hint / InputOTP / Countdown / 返回登录）。
- **严重度：** 通过（信息）

### 2b.8 2FA 错误码

- **模块：** Login 2FA 错误码
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：** 六格填 `000000`，「验证」可点。点后顶栏 toast **验证码错误**（live / `role=alert`）。OTP 仍为 `000000`，仍在两步验证卡。截图 `/tmp/react-r2-2fa-wrong-code.png`。
- **双端：** Vue 2.20 错码 `POST …/verify` 401 但 `#tiger-message-container` 空、画面无 toast（中）。React 同文案 toast **可见**。双端不一致。
- **严重度：** React 通过（信息）。双端错码 Message：**中**（Vue 不可见 / React 可见）。

### 2b.9 2FA 重发 Countdown

- **模块：** Login 2FA 重发
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：** 从 59s 等到约 **58s** 后出现「重新发送验证码」。点击后：OTP 清空；Countdown 回到 **59** 秒；顶栏成功 toast「已重新发送，演示验证码：123456」；「验证」再禁用。截图 `/tmp/react-r2-2fa-resend.png`。
- **双端：** Vue 2.20 重发后 Countdown 复位，但 `Message.success` 未进容器。React 成功 toast 可见。
- **严重度：** 通过（信息）

### 2b.10 2FA 返回登录 + 成功

- **模块：** Login 2FA 成功
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：**
  1. 「返回登录」回到「欢迎回来」；用户名/密码仍为 `demo` / `demo`。
  2. 再登录进入两步验证，填 `123456` 点「验证」→ **`http://127.0.0.1:5174/dashboard`**，「欢迎回来，demo！」；Header `demo`；无「演示模式」Tag。截图 `/tmp/react-r2-2fa-success.png`。
- **双端：** 与 Vue 2.20 成功路径一致。
- **严重度：** 通过（信息）

### 2b.11 Register 表单与空校验

- **模块：** Register
- **端：** React
- **视口：** 桌面 **1280×800**，新隔离上下文
- **复现：**
  1. `http://127.0.0.1:5174/register`。左栏品红渐变 + 勾选卖点「创建您的管理账号」（与登录蓝紫不同，与 Vue 2.11 同形）。第 3 条末字「略」单独一行。右栏「创建账号」；透明 Card 表单。无红框。
  2. 空表点「注册」：用户名/密码 `aria-invalid=true`，红框 + live **请输入用户名** / **请输入密码**。截图 `/tmp/react-r2-register-empty-validation.png`。
- **严重度：** 通过（信息）

### 2b.12 RegisterSuccess

- **模块：** RegisterSuccess Result + 倒计时
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：** 一次性用户名 `rv2r0827c` / `Walk2rct!`（非 admin/demo）。跳转 `/register-success`。绿勾 Result **注册成功** / 「即将自动跳转到登录页」；Countdown「即将自动跳转登录」当时 **4秒**；「立即登录」。右栏 Result 包在 Tigercat `Card variant="transparent"`。约 5s 后自动 `/login`。截图 `/tmp/react-r2-register-success.png`。
- **双端：** Vue 2.20 副文「账号已创建，即将返回登录页」/ Countdown「即将自动返回登录」，且 Vue 走查记 Result **未**包 transparent Card。React 副文「即将自动跳转到登录页」/「即将自动跳转登录」，**有** Card。文案与 Card 包裹双端不完全一致，画面都是成功 Result + 倒计时。
- **严重度：** 通过（信息）。文案/Card 包裹差异：**低**。

### 2b.13 ForgotPassword 邮箱 Input（空校验 / 发码 / OTP）

- **模块：** ForgotPassword 验证身份（邮箱）
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-forgot-review`，浅色。先开 `chrome://inspect/#remote-debugging`（Allow 已勾选），再 `new_page` isolatedContext。未登录、无 cookie / localStorage。未改 admin 密码。
- **复现：**
  1. `http://127.0.0.1:5174/forgot-password`。游客双栏卡。左栏青绿渐变（`from-teal-600 via-cyan-600 to-sky-600`），标题「重置您的登录密码」；编号 1/2/3 卖点。右栏「忘记密码」「通过验证码重置账号密码」。Steps：当前 **1 验证身份**，2 设置新密码，3 完成。账号 Input 空占位「请输入邮箱或手机号」；6 格 InputOTP；「获取验证码」；「下一步」；「返回登录」。无侧栏 / Header / TagsView / 「演示模式」。`scrollWidth===clientWidth`（1280）。截图 `/tmp/react-r3-forgot-empty.png`。
  2. 空账号点「获取验证码」：账号 `aria-invalid=true`，描边红（`text-red-900` / `border` 红），live **请输入邮箱或手机号**。无 fetch、无 Message。截图 `/tmp/react-r3-forgot-empty-validation.png`。
  3. 填一次性邮箱 `rv3r.throwaway@example.test`（非 admin/demo），点「获取验证码」。`POST /api/auth/forgot-password/code` **200**（Kestrel），body `channel=email` `target=rv3r.throwaway@example.test`，`data.sentTo` 同值。按钮换成 Countdown **59** 秒；行内「验证码已发送至 rv3r.throwaway@example.test」；a11y status **验证码已发送**（toast 约 2s，截图拍到 Countdown 时已消失）。截图 `/tmp/react-r3-forgot-code-sent.png`。
  4. 仍空 OTP 点「下一步」：六格 `invalid=true`，红字 **请输入验证码**。仍在步骤 1。截图 `/tmp/react-r3-forgot-otp-empty-validation.png`。桌面末格 `getBoundingClientRect` 未超出 form（未裁切）。
  5. OTP 填 `123456` 点「下一步」→ 进入步骤 2「设置新密码」。截图 `/tmp/react-r3-forgot-otp-filled.png`。
- **双端：** Vue 2.13 空校验同文案「请输入邮箱或手机号」。Vue 2.15 发码后 Countdown 同形；Vue 成功 toast 文案为「验证码已发送至 {sentTo}」，React toast 为「验证码已发送」，另有行内 sentTo。Vue 左栏「找回账号访问权限」+ 蓝紫渐变 + 副文「通过邮箱或手机号重置登录密码」；React 左栏「重置您的登录密码」+ 青绿渐变 + 副文「通过验证码重置账号密码」。步骤结构同形（身份 + OTP 同页）。
- **严重度：** 通过（信息）。左栏文案/色板与 toast 文案差异：**低**。

### 2b.14 ForgotPassword 手机 MaskInput

- **模块：** ForgotPassword 手机 MaskInput
- **端：** React
- **视口：** 桌面 **1280×800**，同一隔离上下文（发码前在步骤 1 另测，未对手机发码、未重置密码）
- **复现：**
  1. 账号输入 `1` 后 DOM 出现 `data-testid="forgot-phone-mask"`，组件 `MaskInput`，`mask="### #### ####"`。
  2. 继续键入到 `138`：画面明文 **`138`**，DOM `value="138 "`（尾空格，对应 mask 第一组分隔）。与 Vue 2.14 PNG / 2.20 DOM 同形。截图 `/tmp/react-r3-forgot-phone-mask.png`。
  3. 再键入到七位：画面 **`138 1234`**，DOM `value="138 1234 "`。空格分组可见，即 mask 槽位，不是损坏的明文连写。截图 `/tmp/react-r3-forgot-phone-mask-slots.png`。未发短信、未点「获取验证码」。清掉后走邮箱路径。
- **双端：** Vue 2.14 PNG 只拍到 `138` 中间态（未取证完成态）；Vue 2.20 后补 mask `### #### ####` + `"138 "`。React 本会话拍到分组空格。
- **严重度：** 通过（信息）

### 2b.15 ForgotPassword 步骤 2（空校验）

- **模块：** ForgotPassword 设置新密码
- **端：** React
- **视口：** 桌面 **1280×800**，浅色。先读既有 PNG，再 live 确认。
- **复现：**
  1. `/tmp/react-r2-forgot-step2-empty.png` 与 `/tmp/react-r3-forgot-step2-empty-validation.png` 同画面：步骤 1 为勾，当前 **2 设置新密码**，3 未完成。新密码空、**红框** + 红字 **密码长度不能少于 6 位**。确认密码空占位「请再次输入新密码」，无红框红字。主按钮「重置密码」；描边按钮「上一步」。本图无「返回登录」。`/tmp/react-r3-forgot-step2-empty.png` 是同一步、尚未点提交的空表（无红字）。
  2. 与 2b.13 邮箱路径衔接：OTP `123456` 进步骤 2 后空表点「重置密码」得到上述校验。未改 admin 密码。
- **双端：** Vue 2.16 同为步骤 2 + 「重置密码」/「上一步」；空新密码红字是 **请输入新密码**，React 是 **密码长度不能少于 6 位**。
- **严重度：** 通过（信息）。空校验文案双端不一致：**低**。


### 2b.16 ForgotPassword 完成 Result

- **模块：** ForgotPassword 完成
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文（React `http://127.0.0.1:5174` isolated），浅色。LIVE 走查（会话 01a04443）已走到 Result；CLI 在写入 `/tmp/react-r4-forgot-success.png` 前中断。本条以 live DOM 为准；r4 截图缺失时用既有 `/tmp/react-r2-forgot-success.png` 作支持画面。
- **复现：**
  1. 一次性邮箱 `rv4r.throwaway@example.test`（非 admin/demo）。OTP `123456`。步骤 2 新密码 + 确认均为 `Walk4rct!`，点「重置密码」。
  2. `POST /api/auth/forgot-password/code` **200**；`POST /api/auth/forgot-password` **200**（Kestrel）。
  3. Result 步骤 1、2 为勾，当前 **3 完成**。绿色圆勾：**密码已重置** / **请使用新密码登录系统**。实心按钮 **返回登录**。无倒计时。
  4. 左栏青绿（teal）渐变 + 「重置您的登录密码」。未改 admin 密码。
- **双端：** 与 Vue 2.17 同文案、同三步完成态。Roadmap 只要完成 Result，两端都无倒计时。
- **严重度：** 通过（信息）

### 2b.17 React 暗色 + 移动 ~375px

- **模块：** 游客页 `.dark` / 窄屏溢出
- **端：** React
- **视口：** 暗色窄屏（既有 PNG `/tmp/react-login-dark-mobile.png`、`/tmp/react-forgot-dark-mobile.png`）。本条未再 live 量 `scrollWidth`。
- **复现：**
  1. 登录：左渐变栏收起，顶栏 `LogoIcon` + 「Tigercat Admin」；标题「欢迎回来」。暗底卡、紫主按钮。未见横溢。
  2. 忘记密码步骤 1：暗底单栏卡 + Steps。「验证码」标签与 InputOTP 格重叠（「验」几乎被挡住）。与 Vue 2.22「第六格被 overflow-hidden 裁切 / 号叠进 OTP 行」同属窄屏 OTP 挤叠，表现不完全一样。
- **严重度：** 忘记密码窄屏 OTP/标签叠字：**中**。登录暗色窄屏通过（信息）。紧凑未切（游客页无主题抽屉）。

### 2b.99 双端错位（汇总）

- **模块：** Vue vs React 游客页对齐
- **端：** Vue / React
- **视口：** 见上各条
- **复现：**
  1. **壳：** 两端都是居中 leftover 双栏渐变卡 + 内层 Tigercat `Card variant="transparent"` `p-0`。React 左栏用 `LogoIcon`，Vue 用 `AppLogo`；桌面同形。
  2. **登录：** 空校验文案两端同「请输入用户名/密码」。错密 Message 文案同「用户名或密码错误」；Vue toast 进 `#tiger-message-container`，React 为顶栏 toast（2b.4 两记略有出入，均可见）。admin 成功与已登录重定向两端一致。
  3. **2FA：** React Alert 无 Vue 那句「验证通过后才会写入会话…」（2b.7，低）。错码/重发 Message：Vue 2.20 记容器空、**不可见（中）**；React toast **可见**。成功路径两端都进 dashboard。
  4. **注册成功：** Vue Result 走查记未包 transparent Card；React 有 Card。副文「返回登录」vs「跳转登录」（2b.12，低）。
  5. **忘记密码：** 左栏标题/色板不同（Vue 蓝紫「找回账号访问权限」；React 青绿「重置您的登录密码」）。步骤 2 空校验文案：Vue「请输入新密码」；React「密码长度不能少于 6 位」（低）。完成 Result 同形。窄屏 OTP 两端都挤（中）。
  6. **清单其余：** leftover 渐变 pane 两端都有；游客 overlay 少，2FA/注册成功无额外焦点陷阱问题记入。紧凑未走。
- **严重度：** 功能主路径两端可通过。中：Vue 2FA 错码 Message 不可见；两端忘记密码窄屏 OTP 挤叠。低：品牌组件名、2FA 说明句、RegisterSuccess Card/文案、Forgot 左栏色板与空校验文案。

---

## 3. Shell overlays (Vue)

本期只走 Vue `http://127.0.0.1:5173`。未开 React `5174` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选），再在隔离上下文 `vue-shell-overlays` 打开 `/login`，避免项 1/2 留下的会话与 OnboardingTour。账号 `admin` / `admin123`（无 2FA）。锁屏 PIN `123456`。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。视口桌面 **1280×800**，浅色、非紧凑（除非后文切过）。项 27 挂件（CommandPalette / OnboardingTour / NotificationBell / ShellQuickActions / 改密 Modal / ⌘K / Bell / 快捷按钮）不作为独立走查面。

### 3.1 LockScreen

- **模块：** LockScreen 锁定屏幕
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-shell-overlays`，浅色
- **复现：**
  1. 登录后 `/dashboard`。点 Header 账号 `admin`，下拉含「个人中心 / 主题模式：跟随系统 / 修改密码 / **锁定屏幕** / 退出登录」。截图 `/tmp/vue-lock-avatar-menu.png`。
  2. 点「锁定屏幕」。全屏遮罩 `data-testid="shell-lock-screen"`：`position:fixed; inset:0; z-index:2000`，`1280×800` 铺满视口，`pointer-events:auto`，`backdrop-filter:blur(8px)`，背景 `oklab(… / 0.92)`。侧栏/Header/TagsView/内容被糊住。卡片：`Avatar`「A」、标题 **admin**、副文「已锁定 · 输入 PIN 解锁」、`Statistic` 实时时钟（标题「2026年8月27日星期四」+ 时分秒）、6 格 `InputOTP`（masked numeric）、Alert「演示 PIN：123456」、`NumberKeyboard`（1–9 / 空键 / 0 / Delete / 确定）。`sessionStorage tigercat-admin:lock-screen` = `{"locked":true}`。URL 仍 `/dashboard`。截图 `/tmp/vue-lock-screen.png`。
  3. **Esc 不能绕过：** 按 Escape，遮罩仍在，会话仍 `locked:true`，无其它 dialog。
  4. **⌘K / Cmd-K 不能绕过：** `Meta+k` 与 `Control+k` 后仍只有锁屏 dialog，无命令面板文案、无 Spotlight。截图 `/tmp/vue-lock-screen-after-esc-cmdk.png`。
  5. **错误 PIN：** 点 OTP 第 1 格键入 `000000`。Alert **PIN 错误，请重试**（`data-testid="shell-lock-error"`），六格清空，遮罩仍在。截图 `/tmp/vue-lock-wrong-pin.png`。
  6. **正确 PIN 经 InputOTP：** 再点第 1 格键入 `123456`，遮罩卸载；`sessionStorage` 变为 `{"locked":false}`；仍停在 `http://127.0.0.1:5173/dashboard`，「欢迎回来，admin！」可见。截图 `/tmp/vue-lock-unlocked.png`。
  7. **叠层 / leftover：** 锁屏 `z-[2000]` 高于 Header `10`、ChatDock 容器 `z-40`、水印（此时未开，DOM 无 overlay）。卡片 leftover：`rounded-2xl`、`shadow-lg`、`p2-avatar`、`bg-gradient-to-tr from-(--tiger-primary) to-blue-400`；token 用 `--tiger-bg-page` / `--tiger-bg-card` / `--tiger-border`。NumberKeyboard 文案中英混排（`Delete` 英文、`确定` 中文）。错 PIN 时 overlay `overflow-auto` 右侧出现滚动条（卡片略高于 800 高视口）。a11y 树在 modal 下仍露出「快捷操作」节点（项 27，不审功能），画面上被锁屏盖住。
- **严重度：** 主路径通过（信息）。键盘中英混排 + overlay 滚动条：**低**。

### 3.2 ThemeConfigDrawer

- **模块：** ThemeConfigDrawer 主题配置
- **端：** Vue
- **视口：** 桌面 **1280×800**，浅色（随后切过深色再回浅色）
- **复现：**
  1. Header 调色板按钮 `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`。点开右侧 Drawer 标题「主题配置」，宽约 360px，宿主 `fixed inset-0 z-index:1000`（低于锁屏 `2000`）。内容：外观 `Segmented`（浅色 / 深色 / 跟随系统）；主色 `ColorSwatch` 4 列 8 色（蓝/紫/青/绿/橙/红/粉/灰）；紧凑密度 `Switch` + 副文「收紧内容区内边距，侧栏默认折叠」。默认 **跟随系统** + **蓝色** `#2563eb` + 开关关。遮罩盖住壳。截图 `/tmp/vue-theme-drawer.png`。
  2. 点 **深色**：`html.dark` 立刻加上；`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`；Drawer 与侧栏/主区变暗底。截图 `/tmp/vue-theme-dark.png`。
  3. 点 **浅色**：`html.dark` 去掉；LS `mode=light`。截图 `/tmp/vue-theme-light.png`。
  4. 点主色 **紫色**：`--tiger-primary` 变为 `#7c3aed`；Header 关闭钮描边、仪表盘 Tag、KPI 图标底、色块选中环同步变紫；LS `primaryColor=#7c3aed`。截图 `/tmp/vue-theme-primary-purple.png`。再点回蓝色，主色恢复 `#2563eb`。
  5. **紧凑密度：** 指针点 `Switch`，滑块可拨到开（紫轨），`aria-checked=true`。但 `document.documentElement` **没有** `.compact`，侧栏仍 **240px**，「收起菜单」仍在，`#main-content-scroll` padding 仍 `24px`，LS `compactMode` 仍 `false`。关 Drawer 再开，开关内部态可与 `themePrefs.compactMode` 脱节（仍显示开、LS 仍 false）。空格键能拨动外观，同样不写 LS、不加 `.compact`。截图 `/tmp/vue-theme-compact.png`。
  6. **leftover：** 调色板入口是自定义 `button`（`h-10 w-10 rounded-lg`），不是 Tigercat `Button`。Drawer / Segmented / ColorSwatch / Text 为 Tigercat。`Switch` 按 Tigercat Vue 契约应走 `modelValue` / `update:modelValue`；本抽屉绑的是 `:checked` + `@update:checked`，与观察一致（外观可拨、主题未应用）。
- **严重度：** 浅色 / 深色 / 跟随系统 / 主色通过（信息）。紧凑密度开关不写 `compactMode`、不加 `.compact`、侧栏不折叠：**中**。

### 3.3 Watermark

本期只读既有 PNG，未再走 LockScreen / ThemeConfigDrawer，未改产品代码。6 张图均为 Vue；5 张整页 **1280×800** 浅色，1 张 tile 裁切 **180×80**。文件齐、5 张整页可读；`vue-watermark-tile.png` 几乎全黑、看不出字。图中无地址栏，不从像素发明 URL；画面是系统设置 / 仪表盘 / 锁屏。

- **模块：** 全局内容水印（`/settings` `theme.watermark`）
- **端：** Vue
- **视口：** 桌面 **1280×800**（tile 裁切 180×80）
- **复现：**
  1. **关：** `/tmp/vue-watermark-settings-off.png`。面包屑「管理中心 / 系统管理 / 系统设置」。TagsView：未选「仪表盘」（无关闭钮）、选中「系统设置」带 ×。Card「全局内容水印」+ Tag `theme.watermark`；副文「在内容区（含多标签条）叠加当前用户名与日期。立即生效，保存在本机；不影响内容页草稿水印演示。」。`Switch` 关（灰轨）。内容区、标签条、侧栏、Header **均无** 斜向「admin / 日期」叠层。右下 ChatDock 未读 1。
  2. **拨开后立刻一帧：** `/tmp/vue-watermark-switch-no-overlay.png`。同一设置页，开关已是开（蓝轨、白钮在右），**画面仍无** 斜向水印。标签「仪表盘 / 系统设置」仍清晰、× 仍在。静态图不能证明事件没发出，只证明拨开当帧叠层未画出。
  3. **开且叠层可见：** `/tmp/vue-watermark-on-settings.png`。开关仍开。内容区斜向重复两行：**admin** + **2026-08-27**（浅灰、约 −20°）。侧栏与 Header 无水印。TagsView「仪表盘 / 系统设置」字与 × 仍完整可读，未见水印字压在标签文案上。Logo 卡 / 水印卡 / 登录锁定数字仍能读。
  4. **仪表盘仍在：** `/tmp/vue-watermark-on-dashboard.png`。TagsView：选中「仪表盘」（无 ×）、「系统设置」带 ×。KPI / 折线 / 饼图 / 快捷块上同样 **admin** + **2026-08-27** 斜向铺满。侧栏、Header 无水印。右下 `+` 与客服钮叠在水印之上（仍可见未读 1）。标签条文案仍清晰。
  5. **tile 裁切不可读：** `/tmp/vue-watermark-tile.png` 180×80、2494 字节，几乎全黑，看不出用户名或日期。不以它作正文证据。
  6. **锁屏盖住水印：** `/tmp/vue-watermark-under-lock.png`。全屏锁屏卡（Avatar A、**admin**、PIN、键盘、时钟 10:37:44 / 2026年8月27日星期四）。背后糊成深蓝，**读不出** 「admin / 2026-08-27」水印字。锁屏盖住水印层。
  7. **pointer-events / 不挡标签：** 静态 PNG **点不到**，不能实测 `pointer-events: none`。能确认的是：开水印后标签条仍完整、选中态与 × 仍在，水印是半透明斜字不是实心挡板。侧栏/Header 未被盖。
- **严重度：** `/settings` 开关 → 用户名+当天日期叠层、锁屏盖住水印、标签条不被字挡住：通过（信息）。拨开当帧无叠层：低（随后同页已有叠层；静态图无法区分渲染间隙与开关内部态）。`pointer-events: none`：PNG 未证，不升严重度。

### 3.4 TagsView

本期 live-walk Vue `http://127.0.0.1:5173`。先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选），隔离上下文 `vue-tags-chat` 打开 `/login`，`admin` / `admin123`。首登 OnboardingTour 点「关闭引导」，**未审 Tour**。视口桌面 **1280×800**，浅色。未开 React，未改产品代码。未审项 27。

- **模块：** TagsView 多标签条
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-tags-chat`，浅色
- **复现：**
  1. **仅仪表盘：** 登录后 `/dashboard`。`sessionStorage tigercat-admin:tags-view` = `{"keys":["home"],"activeKey":"home"}`。TagsView 只有「仪表盘」选中，**无关闭钮**（`closableBtn=false`）。「标签操作」三项全 disabled：关闭当前 / 关闭其他 / 关闭全部。截图 `/tmp/vue-tags-home-only.png`、`/tmp/vue-tags-close-all-home-only.png`。
  2. **开多标签：** 侧栏进系统设置、用户管理、项目列表。URL `/projects`。标签顺序 **仪表盘**（无 ×）/ **系统设置**（×「关闭系统设置」）/ **用户管理**（×）/ **项目列表**（选中，×「关闭项目列表」）。storage `keys=["home","settings","users","projects"]` `activeKey=projects`。截图 `/tmp/vue-tags-multi.png`。
  3. **`/projects/:id` 高亮项目列表：** 点「智能运营台」查看详情。URL **`http://127.0.0.1:5173/projects/1001`**。未新增详情标签；TagsView 仍是上列四枚，**项目列表** `data-active=true`。侧栏「项目列表」`aria-current=page`、字色 `rgb(37, 99, 235)`、`font-medium`。面包屑仍「项目 / 项目列表」。storage `activeKey` 仍 `projects`。截图 `/tmp/vue-tags-project-detail.png`。
  4. **关闭当前：** 「标签操作」菜单「关闭当前 / 关闭其他 / 关闭全部」（截图 `/tmp/vue-tags-actions-menu.png`）。在 `/projects/1001` 点「关闭当前」。项目列表标签消失，跳到相邻 **用户管理**，URL `/users`。剩 仪表盘 / 系统设置 / 用户管理（选中）。storage `{"keys":["home","settings","users"],"activeKey":"users"}`。截图 `/tmp/vue-tags-close-current.png`。
  5. **关闭其他：** 仍在用户管理，点「关闭其他」。系统设置标签去掉；仪表盘保留且仍无 ×；用户管理仍选中，URL 仍 `/users`。storage `{"keys":["home","users"],"activeKey":"users"}`。此时「关闭其他」变 disabled（没有其它可关标签）。截图 `/tmp/vue-tags-close-others.png`。
  6. **关闭全部：** 点「关闭全部」。只剩仪表盘，URL `/dashboard`，「欢迎回来，admin！」。storage `{"keys":["home"],"activeKey":"home"}`。再开「标签操作」：关闭当前 / 其他 / 全部 **全 disabled**。仪表盘始终无 ×。
  7. **刷新恢复：** 再打开系统设置 + 用户管理。刷新前 storage `{"keys":["home","settings","users"],"activeKey":"users"}`，URL `/users`。浏览器 reload 后仍 `/users`，三枚标签仍在，用户管理选中，系统设置仍带 ×，仪表盘仍无 ×。storage 同形。截图 `/tmp/vue-tags-after-refresh.png`。Tour 未再挡住壳。
- **严重度：** 通过（信息）。多标签开/关当前/其他/全部、刷新恢复、仪表盘不可关、`/projects/:id` 高亮「项目列表」均按预期。

### 3.5 ChatDock

本期 live-walk Vue `http://127.0.0.1:5173` 已完成（前一 grok-4.6 会话拍齐 PNG 后在写入本节前耗尽回合）。本条只根据既有截图 + 该次走查事实落笔记；**未再走** 发送 / 加载 / 演示回复。未开 React，未改产品代码。未审 Tour / ⌘K / Bell / 快捷操作。先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选），截图 `/tmp/vue-chat-inspect-remote-debugging.png`（本会话复核 `/tmp/vue-chat-inspect-remote-debugging-now.png`，Allow 仍勾选）。视口桌面 **1280×800**，浅色。锁屏盖住 dock 与 ~375px Drawer **本条先记缺口**，写完后再补。

- **模块：** ChatDock 在线客服
- **端：** Vue
- **视口：** 桌面 **1280×800**（9 张业务 PNG 像素均为 1280×800；inspect 页 1042×632）
- **复现：**
  1. **关：** 隔离上下文登录 `admin` / `admin123` 进 `/dashboard`，OnboardingTour 关掉。右下 `FloatButton`（对话气泡）+ `Badge` `variant=danger` 未读 **1**；其上方另有 ShellQuickActions **+**（项 27，不审）。截图 `/tmp/vue-chat-closed-live.png`。更早一张 `/tmp/vue-chat-closed.png` 在用户管理页，同一右下 FAB + 未读 1。
  2. **开：** 点客服钮。右侧 `Drawer` 标题 **在线客服**，宽 **380px**，`mask` + 模糊盖住壳。种子消息「你好，我是在线客服小虎，有任何关于后台的问题都可以问我~」，其下时间戳原文 **`2026-06-29T09:00:00.000Z`**（未本地化）。状态 **客服在线**（绿字）。输入框占位「输入消息，回车发送」，按钮「发送」。截图 `/tmp/vue-chat-open.png`。
  3. **点发送：** `POST /api/chat/messages` **200**。右侧用户气泡 **视觉走查测试消息**（蓝底），时间戳 `2026-08-27T17:52:22.183Z`。演示回复「已收到你的消息：“视觉走查测试消息”。这是演示客服回复，稍后会有同事跟进（ChatWindow 组件示例）。」，时间戳 `2026-08-27T17:52:23.183Z`。截图 `/tmp/vue-chat-sent.png`。
  4. **回车发送：** 同样发出。用户气泡 **回车发送测试** + 同形演示回复（仍点名 ChatWindow）。对话变长后抽屉底部输入框 / 「发送」被裁切。截图 `/tmp/vue-chat-enter-send.png`。
  5. **再关：** 未读 Badge 清掉（`show-zero=false`，FAB 上无 0）。右下客服钮仍在，其上方 ShellQuickActions **+** 仍在。截图 `/tmp/vue-chat-closed-after-open.png`。
  6. **叠层：** 水印开时斜向「admin / 2026-08-27」铺内容区；右下 FAB 叠在水印之上（水印在 dock 下面）。截图 `/tmp/vue-chat-over-watermark.png`。主题配置 Drawer 宿主 `z-index:1000` 盖住 ChatDock 容器 `z-40`（主题抽屉打开时右下看不到客服钮）。截图 `/tmp/vue-chat-under-theme.png`。锁屏 `z-[2000]` **本条 PNG 未拍**（见下缺口）。
  7. **leftover（画面可见）：** 气泡下是 raw ISO 时间戳，不是本地日期时间；textarea 右下角有浏览器原生 resize 拖柄；演示回复文案点名 `ChatWindow` 组件；dock 容器 `z-40` 低于主题 1000 / 锁屏 2000。FloatButton / Badge / Drawer / ChatWindow 为 Tigercat；定位壳是 leftover `fixed bottom-6 right-6 z-40`。
  8. **缺口：** 锁屏盖住 dock **未拍**。移动 Drawer **~375px 未走**。
- **严重度：** 开/关、点发送、回车发送、未读清零、水印在下、主题抽屉盖住 dock：通过（信息）。raw ISO 时间戳 + textarea resize 拖柄 + 演示回复点名 ChatWindow + 对话变长后输入区裁切：**低**。锁屏叠层、375px Drawer：未取证（本条）。

---

## 3b. Shell overlays (React)

本期只走 React `http://127.0.0.1:5174`。未开 Vue `5173` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/react-shell-inspect-remote-debugging.png`），再在隔离上下文 `react-shell-overlays` 打开 `/login`，未复用 `vue-shell-overlays` / `vue-tags-chat`。账号 `admin` / `admin123`（无 2FA）。锁屏 PIN `123456`。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。视口桌面 **1280×800**，浅色、非紧凑（除非后文切过）。项 27 挂件（CommandPalette / OnboardingTour / NotificationBell / ShellQuickActions / 改密 Modal / ⌘K / Bell / 快捷按钮）不作为独立走查面。未走 Watermark / TagsView / ChatDock。

### 3b.1 LockScreen

- **模块：** LockScreen 锁定屏幕
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-shell-overlays`，浅色
- **复现：**
  1. 登录后 `/dashboard`。点 Header 账号 `admin`，下拉含「个人中心 / 主题模式：跟随系统 / 修改密码 / **锁定屏幕** / 退出登录」。截图 `/tmp/react-lock-avatar-menu.png`。
  2. 点「锁定屏幕」。全屏遮罩 `data-testid="shell-lock-screen"`：`position:fixed; inset:0; z-index:2000`，`1280×800` 铺满视口，`pointer-events:auto`，`backdrop-filter:blur(8px)`，背景 `oklab(… / 0.92)`。侧栏/Header/TagsView/内容被糊住。卡片：`Avatar`「A」、标题 **admin**、副文「已锁定 · 输入 PIN 解锁」、`Statistic` 实时时钟（标题「2026年8月27日星期四」+ 时分秒）、6 格 `InputOTP`（masked numeric）、Alert「演示 PIN：123456」、`NumberKeyboard`（1–9 / 空键 / 0 / Delete / 确定）。`sessionStorage tigercat-admin:lock-screen` = `{"locked":true}`。URL 仍 `/dashboard`。截图 `/tmp/react-lock-screen.png`。
  3. **Esc 不能绕过：** 按 Escape，遮罩仍在，会话仍 `locked:true`，无其它 dialog。
  4. **⌘K / Cmd-K 不能绕过：** `Meta+k` 与 `Control+k` 后仍只有锁屏 dialog，无命令面板文案、无 Spotlight。截图 `/tmp/react-lock-screen-after-esc-cmdk.png`。
  5. **错误 PIN 经 InputOTP：** 点 OTP 第 1 格填 `000000`。Alert **PIN 错误，请重试**（`data-testid="shell-lock-error"`），六格清空，遮罩仍在。错 PIN 时 overlay `overflow:auto`、`scrollHeight=820` > `clientHeight=800`，右侧出现滚动条。截图 `/tmp/react-lock-wrong-pin.png`。
  6. **正确 PIN 经 InputOTP：** 再点第 1 格填 `123456`，遮罩卸载；`sessionStorage` 变为 `{"locked":false}`；仍停在 `http://127.0.0.1:5174/dashboard`，「欢迎回来，admin！」可见。截图 `/tmp/react-lock-unlocked.png`。
  7. **叠层 / leftover：** 锁屏 `z-[2000]` 高于 Header `10`、ChatDock 容器 `fixed bottom-6 right-6 z-40`（右下客服钮 + 未读 1 透过模糊可见、被锁屏盖住，**未走 ChatDock**）、水印（此时未开，DOM 无 overlay）。主题抽屉本步未开。卡片 leftover：`rounded-2xl`、`shadow-lg`、`p2-avatar`、`bg-gradient-to-tr from-(--tiger-primary) to-blue-400`；token 用 `--tiger-bg-page` / `--tiger-bg-card` / `--tiger-border`。NumberKeyboard 文案中英混排（`Delete` 英文、`确定` 中文）。a11y 树在 modal 下仍露出「快捷操作」节点（项 27，不审功能），画面上被锁屏盖住。`#tiger-message-container` `z-[9999]` 存在但空。
- **双端：** 与 Vue 3.1 同形（入口菜单、全屏 `z-[2000]` 糊层、InputOTP + NumberKeyboard、Esc / ⌘K 不绕过、错 PIN Alert + 清空、正确 PIN 解锁）。Vue 3.1 记错 PIN 时 overlay 滚动条 + 键盘中英混排（低）；React 同。
- **严重度：** 主路径通过（信息）。键盘中英混排 + overlay 滚动条：**低**。

### 3b.2 ThemeConfigDrawer

本期只走 React `http://127.0.0.1:5174` ThemeConfigDrawer。浅色 / 深色 / 跟随系统 / 主色 **不重走**：以上一会话已拍、本会话可读的四张 PNG 落笔记（live-walk 当时未写入本文件）。紧凑密度 Switch **本会话 live 核**。未开 Vue `5173` 页面，未改产品代码。未走 Watermark / TagsView / ChatDock，未审项 27。视口桌面 **1280×800**。四张图 IHDR 均为 **1280×800**，文件齐、可读。

- **模块：** ThemeConfigDrawer 主题配置（PNG 读图：外观 / 主色；live：紧凑）
- **端：** React
- **视口：** 桌面 **1280×800**（四张既有 PNG 像素相同）
- **复现（四张既有 PNG，未再切 light/dark/system/primary）：**
  1. **Header 调色板触发 → Drawer 打开。** `/tmp/react-theme-drawer.png`。右侧 Drawer 已开，标题 **主题配置**，右上关闭 ×（圆角描边钮）。壳（侧栏 Tigercat / Header 面包屑「管理中心 / 仪表盘」/ 主区「欢迎回来，admin !」）被半透明遮罩糊住。Header 调色板入口本身在本批打开态图里被 mask 盖住，看不见按钮像素；从文件名 + Drawer 已开可确认走查路径是 Header 调色板打开本抽屉。内容：外观 `Segmented` **浅色 / 深色 / 跟随系统**（本图选中 **跟随系统**，白底胶囊在右）；主色 `ColorSwatch` 4 列 8 色（蓝勾选 + 蓝环 / 紫 / 青 / 绿 / 橙 / 红 / 粉 / 灰）；紧凑密度 `Switch` **关**（灰轨、白钮在左）+ 副文「收紧内容区内边距，侧栏默认折叠」。默认画面 = **跟随系统 + 蓝色主色 + 紧凑关**。KPI 图标底为蓝。侧栏仍展开（底栏「收起菜单」可见）。
  2. **深色。** `/tmp/react-theme-dark.png`。Segmented 选中 **深色**。Drawer、侧栏、主区、KPI 卡均为暗底；折线仍可见。主色仍是蓝色勾选。紧凑 Switch 仍关。画面整壳已暗，**html.dark 从像素上看已生效**（类名本身读不到）。
  3. **浅色。** `/tmp/react-theme-light.png`。Segmented 选中 **浅色**。Drawer / 侧栏 / 主区回到浅底。主色仍蓝色勾选。紧凑 Switch 仍关。与深色图对比，暗底已去掉。
  4. **主色紫色。** `/tmp/react-theme-primary-purple.png`。Segmented 回到 **跟随系统**。ColorSwatch **紫色勾选 + 紫环**；KPI 图标底、仪表盘 Tag、欢迎卡 Logo 底、Drawer 关闭钮描边同步变紫。折线系列仍是蓝（未跟主色）。紧凑 Switch 仍关。`--tiger-primary` 具体 hex、`localStorage tigercat.admin.theme` JSON **本批 PNG 读不到，不发明**。
  5. **leftover（画面可见）：** 四张都是右侧 Drawer + 全屏 mask，内层外观 / 主色 / 紧凑是 Tigercat Segmented / ColorSwatch / Switch / Text。Header 调色板触发钮被 mask 挡住，本批图不能从像素判定它是不是 leftover `<button>`。紫主色下折线仍蓝，属画面可见的未跟 token。四张 Switch 都关，侧栏都未折叠。
- **严重度（PNG 段）：** 跟随系统默认 + 深色暗底 + 浅色回浅 + 紫色主色跟 KPI/Logo/Tag：通过（信息）。`html` class 字符串、`--tiger-primary` hex、`localStorage` 键值：PNG 未证。紧凑密度：四张均为关，见下 live。

- **模块：** ThemeConfigDrawer 紧凑密度 Switch（live）
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-theme-compact`（未复用 `react-shell-overlays` / `vue-shell-overlays` / `vue-tags-chat`），浅色、默认非紧凑
- **复现：**
  1. 先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/react-theme-inspect-remote-debugging.png`）。`new_page` isolatedContext `react-theme-compact` 打开 `http://127.0.0.1:5174/login`，`admin` / `admin123`。进 `/dashboard` 后 OnboardingTour 1/6 点「关闭引导」关掉，**未审 Tour**。
  2. Header `button` `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`（leftover：自定义 `h-10 w-10 rounded-lg`，不是 Tigercat `Button`）。点开右侧 Drawer 标题 **主题配置**，宿主 `fixed` `z-index:1000`，宽约 360px + mask。Segmented **跟随系统**；ColorSwatch **蓝色**；`--tiger-primary` = `#2563eb`。拨前：`html` 无 class（无 `.compact`、无 `.dark`）；`localStorage tigercat.admin.theme` **不存在**（本隔离上下文未写过主题）；Switch `aria-checked=false`；侧栏 `aside` **240px**，「收起菜单」在；`#main-content-scroll` padding **24px**。
  3. **拨开紧凑密度 Switch。** 滑块到开（蓝轨 `rgb(37, 99, 235)`，白钮在右），a11y `switch checked`，`aria-checked=true`。拨后立刻：
     - `localStorage tigercat.admin.theme` = `{"mode":"system","primaryColor":"#2563eb","compactMode":true}`（键 `tigercat.admin.theme` 的 `compactMode` **已写入 true**）
     - `document.documentElement` class = `compact`（**有** `.compact`，无 `.dark`）
     - 侧栏 `aside` 宽 **64px**，带 `tiger-sidebar-collapsed`；画面为图标栏（品牌只剩「T」、菜单无文字）。Header 汉堡从「关闭导航菜单」变成「打开导航菜单」
     - `#main-content-scroll` padding **16px**（由 24px 收紧）
     - Switch `aria-checked=true` 与 LS `compactMode:true` **一致**
  4. 截图 `/tmp/react-theme-compact.png`（1280×800）。Drawer 仍开：跟随系统 + 蓝色 + 紧凑开。未再切浅色/深色/主色。
- **双端：** Vue **3.2** 紧凑 Switch 可拨到开，但 **不写** `compactMode`、**不加** `.compact`、侧栏仍 240px、`#main-content-scroll` 仍 24px（中）。React 本会话 **同一操作会写 LS / 加 `.compact` / 侧栏折到 64px / padding 24→16**。两端不一致：Vue 有缺陷，React 无此缺陷。
- **严重度：** React 紧凑密度通过（信息）。双端紧凑：**中**（仅 Vue；React 已 live 否定同一 bug）。Header 调色板 leftover `<button>`：**低**（与 Vue 3.2 同形）。

### 3b.3 Watermark

本期 live-walk React `http://127.0.0.1:5174` Watermark。先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/react-watermark-inspect-remote-debugging.png`，1042×632）。`new_page` isolatedContext `react-watermark-tags` 打开 `/login`，未复用 `react-shell-overlays` / `react-theme-compact` / `vue-shell-overlays` / `vue-tags-chat`。账号 `admin` / `admin123`。进 `/dashboard` 后 OnboardingTour 1/6 点「关闭引导」关掉，**未审 Tour**。视口桌面 **1280×800**，浅色。锁屏只用来确认水印叠层，**不重走 3b.1 / 3b.2**。未开 Vue 页面，未改产品代码。未审项 27。未走 ChatDock。

- **模块：** 全局内容水印（`/settings` `theme.watermark`）
- **端：** React
- **视口：** 桌面 **1280×800**（tile 裁切 180×80；inspect 页 1042×632）
- **复现：**
  1. **关：** 侧栏「系统管理 / 系统设置」进 `http://127.0.0.1:5174/settings`。Card「内容水印」内行：**全局内容水印** + Tag `theme.watermark`；副文「在内容区（含多标签条）叠加当前用户名与日期。立即生效，保存在本机；不影响内容页草稿水印演示。」。`Switch` `data-testid="setting-theme-watermark-switch"` `aria-checked=false`（灰轨）。DOM **无** `[data-testid="shell-watermark"]`。`localStorage tigercat-admin:watermark` 不存在。TagsView：未选「仪表盘」（无关闭钮）、选中「系统设置」带 ×。侧栏 / Header / 内容区均无斜向叠层。截图 `/tmp/react-watermark-settings-off.png`（1280×800）。
  2. **拨开：** 点 Switch。立刻 `aria-checked=true`（蓝轨 `bg-[var(--tiger-primary,#2563eb)]`），LS = `{"enabled":true}`。当帧 DOM 已有 overlay `data-testid="shell-watermark"`：`pointer-events-none absolute inset-0 z-[9]`，铺内容窗格（含 TagsView 几何范围）`1040×703`，`top:97 left:240`。内层 Tigercat `Watermark`：`data-watermark="true"` `pointer-events:none` `z-index:9`，`background-image` 为 180×80 PNG tile、`background-repeat:repeat`、`background-size:280px 180px`。`/tmp/react-watermark-switch-no-overlay.png` 与随后 `/tmp/react-watermark-on-settings.png` **同一文件**（SHA256 相同，1280×800 / 195243 字节）：开关已开，内容区斜向重复两行 **admin** + **2026-08-27**（浅灰、约 −20°）。侧栏与 Header 无水印。TagsView「仪表盘 / 系统设置」字与 × 仍完整可读。未观察到 Vue 3.3 那张「开关已开、画面仍无斜字」的独立帧。
  3. **tile：** `/tmp/react-watermark-tile.png` 180×80、2494 字节，几乎全黑（像素 alpha 最高 38），肉眼读不出字。对比增强 `/tmp/react-watermark-tile-boosted.png` 可见斜向 **admin** / **2026-08-27**。不以原 tile 作正文证据。
  4. **不挡标签 / pointer-events：** overlay `pointer-events:none`（宿主与 `data-watermark` 内层均为 none）。`elementFromPoint` 打在标签条命中 `shell-tag-home` / `shell-tags-view`，打在主区命中内容 `div.space-y-6`，**打不中** overlay。开水印后点 TagsView「仪表盘」，URL 从 `/settings` 变为 `/dashboard`，标签选中切走——**live 证明不挡点击**。截图 `/tmp/react-watermark-on-dashboard.png`（1280×800）：选中「仪表盘」（无 ×）、「系统设置」带 ×；KPI / 折线 / 饼图 / 快捷块上同样斜向 **admin** + **2026-08-27**。侧栏、Header 无水印。右下客服钮 + 未读 1 叠在水印之上（ChatDock 不审）。
  5. **锁屏盖住水印：** Header `admin` →「锁定屏幕」（不重走 3b.1 功能）。全屏 `data-testid="shell-lock-screen"` `position:fixed; inset:0; z-index:2000`，`pointer-events:auto`，`backdrop-filter:blur(8px)`，背景 `oklab(… / 0.92)`。水印层仍在 DOM（`z-index:9`，`visible` 尺寸 1040×703），但锁屏 z 2000 > 9；`elementFromPoint(640,400)` 与标签条位置均命中锁屏，**读不出** 「admin / 2026-08-27」水印字。`sessionStorage tigercat-admin:lock-screen` = `{"locked":true}`。截图 `/tmp/react-watermark-under-lock.png`。PIN `123456` 解锁后回到 `/dashboard`（仅恢复走查，不记锁屏缺陷）。
  6. **叠层 / leftover：** 水印 `z-[9]` 低于 Header `10`、锁屏 `2000`、主题抽屉 `1000`（本步未开抽屉）。ChatDock 容器仍是 leftover `fixed bottom-6 right-6 z-40`（高于水印，FAB 压在斜字上，**未审 ChatDock**）。overlay 宿主 leftover：`pointer-events-none absolute inset-0 z-[9]`。内层 wrapper class 出现重复 `relative relative`。设置页水印行是 leftover flex 行（`flex … rounded-md p-2`）包 Tigercat `Text` / `Tag` / `Switch`；外层 `Card title="内容水印"`。tile 原图与 Vue 一样几乎全黑。
- **双端：** 与 Vue **3.3** 同形：`/settings` Card + Tag `theme.watermark` + Switch；叠层 **admin** + 当天日期斜向；锁屏盖住水印；标签条仍可读。Vue 3.3 `pointer-events: none` 为 PNG 未证；React 本会话 live 点击标签切走，已证。Vue 有「拨开当帧无叠层」（低）；React 拨开当帧 DOM 已有 overlay，两张开关后整页图相同。Vue tile 180×80 几乎全黑；React 原 tile 同样 180×80 / 2494 字节几乎全黑，boost 后能读字。
- **严重度：** `/settings` 开关 → 用户名+当天日期叠层、锁屏盖住水印、标签条可读且可点：通过（信息）。`pointer-events: none`：React live 已证（通过）。原 tile PNG 不可读：与 Vue 同，不升严重度。wrapper `relative relative` leftover：**低**。

### 3b.4 TagsView

本期 live-walk React `http://127.0.0.1:5174` TagsView。先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/react-tags-inspect-remote-debugging.png`，1042×632）。`new_page` isolatedContext `react-tags-view` 打开 `/login`，未复用 `react-shell-overlays` / `react-theme-compact` / `react-watermark-tags` / `vue-shell-overlays` / `vue-tags-chat`。账号 `admin` / `admin123`。进 `/dashboard` 后 OnboardingTour 1/6 点「关闭引导」关掉，**未审 Tour**。视口桌面 **1280×800**，浅色。未开 LockScreen / Theme drawer。未开 Vue 页面，未改产品代码。未审项 27。未走 ChatDock。

- **模块：** TagsView 多标签条
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-tags-view`，浅色
- **复现：**
  1. **仅仪表盘：** 登录后 `http://127.0.0.1:5174/dashboard`。`sessionStorage tigercat-admin:tags-view` = `{"keys":["home"],"activeKey":"home"}`（键与 Vue 3.4 相同）。TagsView `data-testid="shell-tags-view"` 只有「仪表盘」`shell-tag-home` `data-active=true`，**无关闭钮**（`closable=false` / 无 × 按钮 / a11y 树上 tab 无 close）。「标签操作」`shell-tags-view-actions` 打开后三项全 disabled（`aria-disabled=true`、`opacity-50`、`cursor-not-allowed`）：关闭当前 / 关闭其他 / 关闭全部。截图 `/tmp/react-tags-home-only.png`、`/tmp/react-tags-close-all-home-only.png`（1280×800；覆盖先前 home-only 半成品）。leftover 宿主 class：`p2-tags-view` / `p2-tags-view-list` + token 边框/底。
  2. **开多标签：** 侧栏进系统设置、用户管理、项目列表。URL `/projects`。标签顺序 **仪表盘**（无 ×）/ **系统设置**（×「关闭系统设置」）/ **用户管理**（×）/ **项目列表**（选中，×「关闭项目列表」）。storage `keys=["home","settings","users","projects"]` `activeKey=projects`。侧栏「项目列表」`aria-current=page`、字色 `rgb(37, 99, 235)`、`font-medium`。截图 `/tmp/react-tags-multi.png`（1280×800）。
  3. **`/projects/:id` 高亮项目列表：** 点「智能运营台」查看详情。URL **`http://127.0.0.1:5174/projects/1001`**。未新增详情标签；TagsView 仍是上列四枚，**项目列表** `data-active=true`。侧栏「项目列表」`aria-current=page`、字色 `rgb(37, 99, 235)`、`font-medium`。面包屑仍「项目 / 项目列表」。storage `activeKey` 仍 `projects`。截图 `/tmp/react-tags-project-detail.png`（1280×800）。
  4. **关闭当前：** 「标签操作」菜单三项均可用（`aria-disabled=false`、opacity 1）：关闭当前 / 关闭其他 / 关闭全部（截图 `/tmp/react-tags-actions-menu.png`）。在 `/projects/1001` 点「关闭当前」。项目列表标签消失，跳到相邻 **用户管理**，URL `/users`。剩 仪表盘（无 ×）/ 系统设置（×）/ 用户管理（选中，×）。storage `{"keys":["home","settings","users"],"activeKey":"users"}`。截图 `/tmp/react-tags-close-current.png`（1280×800）。
  5. **关闭其他：** 本会话隔离上下文 `react-tags-view-rest`（未复用 `react-tags-view` / `react-watermark-tags` / `react-shell-overlays` / `react-theme-compact` / `vue-*`）。先开 `chrome://inspect/#remote-debugging`，「Allow remote debugging for this browser instance」已勾选（截图 `/tmp/react-tags-rest-inspect-remote-debugging.png`）。`admin` / `admin123` 登录，OnboardingTour 点「关闭引导」关掉（未审 Tour）。视口 **1280×800**。侧栏开系统设置 + 用户管理，当前 `/users`，storage `{"keys":["home","settings","users"],"activeKey":"users"}`。点「关闭其他」。系统设置标签去掉；仪表盘保留且仍无 ×；用户管理仍选中，URL 仍 `/users`。storage `{"keys":["home","users"],"activeKey":"users"}`。再开「标签操作」：「关闭其他」变 disabled（`aria-disabled=true`、`opacity-50`、`cursor-not-allowed`）；「关闭当前」「关闭全部」仍可用。截图 `/tmp/react-tags-close-others.png`（live 复核后覆盖，1280×800；画面：仪表盘无 × + 用户管理选中带 ×）。
  6. **关闭全部：** 点「关闭全部」。只剩仪表盘（无 ×），URL `/dashboard`，「欢迎回来，admin！」。storage `{"keys":["home"],"activeKey":"home"}`。再开「标签操作」：关闭当前 / 关闭其他 / 关闭全部 **全 disabled**（三项 `aria-disabled=true`、`opacity-50`、`cursor-not-allowed`）。仪表盘始终无 ×。截图 `/tmp/react-tags-close-all.png`（1280×800；菜单三项灰色）。
  7. **刷新恢复：** grok-4.6 两轮 max-turns 后，隔离 Playwright 上下文 `react-tags-refresh` live 复核（视口 **1280×800**，`admin` / `admin123`；`localStorage tigercat-admin:onboarding-tour:done=1` 抑制 Tour，**未审 Tour**）。打开系统设置 + 用户管理。刷新前 URL `/users`，storage `{"keys":["home","settings","users"],"activeKey":"users"}`。reload 后仍 `/users`，三枚标签仍在：仪表盘（无 ×）/ 系统设置（×）/ 用户管理（选中，×）。storage 同形。截图 `/tmp/react-tags-after-refresh.png`（1280×800；主区当帧仍「加载中…」，标签条与侧栏「用户管理」高亮已恢复）。刷新前对照 `/tmp/react-tags-before-refresh.png`。
  8. **仪表盘不可关：** 全程 `shell-tag-home` 无 ×（`closable=false`）。仅仪表盘时「关闭当前 / 关闭其他 / 关闭全部」三项全 disabled（步 1、步 6）。多标签时关当前/其他也不会掉仪表盘。
- **双端：** 与 Vue **3.4** 同形：仅仪表盘无 ×、三项关闭全 disabled；开 系统设置 / 用户管理 / 项目列表 后四枚标签；`/projects/1001` 不另开详情标签，仍高亮「项目列表」、`activeKey=projects`；关闭当前跳相邻用户管理；关闭其他留仪表盘+当前；关闭全部回 `/dashboard` 且三项再 disabled；`sessionStorage tigercat-admin:tags-view` 键值同形，刷新后 keys/activeKey 恢复。未见错位。leftover 宿主 `p2-tags-view` / `p2-tags-view-list` 与 Vue 同类（token 边框/底）。
- **严重度：** 通过（信息）。多标签开/关当前/其他/全部、刷新恢复、仪表盘不可关、`/projects/:id` 高亮「项目列表」均按 Vue 3.4 预期。未走 ChatDock / 暗色 / 移动 / 项 27。

### 3b.5 ChatDock

本期 live-walk React `http://127.0.0.1:5174` 已完成（前一 grok-4.6 会话在隔离上下文 `react-chatdock` 拍齐 PNG 后，写入本节前耗尽回合）。本条只根据既有截图 + 该次走查事实落笔记；**未再走** 发送 / 加载 / 演示回复。未开 Vue 页面（只对照 Vue **3.5**），未改产品代码。未审 Tour / ⌘K / Bell / 快捷操作。先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选），截图 `/tmp/react-chat-inspect-remote-debugging.png`（1042×632；本会话复核 `/tmp/react-chat-inspect-remote-debugging-now.png`，Allow 仍勾选）。视口桌面 **1280×800**，浅色。锁屏盖住 dock：写完本节后在隔离上下文 `react-chatdock-lock` **lock 一次**确认（不重走 3b.1 PIN / Esc / ⌘K）。移动 Drawer **~375px 未走**。

- **模块：** ChatDock 在线客服
- **端：** React
- **视口：** 桌面 **1280×800**（8 张业务 PNG 像素均为 1280×800；inspect 页 1042×632）
- **复现：**
  1. **关：** 隔离上下文 `react-chatdock` 登录 `admin` / `admin123` 进 `/dashboard`，OnboardingTour 关掉。右下 wrap `fixed bottom-6 right-6 z-40`，wrapRect **56×56** at **1200,720**。`FloatButton` `data-tour=chat-dock` `aria-label="联系在线客服"`，56px 圆 `rgb(37,99,235)`。`Badge` `danger` 未读 **1**（span 20×20 at 1240,716）。其上方另有 ShellQuickActions **+**（项 27，不审）。截图 `/tmp/react-chat-closed.png`（1280×800）。
  2. **开：** 点客服钮。右侧 `Drawer` 标题 **在线客服**，宽 **380px**（dialogRect x900 y0 w380 h800），`mask` + `backdrop-blur(2px)` `rgba(0,0,0,0.5)` 铺满 1280×800。`GET /api/chat/messages` **200**（共享 in-memory Api 已有 Vue 3.5 走查气泡）。种子「你好，我是在线客服小虎，有任何关于后台的问题都可以问我~」，其下时间戳原文 **`2026-06-29T09:00:00.000Z`**（未本地化），再加上 Vue 走查气泡（「视觉走查测试消息」`2026-08-27T17:52:22.183Z` 等）。状态 **客服在线**（绿字）。输入框占位「输入消息，回车发送」，按钮「发送」。因线程已含 Vue 气泡，开态图里输入框/发送已贴底、部分被裁。截图 `/tmp/react-chat-open.png`。
  3. **点发送：** `POST /api/chat/messages` **200**。用户气泡 **React视觉走查测试消息**（蓝底），时间戳 `2026-08-27T18:49:53.089Z`。演示回复「已收到你的消息：“React视觉走查测试消息”。这是演示客服坞，稍后会有同事跟进（ChatWindow 组件示例）。」，时间戳 `2026-08-27T18:49:54.089Z`。`textarea` `resize=vertical`。长线程后输入/发送 bottoms **1034 > viewport 800**（裁切）。截图 `/tmp/react-chat-sent.png`。
  4. **回车发送：** 同样 `POST` **200**。用户气泡 **React回车发送测试** `2026-08-27T18:50:21.419Z` + 同形演示回复（仍点名 ChatWindow，文案「演示客服坞」）`2026-08-27T18:50:22.419Z`。textarea/发送仍不在视口内。截图 `/tmp/react-chat-enter-send.png`。
  5. **再关：** 未读 Badge 清掉（`badgeSpans=[]`，`unreadStatusNearFab=false`，`showZero=false`，FAB 上无 0）。FAB 仍 `aria-label` **联系在线客服**。右下客服钮仍在，其上方 ShellQuickActions **+** 仍在。截图 `/tmp/react-chat-closed-after-open.png`。
  6. **叠层：** 水印 overlay `pointer-events-none` `z-[9]` 1040×703 at 240,97；`localStorage tigercat-admin:watermark` = `{"enabled":true}`。dock `z-40` 在水印之上（右下 FAB 压在斜字上，未读已清）。截图 `/tmp/react-chat-over-watermark.png`。主题配置 Drawer 宿主 `z-index:1000` 盖住 ChatDock `z-40`（主题抽屉打开时右下看不到客服钮）。截图 `/tmp/react-chat-under-theme.png`。锁屏 `z-[2000]` 盖住 ChatDock `z-40`：`data-testid="shell-lock-screen"` `position:fixed; inset:0; z-index:2000`，`pointer-events:auto`，`backdrop-filter:blur(8px)` 铺满 1280×800。dock wrap 仍 `fixed bottom-6 right-6 z-40`（56×56 at 1200,720），FAB 在 DOM 中仍 `aria-label` 联系在线客服、透过模糊可见，但 `elementFromPoint(1228,748)` 命中锁屏而非 FAB。`sessionStorage tigercat-admin:lock-screen` = `{"locked":true}`。截图 `/tmp/react-chat-under-lock.png`（1280×800）。不重走 PIN / Esc / ⌘K。
  7. **leftover（画面可见 / 走查已量）：** 气泡下是 raw ISO 时间戳，不是本地日期时间；textarea 右下角 `resize=vertical` 原生拖柄；演示回复文案点名 `ChatWindow` 组件且写「演示客服坞」（Vue 3.5 记「演示客服回复」）；dock 容器 leftover `fixed bottom-6 right-6 z-40`，低于主题 1000 / 锁屏 2000。FloatButton / Badge / Drawer / ChatWindow 为 Tigercat。长线程后输入区裁切。
  8. **缺口：** 移动 Drawer **~375px 未走**。
- **双端：** 与 Vue **3.5** 同形：关态右下 FAB + 未读 1；开态右侧 Drawer 标题「在线客服」宽 380px + mask 模糊；种子小虎文案 + raw ISO `2026-06-29T09:00:00.000Z`；「客服在线」绿字；占位「输入消息，回车发送」+「发送」；点发送 / 回车均 `POST /api/chat/messages` 200；关后未读清零且 FAB 仍在；水印在 dock 下、主题抽屉盖住 dock；raw ISO + textarea resize + 点名 ChatWindow + 长线程输入裁切。共享 in-memory Api 使 React 开态已带 Vue 3.5 气泡（GET messages 200）。锁屏叠层：React 本条已证 `z-2000` 盖住 dock `z-40`；Vue 3.5 当时未拍。**错位：** 演示回复 React 写「这是**演示客服坞**」，Vue 3.5 记「这是**演示客服回复**」（两端都点名 ChatWindow）。
- **严重度：** 开/关、点发送、回车发送、未读清零、水印在下、主题抽屉盖住 dock、锁屏盖住 dock：通过（信息）。raw ISO 时间戳 + textarea resize 拖柄 + 演示回复点名 ChatWindow + 对话变长后输入区裁切：**低**。演示回复「客服坞」vs「客服回复」：**低**（文案错位）。375px Drawer：未取证（本条）。

---

## 4. Home / Dashboard (Vue)

本期只走 Vue `http://127.0.0.1:5173/dashboard`（`HomePage.vue`）。未开 React `5174` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/vue-home-inspect-remote-debugging.png`），再在隔离上下文 `vue-home-dashboard` 打开 `/login`，未复用 `vue-shell-overlays` / `vue-tags-chat` / `react-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme（除 4.6 只为查 dashboard token 而拨暗色）/ Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `HomePage.vue`、`MetricCard.vue`、`MetricGrid.vue`、`ChartEmptyState.vue`、`PageHeader.vue`：HomePage **不 import** `PageHeader`。

### 4.1 Welcome

- **模块：** 仪表盘欢迎卡（welcome-back / AppLogo / 用户名 / 身份 Tag / leftover `p2-page-accent`）
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-home-dashboard`，浅色
- **复现：**
  1. 登录后 URL **`http://127.0.0.1:5173/dashboard`**。Tour 关掉后主区第一块是 Tigercat `Card`（`overflow-hidden`，圆角 `--tiger-radius-lg`，白底 `rgb(255,255,255)`，描边 `--tiger-border`）。截图 `/tmp/vue-home-welcome.png`（1280×800）。
  2. **AppLogo：** 卡内左侧 `svg.drop-shadow-sm` **48×48**（`AppLogo :size="48"`），`filter: drop-shadow(rgba(0,0,0,0.15) 0px 1px 2px)`。画面是蓝底白 T，与侧栏品牌同形。
  3. **用户名：** 文案 **「欢迎回来，admin！」**（`session.username`）。`Text` `size=lg` `weight=bold`（18px / 700），颜色 `rgb(17,24,39)`，class 同时带 Tigercat `text-[var(--tiger-text,#111827)]` 与 leftover **`p2-text-primary`**。
  4. **副文：** 画面是 **Hello world**（inject `homeMessage`，不是模板兜底「今天是个好日子，让我们开始工作吧！」）。
  5. **Tag：** 右侧 Tigercat `Tag` **管理员** `variant=primary`（底 `rgb(219,234,254)` / 字 `rgb(37,99,235)`）+ **已认证** `variant=success`（底 `rgb(220,252,231)` / 字 `rgb(22,163,74)`），`size=sm`，`hidden sm:flex` 在 1280 可见。
  6. **leftover `p2-page-accent`：** DOM 1 个 `div.p2-page-accent.absolute.inset-0.-m-4`，`position:absolute; inset:0; z-index:auto`，背景 `linear-gradient(90deg, color(srgb 0.145 0.388 0.922 / 0.12), color(srgb 0.953 0.957 0.965 / 0.86))`（即 `--tiger-primary` 12% → `--tiger-bg-hover` 86%）。卡 `overflow:hidden` 裁住 `-m-4` 外溢。画面是淡蓝到浅灰横向渐变铺满欢迎卡，不是独立 PageHeader 块。
- **严重度：** 欢迎卡 / Logo / 用户名 / 双 Tag 通过（信息）。leftover `p2-page-accent` + `p2-text-primary`：**低**（Roadmap leftover，功能不挡）。副文走 inject `Hello world` 而非兜底文案：信息（壳注入，非本页缺陷）。

### 4.2 Marquee vs KPI

- **模块：** 运维公告 Marquee vs MetricGrid KPI（总用户 / 活跃 / 角色 / 权限）
- **端：** Vue
- **视口：** 桌面 **1280×800**，浅色
- **复现：**
  1. Marquee 在欢迎卡与导出按钮之间。`aria-label="运维公告"`，Tigercat `tiger-marquee overflow-hidden max-w-full tiger-marquee-horizontal tiger-marquee-pause-hover`，class 另有 `rounded-lg border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-card,#ffffff) px-3 py-2`。矩形 **977×38** at **(264,280)**；`position:static`；**`z-index:auto`**；`overflow/overflowX/overflowY=hidden`；底 `rgb(255,255,255)`，边 `rgb(229,231,235)`。
  2. 轨道 `tiger-marquee-track flex w-max` 实测宽 **2991px**、高 20，`transform: matrix(1,0,0,1,-127.88,0)`（向左滚）。内容 repeat=2，四条公告（计划维护 / 自动备份 / 媒体 80% / 演示环境重启）各带 `--tiger-primary` 圆点。轨道 `overflow:visible`，但被 Marquee 宿主 `overflow:hidden` 裁在 977 宽内；未把页面撑出横向滚动（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` scrollWidth===clientWidth **1025**）。
  3. 导出行在 Marquee 与 KPI 之间：y **342–376**。`MetricGrid :columns="4"` 实为 `grid-cols-1 md:grid-cols-3 xl:grid-cols-4`，1280 下 `grid-template-columns: 232.25px × 4`。四张 `MetricCard`：总用户数 **5** / 活跃用户 **5** / 总角色数 **4** / 总权限数 **22**，整行 **977×90** at **(264,400)**。`z-index:auto`。
  4. **重叠：** Marquee bottom **318**，KPI top **400**，垂直空隙 **82px**（中间是导出按钮）。四张 KPI 与 Marquee 的 overlap area 均为 **0**；Marquee 全部子孙与 KPI 相交 **0**。不是 `position:absolute/fixed` 浮层，不盖 KPI。
  5. 截图 `/tmp/vue-home-marquee-kpi.png`（1280×800）：跑马灯、CSV/JSON/Excel、四张 KPI 同屏，KPI 数字完整可读。
- **严重度：** 通过（信息）。Marquee 不覆盖 MetricGrid KPI。leftover 无（Marquee / MetricCard / MetricGrid 为现用组件；公告文案含「演示环境」是产品文案不是 Header 演示 Tag）。

### 4.3 Charts empty / error / data

- **模块：** 用户创建趋势 LineChart + 范围 Select；用户状态 PieChart；用户概览 BarChart；ChartEmptyState / statsError Alert / Loading
- **端：** Vue
- **视口：** 桌面 **1280×800**，浅色
- **复现：**
  1. **Live API（数据态）：** 登录后 `GET /api/stats/overview` **200**，body `totalUsers=5, activeUsers=5, disabledUsers=0, totalRoles=4, totalPermissions=22`（Kestrel）。`GET /api/stats/trend?days=7` **200**，7 点：08-21…08-26 为 0，**08-27=5**。无 `role=alert`、无 Loading、无 `暂无趋势/分布/概览`、无 `.tiger-empty`。截图 `/tmp/vue-home-charts-data.png`（切到近 30 天后拍；折线+饼图同屏）。
  2. **范围 Select：** 默认「近 7 天」。点开 listbox 四项：**近 7 天 / 近 14 天 / 近 30 天 / 近 90 天**（`clearable=false`）。选 **近 30 天** → `GET /api/stats/trend?days=30` **200**，30 点 07-29…08-27，仅末日 count=5。按钮文案变成「近 30 天」。30 日 X 轴 `MM-DD` 全部画出，在 **320px** 图宽里挤成一条不可读字带（「日期」轴标仍在）。
  3. **LineChart：** 标题「用户创建趋势」，面积/点/零点/动画开启。SVG **`width=320 height=220`**，`display:inline-block`，卡宽 **643px**，右侧空 **306px**。折线色 gradient stop 全是 **`#3b82f6`**，页面 `--tiger-primary` 是 **`#2563eb`**（源码 `line-color="#3b82f6"`，不跟 token）。
  4. **PieChart：** 标题「用户状态分布」。数据 Active=5 / Disabled=0 → 整圆蓝、Disabled path `d=""`。外标签 **「Active 100.0%」** / **「Disabled 0.0%」**（英文，与中文页不一致）。SVG 同样 **320×220**，卡内宽仅 **309.7px**、`overflow:hidden`：Disabled 标签 **clippedRight**，超出卡右 **32.5px**；图例 `aria-label="Chart legend"` 超出卡右 **27px**。画面「Active」左侧 A 被裁成「ctive 100.0%」，「Disabled」右侧被裁。颜色源码 `['#3b82f6','#ef4444']`，stroke `#3b82f6` / `#ef4444`。
  5. **BarChart：** 滚到 `#main-content-scroll` scrollTop≈489。标题「用户概览」。五柱：总用户/活跃 同高（5）、禁用 **高度 0**（无 rect）、角色（4）、权限最高（22，橙）。Y 轴 0–22「数量」。SVG 仍 **320×220**，卡宽 **643px**，右侧空 **306px**。柱色 stop **`#3b82f6 / #22c55e / #ef4444 / #a855f7 / #f97316`**（源码写死 hex）。截图 `/tmp/vue-home-charts-bar.png`。
  6. **Empty / error / Loading：** 未改产品代码，不能把 overview/trend 打成空数组或 5xx。源码有 `ChartEmptyState`（「暂无趋势数据 / 暂无分布数据 / 暂无概览数据」）、`statsError` `Alert`（「数据加载失败」）、三处 `Loading`（h-52）。**本会话未出现这些分支 → 记缺口**，无 empty/error 截图。
- **严重度：** live 数据态 + 7/14/30/90 选项 + days=30 重拉：通过（信息）。Empty/error/Loading：**缺口**（未取证）。折线/柱图固定 320 宽不撑满 Card、30 日 X 轴不可读、饼图 320 宽溢出卡片并裁切外侧标签：**中**。硬编码 `#3b82f6` 等 hex 不跟 `--tiger-primary`、饼图英文 Active/Disabled：**低**（leftover / i18n）。

### 4.4 Shortcuts

- **模块：** 快捷操作四格（用户管理 / 角色配置 / 系统设置 / 查看日志）
- **端：** Vue
- **视口：** 桌面 **1280×800**，浅色
- **复现：**
  1. 滚到「快捷操作」卡（与用户概览并排，`lg:col-span-1`，内 `grid-cols-2 gap-3`）。四枚原生 **`<button class="p2-action-tile ...">`**，不是 Tigercat Button：用户管理 / 角色配置 / 系统设置 / 查看日志。每枚 **132×96**、`min-h-24`（96px），白底 `rgb(255,255,255)`，边 `rgb(229,231,235)`，圆角 8px。图标 `text-(--tiger-primary,#3b82f6)`。截图 `/tmp/vue-home-shortcuts.png`。
  2. 点 **用户管理**。URL 变为 **`http://127.0.0.1:5173/users`**。主区 PageHeader「用户管理 / 管理平台用户账号、角色与权限」，表格 5 行（admin / demo / rv2vue0827 / rv2react0827 / rv2r0827c），与 KPI 总用户 **5** 一致。侧栏「系统管理」展开，当前项「用户管理」。未审 Users 页。
  3. 点侧栏 **仪表盘** 返回 **`http://127.0.0.1:5173/dashboard`**，「欢迎回来，admin！」仍在。路由映射与源码一致：`users→/users`、`roles→/roles`、`settings→/settings`、`logs→/audit-logs`（后三项本条只点了一枚）。
  4. **leftover：** `p2-action-tile` + `hover:shadow-md` + `group-hover:scale-110`，定义在 `Tigercat.Admin.Vue/src/style.css`（边框 `--tiger-border`，hover 边 `--tiger-primary`）。不是 Data 页那种 Tigercat 卡片按钮。
- **严重度：** 点击跳转 `/users` 再回 `/dashboard` 通过（信息）。leftover `p2-action-tile` 原生 button：**低**。

### 4.5 DataExport

本期隔离上下文 `vue-home-dashboard` 已不在（本会话 `list_pages` 仅 about:blank + inspect）。先开 `chrome://inspect/#remote-debugging`，「Allow remote debugging for this browser instance」仍勾选（截图 `/tmp/vue-home-inspect-remote-debugging-now.png`）。新隔离上下文 **`vue-home-rest`** 打开 Vue `http://127.0.0.1:5173/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」关掉（**未审 Tour**）。视口 **1280×800**。未开 React `5174`，未重启三端。4.5 工具栏先读既有图 `/tmp/vue-home-export.png`（前一会话 1280×800，切到快捷操作后拍，故 TagsView 仍带「用户管理」）；Message 该图不可见，本会话 live 点 CSV 补。

- **模块：** 仪表盘 DataExport（CSV / JSON / Excel）
- **端：** Vue
- **视口：** 桌面 **1280×800**，浅色；隔离上下文 `vue-home-rest`（图 `/tmp/vue-home-export.png` 为前一会话 `vue-home-dashboard`）
- **复现：**
  1. **工具栏（既有图）：** `/tmp/vue-home-export.png`（1280×800）。Marquee 与 KPI 之间右对齐三枚描边按钮，画面字 **CSV / JSON / Excel**（无第四格式）。白底、浅灰边、圆角。无 Message toast。主区仍是欢迎卡 + 跑马灯 + KPI 5/5/4/22 + 折线/饼图。
  2. **Live 按钮 DOM：** 三枚 Tigercat `DataExport` 触发钮，可见文案 **CSV / JSON / Excel**，`aria-label` **导出 CSV / 导出 JSON / 导出 Excel**。class 走 `--tiger-radius-md` / `--tiger-border` / `--tiger-text` / `--tiger-surface` / `--tiger-surface-muted`，无 `p2-*`。外层 leftover 只是 `div.flex.flex-wrap.items-center.justify-end.gap-2`。矩形约 CSV **54×34** at **(1047,342)**、JSON **61×34** at **(1109,342)**、Excel **63×34** at **(1178,342)**。源码 `v-for="format in EXPORT_FORMATS"`（`csv|json|xlsx`），每枚 `:formats="['xlsx']"`（官方 DataExport 2.1.1 只认 `xlsx`/`markdown`），`labels.xlsxText` 改成 CSV/JSON/Excel，`cell-formatter="skipClientDataExport"` 跳过客户端序列化。
  3. **点 CSV：** `GET /api/export/overview?format=csv&days=7` **200**（Kestrel）。`Content-Type: text/csv; charset=utf-8`，`Content-Disposition: attachment; filename=overview.csv`，`content-length=423`。Tigercat `Message.success` 文案 **「导出成功」**（a11y `role=status` `aria-live=polite`，宿主持 leftover `fixed z-[9999] ... top-6 left-1/2`）。duration 3s 后消失。失败 toast **未走**（未打 5xx）。截图 `/tmp/vue-home-export-success.png`（1280×800；拍时 toast 已过 3s，画面无「导出成功」字；成功以 snapshot + 网络为准）。
  4. **leftover vs Tigercat DataExport：** 触发器是 Tigercat `DataExport`，不是自制导出钮。适配 leftover：三枚实例都伪装成 `xlsx` 再靠 `skipClientDataExport` 转 `GET /api/export/overview` Blob；外层 `flex justify-end` 原生 wrapper。无 `p2-export*` 类。
- **严重度：** CSV 导出 200 + Message「导出成功」通过（信息）。官方 DataExport 只认 xlsx/markdown、三钮靠 skipClient 走 API：**低**（既有适配，功能不挡）。JSON / Excel 点击与失败 Message：**缺口**（本条只点了 CSV）。

### 4.6 Dark tokens

本期隔离上下文 **`vue-home-dark-mobile`**（未复用 `vue-home-dashboard` / `vue-home-rest` / `vue-shell-overlays` / `vue-tags-chat` / `react-*`）。先开 `chrome://inspect/#remote-debugging`，「Allow remote debugging for this browser instance」已勾选（截图 `/tmp/vue-home-dark-inspect-remote-debugging.png`）。`new_page` isolatedContext 打开 Vue `http://127.0.0.1:5173/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」关掉（**未审 Tour**）。视口桌面 **1280×800**。ThemeConfigDrawer **只用来切外观到深色**，关抽屉后查 `/dashboard` token，**不把 Theme 当产品再走一遍**。未开 React `5174`，未重启三端。

- **模块：** 仪表盘暗色 token（welcome / Marquee / KPI MetricGrid / Line·Pie·Bar / DataExport / 系统信息）
- **端：** Vue
- **视口：** 桌面 **1280×800**，深色；隔离上下文 `vue-home-dark-mobile`
- **复现：**
  1. Header `button` `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`。点开 Drawer「主题配置」，外观 Segmented 默认 **跟随系统**。点 **深色**，再点关闭 ×。抽屉关掉（无 mask）。`html` class = **`dark`**。`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`。URL 仍 `/dashboard`。截图 `/tmp/vue-home-dark.png`（1280×800；欢迎卡 + Marquee + CSV/JSON/Excel + KPI 5/5/4/22 + 折线/饼图同屏）。
  2. **`--tiger-*` 计算值：** `--tiger-primary=#2563eb`（抽屉主色仍是蓝色，不是 `style.css` `.dark` 兜底 `#6396ff`）、`--tiger-bg-page=#0d1117`、`--tiger-bg-card=#161b22`、`--tiger-bg-hover=#1b212c`、`--tiger-text=#f0f6fc`、`--tiger-text-secondary=#8b949f`、`--tiger-border=#304050`。Tigercat 另有 `--tiger-surface=#111827`、`--tiger-surface-muted=#1f2937`。内容区 `#main-content-scroll` 底 `rgb(31,41,55)`（`#1f2937`）。无「演示模式」Tag。无横向溢出（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` 1025===1025）。
  3. **Welcome：** Tigercat Card 底 `rgb(17,24,39)`（`--tiger-surface`），字 `rgb(240,246,252)`。标题 leftover **`p2-text-primary`** 跟 `--tiger-text`（`#f0f6fc`）。leftover **`p2-page-accent`** 渐变 `linear-gradient(90deg, color(srgb 0.145 0.388 0.922 / 0.12), color(srgb 0.106 0.129 0.173 / 0.86))`（`--tiger-primary` 12% → `--tiger-bg-hover` 86%），暗底上仍有一层淡蓝横向洗。副文 `Hello world` 色 `rgb(156,163,175)`。Tag「管理员 / 已认证」仍可读。
  4. **Marquee：** 宿主 `bg-(--tiger-bg-card,#ffffff)` 实算 **`rgb(22,27,34)`**（`#161b22`），边 `--tiger-border` `#304050`，与欢迎 Card 的 `--tiger-surface` `#111827` **不是同一张暗底**。公告字 `--tiger-text-secondary` `rgb(139,148,159)`，圆点 `--tiger-primary` `rgb(37,99,235)`。轨道仍 2991px，宿主 `overflow:hidden` 裁住，未撑出页面横溢。
  5. **KPI MetricGrid：** 四张 Tigercat Card 底 `--tiger-surface` `#111827`，数字 5/5/4/22 白字可读。图标 leftover **`p2-icon-chip`** 色 `rgb(37,99,235)`（跟 `--tiger-primary`）。1280 下仍是 4 列。
  6. **Charts：** Line 面积/描边 stop 仍全是 **`#3b82f6`**；Pie stop **`#3b82f6` / `#ef4444`**；Bar stop **`#3b82f6` / `#22c55e` / `#ef4444` / `#a855f7` / `#f97316`**。页面 `--tiger-primary` 是 **`#2563eb`**。三张 SVG 仍固定 **320×220**，折线/柱右侧空一大块；饼图外侧标签仍被裁成「ctive 100.0%」/「Disable」（与 4.3 浅色同形，暗底上更刺眼）。轴字/网格在暗底可读。
  7. **Export：** 三枚 DataExport 钮 CSV/JSON/Excel 跟 `--tiger-text` `#f0f6fc`、`--tiger-surface` `#111827`、`--tiger-border` `#304050`，无 `p2-export*`。暗底描边可读。
  8. **Shortcuts / 系统信息：** 滚 `#main-content-scroll` scrollTop≈489。四枚 leftover **`p2-action-tile`** 底 `--tiger-bg-card` `#161b22`、字 `--tiger-text`、边 `--tiger-border`，图标 `text-(--tiger-primary,#3b82f6)` → `rgb(37,99,235)`；贴在 `--tiger-surface` Card 里，砖块比卡面略亮一档。系统信息行 **可见**：系统版本 **v1.0.0** / 运行环境 **.NET 10 + Vue 3**（「Vue 3」折到第二行）/ 最后更新 **2026-01-28** / API 状态 **在线**。截图 `/tmp/vue-home-dark-charts.png`（1280×800）。
- **严重度：** 切深色后 `html.dark`、壳与主区暗底、KPI/导出/系统信息可读：通过（信息）。硬编码图表 hex `#3b82f6/#ef4444/#22c55e/#a855f7/#f97316` 不跟 `--tiger-primary`（暗色 leftover，浅色已记在 4.3）：**低**。leftover `p2-page-accent` / `p2-text-primary` / `p2-action-tile` / `p2-icon-chip` 多数已绑 `--tiger-*`，但 Marquee/`p2-action-tile` 用 `--tiger-bg-card`、Card 用 `--tiger-surface`，暗底出现两档灰：**低**。饼图裁切同 4.3（中，不在本条重开）。Theme 紧凑/主色：本条不审。

### 4.7 Mobile ~375px

本期 4.7 先写前一会话已落盘的 `/tmp/vue-home-mobile-375.png`（PNG 像素 **750×1624** = 2× CSS **375×812**，浅色），不重走 4.1–4.6，不审 React，不开 MockApi / `dev:demo` / Aspire，不改产品代码。该图为前一 grok-4.6 会话 live-walk 后保存；本条先按像素写，overflow 数字与折下图表 / 快捷操作 / 系统信息标 **缺口**，后面只 live 补这些。

- **模块：** 仪表盘 `/dashboard` 移动 ~375px（壳汉堡 / 欢迎卡 / Marquee 裁切 vs 页面横溢 / 导出换行 / KPI 单列 / 折下图表·快捷·系统信息）
- **端：** Vue
- **视口：** ~**375×812**，浅色（shot）；隔离上下文 **`vue-home-mobile-ph`**（前一会话；本条写 shot 时未再 attach）
- **复现：**
  1. **壳（shot）：** Header 左汉堡（三条杠圆角钮）+ 品牌「管理中心」在 375 宽下折成两行「管理 / 中心」（蓝字）+ 主题调色盘钮 + 铃铛红徽 **2** + 头像「A admin ▾」。面包屑 **管理中心 / 仪表盘**（「管理中心 /」一行，「仪表盘」折到下一行）。TagsView 左一枚浅蓝描边 tab **仪表盘**，右 **…**。无「演示模式」Tag。无侧栏（汉堡收起）。主区第一块是欢迎 Card，不是 PageHeader。截图 `/tmp/vue-home-mobile-375.png`。
  2. **Welcome（shot）：** Tigercat Card：左 AppLogo 蓝底白 T + 标题 **「欢迎回来，admin！」** + 副文 **Hello world**。375 下 **没有**「管理员 / 已认证」Tag（源码 `hidden sm:flex`，与 4.1 桌面可见对照）。欢迎卡淡蓝横向渐变仍在（leftover `p2-page-accent`，4.1 已记，本条不重开）。
  3. **Marquee clip vs 页面溢出（shot）：** 欢迎卡下一条圆角描边跑马灯。左缘裁成 **「…可能被重置。」**（前一条「演示环境重启后数据可能被重置。」的尾），蓝点后 **「今晚 22:00-23:00 计划维护，…」** 右缘再被盒子裁掉。这是 Marquee 宿主 `overflow:hidden` 的轨道裁切，不是独立浮层。shot 右侧主区有竖滚动条。 **`documentElement.scrollWidth===clientWidth` 与 `#main-content-scroll` scrollWidth===clientWidth 本条写 shot 时未测 → 缺口**（Marquee 裁切 ≠ 已证实无页面横溢）。
  4. **Export wrap（shot）：** Marquee 与 KPI 之间右对齐三枚描边钮 **CSV / JSON / Excel**，**同一行、未换行**（`flex-wrap` 在 375 仍装得下）。未点导出（4.5 已点过 CSV）。
  5. **KPI 单列（shot）：** MetricGrid 在 375 为 **单列堆叠**（`grid-cols-1`；桌面 4.2 是 4 列）。可见 **总用户数 5** / **活跃用户 5** / **总角色数 4**；第四张 **总权限数** 只露出卡顶（图标+标题），数字被视口底裁掉。右下 FAB 蓝 **+** 压在「总角色数」卡右下，其下聊天气泡未读红徽 **1**。
  6. **Charts / shortcuts / 系统信息（shot）：** 本张 **折下不可见**（用户创建趋势 / 饼图 / 柱图 / 快捷操作四格 / 系统信息均不在 375×812 首屏）。未滚、无 `/tmp/vue-home-mobile-375-below.png` → **缺口**。
- **严重度：** 375 浅色首屏壳 + 欢迎卡无身份 Tag + KPI 单列 + 导出三钮同行：通过（信息，符合 `hidden sm:flex` / `grid-cols-1` / `flex-wrap`）。Marquee 左右裁切是组件轨道，**尚未用 scrollWidth 区分页面横溢**：**缺口**。折下图表 / 快捷操作 / 系统信息：**缺口**。品牌「管理中心」与面包屑在 375 折行：信息（壳，非本页缺陷）。FAB 压 KPI 右下：信息（壳 ChatDock / 快操作，4.7 不审 Chat）。Theme 用浅色（shot）；未在 375 切暗色。

### 4.8 PageHeader leftover

本期只写 4.8，不重开 4.1–4.7，不审 React Home，不 attach Chrome。证据 = `HomePage.vue` / `PageHeader.vue` / `UsersPage.vue` 源码 + 既有 shot `/tmp/vue-home-welcome.png`（1280 浅色）/ `/tmp/vue-home-dark.png`（1280 深色）/ `/tmp/vue-home-mobile-375.png`（375）。未改产品代码。

- **模块：** 仪表盘 PageHeader leftover（`TigerPageHeader` + `p2-icon-chip` 48 + title lg + subtitle + optional tags）
- **端：** Vue
- **视口：** 既有 shot 桌面 **1280**（浅色 `/tmp/vue-home-welcome.png` + 深色 `/tmp/vue-home-dark.png`）与移动 **375**（`/tmp/vue-home-mobile-375.png`）。本条未 attach 浏览器、未测 live DOM。
- **复现：**
  1. **源码无 PageHeader：** `HomePage.vue` `<script setup>` 本地组件 import 是 `AppLogo` / `MetricCard` / `MetricGrid` / `ChartEmptyState`（另有 `Icon`），**没有** `PageHeader`。模板根 `div.space-y-6`，第一块是 Tigercat `Card` 欢迎区，不是 `<PageHeader>`。
  2. **对照 `PageHeader.vue` chrome：** `@expcat/tigercat-vue/PageHeader` 的 `TigerPageHeader`（`:show-back="false"`）+ 左 `div.p2-icon-chip` **48×48**（`h-12 w-12`，内 `Icon` 24）+ `Text` title `size="lg"` `weight="bold"` `p2-text-primary` + subtitle `size="sm"` `color="secondary"` + 可选 `#actions` tags（`hidden sm:flex`）。
  3. **Shot：主区第一块是欢迎 Card，不是 PageHeader。** `/tmp/vue-home-welcome.png`（1280 浅色）：TagsView 下第一块是欢迎 Card——左 AppLogo 蓝底白 T + **「欢迎回来，admin！」** + 副文 Hello world + 右 Tag「管理员 / 已认证」，淡蓝横向洗。**没有** 48px `p2-icon-chip` + 页标题「仪表盘」那种 PageHeader 行。`/tmp/vue-home-dark.png`（1280 深色）同形：暗底欢迎 Card，仍是 AppLogo + 欢迎回来。`/tmp/vue-home-mobile-375.png`（375）：同样欢迎 Card 为首块，375 下身份 Tag 不见（源码 `hidden sm:flex`）。4.1 / 4.7 已写过这点，本条不重审欢迎卡。
  4. **壳 chrome ≠ leftover PageHeader：** 三张 shot 上都有面包屑 **管理中心 / 仪表盘** 和 TagsView tab **仪表盘**。这是 App Shell（Header breadcrumbs + TagsView），不是 `PageHeader.vue`。375 下面包屑折成「管理中心 /」+「仪表盘」仍是壳。
  5. **对照 `/users`：** 4.4 点快捷操作「用户管理」落到 **`http://127.0.0.1:5173/users`**，主区 **有** PageHeader「用户管理 / 管理平台用户账号、角色与权限」。`UsersPage.vue` `import PageHeader` 并传入 `title="用户管理"` `subtitle="管理平台用户账号、角色与权限"` `icon="users"` + tags。Home **没有** 这条 chrome。
  6. **Home 上仍在的 header-ish leftover（4.1–4.6 已记，不重写）：** 欢迎卡 `p2-page-accent` + 标题 `p2-text-primary`（4.1 / 4.6）；快捷操作原生 `p2-action-tile`（4.4 / 4.6）；图表硬编码 `#3b82f6` 等 hex，不跟 `--tiger-primary` `#2563eb`（4.3 / 4.6）。欢迎卡布局（48 左标 + lg 标题 + sm 副文 + `hidden sm:flex` tags）**形似** PageHeader slot，但是 `Card`+`AppLogo`，不是 `TigerPageHeader`+`p2-icon-chip`。
  7. **Live DOM：** 本条未 attach Chrome，拒绝声称未测的选择器计数（例如 `/dashboard` 上 `TigerPageHeader` / `.p2-icon-chip` 节点数）→ **缺口**。结论靠源码无 import + 三张 shot 画面，不编造 DOM 选择器。
- **严重度：** `/dashboard` 不 import / 不渲染 `PageHeader`，主区第一块是欢迎 Card（AppLogo +「欢迎回来，admin！」）：通过（信息，源码 + 1280/375 shot）。壳面包屑 / TagsView「仪表盘」不是 leftover PageHeader：通过（信息）。Home 残留 header-ish leftover（`p2-page-accent` / `p2-text-primary` / `p2-action-tile` / 图表 hex）：**低**（已在 4.1/4.3/4.4/4.6，本条不升档）。Live `TigerPageHeader` 选择器计数：**缺口**（本会话未测，不声称）。

---

## 4b. Home / Dashboard (React)

本期只走 React `http://127.0.0.1:5174/dashboard`（`HomePage.tsx`）。未开 Vue `5173` 走查（Vue ## 4.1–4.8 已在本文件，不重走、不重写）。未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/react-home-inspect-remote-debugging.png`），再在隔离上下文 **`react-home-dashboard`** 打开 `/login`，未复用 `vue-home-dashboard` / `vue-home-rest` / `vue-home-dark-mobile` / `vue-home-mobile-ph` / `vue-shell-overlays` / `vue-tags-chat` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。未切暗色、未缩到 375。走查前已读 `HomePage.tsx`、`PageFragments.tsx`（`MetricCard` / `MetricGrid` / `ChartEmptyState`）、`PageHeader.tsx`：HomePage **不 import** `PageHeader`。本期只写 **4b.1–4b.5**；4b.6 Dark / 4b.7 Mobile 375 / 4b.8 PageHeader 留给后续会话。

### 4b.1 Welcome

- **模块：** 仪表盘欢迎卡（welcome-back / LogoIcon / 用户名 / 身份 Tag / leftover `p2-page-accent`）
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-home-dashboard`，浅色
- **复现：**
  1. 登录后 URL **`http://127.0.0.1:5174/dashboard`**。Tour 关掉后主区第一块是 Tigercat `Card`（`overflow-hidden` 出现两次，圆角 `--tiger-radius-lg`=`0.75rem`→12px，白底 `rgb(255,255,255)`=`--tiger-surface`，描边 `--tiger-border` `#e5e7eb`）。矩形 **977×90** at **(264,166)**。截图 `/tmp/react-home-welcome.png`（1280×800）。
  2. **LogoIcon：** 卡内左侧 `svg` **48×48**（`LogoIcon size={48}`，`Icons.tsx`），`filter: none`（无 Vue `AppLogo` 的 `drop-shadow-sm`）。画面是蓝底白 T，与侧栏品牌同形。渐变 stop 硬编码 **`#3B82F6` → `#4F46E5`**（不跟页面 `--tiger-primary` `#2563eb`）。
  3. **用户名：** 文案 **「欢迎回来，admin！」**（outlet `username`）。`Text` `size=lg` `weight=bold`（18px / 700），颜色 `rgb(17,24,39)`，class 同时带 Tigercat `text-[var(--tiger-text,#111827)]` 与 leftover **`p2-text-primary`**。
  4. **副文：** 画面是 **Hello world**（outlet `homeMessage`，不是源码兜底「今天是个好日子，让我们开始工作吧！」）。
  5. **Tag：** 右侧 Tigercat `Tag` **管理员** `variant=primary`（底 `rgb(219,234,254)` / 字 `rgb(37,99,235)`）+ **已认证** `variant=success`（底 `rgb(220,252,231)` / 字 `rgb(22,163,74)`），`size=sm`，`hidden sm:flex` 在 1280 可见。矩形约 54×22 at (1108,200) / (1170,200)。
  6. **leftover `p2-page-accent`：** DOM 1 个 `div.p2-page-accent.absolute.inset-0.-m-4`，`position:absolute; inset:0; z-index:auto`，背景 `linear-gradient(90deg, color(srgb 0.145 0.388 0.922 / 0.12), color(srgb 0.953 0.957 0.965 / 0.86))`。卡 `overflow:hidden` 裁住 `-m-4` 外溢。画面是淡蓝到浅灰横向渐变铺满欢迎卡，不是独立 PageHeader 块。`p2-text-primary` 计数 **1**。主区无 `PageHeader` / `.tiger-page-header`。Header 无「演示模式」Tag。
- **双端：** 与 Vue **4.1** 同形：欢迎 Card + leftover `p2-page-accent` 同色横向洗 + 标题 leftover `p2-text-primary` + 「欢迎回来，admin！」+ 副文 Hello world + Tag「管理员 / 已认证」。**错位：** Vue 用 `AppLogo :size="48"` 且 `svg.drop-shadow-sm`；React 用 `LogoIcon size={48}`，`filter:none`，渐变写死 `#3B82F6/#4F46E5`。
- **严重度：** 欢迎卡 / Logo / 用户名 / 双 Tag 通过（信息）。leftover `p2-page-accent` + `p2-text-primary`：**低**（与 Vue 4.1 同 leftover）。LogoIcon 无 drop-shadow、渐变 hex 不跟 `--tiger-primary`：**低**（双端错位）。副文走壳注入 `Hello world`：信息（非本页缺陷）。

### 4b.2 Marquee vs KPI

- **模块：** 运维公告 Marquee vs MetricGrid KPI（总用户 / 活跃 / 角色 / 权限）
- **端：** React
- **视口：** 桌面 **1280×800**，浅色
- **复现：**
  1. Marquee 在欢迎卡与导出按钮之间。`aria-label="运维公告"`，Tigercat `tiger-marquee overflow-hidden max-w-full tiger-marquee-horizontal tiger-marquee-pause-hover`，class 另有 `rounded-lg border border-(--tiger-border,#e5e7eb) bg-(--tiger-bg-card,#ffffff) px-3 py-2`。矩形 **977×38** at **(264,280)**；`position:static`；**`z-index:auto`**；`overflow/overflowX/overflowY=hidden`；底 `rgb(255,255,255)`，边 `rgb(229,231,235)`。
  2. 轨道 `tiger-marquee-track flex w-max` 实测宽 **2990.8px**、高 20，`transform: matrix(1,0,0,1,-764.418,0)`（向左滚）。内容 repeat=2，四条公告（计划维护 / 自动备份 / 媒体 80% / 演示环境重启）各带 `--tiger-primary` 圆点（`bg-(--tiger-primary,#3b82f6)` 实算 `rgb(37,99,235)`=`#2563eb`）。轨道 `overflow:visible`，但被 Marquee 宿主 `overflow:hidden` 裁在 977 宽内；未把页面撑出横向滚动（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` scrollWidth===clientWidth **1025**）。
  3. 导出行在 Marquee 与 KPI 之间：y **342–376**。`MetricGrid columns={4}` 实为 `grid-cols-1 md:grid-cols-3 xl:grid-cols-4`，1280 下 `grid-template-columns: 232.25px × 4`。四张 `MetricCard`：总用户数 **5** / 活跃用户 **5** / 总角色数 **4** / 总权限数 **22**，整行 **977×90** at **(264,400)**。`z-index:auto`。
  4. **重叠：** Marquee bottom **318**，KPI top **400**，垂直空隙 **82px**（中间是导出按钮）。四张 KPI 与 Marquee 的 overlap area 均为 **0**；Marquee 全部子孙与 KPI 相交 **0**。不是 `position:absolute/fixed` 浮层，不盖 KPI。
  5. 截图 `/tmp/react-home-marquee-kpi.png`（1280×800）：跑马灯、CSV/JSON/Excel、四张 KPI 同屏，KPI 数字完整可读。
- **双端：** 与 Vue **4.2** 同形：Marquee 不覆盖 KPI（overlap 0、z-auto、空隙 82px），KPI **5/5/4/22**，几何几乎同一组数字（Marquee 977×38 at 264,280；KPI 977×90 at 264,400；列宽 232.25px）。共享 in-memory Api。无 leftover `p2-*` 在 Marquee 上。
- **严重度：** 通过（信息）。Marquee 不覆盖 MetricGrid KPI。leftover 无（Marquee / MetricCard / MetricGrid 为现用组件；公告文案含「演示环境」是产品文案不是 Header 演示 Tag）。

### 4b.3 Charts empty / error / data

- **模块：** 用户创建趋势 LineChart + 范围 Select；用户状态 PieChart；用户概览 BarChart；ChartEmptyState / statsError Alert / Loading
- **端：** React
- **视口：** 桌面 **1280×800**，浅色
- **复现：**
  1. **Live API（数据态）：** 登录后 `GET /api/stats/overview` **200**（Kestrel），body `totalUsers=5, activeUsers=5, disabledUsers=0, totalRoles=4, totalPermissions=22`。`GET /api/stats/trend?days=7` **200**，7 点：08-21…08-26 为 0，**08-27=5**。无 `role=alert`、无 Loading、无 `暂无趋势/分布/概览`、无 `.tiger-empty`。截图 `/tmp/react-home-charts-data.png`（切到近 30 天后拍；折线+饼图同屏）。
  2. **范围 Select：** 默认「近 7 天」。点开 listbox 四项：**近 7 天 / 近 14 天 / 近 30 天 / 近 90 天**（`clearable=false`）。选 **近 30 天** → `GET /api/stats/trend?days=30` **200**，30 点 07-29…08-27，仅末日 count=5。按钮文案变成「近 30 天」。30 日 X 轴 `MM-DD` 全部画出（30 个 tick，均宽 **34.9px**，相邻重叠 **29/29**），在 **320px** 图宽里挤成一条不可读字带（「日期」轴标仍在；tick 跨度仅 278.8px）。
  3. **LineChart：** 标题「用户创建趋势」，面积/点/零点/动画开启。SVG **`width=320 height=220`**，`display:block`，卡宽 **643.3px**，右侧空 **323.3px**。折线色 gradient stop 全是 **`#3b82f6`**，页面 `--tiger-primary` 是 **`#2563eb`**（源码 `lineColor="#3b82f6"`，不跟 token）。
  4. **PieChart：** 标题「用户状态分布」。数据 Active=5 / Disabled=0 → 整圆蓝、Disabled path `d=""`。外标签 **「Active 100.0%」** / **「Disabled 0.0%」**（英文，与中文页不一致）。SVG 同样 **320×220**，卡内宽仅 **309.7px**、`overflow:hidden`：Disabled 标签 **clippedRight**，超出卡右 **32.5px**；图例 `aria-label="Chart legend"` 超出卡右 **27.3px**。画面「Active」左侧 A 被裁成「ctive 100.0%」，「Disabled」右侧被裁成「Disable」。颜色源码 `['#3b82f6','#ef4444']`，stop `#3b82f6` / `#ef4444`。
  5. **BarChart：** 滚 `#main-content-scroll` scrollTop=**480**。标题「用户概览」。五柱：总用户/活跃 同高（h=32.7）、禁用 **高度 0**（rect 仍在）、角色（h=26.2）、权限最高（h=144，橙）。Y 轴 0–22「数量」。SVG 仍 **320×220**，卡宽 **643.3px**，右侧空 **323.3px**。柱色 stop **`#3b82f6 / #22c55e / #ef4444 / #a855f7 / #f97316`**（源码写死 hex）。截图 `/tmp/react-home-charts-bar.png`。
  6. **Empty / error / Loading：** 未改产品代码，不能把 overview/trend 打成空数组或 5xx。源码有 `ChartEmptyState`（「暂无趋势数据 / 暂无分布数据 / 暂无概览数据」）、`statsError` `Alert`（「数据加载失败」）、三处 `Loading`（h-52）。**本会话未出现这些分支 → 记缺口**，无 empty/error 截图。
  7. **系统信息（顺带可见，不单开条）：** 同屏底部 `MetricGrid`：系统版本 **v1.0.0** / 运行环境 **.NET 10 + React 19**（「React 19」折到第二行）/ 最后更新 **2026-01-28** / API 状态 **在线**。见 `/tmp/react-home-charts-bar.png`。
- **双端：** 与 Vue **4.3** **同一组中档缺陷**：三张 SVG 固定 **320×220** 不撑满 Card（折线/柱右侧空 ~323px；饼卡 309.7px 裁外侧标签）；30 日 X 轴 MM-DD 在 320px 内 30 tick 互相重叠不可读；饼图英文 Active/Disabled，画面裁成「ctive 100.0%」/「Disable」，Disabled overflowRight **32.5px**、legend **27.3px** 与 Vue 4.3 同数。硬编码 `#3b82f6` 不跟 `--tiger-primary` `#2563eb`。live 数据与 Select 7/14/30/90 同形。**错位：** React LineChart `display:block`，Vue 4.3 记 `inline-block`（宽高仍 320×220）。Empty/error/Loading 两端都是缺口。
- **严重度：** live 数据态 + 7/14/30/90 选项 + days=30 重拉：通过（信息）。Empty/error/Loading：**缺口**（未取证）。折线/柱图固定 320 宽不撑满 Card、30 日 X 轴不可读、饼图 320 宽溢出卡片并裁切外侧标签：**中**（与 Vue 4.3 同档）。硬编码 `#3b82f6` 等 hex 不跟 `--tiger-primary`、饼图英文 Active/Disabled：**低**（leftover / i18n）。

### 4b.4 Shortcuts

- **模块：** 快捷操作四格（用户管理 / 角色配置 / 系统设置 / 查看日志）
- **端：** React
- **视口：** 桌面 **1280×800**，浅色
- **复现：**
  1. 滚到「快捷操作」卡（与用户概览并排，`lg:col-span-1`，内 `grid-cols-2 gap-3`）。四枚原生 **`<button class="p2-action-tile ...">`**，不是 Tigercat Button：用户管理 / 角色配置 / 系统设置 / 查看日志。每枚 **131.8×96**、`min-h-24`（96px），白底 `rgb(255,255,255)`，边 `rgb(229,231,235)`，圆角 8px。图标 `text-(--tiger-primary,#3b82f6)` 实算 `rgb(37,99,235)`。截图 `/tmp/react-home-shortcuts.png`。
  2. 点 **用户管理**。URL 变为 **`http://127.0.0.1:5174/users`**。主区 PageHeader「用户管理 / 管理平台用户账号、角色与权限」，表格 5 行（admin / demo / rv2vue0827 / rv2react0827 / rv2r0827c），与 KPI 总用户 **5** 一致。侧栏「系统管理」展开，当前项「用户管理」。未审 Users 页。
  3. 点侧栏 **仪表盘** 返回 **`http://127.0.0.1:5174/dashboard`**，「欢迎回来，admin！」仍在。路由映射与源码一致：`users→/users`、`roles→/roles`、`settings→/settings`、`logs→/audit-logs`（后三项本条只点了一枚）。
  4. **leftover：** `p2-action-tile` + `hover:shadow-md` + `group-hover:scale-110`，定义在 `Tigercat.Admin.React/src/index.css`（边框 `--tiger-border`，hover 边 `--tiger-primary`）。不是 Data 页那种 Tigercat 卡片按钮。
- **双端：** 与 Vue **4.4** 同形：四枚 leftover `p2-action-tile` 原生 button，点「用户管理」进 `/users` 再回 `/dashboard`。几何几乎同一（Vue 132×96，React 131.8×96）。路由映射相同。
- **严重度：** 点击跳转 `/users` 再回 `/dashboard` 通过（信息）。leftover `p2-action-tile` 原生 button：**低**（与 Vue 4.4 同 leftover）。

### 4b.5 DataExport

本期隔离上下文 `react-home-dashboard` 已不在（本会话 `list_pages` 仅 about:blank + inspect）。先开 `chrome://inspect/#remote-debugging`，「Allow remote debugging for this browser instance」仍勾选（既有图 `/tmp/react-home-inspect-remote-debugging.png`；本会话再拍 `/tmp/react-home-inspect-remote-debugging-now.png`）。新隔离上下文 **`react-home-export`** 打开 React `http://127.0.0.1:5174/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」关掉（**未审 Tour**）。视口 **1280×800**，浅色。未开 Vue 走查，未重启三端（Api 5137 / Vue 5173 / React 5174 仍活）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。未复用 `vue-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`。4.5 工具栏先读既有图 `/tmp/react-home-marquee-kpi.png`（前一会话 1280×800，Marquee 与 KPI 之间已见 CSV/JSON/Excel）；Message 该图不可见，本会话 live 点 CSV 补。未写 4b.6 Dark / 4b.7 Mobile 375 / 4b.8 PageHeader，未开项 5。

- **模块：** 仪表盘 DataExport（CSV / JSON / Excel）
- **端：** React
- **视口：** 桌面 **1280×800**，浅色；隔离上下文 `react-home-export`（工具栏外观对照图 `/tmp/react-home-marquee-kpi.png` 为前一会话 `react-home-dashboard`）
- **复现：**
  1. **工具栏（既有图 + 本会话图）：** `/tmp/react-home-marquee-kpi.png` 与 `/tmp/react-home-export.png`（1280×800）。Marquee 与 KPI 之间右对齐三枚描边按钮，画面字 **CSV / JSON / Excel**（无第四格式）。白底、浅灰边、圆角。无 Message toast。主区仍是欢迎卡 + 跑马灯 + KPI 5/5/4/22 + 折线/饼图。
  2. **Live 按钮 DOM：** 三枚 Tigercat `DataExport` 触发钮（`@expcat/tigercat-react/DataExport`），可见文案 **CSV / JSON / Excel**，`aria-label` **导出 CSV / 导出 JSON / 导出 Excel**。class 走 `--tiger-radius-md` / `--tiger-border` / `--tiger-text` / `--tiger-surface` / `--tiger-surface-muted`（计算值 `0.5rem` / `#e5e7eb` / `#111827` / `#ffffff` / `#f9fafb`），无 `p2-export*`。外层 leftover 只是 `div.flex.flex-wrap.items-center.justify-end.gap-2`（977×34 at (264,342)）。矩形约 CSV **54.3×34** at **(1047,342)**、JSON **60.5×34** at **(1109,342)**、Excel **63.1×34** at **(1178,342)**。源码 `EXPORT_FORMATS.map`（`csv|json|xlsx`），每枚 `formats={DATA_EXPORT_TRIGGER_FORMATS}` 即 `['xlsx']`（官方 DataExport 2.1.1 只认 `xlsx`/`markdown`），`labels.xlsxText` 改成 CSV/JSON/Excel，`cellFormatter={skipClientDataExport}` 跳过客户端序列化。
  3. **点 CSV：** `GET /api/export/overview?format=csv&days=7` **200**（Kestrel）。`Content-Type: text/csv; charset=utf-8`，`Content-Disposition: attachment; filename=overview.csv; filename*=UTF-8''overview.csv`，`content-length=423`。Tigercat `Message.success` 文案 **「导出成功」**（a11y snapshot：`generic` `aria-live=polite` 下 `role=status` `aria-live=polite` `atomic`，StaticText「导出成功」）。宿主 leftover `div.fixed.z-[9999].flex.flex-col.gap-2.pointer-events-none.top-6.left-1/2.-translate-x-1/2`（`#tiger-message-container-root`，`main.tsx` `<MessageContainer />`）。duration 3s 后消失。失败 toast **未走**（未打 5xx）。截图 `/tmp/react-home-export-success.png`（1280×800；拍时 toast 已过 3s，画面无「导出成功」字；成功以 snapshot + 网络为准）。
  4. **leftover vs Tigercat DataExport：** 触发器是 Tigercat `DataExport`，不是自制导出钮。适配 leftover：三枚实例都伪装成 `xlsx` 再靠 `skipClientDataExport` 转 `GET /api/export/overview` Blob；外层 `flex justify-end` 原生 wrapper。无 `p2-export*` 类。
- **双端：** 与 Vue **4.5** 同形：三枚 Tigercat DataExport 触发钮画面 CSV/JSON/Excel、`aria-label` 导出 CSV/JSON/Excel、`skipClientDataExport` + `formats=['xlsx']`、点 CSV 走 `GET /api/export/overview?format=csv&days=7` **200** + Message「导出成功」、几何几乎同一组数字（Vue CSV 54×34 / JSON 61×34 / Excel 63×34 同坐标；React 54.3 / 60.5 / 63.1）。官方 DataExport 只认 xlsx/markdown 的伪装适配两端相同。JSON / Excel / 失败 Message 两端都未点。
- **严重度：** CSV 导出 200 + Message「导出成功」通过（信息）。官方 DataExport 只认 xlsx/markdown、三钮靠 skipClient 走 API：**低**（既有适配，功能不挡，与 Vue 4.5 同档）。JSON / Excel 点击与失败 Message：**缺口**（本条只点了 CSV）。

### 4b.6 Dark tokens

本期隔离上下文 **`react-home-dark-mobile`**（未复用 `vue-home-dashboard` / `vue-home-rest` / `vue-home-dark-mobile` / `vue-home-mobile-ph` / `vue-shell-overlays` / `vue-tags-chat` / `react-home-dashboard` / `react-home-export` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`）。先开 `chrome://inspect/#remote-debugging`，「Allow remote debugging for this browser instance」已勾选（截图 `/tmp/react-home-dark-inspect-remote-debugging.png`）。`new_page` isolatedContext 打开 React `http://127.0.0.1:5174/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」关掉（**未审 Tour**）。视口桌面 **1280×800**。ThemeConfigDrawer **只用来切外观到深色**，关抽屉后查 `/dashboard` token，**不把 Theme 当产品再走一遍**（3b.2 已记 compact/primary）。未开 Vue `5173` 走查，未重启三端。不是 MockApi / `dev:demo` / Aspire。未改产品代码。未重写 4b.1–4b.5。

- **模块：** 仪表盘暗色 token（welcome / Marquee / KPI MetricGrid / Line·Pie·Bar / DataExport / 快捷操作 / 系统信息）
- **端：** React
- **视口：** 桌面 **1280×800**，深色；隔离上下文 `react-home-dark-mobile`
- **复现：**
  1. Header `button` `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`。点开 Drawer「主题配置」，外观 Segmented 默认 **跟随系统**。点 **深色**（主色仍 **蓝色**、紧凑密度开关未动），再点关闭 ×。抽屉关掉（节点仍在 DOM，`translate-x-full`，矩形 0×0，无 mask）。`html` class = **`dark`**。`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`。URL 仍 `/dashboard`。截图 `/tmp/react-home-dark.png`（1280×800；欢迎卡 + Marquee + CSV/JSON/Excel + KPI 5/5/4/22 + 折线/饼图同屏）。
  2. **`--tiger-*` 计算值：** `--tiger-primary=#2563eb`（抽屉主色仍是蓝色，不是 `index.css` `.dark` 兜底 `#6396ff`）、`--tiger-bg-page=#0d1117`、`--tiger-bg-card=#161b22`、`--tiger-bg-hover=#1b212c`、`--tiger-text=#f0f6fc`、`--tiger-text-secondary=#8b949f`、`--tiger-border=#304050`。Tigercat 另有 `--tiger-surface=#111827`、`--tiger-surface-muted=#1f2937`。内容区 `#main-content-scroll` 底 `rgb(31,41,55)`（`#1f2937`）。无「演示模式」Tag。无横向溢出（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` 1025===1025）。
  3. **Welcome：** Tigercat Card 底 `rgb(17,24,39)`（`--tiger-surface`），标题字 `rgb(240,246,252)`。标题 leftover **`p2-text-primary`** 跟 `--tiger-text`（`#f0f6fc`），计数 **1**。leftover **`p2-page-accent`** 计数 **1**，渐变 `linear-gradient(90deg, color(srgb 0.145 0.388 0.922 / 0.12), color(srgb 0.106 0.129 0.173 / 0.86))`（`--tiger-primary` 12% → `--tiger-bg-hover` 86%），暗底上仍有一层淡蓝横向洗。副文 `Hello world` 色 `rgb(156,163,175)`。Tag「管理员 / 已认证」仍可读。**LogoIcon** 渐变 stop 仍硬编码 **`#3B82F6` → `#4F46E5`**（4b.1 浅色 leftover，暗色仍不跟 `--tiger-primary` `#2563eb`）。
  4. **Marquee：** 宿主 `bg-(--tiger-bg-card,#ffffff)` 实算 **`rgb(22,27,34)`**（`#161b22`），边 `--tiger-border` `#304050`，与欢迎 Card 的 `--tiger-surface` `#111827` **不是同一张暗底**。轨道宽 **2990.8px**，宿主 `overflow:hidden` 裁住，未撑出页面横溢。公告圆点 `--tiger-primary` `rgb(37,99,235)`。
  5. **KPI MetricGrid：** 四张 Tigercat Card 底 `--tiger-surface` `#111827`，数字 5/5/4/22 白字可读。图标 leftover **`p2-icon-chip`** 色 `rgb(37,99,235)`（跟 `--tiger-primary`）。1280 下仍是 4 列（`232.25px × 4`）。主区 `p2-icon-chip` 计数 **8**（KPI 4 + 系统信息 4）。
  6. **Charts：** Line 面积/描边 stop 仍全是 **`#3b82f6`**；Pie stop **`#3b82f6` / `#ef4444`**；Bar stop **`#3b82f6` / `#22c55e` / `#ef4444` / `#a855f7` / `#f97316`**。页面 `--tiger-primary` 是 **`#2563eb`**。三张 SVG 仍固定 **320×220** `display:block`，折线/柱卡宽 **643.3px**、右侧空 **323.3px**；饼图卡内宽 **309.7px**、`overflow:hidden`，Disabled 标签 **overflowRight 32.5px**、图例 **27.3px**（与 4b.3 浅色同形，暗底上更刺眼；画面「Active」左缘 / 「Disabled」右缘仍裁）。轴字/网格在暗底可读。
  7. **Export：** 三枚 DataExport 钮 CSV/JSON/Excel 跟 `--tiger-text` `#f0f6fc`、`--tiger-surface` `#111827`、`--tiger-border` `#304050`，无 `p2-export*`。矩形约 CSV **54.3×34** at **(1047,342)**、JSON **60.5×34** at **(1109,342)**、Excel **63.1×34** at **(1178,342)**。暗底描边可读。
  8. **Shortcuts / 系统信息：** 滚 `#main-content-scroll` scrollTop=**480**。四枚 leftover **`p2-action-tile`** 底 `--tiger-bg-card` `#161b22`、字 `--tiger-text` `#f0f6fc`、边 `--tiger-border` `#304050`，图标 `text-(--tiger-primary,#3b82f6)` → `rgb(37,99,235)`；贴在 `--tiger-surface` Card（`rgb(17,24,39)`）里，砖块比卡面略亮一档。系统信息行 **可见**：系统版本 **v1.0.0** / 运行环境 **.NET 10 + React 19**（「React 19」折到第二行）/ 最后更新 **2026-01-28** / API 状态 **在线**。截图 `/tmp/react-home-dark-charts.png`（1280×800）。
- **双端：** 与 Vue **4.6** 同形：`html.dark`；同一组 `--tiger-*`（primary `#2563eb` 不是 `.dark` 兜底 `#6396ff`；bg-page `#0d1117` / bg-card `#161b22` / bg-hover `#1b212c` / text `#f0f6fc` / text-secondary `#8b949f` / border `#304050`；surface `#111827`）；内容区底 `#1f2937`；Marquee `--tiger-bg-card` vs Card `--tiger-surface` 两档灰；leftover `p2-page-accent` / `p2-text-primary` / `p2-action-tile` / `p2-icon-chip`；图表硬编码 `#3b82f6/#ef4444/#22c55e/#a855f7/#f97316` 不跟 `--tiger-primary`；饼图裁切同 4.3/4b.3（Disabled overflowRight **32.5**、legend **27.3**）；系统信息 v1.0.0 / 2026-01-28 / API 在线。**错位：** 运行环境 Vue 4.6 是 **.NET 10 + Vue 3**，React 是 **.NET 10 + React 19**。React LogoIcon 渐变 `#3B82F6/#4F46E5` 是 Vue `AppLogo` 没有的暗色 leftover。
- **严重度：** 切深色后 `html.dark`、壳与主区暗底、KPI/导出/系统信息可读：通过（信息）。硬编码图表 hex `#3b82f6/#ef4444/#22c55e/#a855f7/#f97316` 不跟 `--tiger-primary`（暗色 leftover，浅色已记在 4b.3）：**低**。leftover `p2-page-accent` / `p2-text-primary` / `p2-action-tile` / `p2-icon-chip` 多数已绑 `--tiger-*`，但 Marquee/`p2-action-tile` 用 `--tiger-bg-card`、Card 用 `--tiger-surface`，暗底出现两档灰：**低**（与 Vue 4.6 同档）。LogoIcon 渐变 hex 不跟 `--tiger-primary`：**低**（4b.1 浅色已记，本条记暗色仍在）。饼图裁切同 4b.3（中，不在本条重开）。Theme 紧凑/主色：本条不审。

### 4b.7 Mobile ~375px

本期 `list_pages` 时 4b.6 的隔离上下文 **`react-home-dark-mobile` 已不在**（仅 about:blank + inspect）。先开 `chrome://inspect/#remote-debugging`，「Allow remote debugging for this browser instance」仍勾选（截图 `/tmp/react-home-mobile-inspect-remote-debugging.png`）。新隔离上下文 **`react-home-mobile-ph`** 打开 React `http://127.0.0.1:5174/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」关掉（**未审 Tour**）。未复用 `vue-*` / `react-home-dashboard` / `react-home-export` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`。未开 Vue `5173` 走查（Vue ## 4.7 已在本文件，不重走）。未重启三端。不是 MockApi / `dev:demo` / Aspire。未改产品代码。未重写 4b.1–4b.6。新隔离上下文默认 **不是暗色**（`html` class 空、`localStorage tigercat.admin.theme` = `null`、`html.dark` = false），因此 **未开** ThemeConfigDrawer、未点「浅色」。**4b.7 使用浅色。** emulate 视口 **375×812×2,mobile,touch**。首屏截图后立刻写本条；折下图表/快捷/系统信息本条先标缺口，后面只滚一次补拍。

- **模块：** 仪表盘 `/dashboard` 移动 ~375px（壳汉堡 / 欢迎卡 / Marquee 裁切 vs 页面横溢 / 导出换行 / KPI 单列 / 折下图表·快捷·系统信息）
- **端：** React
- **视口：** ~**375×812**（emulate `375x812x2,mobile,touch`；PNG 像素 **750×1624** = 2× CSS **375×812**），隔离上下文 **`react-home-mobile-ph`**，**浅色**（新隔离上下文默认；不是 4b.6 留下的 `html.dark`）
- **复现：**
  1. **壳（live + shot）：** Header 左汉堡 `aria-label="打开导航菜单"` + 品牌「管理中心」在 375 宽下折成两行「管理 / 中心」（蓝字，矩形约 **51×56** at **(64,16)**）+ 主题调色盘钮 + 铃铛红徽 **2** + 头像「A admin ▾」。面包屑 **管理中心 / 仪表盘**（「管理中心 /」一行，「仪表盘」折到下一行；第二处「管理中心」**56×20** at **(16,76)**）。TagsView 左一枚浅蓝描边 tab **仪表盘**，右 **…**。无「演示模式」Tag。无侧栏（汉堡收起；`[role=complementary]` 不占宽）。主区第一块是欢迎 Card（**327×90** at **(24,210)**，LogoIcon 48×48），不是 PageHeader。截图 `/tmp/react-home-mobile-375.png`。
  2. **Welcome（live + shot）：** Tigercat Card：左 LogoIcon 蓝底白 T + 标题 **「欢迎回来，admin！」** + 副文 **Hello world**。375 下 **没有**「管理员 / 已认证」Tag（宿主 `hidden sm:flex items-center gap-2`，`display:none`，`vis=false`；与 4b.1 桌面可见对照）。欢迎卡淡蓝横向渐变仍在（leftover `p2-page-accent`，4b.1 已记，本条不重开）。
  3. **Marquee clip vs 页面溢出（live）：** 欢迎卡下一条圆角描边跑马灯。宿主 **327×38** at **(24,324)**，`overflow/overflowX=hidden`，`z-index:auto`。轨道宽 **2991px**，`transform: matrix(1,0,0,1,-679.143,0)`。画面左缘裁成 **「…接近 80%，请及时清理过期文件。」**（前一条「媒体存储用量接近 80%…」的尾），蓝点后 **「演示环境将…」** 右缘再被盒子裁掉。这是 Marquee 宿主 `overflow:hidden` 的轨道裁切，不是独立浮层。**`documentElement.scrollWidth===clientWidth===375`**；**`#main-content-scroll` scrollWidth===clientWidth===375**（scrollTop=0，scrollHeight=2276，clientHeight=626）。Marquee 裁切 ≠ 页面横溢。shot 右侧主区有竖滚动条。
  4. **Export wrap（live + shot）：** Marquee 与 KPI 之间右对齐三枚描边钮 **CSV / JSON / Excel**，**同一行、未换行**（`flex-wrap` 在 375 仍装得下）。CSV **54×34** at **(157,386)**、JSON **61×34** at **(219,386)**、Excel **63×34** at **(288,386)**。未点导出（4b.5 已点过 CSV）。
  5. **KPI 单列（live + shot）：** MetricGrid 在 375 为 **单列堆叠**（`grid-template-columns: 327px`；class `grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-4`；桌面 4b.2 是 4 列）。四张 **327×90**：总用户数 **5** at y **444** / 活跃用户 **5** at y **550** / 总角色数 **4** at y **656** / 总权限数 **22** at y **762**（bottom **852** > 视口 812，**clippedBottom**）。画面第四张只露出卡顶（图标+标题「总权限数」+ 数字上半 **22**），被视口底裁掉。右下 FAB 蓝 **+** 压在「总角色数」卡右下，其下聊天气泡未读红徽 **1**。
  6. **Charts / shortcuts / 系统信息（首屏）：** 本张 **折下不可见**。用户创建趋势 y **893**、快捷操作「用户管理」y **1570**、系统版本 y **2117**，均 `vis=false`（首屏 innerHeight=812）。本条写完后才滚一次补拍；写本条时无 `/tmp/react-home-mobile-375-below.png` → **缺口**。
- **双端：** 与 Vue **4.7** 同形：~375×812 浅色；汉堡收起侧栏；品牌「管理中心」与面包屑折行；欢迎卡无身份 Tag（`hidden sm:flex`）；Marquee 宿主裁轨道、CSV/JSON/Excel 同行未换行；KPI 单列 总用户数 5 / 活跃 5 / 角色 4 / 权限卡底被视口裁；折下图表 / 快捷 / 系统信息不在首屏；FAB + 与聊天气泡压 KPI。**错位：** Vue 4.7 写 shot 时未测 `scrollWidth`（标缺口）；React 本条 live 测得 **documentElement 375===375** 且 **`#main-content-scroll` 375===375**，故 Marquee 裁切已与页面横溢分开。欢迎卡左标 React 是 `LogoIcon`（无 drop-shadow），Vue 是 `AppLogo`。
- **严重度：** 375 浅色首屏壳 + 欢迎卡无身份 Tag + KPI 单列 + 导出三钮同行 + 无页面横溢：通过（信息，符合 `hidden sm:flex` / `grid-cols-1` / `flex-wrap` / Marquee 宿主裁切）。折下图表 / 快捷操作 / 系统信息：**缺口**（写本条时未滚）。品牌「管理中心」与面包屑在 375 折行：信息（壳，非本页缺陷）。FAB 压 KPI 右下：信息（壳 ChatDock / 快操作，4b.7 不审 Chat）。Theme 用浅色（新隔离上下文默认，未开抽屉）；未在 375 切暗色。

### 4b.8 PageHeader leftover

本期只写 4b.8，不重开 4b.1–4b.7，不审 Vue Home，不 attach Chrome，不开项 5。证据 = `HomePage.tsx` / `PageHeader.tsx` / `UsersPage.tsx` 源码 + 既有 shot `/tmp/react-home-welcome.png`（1280 浅色）/ `/tmp/react-home-dark.png`（1280 深色）/ `/tmp/react-home-mobile-375.png`（375）。未改产品代码。

- **模块：** 仪表盘 PageHeader leftover（`TigerPageHeader` + `p2-icon-chip` 48 + title lg + subtitle + optional tags）
- **端：** React
- **视口：** 既有 shot 桌面 **1280**（浅色 `/tmp/react-home-welcome.png` + 深色 `/tmp/react-home-dark.png`）与移动 **375**（`/tmp/react-home-mobile-375.png`）。本条未 attach 浏览器、未测 live DOM。
- **复现：**
  1. **源码无 PageHeader：** `HomePage.tsx` 本地组件 import 是 `LogoIcon`（`../components/Icons`）+ `ChartEmptyState` / `MetricCard` / `MetricGrid`（`../components/PageFragments`），**没有** `PageHeader`（## 4b 引言与 4b.1 已写，本条核对源码仍如此）。返回根 `div.space-y-6`，第一块内容是 Tigercat `Card` 欢迎区（`{/* 欢迎区域 */}`），不是 `<PageHeader>`。
  2. **对照 `PageHeader.tsx` chrome：** `@expcat/tigercat-react/PageHeader` 的 `TigerPageHeader`（`showBack={false}`，`className="min-w-0 overflow-hidden"`）+ 左 `div.p2-icon-chip` **48×48**（`h-12 w-12`，内传入 `icon`）+ `Text` title `size="lg"` `weight="bold"` `p2-text-primary` + subtitle `size="sm"` `color="secondary"` + 可选 `actions` tags（`hidden sm:flex`）。
  3. **Shot：主区第一块是欢迎 Card，不是 PageHeader。** `/tmp/react-home-welcome.png`（1280 浅色）：TagsView 下第一块是欢迎 Card——左 LogoIcon 蓝底白 T + **「欢迎回来，admin！」** + 副文 Hello world + 右 Tag「管理员 / 已认证」，淡蓝横向洗。**没有** 48px `p2-icon-chip` + 页标题「仪表盘」那种 PageHeader 行。`/tmp/react-home-dark.png`（1280 深色）同形：暗底欢迎 Card，仍是 LogoIcon + 欢迎回来。`/tmp/react-home-mobile-375.png`（375）：同样欢迎 Card 为首块，375 下身份 Tag 不见（源码 `hidden sm:flex`）。4b.1 / 4b.7 已写过这点，本条不重审欢迎卡。
  4. **壳 chrome ≠ leftover PageHeader：** 三张 shot 上都有面包屑 **管理中心 / 仪表盘** 和 TagsView tab **仪表盘**。这是 App Shell（Header breadcrumbs + TagsView），不是 `PageHeader.tsx`。375 下面包屑折成「管理中心 /」+「仪表盘」仍是壳。
  5. **对照 `/users`：** 4b.4 点快捷操作「用户管理」落到 **`http://127.0.0.1:5174/users`**，主区 **有** PageHeader「用户管理 / 管理平台用户账号、角色与权限」。`UsersPage.tsx` `import { PageHeader }` 并传入 `title="用户管理"` `subtitle="管理平台用户账号、角色与权限"` `icon={<UsersIcon size={24} />}` + tags。Home **没有** 这条 chrome。
  6. **Home 上仍在的 header-ish leftover（4b.1–4b.6 已记，不重写）：** 欢迎卡 `p2-page-accent` + 标题 `p2-text-primary`（4b.1 / 4b.6）；快捷操作原生 `p2-action-tile`（4b.4 / 4b.6）；图表硬编码 `#3b82f6` 等 hex，不跟 `--tiger-primary` `#2563eb`（4b.3 / 4b.6）；LogoIcon 渐变 stop **`#3B82F6` → `#4F46E5`**（`Icons.tsx`，4b.1 / 4b.6）。欢迎卡布局（48 左标 + lg 标题 + sm 副文 + `hidden sm:flex` tags）**形似** PageHeader slot，但是 `Card`+`LogoIcon`，不是 `TigerPageHeader`+`p2-icon-chip`。
  7. **Live DOM：** 本条未 attach Chrome，拒绝声称未测的选择器计数（例如 `/dashboard` 上 `TigerPageHeader` / `.p2-icon-chip` 节点数）→ **缺口**。结论靠源码无 import + 三张 shot 画面，不编造 DOM 选择器。
- **双端：** 与 Vue **4.8** 同形：Home **不 import** `PageHeader`；主区第一块是欢迎 Card 不是 `TigerPageHeader`+`p2-icon-chip` 页头行；壳面包屑「管理中心 / 仪表盘」与 TagsView tab「仪表盘」不是 leftover PageHeader；`/users` **有** PageHeader 标题/副标题，Home 没有；残留 header-ish leftover 同一组（`p2-page-accent` / `p2-text-primary` / `p2-action-tile` / 图表 hex）；live `TigerPageHeader` 选择器计数两端都标缺口（本条未测）。**错位：** 欢迎卡左标 Vue 4.8 是 `AppLogo`，React 是 `LogoIcon`；React 另有 LogoIcon 渐变 `#3B82F6/#4F46E5` leftover（Vue 4.8 未列这项）。
- **严重度：** `/dashboard` 不 import / 不渲染 `PageHeader`，主区第一块是欢迎 Card（LogoIcon +「欢迎回来，admin！」）：通过（信息，源码 + 1280/375 shot）。壳面包屑 / TagsView「仪表盘」不是 leftover PageHeader：通过（信息）。Home 残留 header-ish leftover（`p2-page-accent` / `p2-text-primary` / `p2-action-tile` / 图表 hex / LogoIcon 渐变）：**低**（已在 4b.1/4b.3/4b.4/4b.6，本条不升档）。Live `TigerPageHeader` 选择器计数：**缺口**（本会话未测，不声称）。

---

## 5. About (Vue)

本期只走 Vue `http://127.0.0.1:5173/about`（`AboutPage.vue`）。未开 React `5174` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/vue-about-inspect-remote-debugging.png`），再在隔离上下文 **`vue-about`** 打开 `/login`，未复用 `vue-home-dashboard` / `vue-home-rest` / `vue-home-dark-mobile` / `vue-home-mobile-ph` / `vue-shell-overlays` / `vue-tags-chat` / `react-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme（除 5.4 只为查 About token 而拨暗色）/ Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `AboutPage.vue`、`PageHeader.vue`：AboutPage **有 import** `PageHeader` + Tigercat `NavigationMenu` / `Alert` / `Card` / `Text` / `Tag`。入口：侧栏底部「关于」→ `/about`。

### 5.1 PageHeader + live info

- **模块：** About PageHeader + GET `/api/info` 服务概览
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-about`，浅色
- **复现：**
  1. 登录后点侧栏底部 **关于**，URL **`http://127.0.0.1:5173/about`**。标题 `tigercat-admin-vue`。壳面包屑「管理中心 / 关于」；TagsView 选中「关于」（可关）；无「演示模式」Tag。截图 `/tmp/vue-about-info.png`（1280×800）。
  2. **PageHeader 已挂：** 主区第一块是 `header.tiger-page-header` **977×65** at **(264,166)**，`class-name="min-w-0 overflow-hidden"`，底透明、底边 `--tiger-border` `rgb(229,231,235)`。左 leftover **`p2-icon-chip`** **48×48** at **(264,166)**（`h-12 w-12`，内 Icon 24，info），底 `color(srgb 0.145 0.388 0.922 / 0.14)`、色 `rgb(37,99,235)`（跟 `--tiger-primary` `#2563eb`）。标题 **「关于 Tigercat」** `Text` `size=lg` `weight=bold` leftover **`p2-text-primary`** **154×28** at **(324,166)**，色 `rgb(17,24,39)`（`--tiger-text` `#111827`）。副文 **「了解平台版本与服务信息」** `Text` `size=sm` `color=secondary` **154×20** at **(324,194)**，色 `rgb(75,85,99)`。右侧 `#actions` tags（`hidden sm:flex`，1280 下 `display:flex`）：**系统信息** `variant=primary` 底 `rgb(219,234,254)` / 字 `rgb(37,99,235)`；**已连接** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)`。与 Home **不 import** PageHeader 对照：本页 **有** 这条 chrome。
  3. **GET `/api/info` 200：** 导航到 `/about` 后 `GET http://127.0.0.1:5173/api/info` **200**，`server: Kestrel`（不是 MockApi）。body `{"code":200,"message":"Success","data":{"name":"Tigercat Admin API","version":"1.0.0","description":"Tigercat Admin Backend API"},"success":true}`。无 Alert「信息加载失败」。无「正在加载服务信息...」。
  4. **服务概览 Card：** `#about-info` 内 Tigercat Card 宿主 **977×108** at **(264,323)**，底 `--tiger-surface` `#ffffff`，边 `--tiger-border` `#e5e7eb`。源码 `<Card title="服务概览">` live 落到 **HTML `title="服务概览"`** 原生 tooltip，**没有** `tiger-card-header` / 可见「服务概览」标题（a11y 树也无该字）。卡内 leftover 三格 `grid-cols-1 md:grid-cols-3`（1280 下三列，各 **298×74** at y **340**）：**服务名称 / Tigercat Admin API**、**当前版本 / 1.0.0**、**服务描述 / Tigercat Admin Backend API**。与 API `data` 一致。每格 `border-slate-200 bg-slate-50/70`：边 `oklch(0.929 0.013 255.508)`、底 `oklab(0.984 … / 0.7)`，不是 `--tiger-border` / `--tiger-bg-card`。图标芯片 40×40 leftover **`bg-blue-100 text-blue-600` / `bg-purple-100 text-purple-600` / `bg-green-100 text-green-600`**。数值 `Text` 同时带 `text-[var(--tiger-text,#111827)]` 与 leftover **`text-slate-800`**，实算 `oklch(0.279 0.041 260.031)`。
  5. **系统信息行（折下）：** 首屏 y **916** > 视口 800，shot 不可见。源码第四张 Card `title="系统信息"` 同样落到 HTML `title`；内三格运行环境 **.NET 10 + Vue 3** / 包管理器 **PNPM** / API 状态 Tag **● 已连接**（success）。本条不滚；5.2 滚到 stack 时再对一下。
- **严重度：** PageHeader「关于 Tigercat / 了解平台版本与服务信息」+ tags 系统信息 / 已连接 + `/api/info` 200 三字段上屏：通过（信息）。`Card title` 未渲染可见标题、只剩 native `title` tooltip：**中**。leftover `slate-200` / `bg-slate-50/70` / `bg-*-100 text-*-600` / `text-slate-800` 不跟 `--tiger-*`：**低**（Roadmap leftover）。`p2-icon-chip` + `p2-text-primary` 已绑 `--tiger-primary` / `--tiger-text`：**低**（与 Home PageHeader chrome 同形）。

### 5.2 NavigationMenu jumps

本期 5.2 **先写前一会话已落盘的两张 nav shot**（PNG 像素 **1280×800**，浅色），不重写 5.1。截图 `/tmp/vue-about-nav.png`（点「服务信息」Trigger 后）与 `/tmp/vue-about-nav-stack.png`（点「技术栈」Trigger 后）。两张都 **看不见** 可见 Card 标题「服务概览 / 产品亮点 / 技术栈」（5.1 已记：`Card title` 落到 native `title` tooltip）。**shot 只证明 Trigger 打开 Content，不能证明点了 NavigationMenuLink 后 `scrollIntoView`。** 下面 live 只补：Trigger → Content link 的滚动位移、`#about-*` 矩形、`overflow-x-auto` vs `scrollWidth`。

- **模块：** About NavigationMenu 锚点（服务信息 → `#about-info` / 特性 → `#about-features` / 技术栈 → `#about-stack`）
- **端：** Vue
- **视口：** 桌面 **1280×800**，浅色；shot 为前一会话隔离上下文 **`vue-about`**
- **复现：**
  1. **服务信息 Trigger（shot）：** `/tmp/vue-about-nav.png`（1280×800）。PageHeader 下一条横排 NavigationMenu：**服务信息** caret **朝上**（展开）/ **特性** caret 朝下 / **技术栈** caret 朝下。Trigger 下弹出白底圆角 Content，文案 **「查看服务名称、版本与连接状态」**（源码 `ABOUT_SECTIONS.info.description`）。主区仍是页顶：PageHeader「关于 Tigercat」+ 服务三格（服务名称 **Tigercat Admin API** / 当前版本 **1.0.0** / 服务描述 **Tigercat Admin Backend API**）+ 产品亮点四 pastel chips（清晰导航体验蓝 / 安全认证体系紫 / 快速响应接口橙 / 一致视觉语言绿）+ 技术栈上沿（前端框架 **Vue 3** / 构建工具 **Vite**）。与 `/tmp/vue-about-info.png` 同屏位置。**#about-info 已在视口内**，shot 上看不出滚动位移（先验：服务信息 jump 后 `#main-content-scroll` scrollTop=0）。
  2. **技术栈 Trigger（shot）：** `/tmp/vue-about-nav-stack.png`（1280×800）。**技术栈** caret **朝上**（展开），弹出 **「了解前端、构建与 UI 组件」**（源码 `ABOUT_SECTIONS.stack.description`）。服务信息 / 特性 caret 朝下（收起）。**画面仍是页顶**——PageHeader、服务三格、亮点四格完整可见，技术栈仍只露 Vue 3 / Vite 上沿，**没有**滚到 `#about-stack` 整块或系统信息行。shot 只证明点了 **Trigger**；**没有**证明点了 Content 里的 `NavigationMenuLink`。特性（「浏览产品亮点与体验说明」）无独立 shot。
  3. **锚点 vs 可见内容（shot + 源码，非可见 heading）：** `#about-info` = 服务概览三格（shot 全见）；`#about-features` = 产品亮点四 chips（shot 全见）；`#about-stack` = 技术栈（shot 只见 Vue 3 / Vite；源码还有开发语言 TypeScript / UI 组件 Tigercat UI，折下）。系统信息 Card 仍折下（5.1 已记 y≈916）。源码 `scrollToAboutSection` 对 `href` 做 `preventDefault` + `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`，目标 id 即 `#about-info` / `#about-features` / `#about-stack`。
  4. **leftover `overflow-x-auto`（shot）：** 源码 `<NavigationMenu class-name="min-w-0 overflow-x-auto">`。1280 下三项「服务信息 特性 技术栈」同一行、右余白大，shot **看不见** nav 横向滚动条；页右是主区竖滚动条。三项之间有空隙，不像被裁切。`documentElement.scrollWidth===clientWidth` 与 nav 自身 scrollWidth **本条写 shot 时未测 → 缺口**（live 补）。
- **严重度：** Trigger 打开 Content，文案与源码 description 一致：通过（信息，两张 1280×800 shot）。服务信息目标已在首屏、shot 无位移：信息（符合先验 scrollTop=0）。**点 Content link 后是否 smooth scroll 到 `#about-features` / `#about-stack`：缺口**（shot 未证明 Link 点击与滚动位移）。leftover `min-w-0 overflow-x-auto` 1280 下未见横条：**低**（Roadmap leftover；横溢数字待 live）。

