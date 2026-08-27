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
