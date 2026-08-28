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
  5. **live scroll proof（vue-about-rest）：** 隔离上下文 **`vue-about-rest`**，`admin` / `admin123`，视口 **1280×800** 浅色。inspect Allow shot `/tmp/vue-about-rest-inspect-remote-debugging.png`。未改产品代码、未停 Api。
     - **overflow：** `documentElement` `scrollWidth===clientWidth===1280`（无页级横溢）。`#main-content-scroll` `scrollWidth===clientWidth===1025`，`scrollHeight=889`，`clientHeight=658`，`scrollTop=0`。
     - **NavigationMenu leftover `overflow-x-auto`：** `NAV.tiger-navigation-menu.min-w-0.overflow-x-auto` `scrollWidth===clientWidth===977` at **(264,255,977×44)**。1280 下无横条（补 复现 4 的横溢数字缺口）。
     - **锚点矩形（scrollTop=0）：** `#about-info` **(264,323,977×108)** vis=true；`#about-features` **(264,455,977×198)** vis=true（全见）；`#about-stack` **(264,677,977×198)** vis=true 但底边 y **875>800**（部分）；系统信息 Card `title=系统信息` **(264,899,977×108)** vis=false。
     - **点 服务信息 NavigationMenuLink 后：** `#main-content-scroll` `scrollTop` 仍 **0**，`location.hash` 空，`#about-info` 仍 y **323** vis=true。符合预期：目标已在屏内，`scrollIntoView` 无位移。
     - **点 特性 NavigationMenuLink 后：** `scrollTop` 仍 **0**，hash 空，`#about-features` 仍 y **455–653** 全在屏内，PageHeader 仍 vis y **166**，系统信息仍 vis=false。点击打到 `<a href=#about-features class=tiger-navigation-menu-link>` 文案「浏览产品亮点与体验说明」。截图 `/tmp/vue-about-nav-features.png`（1280×800）：特性 caret 朝上，Content「浏览产品亮点与体验说明」，页面仍在顶（PageHeader + 服务三格 + 亮点四格 + 技术栈 Vue 3 / Vite 上沿）。`scrollIntoView` 位移 **未观察到**（目标已全见；`block:start` 未推动 `#main-content-scroll`）。
     - **技术栈 Link + 滚到 `#about-stack` / 系统信息行：** 本 walk **未点** → **缺口**。系统信息 **.NET 10 + Vue 3** / **PNPM** / API **已连接** 在两次点击后仍折下（y **899**）。
- **严重度：** Trigger 打开 Content，文案与源码 description 一致：通过（信息，两张 1280×800 shot）。服务信息 / 特性 NavigationMenuLink 点击打到对应 `<a href=#about-*>`，目标已全在 1280×800 首屏，`scrollTop` 保持 0、hash 空、`scrollIntoView` 无位移：通过（信息，`vue-about-rest` live + `/tmp/vue-about-nav-features.png`）。`documentElement` / `#main-content-scroll` / nav `scrollWidth===clientWidth`，1280 下无横条：通过（信息）。leftover `min-w-0 overflow-x-auto`：**低**（Roadmap leftover；1280 无横溢）。**点 技术栈 Link 后是否 smooth scroll 到 `#about-stack` 整块 / 系统信息行：缺口**（本 walk 未点；系统信息 y=899 仍折下）。

### 5.3 Load-fail Alert

- **模块：** About 信息加载失败 Alert（`title="信息加载失败"`）
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-about-rest`，浅色（未另开失败路径）
- **复现：**
  1. 成功路径已在 **5.1** live：`GET http://127.0.0.1:5173/api/info` **200**（Kestrel），PageHeader Tag **已连接**，无 Alert「信息加载失败」，无「正在加载服务信息...」。本条不重写 5.1。
  2. 失败路径需要只在隔离上下文 `vue-about-rest` 内拦截 `/api/info`（DevTools offline / request blocking），**不能**停 Api `:5137`，**不能** block 全部 `/api`，**不能**留下任何拦截。
  3. chrome-devtools MCP **没有** URL request-block / `Network.emulate` URL-block 工具。本会话拒绝停 Api、拒绝全局 `/api` 拦截。无法在 1–2 回合内做安全的 isolated-context-only block。
  4. 因此失败 Alert 路径 **未 live 复现**。无失败 shot。源码路径仍在：`errorMessage` 非空时渲染 `<Alert type="error" title="信息加载失败" :description="errorMessage" closable>`；`getFriendlyErrorMessage` 无中文时落到「服务信息加载失败，请稍后重试。」；Tag 会切 `danger` / 「连接失败」。这些是源码契约，不是 live 失败画面。
- **严重度：** 成功路径（5.1 GET `/api/info` 200 + Tag 已连接 + 无 Alert）：通过（信息）。失败 Alert「信息加载失败」live：**缺口**（无安全 URL-block 工具；拒绝杀 Api / 全局 `/api` 拦截）。无 shot。

### 5.4 Dark tokens

本期隔离上下文 **`vue-about-dark-mobile`**（未复用 `vue-about` / `vue-about-rest` / `vue-about-shots` / `vue-home-*` / `vue-shell-*` / `react-*`）。先开 `chrome://inspect/#remote-debugging`（未再截 inspect）。`new_page` isolatedContext 打开 Vue `http://127.0.0.1:5173/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」（**未审 Tour**）。视口桌面 **1280×800**。侧栏「关于」进 `/about` 后 **一直停在 /about**。ThemeConfigDrawer **只用来切外观到深色**，关抽屉后查 `/about` token，**不把 Theme 当产品再走一遍**。未开 MockApi / `dev:demo` / Aspire，未重启 Api `:5137`，未动 React `:5174`。

- **模块：** About 暗色 token（PageHeader / NavigationMenu / infoCards / highlights / stack / systemInfo）
- **端：** Vue
- **视口：** 桌面 **1280×800**，深色；隔离上下文 `vue-about-dark-mobile`
- **复现：**
  1. Header `button` `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`。点开 Drawer「主题配置」，外观 Segmented 默认 **跟随系统**。点 **深色**，再点关闭 ×。抽屉关掉（无 mask）。`html` class = **`dark`**。`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`。URL 仍 `/about`。截图 `/tmp/vue-about-dark.png`（PNG **1280×800**；PageHeader + nav 服务信息/特性/技术栈 + 服务三格 + 亮点四格 + 技术栈 Vue 3 / Vite 上沿；系统信息折下）。无「演示模式」Tag。
  2. **`--tiger-*` 计算值（`documentElement`）：** `--tiger-primary=#2563eb`、`--tiger-bg-page=#0d1117`、`--tiger-bg-card=#161b22`、`--tiger-bg-hover=#1b212c`、`--tiger-text=#f0f6fc`、`--tiger-text-secondary=#8b949f`、`--tiger-border=#304050`、`--tiger-surface=#111827`、`--tiger-surface-muted=#1f2937`。`#main-content-scroll` 底 `rgb(31,41,55)`（`#1f2937`）。侧栏 `aside.tiger-sidebar` 底 `rgb(17,24,39)`（`--tiger-surface`）。无横向溢出（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` **1025===1025**）。
  3. **PageHeader：** `header.tiger-page-header` **977×65** at **(264,166)** vis=true，底透明、边 `rgb(48,64,80)` = `--tiger-border` `#304050`。leftover **`p2-icon-chip`** 48×48，色 `rgb(37,99,235)` / 底 `color(srgb 0.145 0.388 0.922 / 0.14)`（跟 `--tiger-primary`）。leftover **`p2-text-primary`**「关于 Tigercat」色 **`rgb(240,246,252)`** = `--tiger-text` `#f0f6fc`。Tag「系统信息 / 已连接」可读。
  4. **nav：** `nav.tiger-navigation-menu` class 含 leftover `min-w-0 overflow-x-auto`，**977×44** at **(264,255)**，`overflow-x:auto`，`scrollWidth===clientWidth===977`（1280 无横条）。Trigger「服务信息 / 特性 / 技术栈」class 含 `text-[var(--tiger-text,#374…)]`，实算 **`rgb(240,246,252)`** = `--tiger-text`。
  5. **宿主 Card vs leftover 内格：** `#about-info` / `#about-features` / `#about-stack` 宿主均 `bg-[var(--tiger-surface,#ffffff)]` + `border-[var(--tiger-border,#e5e7eb)]`，底 **`rgb(17,24,39)`**、边 **`rgb(48,64,80)`**（跟 `--tiger-surface` / `--tiger-border`）。内格 **不跟** 这组 token：
     - **infoCards / stack / systemInfo 内格** class `border-slate-200 bg-slate-50/70`（量到 **10** 枚 `bg-slate-50*`、**14** 枚 `border-slate-200`）。边实算 **`oklch(0.929 0.013 255.508)`** ≈ `rgb(226,232,240)` / `#e2e8f0`，**不是** `--tiger-border` `#304050`。底实算 **`oklab(0.984 … / 0.7)`**（浅 slate-50 半透明，暗底上仍是浅灰砖）。例：`#about-info`「服务名称 / 当前版本 / 服务描述」三格 **298×74** at y **340** vis=true。
     - **值字 leftover `text-slate-800`：** **13** 枚，class 同时写 `text-[var(--tiger-text,#111827)] text-slate-800`。实算 **`oklch(0.279 0.041 260.031)`** ≈ `rgb(29,41,61)` / `#1d293d`，**不是** `--tiger-text` `#f0f6fc`（`text-slate-800` 压过 CSS 变量）。贴在浅 leftover 砖上可读，但整砖停在浅色。
     - **芯片 `bg-*-100`：** `#about-info` `bg-blue-100 text-blue-600` 底 `oklch(0.932 0.032 255.585)` ≈ `#dbeafe`、色 `oklch(0.546 0.245 262.881)`；同段还有 `bg-purple-100` / `bg-green-100`。均不是 `--tiger-primary` / `--tiger-bg-card`。
  6. **highlights `#about-features`：** 四格 leftover `border-slate-200 bg-linear-to-br from-*-50 to-*-100`，1280 下 2×2 全 vis。边同样 `oklch(0.929 …)` 浅 slate。渐变仍是浅色：`from-blue-50 to-blue-100` = `linear-gradient(to right bottom, oklch(0.97 0.014 254.604), oklch(0.932 0.032 255.585))` ≈ `#eff6ff→#dbeafe`；紫 `#faf5ff→#f3e8ff`；橙 `#fff7ed→#ffedd4`；绿 `#f0fdf4→#dcfce7`。图标壳 leftover **`bg-white/70`** 底 `oklab(1 … / 0.7)`。四砖贴在 `--tiger-surface` 宿主上，是完整浅色岛。
  7. **stack / systemInfo：** `#about-stack` 宿主 y **677** vis=true（底边 875>800，下两格部分裁切）。内格同 `border-slate-200 bg-slate-50/70`：Vue 3 / Vite vis=true at y **694**；TypeScript / Tigercat UI at y **784**（芯片 y **801** vis=false）。**systemInfo** 无独立 `#id`；内格「运行环境 .NET 10 + Vue 3 / 包管理器 PNPM / API 状态 ● 已连接」class 同 leftover，y **916** vis=false（折下），底/边与 infoCards 同一组浅 `oklab`/`oklch`，未跟 `--tiger-bg-card`。本张首屏看不到系统信息行。
- **严重度：** 切深色后 `html.dark`、壳侧栏/`#main-content-scroll`/PageHeader/`nav` Trigger 跟 `--tiger-*`，值字 `p2-text-primary` 变 `#f0f6fc`：通过（信息，`vue-about-dark-mobile` live + `/tmp/vue-about-dark.png`）。infoCards / highlights / stack / systemInfo 内格 leftover `border-slate-200` / `bg-slate-50/70` / `from-*-50 to-*-100` / `bg-*-100` / `bg-white/70` / `text-slate-800` **不跟** `--tiger-bg-card` / `--tiger-surface` / `--tiger-border` / `--tiger-text`，暗壳上整组浅色砖：**中**。`text-slate-800` 压过同元素 `--tiger-text`：**中**（同源 leftover）。Theme 紧凑/主色：本条不审。系统信息首屏折下：信息（5.5 再量 375）。

### 5.6 leftover CSS

本期只写 5.6，不重写 5.1–5.3，不审 React About，不 attach Chrome。证据 = `AboutPage.vue` / `PageHeader.vue` 源码 + 已记 5.1/5.2 live（视口 **1280×800** 浅色，`vue-about` / `vue-about-rest`）。未改产品代码。双端对照留给 React About，本条 **未开** `5174`。写本条时 **5.4 Dark / 5.5 Mobile 375 尚未存在**，暗色与 ~375 leftover 标 **缺口**。

- **模块：** About leftover CSS（PageHeader `p2-*` / NavigationMenu `overflow-x-auto` / infoCards·highlights·techStack·systemInfo 的 `slate` / `*-100` / `from-*-50` / `text-slate-800` vs `--tiger-*`）
- **端：** Vue
- **视口：** 桌面 **1280×800** 浅色（5.1/5.2 live）。深色 / ~375：**缺口**（5.4/5.5 写本条时未落）
- **复现：**
  1. **与 Home 4.8 对照：About 有 import PageHeader。** `AboutPage.vue` `<script setup>` `import PageHeader from '../components/PageHeader.vue'`，模板第一块 `<PageHeader title="关于 Tigercat" subtitle="了解平台版本与服务信息" icon="info" :tags="[系统信息, connectionStatus]">`。Home 4.8 明确 **不** import。5.1 live：`header.tiger-page-header` **977×65** at **(264,166)**，`class-name="min-w-0 overflow-hidden"`。
  2. **PageHeader leftover `p2-icon-chip` + `p2-text-primary`（5.1 已量，绑 `--tiger-*`）：** 左芯片 `div.p2-icon-chip` **48×48**（`h-12 w-12`，内 Icon 24），底 `color(srgb 0.145 0.388 0.922 / 0.14)`、色 `rgb(37,99,235)` = `--tiger-primary` `#2563eb`。标题 leftover `p2-text-primary` **154×28**，色 `rgb(17,24,39)` = `--tiger-text` `#111827`。副文走 Tigercat `color=secondary`，不是 `p2-*`。`#actions` tags `hidden sm:flex`（1280 下 flex）。`PageHeader.vue` 定义同形。
  3. **Card `title` 不是可见 heading（5.1 已记）：** 四张 Card `title="服务概览 / 产品亮点 / 技术栈 / 系统信息"` live 落到 HTML 原生 `title` tooltip，**没有** `tiger-card-header` / 可见标题。这是 leftover 呈现，不是 `--tiger-*` 色值问题。
  4. **infoCards / techStack / systemInfo 共用格子 leftover：** 源码每格 `flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/70`。5.1 服务概览三格 live：边 `oklch(0.929 0.013 255.508)`、底 `oklab(0.984 … / 0.7)`，**不是** `--tiger-border` `#e5e7eb` / `--tiger-bg-card`（宿主 Card 才是 `--tiger-surface` `#ffffff` + `--tiger-border` `#e5e7eb`）。数值 `Text` 同时带 `text-[var(--tiger-text,#111827)]` 与 leftover **`text-slate-800`**，实算 `oklch(0.279 0.041 260.031)`，不是 `--tiger-text` `#111827`。
  5. **图标芯片 `bg-*-100 text-*-600`（Tailwind 色阶，不跟 `--tiger-primary`）：**
     - infoCards：`bg-blue-100 text-blue-600` / `bg-purple-100 text-purple-600` / `bg-green-100 text-green-600`（5.1 live 已见）。
     - techStack：`bg-green-100 text-green-600` / `bg-orange-100 text-orange-600` / `bg-blue-100 text-blue-600` / `bg-purple-100 text-purple-600`。
     - systemInfo：`bg-indigo-100 text-indigo-600` / `bg-blue-100 text-blue-600` / `bg-green-100 text-green-600`。
     1280 浅色下这些是 pastel 芯片；对照 token `--tiger-primary` / `--tiger-bg-card` / `--tiger-text` / `--tiger-surface` / `--tiger-border` 都不走这些 `*-100/*-600`。
  6. **highlights leftover 渐变：** 四格 `border-slate-200 bg-linear-to-br` + `from-blue-50 to-blue-100` / `from-purple-50 to-purple-100` / `from-orange-50 to-orange-100` / `from-green-50 to-green-100`；图标 wrap `bg-white/70` + `text-*-600`；标题同样 leftover `text-slate-800`。5.2 shot 已见四枚 pastel chips（清晰导航体验蓝 / 安全认证体系紫 / 快速响应接口橙 / 一致视觉语言绿）。**本条未再 attach** 量 `from-*-50` 计算色。
  7. **NavigationMenu leftover `min-w-0 overflow-x-auto`（5.2 live）：** `<NavigationMenu class-name="min-w-0 overflow-x-auto">`。1280 浅色 `NAV.tiger-navigation-menu` `scrollWidth===clientWidth===977` at **(264,255,977×44)**。`documentElement` 1280===1280，`#main-content-scroll` 1025===1025。无横条。leftover 类仍在，1280 无横溢。
  8. **暗色 leftover / ~375 leftover：** 写本条时 **### 5.4 / ### 5.5 尚未存在**。`html.dark` 下 `slate-200` / `bg-slate-50/70` / `bg-*-100` / `from-*-50` / `text-slate-800` 是否仍是浅 pastel、375 下 `grid-cols-1` 与 nav `overflow-x-auto` 是否横溢：**缺口**（留给 5.4/5.5 live）。
- **严重度：** About **有** PageHeader（与 Home 4.8 对照）+ `p2-icon-chip`/`p2-text-primary` 已绑 `--tiger-primary`/`--tiger-text`：通过（信息，5.1）。`Card title` 只剩 native tooltip：**中**（5.1 已记，本条不升档）。格子 leftover `border-slate-200` / `bg-slate-50/70` / `text-slate-800` / `bg-*-100 text-*-600` / `from-*-50 to-*-100` / `bg-linear-to-br` 不跟 `--tiger-primary` / `--tiger-bg-card` / `--tiger-text` / `--tiger-surface` / `--tiger-border`：**低**（Roadmap leftover；1280 浅色 5.1/5.2）。`min-w-0 overflow-x-auto`：**低**（1280 `scrollWidth===clientWidth===977`）。暗色 / 375 leftover 计算色与横溢：**缺口**。

---

## 5b. About (React)

本期只走 React `http://127.0.0.1:5174/about`（`AboutPage.tsx`）。未开 Vue `5173` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/react-about-inspect-remote-debugging.png`），再在隔离上下文 **`react-about`** 打开 `/login`，未复用 `vue-about` / `vue-about-rest` / `vue-about-dark-mobile` / `vue-about-shots` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-home-dashboard` / `react-home-export` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `AboutPage.tsx`、`PageHeader.tsx`：AboutPage **有 import** `PageHeader` + Tigercat `NavigationMenu` / `Alert` / `Card` / `Text` / `Tag`。入口：侧栏底部「关于」→ `/about`。本期只写 **5b.1 / 5b.2**；未走 5b.3 Load-fail Alert / 5b.4 Dark / 5b.5 Mobile 375 / leftover 5b.6。

### 5b.1 PageHeader + live info

- **模块：** About PageHeader + GET `/api/info` 服务概览
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-about`，浅色
- **复现：**
  1. 登录后点侧栏底部 **关于**，URL **`http://127.0.0.1:5174/about`**。标题 `tigercat-admin-react`。壳面包屑「管理中心 / 关于」；TagsView 选中「关于」（可关）；无「演示模式」Tag（`document.body.innerText` 检索「演示模式」为 false）。截图 `/tmp/react-about-info.png`（1280×800）。
  2. **PageHeader 已挂：** 主区第一块是 `header.tiger-page-header` **977×65** at **(264,166)**，`className` 含 `min-w-0 overflow-hidden`，底透明、底边 `--tiger-border` `rgb(229,231,235)`。左 leftover **`p2-icon-chip`** **48×48** at **(264,166)**（`h-12 w-12`，内 Icon 24，info），底 `color(srgb 0.145 0.388 0.922 / 0.14)`、色 `rgb(37,99,235)`（跟 `--tiger-primary` `#2563eb`）。标题 **「关于 Tigercat」** `Text` `size=lg` `weight=bold` leftover **`p2-text-primary`** **154×28** at **(324,166)**，色 `rgb(17,24,39)`（`--tiger-text` `#111827`）。副文 **「了解平台版本与服务信息」** `Text` `size=sm` `color=secondary` **154×20** at **(324,194)**，色 `rgb(75,85,99)`。右侧 `#actions` tags（`hidden sm:flex`，1280 下 `display:flex`）：**系统信息** `variant=primary` 底 `rgb(219,234,254)` / 字 `rgb(37,99,235)`；**已连接** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)`。
  3. **GET `/api/info` 200：** 导航到 `/about` 后 `GET http://127.0.0.1:5174/api/info` **200**，`server: Kestrel`（不是 MockApi）。body `{"code":200,"message":"Success","data":{"name":"Tigercat Admin API","version":"1.0.0","description":"Tigercat Admin Backend API"},"success":true}`。无 Alert「信息加载失败」。无「正在加载服务信息...」。
  4. **服务概览 Card：** `#about-info` 内 Tigercat Card 宿主 **977×108** at **(264,323)**，底 `--tiger-surface` `#ffffff` `rgb(255,255,255)`，边 `--tiger-border` `#e5e7eb` `rgb(229,231,235)`。源码 `<Card title="服务概览">` live 落到 **HTML `title="服务概览"`** 原生 tooltip，**没有** `tiger-card-header` / 可见「服务概览」标题（a11y 树也无该字；`document.body.innerText.includes('服务概览')` = false）。卡内 leftover 三格 `grid-cols-1 md:grid-cols-3`（1280 下三列，各 **298×74** at y **340**）：**服务名称 / Tigercat Admin API**、**当前版本 / 1.0.0**、**服务描述 / Tigercat Admin Backend API**。与 API `data` 一致。每格 `border-slate-200 bg-slate-50/70`：边 `oklch(0.929 0.013 255.508)`、底 `oklab(0.984 … / 0.7)`，不是 `--tiger-border` / `--tiger-bg-card`。图标芯片 40×40 leftover **`bg-blue-100 text-blue-600` / `bg-purple-100 text-purple-600` / `bg-green-100 text-green-600`**。数值 `Text` 同时带 `text-[var(--tiger-text,#111827)]` 与 leftover **`text-slate-800`**，实算 `oklch(0.279 0.041 260.031)`。同页另三张 Card 同样：`title="产品亮点"` / `title="技术栈"` / `title="系统信息"` 都只在宿主 DIV 的 native `title` 上，无 header / 无 heading。
  5. **系统信息行（折下）：** 第四张 Card `title="系统信息"` **977×108** at **(264,899)** vis=false（y **916** 格子 > 视口 800，shot 不可见）。内三格运行环境 **.NET 10 + React** / 包管理器 **PNPM** / API 状态 Tag **● 已连接**（success）。本条不滚；5b.2 滚到 stack 时再对一下。shot 首屏可见技术栈上沿：前端框架 **React 18** / 构建工具 **Vite**（y **694** vis=true）；TypeScript / Tigercat UI at y **784** 底边 858>800 部分裁切。
- **严重度：** PageHeader「关于 Tigercat / 了解平台版本与服务信息」+ tags 系统信息 / 已连接 + `/api/info` 200 三字段上屏：通过（信息）。`Card title` 未渲染可见标题、只剩 native `title` tooltip：**中**。leftover `slate-200` / `bg-slate-50/70` / `bg-*-100 text-*-600` / `from-*-50 to-*-100` / `text-slate-800` 不跟 `--tiger-*`：**低**（Roadmap leftover）。`p2-icon-chip` + `p2-text-primary` 已绑 `--tiger-primary` / `--tiger-text`：**低**（与 Home PageHeader chrome 同形）。
- **双端 vs Vue 5.1：** **同缺陷**。Vue 5.1 MEDIUM：`Card title="服务概览"`（以及 产品亮点 / 技术栈 / 系统信息）落到 HTML native `title` tooltip、无 `tiger-card-header` / 无可见 heading / a11y 树也缺这些词。React 5b.1 live 同样：四张 Card 宿主 DIV `title="服务概览|产品亮点|技术栈|系统信息"`，无 header、无 heading、`innerText` 无「服务概览」「产品亮点」。PageHeader 文案 / tags / GET `/api/info` 200 三字段 / leftover slate 三格几何（`#about-info` 977×108 at (264,323)，三格 298×74 at y 340）与 Vue 5.1 **同形**。差异（预期）：系统信息运行环境 React 为 **`.NET 10 + React`**，Vue 5.1 为 **`.NET 10 + Vue 3`**；技术栈前端框架 React 为 **React 18**（Vue 5.1/5.2 为 Vue 3）。系统信息行两端都折下 y≈899/916。

### 5b.2 NavigationMenu jumps

本期 5b.2 **先写前一会话已落盘的两张 nav shot**（PNG 像素 **1280×800**，浅色），不重写 5b.1。截图 `/tmp/react-about-nav.png`（点「服务信息」Trigger 后）与 `/tmp/react-about-nav-features.png`（点「特性」Trigger 后）。两张都 **看不见** 可见 Card 标题「服务概览 / 产品亮点 / 技术栈」（5b.1 已记：`Card title` 落到 native `title` tooltip）。**shot 只证明 Trigger 打开 Content，不能证明点了 NavigationMenuLink 后 `scrollIntoView`。** 无 `/tmp/react-about-nav-stack.png`。下面 live 只补：Trigger → Content link 的滚动位移、`#about-*` 矩形、`overflow-x-auto` vs `scrollWidth`、以及 Vue 5.2 缺口的 **技术栈 Link**。

- **模块：** About NavigationMenu 锚点（服务信息 → `#about-info` / 特性 → `#about-features` / 技术栈 → `#about-stack`）
- **端：** React
- **视口：** 桌面 **1280×800**，浅色；shot 为前一会话隔离上下文 **`react-about`**
- **复现：**
  1. **服务信息 Trigger（shot）：** `/tmp/react-about-nav.png`（1280×800）。PageHeader 下一条横排 NavigationMenu：**服务信息** caret **朝上**（展开）/ **特性** caret 朝下 / **技术栈** caret 朝下。Trigger 下弹出白底圆角 Content，文案 **「查看服务名称、版本与连接状态」**（源码 `ABOUT_SECTIONS.info.description`）。主区仍是页顶：PageHeader「关于 Tigercat」+ 服务三格（服务名称 **Tigercat Admin API** / 当前版本 **1.0.0** / 服务描述 **Tigercat Admin Backend API**）+ 产品亮点四 pastel chips（清晰导航体验蓝 / 安全认证体系紫 / 快速响应接口橙 / 一致视觉语言绿）+ 技术栈上沿（前端框架 **React 18** / 构建工具 **Vite**）。与 `/tmp/react-about-info.png` 同屏位置。**#about-info 已在视口内**，shot 上看不出滚动位移（先验：服务信息 jump 后 `#main-content-scroll` scrollTop=0）。无可见 heading「服务概览 / 产品亮点 / 技术栈」。侧栏「关于」选中；TagsView「关于」选中；无「演示模式」Tag。页右是主区竖滚动条。
  2. **特性 Trigger（shot）：** `/tmp/react-about-nav-features.png`（1280×800）。**特性** caret **朝上**（展开），弹出 **「浏览产品亮点与体验说明」**（源码 `ABOUT_SECTIONS.features.description`）。服务信息 / 技术栈 caret 朝下（收起）。**画面仍是页顶**——PageHeader、服务三格、亮点四格完整可见，技术栈仍只露 React 18 / Vite 上沿，**没有**滚到 `#about-features` 以外或系统信息行。shot 只证明点了 **Trigger**；**没有**证明点了 Content 里的 `NavigationMenuLink`。
  3. **锚点 vs 可见内容（shot + 源码，非可见 heading）：** `#about-info` = 服务概览三格（shot 全见）；`#about-features` = 产品亮点四 chips（shot 全见）；`#about-stack` = 技术栈（shot 只见 React 18 / Vite；源码还有开发语言 TypeScript / UI 组件 Tigercat UI，折下）。系统信息 Card 仍折下（5b.1 已记 y≈899/916）。源码 `scrollToAboutSection` 对 `href` 做 `preventDefault` + `document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })`，目标 id 即 `#about-info` / `#about-features` / `#about-stack`。无 `/tmp/react-about-nav-stack.png`。
  4. **leftover `overflow-x-auto`（shot）：** 源码 `<NavigationMenu className="min-w-0 overflow-x-auto">`。1280 下三项「服务信息 特性 技术栈」同一行、右余白大，shot **看不见** nav 横向滚动条；页右是主区竖滚动条。三项之间有空隙，不像被裁切。`documentElement.scrollWidth===clientWidth` 与 nav 自身 scrollWidth **本条写 shot 时未测 → 缺口**（live 补）。
  5. **live scroll proof：** 前一会话隔离上下文 **`react-about` 已关**（`list_pages` 仅 about:blank + inspect）。live 改走隔离上下文 **`react-about-rest`**（未复用 `vue-*` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`）。inspect Allow shot `/tmp/react-about-rest-inspect-remote-debugging.png`。未改产品代码、未停 Api。**Trigger → Content NavigationMenuLink 的 `#main-content-scroll` scrollTop / `location.hash` / `#about-*` 矩形 / leftover `overflow-x-auto` vs `scrollWidth===clientWidth` / 技术栈 Link：缺口（正在 live 补）。**
- **严重度：** Trigger 打开 Content，文案与源码 description 一致：通过（信息，两张 1280×800 shot：`/tmp/react-about-nav.png`、`/tmp/react-about-nav-features.png`）。NavigationMenuLink 点击后 `scrollIntoView` / hash / `#about-*` 矩形 / leftover 横溢数字 / 技术栈 Link：**缺口**（shot 只证 Trigger；live 补）。
- **双端 vs Vue 5.2：** shot 层 **同形**：两端都是 Trigger 打开 Content（服务信息「查看服务名称、版本与连接状态」/ 特性「浏览产品亮点与体验说明」），首屏仍在页顶，无可见 Card heading。差异（预期）：技术栈上沿 React 为 **React 18**（Vue 5.2 为 Vue 3）。Vue 5.2 缺口 = 点技术栈 Link 后是否 smooth scroll 到 `#about-stack` 整块 / 系统信息行；React 本条写 shot 时同样未点 → 留给 live。

### 5b.4 Dark tokens

本期隔离上下文 **`react-about-dark-mobile`**（未复用 `vue-*` / `react-about` / `react-about-rest` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`）。先开 `chrome://inspect/#remote-debugging`（未再截 inspect）。`new_page` isolatedContext 打开 React `http://127.0.0.1:5174/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」（**未审 Tour**）。视口桌面 **1280×800**。侧栏「关于」进 `/about` 后 **一直停在 /about**。ThemeConfigDrawer **只用来切外观到深色**（`data-testid=shell-theme-config-trigger`），关抽屉后查 `/about` token，**不把 Theme 当产品再走一遍**。未开 MockApi / `dev:demo` / Aspire，未停 Api `:5137`，未动 Vue `:5173`。未改产品代码。不重写 5b.1–5b.2，不走 5b.3 / leftover 5b.6。

- **模块：** About 暗色 token（PageHeader / NavigationMenu / infoCards / highlights / stack / systemInfo）
- **端：** React
- **视口：** 桌面 **1280×800**，深色；隔离上下文 `react-about-dark-mobile`
- **复现：**
  1. Header `button` `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`。点开 Drawer「主题配置」，外观 Segmented 默认 **跟随系统**。点 **深色**，再点关闭 ×。抽屉关掉（shot 无 mask / 无「主题配置」overlay）。`html` class = **`dark`**。`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`。URL 仍 `/about`。截图 `/tmp/react-about-dark.png`（PNG **1280×800**；PageHeader + nav 服务信息/特性/技术栈 + 服务三格 + 亮点四格 + 技术栈 React 18 / Vite 上沿；系统信息折下）。无「演示模式」Tag。
  2. **`--tiger-*` 计算值（`documentElement`）：** `--tiger-primary=#2563eb`、`--tiger-bg-page=#0d1117`、`--tiger-bg-card=#161b22`、`--tiger-bg-hover=#1b212c`、`--tiger-text=#f0f6fc`、`--tiger-text-secondary=#8b949f`、`--tiger-border=#304050`、`--tiger-surface=#111827`、`--tiger-surface-muted=#1f2937`。`#main-content-scroll` 底 `rgb(31, 41, 55)`（`#1f2937`）。侧栏 `aside.tiger-sidebar` 底 `rgb(17, 24, 39)`（`--tiger-surface`），边 `rgb(48, 64, 80)`（`--tiger-border`）。无横向溢出（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` **1025===1025**）。
  3. **PageHeader：** `header.tiger-page-header` **977×65** at **(264,166)** vis=true，底透明、边 `rgb(48, 64, 80)` = `--tiger-border` `#304050`。leftover **`p2-icon-chip`** 48×48 at **(264,166)**，色 `rgb(37, 99, 235)` / 底 `color(srgb 0.145098 0.388235 0.921569 / 0.14)`（跟 `--tiger-primary`）。leftover **`p2-text-primary`**「关于 Tigercat」**154×28** at **(324,166)**，色 **`rgb(240, 246, 252)`** = `--tiger-text` `#f0f6fc`。Tag「系统信息 / 已连接」可读。
  4. **nav：** `nav.tiger-navigation-menu` class 含 leftover `min-w-0 overflow-x-auto`，**977×44** at **(264,255)**，`overflow-x:auto`，`scrollWidth===clientWidth===977`（1280 无横条）。Trigger「服务信息 / 特性 / 技术栈」class 含 `text-[var(--tiger-text,…)]`，实算 **`rgb(240, 246, 252)`** = `--tiger-text`。
  5. **宿主 Card vs leftover 内格：** `#about-info` / `#about-features` / `#about-stack` 宿主均 `bg-[var(--tiger-surface,#ffffff)]` + `border-[var(--tiger-border,#e5e7eb)]`，底 **`rgb(17, 24, 39)`**、边 **`rgb(48, 64, 80)`**（跟 `--tiger-surface` / `--tiger-border`）。内格 **不跟** 这组 token：
     - **infoCards / stack / systemInfo 内格** class `border-slate-200 bg-slate-50/70`（量到 **10** 枚 `bg-slate-50*`、**14** 枚 `border-slate-200`）。边实算 **`oklch(0.929 0.013 255.508)`**，**不是** `--tiger-border` `#304050`。底实算 **`oklab(0.984 … / 0.7)`**（浅 slate-50 半透明，暗底上仍是浅灰砖）。例：`#about-info`「服务名称 / 当前版本 / 服务描述」三格 **298×74** at y **340** vis=true。
     - **值字 leftover `text-slate-800`：** **13** 枚，class 同时写 `text-[var(--tiger-text,#111827)] text-slate-800`。实算 **`oklch(0.279 0.041 260.031)`**，**不是** `--tiger-text` `#f0f6fc`（`text-slate-800` 压过 CSS 变量）。贴在浅 leftover 砖上可读，但整砖停在浅色。例：「Tigercat Admin API」/「1.0.0」/「React 18」。
     - **芯片 `bg-*-100`：** `#about-info` `bg-blue-100 text-blue-600` 底 `oklch(0.932 0.032 255.585)`、色 `oklch(0.546 0.245 262.881)`（40×40）；同段还有 `bg-purple-100` 底 `oklch(0.946 0.033 307.174)` / `bg-green-100` 底 `oklch(0.962 0.044 156.743)`。均不是 `--tiger-primary` / `--tiger-bg-card`。共 **10** 枚 `bg-*-100`。
  6. **highlights `#about-features`：** 四格 leftover `border-slate-200 bg-linear-to-br from-*-50 to-*-100`，1280 下 2×2 全 vis（各 **464×74**）。边同样 `oklch(0.929 0.013 255.508)` 浅 slate。渐变仍是浅色：`from-blue-50 to-blue-100` = `linear-gradient(to right bottom, oklch(0.97 0.014 254.604), oklch(0.932 0.032 255.585))`；紫 `oklch(0.977 0.014 308.299)→oklch(0.946 0.033 307.174)`；橙 `oklch(0.98 0.016 73.684)→oklch(0.954 0.038 75.164)`；绿 `oklch(0.982 0.018 155.826)→oklch(0.962 0.044 156.743)`。图标壳 leftover **`bg-white/70`** **4** 枚，底 `oklab(1 … / 0.7)`。四砖贴在 `--tiger-surface` 宿主上，是完整浅色岛。
  7. **stack / systemInfo：** `#about-stack` 宿主 y **677** vis=true（底边 875>800，下两格部分裁切）。内格同 `border-slate-200 bg-slate-50/70`：React 18 / Vite vis=true at y **694**；TypeScript / Tigercat UI at y **784**。**systemInfo** 无独立 `#id`；宿主 `title="系统信息"` **977×108** at **(264,899)** vis=false；内格「运行环境 .NET 10 + React / 包管理器 PNPM / API 状态 ● 已连接」class 同 leftover，y **916** vis=false（折下），底/边与 infoCards 同一组浅 `oklab`/`oklch`，未跟 `--tiger-bg-card`。本张首屏看不到系统信息行。
- **严重度：** 切深色后 `html.dark`、壳侧栏/`#main-content-scroll`/PageHeader/`nav` Trigger 跟 `--tiger-*`，值字 `p2-text-primary` 变 `#f0f6fc`：通过（信息，`react-about-dark-mobile` live + `/tmp/react-about-dark.png`）。infoCards / highlights / stack / systemInfo 内格 leftover `border-slate-200` / `bg-slate-50/70` / `from-*-50 to-*-100` / `bg-*-100` / `bg-white/70` / `text-slate-800` **不跟** `--tiger-bg-card` / `--tiger-surface` / `--tiger-border` / `--tiger-text`，暗壳上整组浅色砖：**中**。`text-slate-800` 压过同元素 `--tiger-text`：**中**（同源 leftover）。Theme 紧凑/主色：本条不审。系统信息首屏折下：信息（5b.5 再量 375）。
- **双端 vs Vue 5.4：** **同缺陷**。Vue 5.4 MEDIUM：leftover slate/pastel 停在浅色（`border-slate-200` / `bg-slate-50/70` / `from-*-50 to-*-100` / `bg-*-100` / `bg-white/70` / `text-slate-800` 不跟 `--tiger-bg-card` / `--tiger-surface` / `--tiger-border` / `--tiger-text`；`text-slate-800` 压过 `--tiger-text`）。React 5b.4 live 计数与计算色 **同形**：14 `border-slate-200`、10 `bg-slate-50*`、13 `text-slate-800`、4 `from-*-50`、4 `bg-white/70`、10 `bg-*-100`；边 `oklch(0.929 0.013 255.508)`、底 `oklab(0.984 … / 0.7)`、值字 `oklch(0.279 0.041 260.031)`。壳 token 两端同为 `--tiger-text=#f0f6fc` / `--tiger-surface=#111827` / `--tiger-border=#304050` / `--tiger-bg-card=#161b22`。PageHeader / nav / `#about-info` 三格几何（977×65 at (264,166)；nav 977×44 at (264,255) `scrollWidth===clientWidth===977`；info 三格 298×74 at y 340）与 Vue 5.4 **同形**。差异（预期）：技术栈上沿 React 为 **React 18**（Vue 5.4 为 Vue 3）；systemInfo 运行环境 **`.NET 10 + React`**（Vue 5.4 为 `.NET 10 + Vue 3`）。

---

## 6. Analytics (Vue)

本期只走 Vue `http://127.0.0.1:5173/analytics`（`AnalyticsPage.vue`）。未开 React `5174` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/vue-analytics-inspect-remote-debugging.png`），再在隔离上下文 **`vue-analytics`** 打开 `/login`，未复用 `vue-about` / `vue-about-rest` / `vue-about-dark-mobile` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `AnalyticsPage.vue`、`PageHeader.vue`：AnalyticsPage **有 import** `PageHeader` + Tigercat `Segmented` / `DatePicker` / `Button`/`ButtonGroup` / `Statistic` / `Progress` / `Skeleton` + 多图表。入口：侧栏 **数据分析 → 数据分析看板** → `/analytics`。本期只写 **6.1 / 6.2**；未走 Table+Pagination 渠道明细、暗色、~375、项 7。

### 6.1 PageHeader + toolbar + KPI

- **模块：** Analytics PageHeader（数据分析 / 实时演示 / BI）+ 工具栏 Segmented/DatePicker/刷新/导出 + 四张 KPI Statistic/Progress
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-analytics`，浅色
- **复现：**
  1. 登录后点侧栏 **数据分析** 展开，点 **数据分析看板**。URL **`http://127.0.0.1:5173/analytics`**。标题 `tigercat-admin-vue`。壳面包屑「管理中心 / 数据分析 / 数据分析看板」；TagsView 选中「数据分析看板」（可关）；无「演示模式」Tag（`document.body.innerText` 检索「演示模式」为 false）。`html` 无 `dark`。截图 `/tmp/vue-analytics-header-kpi.png`（PNG **1280×800**）。
  2. **PageHeader 已挂：** 主区第一块 `header.tiger-page-header` **977×65** at **(264,166)**，`class-name` 含 `min-w-0 overflow-hidden`，底透明、底边 `--tiger-border` `rgb(229,231,235)`。左 leftover **`p2-icon-chip`** **48×48** at **(264,166)**（`h-12 w-12`，内 Icon 24，trendingUp），色 `rgb(37,99,235)` / 底 `color(srgb 0.145098 0.388235 0.921569 / 0.14)`（跟 `--tiger-primary` `#2563eb`）。标题 **「数据分析」** leftover **`p2-text-primary`** **317×28** at **(324,166)**，色 `rgb(17,24,39)`（`--tiger-text` `#111827`）。副文 **「一站式 BI 看板，聚合趋势、构成、转化与渠道明细」** `Text` `size=sm` `color=secondary`。右侧 `#actions` tags（`hidden sm:flex`，1280 下 flex）：**实时演示** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)` **66×22** at **(1137,166)**；**BI** `variant=primary` 底 `rgb(219,234,254)` / 字 `rgb(37,99,235)` **30×22** at **(1211,166)**。
  3. **工具栏 Card：** 内层 `flex flex-col gap-3 lg:flex-row` **943×98** at **(281,272)**。左 **Segmented** 三项 radio：**近 7 天** / **近 30 天** / **近 90 天**，默认 **近 30 天** `aria-checked=true`（字 `rgb(17,24,39)`），7/90 未选字 `rgb(107,114,128)`。宿主 segmented 底 `--tiger-surface-muted` `rgb(249,250,251)` **244×36** at **(281,303)**。右 **DatePicker** `range` placeholder **「自定义区间」** 输入 **409×42** at **(815,272)**。**刷新** / **导出** `Button variant=outline` 在 DatePicker **下方**（刷新 **68×44** at **(815,326)**，导出 **(882,326)**，字/边 `rgb(37,99,235)` = `--tiger-primary`）。1280 下右簇仍换行，工具栏高 98，不是单行。本条未点开日历。
  4. **四张 KPI：** `lg:grid-cols-4`，各 **232×122** at y **411**（x **264 / 512 / 761 / 1009**），宿主底 `--tiger-surface` `#ffffff`、边 `--tiger-border` `#e5e7eb`。默认 30 天（factor=1）：**访问量 128,400** + Progress **72%**；**转化率 3.8%** + **38%**；**订单数 2,360** + **64%**；**收入 486,000 元** + **81%**。Progress 条 `bg-[color:var(--tiger-primary,#2563eb)]` 实算 **`rgb(37,99,235)`**（跟 token，不是 `#3b82f6`）。`Statistic` 无 icon SVG（`kpiHasSvg=0`）。源码 `kpis[0].icon = '#3b82f6'` **未传入** `<Statistic>`，访问量卡上看不到 leftover hex 图标。
  5. **切范围（客户端 demo，不打 /api）：** 点 **近 7 天** → 访问量 **51,360**、订单 **944**（`128400*0.4` / `2360*0.4`）。点 **近 90 天** → 访问量 **282,480**、订单 **5,192**、收入 **1,069,200 元**（`*2.2`）。切回 **近 30 天** → **128,400 / 2,360 / 486,000**。切 90 天时 Skeleton 采样：t≈1ms 尚无；**t=41–408ms 共 58 枚** `[class*=skeleton]`；**t=450ms 消失**，数字上屏（与源码 `triggerLoading` **420ms** 同量级）。点 **刷新** 同样：t=41–410ms 58 枚 Skeleton，t=451ms 回到 128,400。点 **导出** → Tigercat Message **「报表已导出（演示）」**（live 可见；源码 `duration: 2400`）。range/refresh/export **没有新的** fetch/xhr：网络仍是登录/仪表盘那 8 条（`POST /api/auth/login`、`GET /api/home`、permissions、notifications、`/api/stats/overview`、`/api/stats/trend?days=7`、chat）。**无** `/api/analytics*`。KPI/图是页面 `factor` 客户端演示数据，不是 live `/api`。
  6. **`--tiger-primary` vs leftover `#3b82f6`（6.1 范围）：** `documentElement` `--tiger-primary=#2563eb`。PageHeader 芯片 / 刷新导出描边 / KPI Progress 都是 `rgb(37,99,235)`。访问量 `icon:'#3b82f6'` 是源码 leftover，**未上屏**。首屏 KPI 区没有 `rgb(59,130,246)`。`#3b82f6` live 命中 3 处都在折下自定义图（ChartSeries `g fill="#3b82f6"` y≈2160、Legend marker `rgb(59,130,246)` y≈2381）→ 记入 6.2。
- **严重度：** PageHeader「数据分析」+ tags 实时演示/BI + Segmented 7/30/90 默认 30 + 刷新 Skeleton ~420ms + 导出 Message「报表已导出（演示）」+ 四 KPI 数字随 factor 变：通过（信息）。图表/KPI 不打 live `/api`、纯客户端 demo：信息（本页设计）。源码 `icon:'#3b82f6'` 未绑定 Statistic：**低**（leftover 死字段，首屏未画出）。`p2-icon-chip` / `p2-text-primary` 已绑 `--tiger-primary` / `--tiger-text`：**低**（与 About 5.1 / Home PageHeader chrome 同形）。1280 下 DatePicker 409 宽把刷新/导出挤到下一行（工具栏 98 高）：**低**。暗色 / 375：**缺口**（本期不走）。

### 6.2 first-screen charts（Area / Donut / Funnel / Gauge）

- **模块：** Analytics 首屏图表网格（AreaChart 访问趋势 / DonutChart 流量构成 / FunnelChart 转化漏斗 / GaugeChart 目标达成率）；对照 Home 4.3 的 320 宽 / leftover `#3b82f6` / clip / 轴挤 / Card `title` 无可见 heading
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-analytics`，浅色；`#main-content-scroll` scrollTop=**360**（把漏斗/仪表滚进视口）
- **复现：**
  1. **首屏（scrollTop=0，已见 6.1 shot）：** KPI 下第一行两卡 **访问趋势** / **流量构成** 已在视口（卡 **477×302** at y **557**，SVG at y **574**）。本条把 `#main-content-scroll` 滚到 **360**，截图 `/tmp/vue-analytics-charts.png`（PNG **1280×800**）：上行 Area + Donut 全见；下行 Funnel + Gauge 全见（卡底边 **804**，视口 800，最下一两像素贴边）。无可见 Card 标题。数据仍是客户端 demo（30 天 factor=1）：面积 1–6 月、环「总访问 **100**」、漏斗 曝光/点击/加购/下单/支付、仪表针 **68**。range/refresh **仍无** `/api/analytics*`（同 6.1 网络清单）。
  2. **Card `title` 只剩 native tooltip（与 About 5.1 / Home 图卡对照）：** 十二张图/表明细卡都是宿主 DIV `title="访问趋势|流量构成|转化漏斗|目标达成率|能力雷达|访问分布|活跃热力|区域份额|渠道层级构成|组织 / 渠道分布|自定义图表（图表基元组合）|渠道明细"`，**没有** `tiger-card-header` / `h2` / `h3`。`innerText` **不含** 这些标题词（「渠道明细」三字只出现在 PageHeader 副文「…转化与渠道明细」里）。a11y/画面都看不见「访问趋势」等 heading。卡 `overflow:hidden`。
  3. **AreaChart 访问趋势：** SVG **`width=320 height=240`** viewBox `0 0 320 240`，**320×240** at **(281,214)**（滚后）。卡宽 **477**，右侧空 **≈123px**（相对 Home 4.3 卡宽 643 / 右空 306，同「固定 320 不撑满」）。折线/面积 `stop-color` / `stroke` = `var(--tiger-primary,#2563eb)`，实算描边 **`rgb(37,99,235)`** = `--tiger-primary` `#2563eb`，**不是** Home 4.3 的写死 `#3b82f6`。X 轴六个月 **1月…6月**，间距约 49px（x **323 / 372 / 421 / 470 / 518 / 567**），12px，可读；Y **0–300**。六类目 **没有** Home 4.3「近 30 天 30 个 MM-DD 挤成字带」。`clipKids=[]`，未见标签裁出卡外。
  4. **DonutChart 流量构成：** SVG 同样 **320×240** at **(782,214)**，卡 **477×302**，右空 **≈123px**。四瓣 fill 属性带 fallback `#5470c6 / #91cc75 / #fac858 / #ee6666`，**计算色跟 token**：`--tiger-chart-1` `rgb(37,99,235)` / chart-2 `rgb(22,163,74)` / chart-3 `rgb(217,119,6)` / chart-4 `rgb(168,85,247)`（`--tiger-chart-1=#2563eb` 等）。中心 **100 / 总访问**。图例「直接访问 / 搜索引擎 / 社交媒体 / 推荐」在环右侧竖排，shot 全见，`clipKids=[]`（对照 Home 4.3 Pie **clippedRight**「ctive 100.0%」）。无外置百分比标签。
  5. **FunnelChart 转化漏斗：** 卡 **477×281** at **(264,523)** vis=true。SVG **320×240** at **(281,540)**，右空 **≈123px**。五层 path `--tiger-chart-1…5` 实算蓝 `rgb(37,99,235)` / 绿 `rgb(22,163,74)` / 橙 `rgb(217,119,6)` / 紫 `rgb(168,85,247)` / 青 `rgb(14,165,233)`。左轴文案 **曝光 / 点击 / 加购 / 下单 / 支付** 可读。`clipKids=[]`。
  6. **GaugeChart 目标达成率：** 卡 **477×281** at **(765,523)** vis=true。SVG **`280×240`** at **(782,540)**，右空 **≈163px**（比 320 图更空）。弧 fill `var(--tiger-primary,#2563eb)` → `rgb(37,99,235)`；底轨 `--tiger-border` `rgb(229,231,235)`；针 `--tiger-text` `rgb(17,24,39)`。刻度 **0 / 20 / 40 / 60 / 80 / 100**，中心值 **68**（源码 `gaugeValue` 30 天 = 68）。
  7. **对照 Home 4.3（本条 live）：**
     - **固定宽：** Analytics 首屏图仍写死 **320×240**（仪表 **280×240**），不随 477 卡变宽。Home 是 **320×220**。高度从 220→240，**宽仍 320，空右仍在**。
     - **leftover `#3b82f6`：** 首屏 Area/Donut/Funnel/Gauge **没有** `rgb(59,130,246)`；Area/Gauge 走 `--tiger-primary` `#2563eb`。Home Line/Pie/Bar 写死 `#3b82f6` 等 hex。**首屏已跟 token。**
     - **clip：** 这四张 `clipKids=[]`，Donut 图例未裁。Home Pie 外侧标签 + legend 裁出卡外。
     - **轴挤：** Area 6 个月可读。Home 30 日 X 轴不可读。本页 Segmented 不改变 Area 的月份点数（只 `factor` 缩放 y），所以 **没有** 30 点挤轴这条。
     - **Card 标题：** 与 About 5.1 **同缺陷**（`title` attr only）。Home 4.3 图卡有可见标题「用户创建趋势 / 用户状态分布 / 用户概览」（Home 不是 `Card title` 这套）。
  8. **其余图种（DOM 量到、**未**滚进 6.2 shot → 不把 shot 当视觉证据）：**
     - **能力雷达** RadarChart：卡 y **828** vis=false；SVG 320×240；轴 性能/可用性/体验/安全/生态；fill `--tiger-chart-1`。
     - **访问分布** ScatterChart：y **828** vis=false；6 点 `var(--tiger-primary,#2563eb)`。
     - **活跃热力** HeatmapChart：y **1133** vis=false；SVG **400×240**；格 fill **写死 hex** `#b9d1fa`…`#346eed` 一串，**不跟** `--tiger-primary` `#2563eb`。
     - **区域份额** TreeMapChart：y **1133** vis=false；华东/华北/华南/西部；`--tiger-chart-1…4`。
     - **渠道层级构成** SunburstChart：y **1438** vis=false；线上 App/Web、线下 门店/代理。
     - **组织 / 渠道分布** OrgChart：y **1438** vis=false；SVG **`720×240`** 塞进卡 477，`div.overflow-auto` **scrollWidth=720 / clientWidth=443**；`clipKids` 总部/运营中心 **clippedRight**，前端组/后端组 **clippedBottom**。源码外包 `overflow-auto`。本条 **未** 横滚该卡。
     - **自定义图表（图表基元组合）** ChartCanvas：y **1751** vis=false；SVG **`width=560 height=240`** 实量 560×240（源码 `CANVAS_W=560 CANVAS_H=240`）。`ChartSeries` `g fill="#3b82f6" stroke="#3b82f6"` → 计算 `rgb(59,130,246)`。Legend「月度转化」marker `rgb(59,130,246)`。这是本页 leftover hex 的 **live 命中点**（6.1 已预告）。卡宽 977，图 560，右空大。
     - **渠道明细** Table+Pagination：**不走**（卡 y **2077** vis=false）。
- **严重度：** Area/Donut/Funnel/Gauge 客户端 demo 上屏、Donut 中心「总访问 100」、仪表 68、六个月轴可读：通过（信息，`/tmp/vue-analytics-charts.png`）。`Card title` 无可见 heading、只剩 native tooltip：**中**（与 About 5.1 同形，十二张卡）。固定 SVG **320/280 宽** 不撑满 477 卡、右侧空 123–163px：**中**（与 Home 4.3 同模式；高度已是 240 不是 220）。首屏四图 **跟** `--tiger-primary` / `--tiger-chart-*`，无 `#3b82f6` clip / 无 30 点轴挤：对比 Home 4.3 **首屏已改善**（信息）。Heatmap 写死 hex 蓝阶、自定义 Canvas **560×240** + series/legend `#3b82f6`、OrgChart **720** 宽在 477 卡内裁切：DOM 已见，**shot 未到** → 视觉细节 **缺口**（本 slice 不继续下滚）。Radar/Scatter/TreeMap/Sunburst 仅 DOM 点名。Table+Pagination / 暗色 / 375：**缺口**（刻意不走）。

### 6.3 below-fold charts（Radar / Scatter / Heatmap / TreeMap / Sunburst / OrgChart / ChartCanvas）

- **模块：** Analytics 折下图表网格（RadarChart 能力雷达 / ScatterChart 访问分布 / HeatmapChart 活跃热力 / TreeMapChart 区域份额 / SunburstChart 渠道层级构成 / OrgChart 组织 / 渠道分布 / ChartCanvas 自定义图表基元组合）
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 **`vue-analytics-rest`**，浅色；`html` 无 `dark`。`#main-content-scroll` MAIN `overflow:auto` **1040×658** at **(240,142)**，`scrollHeight=2666`。未复用 `vue-analytics` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`。PageHeader「数据分析」+ Segmented 默认 **近 30 天** 仍在（6.1 一句话核对，不重审）。
- **复现：**
  1. 侧栏 **数据分析 → 数据分析看板** → URL **`http://127.0.0.1:5173/analytics`**。`documentElement` `--tiger-primary=#2563eb` / `--tiger-chart-1=#2563eb` / chart-2 `#16a34a` / chart-3 `#d97706` / chart-4 `#a855f7` / chart-5 `#0ea5e9`。卡仍是 `title` attr only（与 6.2 十二张同形，画面无 heading）。scrollTop=**0** 时折下 y：能力雷达/访问分布 **1188**、活跃热力/区域份额 **1493**、渠道层级构成/组织 **1798**、自定义图表 **2111**（相对 6.2 在 scrollTop=360 记下的 828 / 1133 / 1438 / 1751，差值全是 **360**）。数据仍是客户端 demo（factor=1），**无** `/api/analytics*`。
  2. **`#main-content-scroll` scrollTop=1018**（雷达卡顶贴主区 ≈170）。截图 `/tmp/vue-analytics-charts-below.png`（PNG **1280×800**）：上行 **能力雷达 + 访问分布** 全见；下行 **活跃热力 + 区域份额** 全见。shot 里看不见 Card 标题。
  3. **RadarChart 能力雷达：** 卡 **477×281** at **(264,170)** vis=true。SVG **`320×240`** at **(281,187)**，右空 **≈123px**。轴文 **性能 / 可用性 / 体验 / 安全 / 生态**（与源码 `radarData` 五轴一致）。面积/顶点 `fill`/`stroke` = `var(--tiger-chart-1,#2563eb)` → 实算 **`rgb(37,99,235)`**；顶点描边 `--tiger-surface` `rgb(255,255,255)`。`uniqueHex=[]`，`rgb(59,130,246)=0`。`clipKids=[]`。
  4. **ScatterChart 访问分布：** 卡 **477×281** at **(765,170)** vis=true。SVG **320×240** at **(782,187)**。**6** 个 `circle`：`Point 1:(12,22)` … `Point 6:(84,78)`，`fillAttr=var(--tiger-primary,#2563eb)` → **`rgb(37,99,235)`**，`stroke=white`。无 leftover `#3b82f6`。`clipKids=[]`。
  5. **HeatmapChart 活跃热力：** 卡 **477×281** at **(264,475)** vis=true。SVG **`400×240`** at **(281,492)**（比 320 图右空更小 ≈43px）。X **周一…周日**，Y **00:00 / 06:00 / 12:00 / 18:00**。**28** 个格 `rect`（7×4）。格 fill **全部写死 hex**，`uniqueVar=[]`（**没有** `var(--tiger-chart-*)` / `var(--tiger-primary)`）：`#dceafd` `#cddffc` `#b9d1fa` `#aac5f8` … `#346eed` `#2765eb`，最深一格碰巧是 **`#2563eb`**（与 token 同值，但是 hex 字面量不是 CSS 变量）。计算色 `rgb(220,234,253)` … `rgb(52,110,237)` / `rgb(37,99,235)`。`rgb(59,130,246)=0`（**不是** Home 4.3 那颗 `#3b82f6`，是另一串 leftover 蓝阶）。`clipKids=[]`。shot 上格子从浅蓝到深蓝，未跟 chart-2/3/4 绿橙紫。
  6. **TreeMapChart 区域份额：** 卡 **477×281** at **(765,475)** vis=true。SVG **400×240** at **(782,492)**。四块文案 **华东 / 华北 / 华南 / 西部**。fill `var(--tiger-chart-1…4)` → 实算 **`rgb(37,99,235)` / `rgb(22,163,74)` / `rgb(217,119,6)` / `rgb(168,85,247)`**（跟 token；attr fallback `#22c55e`/`#f97316` 被变量盖掉）。`uniqueHex=[]`。`clipKids=[]`。shot 上蓝/绿/橙/紫四块可读。
  7. **`#main-content-scroll` scrollTop=1648**。截图 `/tmp/vue-analytics-org-canvas.png`（PNG **1280×800**）：上行 **渠道层级构成 + 组织 / 渠道分布**；下行 **自定义图表（图表基元组合）** + legend「月度转化」。
  8. **SunburstChart 渠道层级构成：** 卡 **477×289** at **(264,150)** vis=true。SVG **320×240** at **(281,167)**，右空 **≈123px**。环文 **线上 / App / Web / 线下 / 门店 / 代理**。path fill：线上+App+Web `var(--tiger-chart-1,#2563eb)` → `rgb(37,99,235)`；线下+门店+代理 `var(--tiger-chart-2,#22c55e)` → `rgb(22,163,74)`。无 `#3b82f6`。`clipKids=[]`。shot 左蓝右绿两瓣，标签在环上可读。
  9. **OrgChart 组织 / 渠道分布：** 卡 **477×289** at **(765,150)** vis=true，卡 `overflow:hidden`。内 `div.overflow-auto` **scrollWidth=720 / clientWidth=443 / clientHeight=240**，`scrollLeft=0`，wrap **443×255** at **(782,167)**。SVG **`width=720 height=240`** 实量 **720×240** at **(782,167)**（比卡宽 477 多 **243px**）。节点文案 **总部/CEO、技术中心/CTO、前端组、后端组、运营中心/COO、市场组、客服组**。节点色走 `--tiger-chart-1…6`（蓝/绿/橙/紫/青/红），**不是** leftover hex。scrollLeft=0 时相对 wrap：
     - **可见：** 总部 **(1110,204)**、CEO、技术中心、CTO。
     - **clippedRight：** 运营中心 **(1302,356)** right **1358** > wrapRight **1224**；COO 同。
     - **clippedBottom：** 前端组 / 后端组 y **508** bottom **524** > wrapBottom **422**（第三排在 240 高 SVG 底边外，竖向无滚动：`scrollHeight=clientHeight=240`）。
     - **clippedRight+Bottom：** 市场组 / 客服组。
     shot 上能看到 **总部 / 技术中心**，**运营中心被卡右裁掉**，底下一排（前端组/后端组）被底边裁掉，wrap 底有横向滚动条。可选横滚一次：`scrollLeft=277`（=720−443）后 **运营中心/COO visInWrap=true**；技术中心/CTO **clippedLeft**；底排仍 **clippedBottom**。与 6.2 DOM（scrollWidth=720 / clientWidth=443，总部/运营中心 clippedRight、前端组/后端组 clippedBottom）同形；本条 live 在 scrollLeft=0 时 **总部未** clippedRight（落在 wrap 内 x=1110），**运营中心** 才是右侧裁切。对照 Home 4.3 Pie 标签 clippedRight：同「图比卡宽、裁出卡外」，这里还有固定高 240 裁第三排。
  10. **ChartCanvas 自定义图表：** 卡 **977×302** at **(264,463)** vis=true。SVG **`width=560 height=240`** 实量 **560×240** at **(281,480)**（源码 `CANVAS_W=560 CANVAS_H=240`）。外包 `overflow-auto` **clientWidth=scrollWidth=943**（560 < 943，**无**横裁）。X 轴 **1月…6月**，Y **0…70**。`ChartSeries` 宿主 `g fill="#3b82f6" stroke="#3b82f6"` → 计算 **`rgb(59,130,246)`**（`rgb59130=1`）。`ChartLegend`「月度转化」色点 `span` **10×10** 底 **`rgb(59,130,246)`**。`uniqueVar=[]`，折线/图例 **不跟** `--tiger-primary` `#2563eb`。shot 上折线比雷达/树图的 `#2563eb` 更亮一档，右侧大块空（977−560≈**417px**）。
  11. **对照 Home 4.3 + 6.2 首屏：**
      - **固定宽：** 折下 Radar/Scatter/Sunburst 仍 **320×240** 塞 477 卡，右空 ≈123px（与 6.2 Area/Donut 同）。Heatmap/TreeMap 升到 **400×240**，空右缩小。Canvas **560** 在 977 宽卡里仍空右 ≈417px。Home 是 **320×220**。
      - **leftover hex：** 6.2 首屏 Area/Donut/Funnel/Gauge **已跟** token，无 `#3b82f6`。折下 Radar/Scatter/TreeMap/Sunburst/Org **同样跟** `--tiger-primary` / `--tiger-chart-*`。**两个 leftover 活点：** Heatmap 写死蓝阶 hex（不是 `#3b82f6`，也不走 `--tiger-chart-*`）；Canvas series/legend **`#3b82f6` → `rgb(59,130,246)`**，与 Home 4.3 Line/Pie/Bar 写死 `#3b82f6` **同色**，对 `--tiger-primary` `#2563eb`。
      - **clip：** Radar/Scatter/Heatmap/TreeMap/Sunburst/Canvas `clipKids=[]`。OrgChart **720** 在 477 卡 + 443 wrap 里裁切（右裁运营中心、底裁第三排），是本页折下唯一 clip。Home 4.3 是 Pie 外侧标签 + legend 裁出。
      - **轴挤：** 这批都是 5–7 类目，无 Home 30 日挤轴。
- **严重度：** Radar 五轴 + Scatter 6 点 + TreeMap 四区 + Sunburst 线上/线下 客户端 demo 上屏、且 **跟** `--tiger-primary` / `--tiger-chart-*`：通过（信息，`/tmp/vue-analytics-charts-below.png` + `/tmp/vue-analytics-org-canvas.png`）。Heatmap 28 格写死 hex 蓝阶、`uniqueVar=[]`、不跟 `--tiger-chart-*`：**中**（leftover hex；色相是蓝阶不是 Home 的 `#3b82f6`，但同类「不走 token」）。ChartCanvas **560×240** + `ChartSeries`/`ChartLegend` 写死 **`#3b82f6` / `rgb(59,130,246)`** 对 `--tiger-primary` `#2563eb`：**中**（与 Home 4.3 leftover hex **同色**；6.2 首屏已改走 token，折下自定义图没改）。OrgChart SVG **720×240** 塞进 477 卡 / wrap clientWidth **443**，scrollLeft=0 裁 **运营中心**（右）+ **前端组/后端组**（底），横滚 277 才能看到运营中心、底排仍裁：**中**（与 Home 4.3 clip 同模式 + 固定高 240 裁第三排）。固定 320/400/560 不撑满卡、右空：与 6.2 **同形中**。`Card title` 无可见 heading：6.2 已记，不另开。渠道明细 Table+Pagination / 暗色 / 375：**缺口**（6.4 走表；暗色/375 本 slice 不走）。

### 6.4 table/pagination（渠道明细）

- **模块：** Analytics 渠道明细 Table + 客户端 Pagination（`pageSize=5` / 共 8 条）
- **端：** Vue
- **视口：** 桌面 **1280×800**，浅色。截图来自隔离上下文 **`vue-analytics-rest`**（6.3 同上下文，本条只写表，不重审折下图 / 不重审 6.1–6.3）。live range-reset 若走，隔离上下文必须叫 **`vue-analytics-table-write`**（本条 shot 阶段未新开 Chrome）。未复用 `vue-analytics` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `react-*`。
- **复现：**
  1. 壳（shot 像素，不审壳控件）：侧栏 **数据分析看板** 高亮蓝；面包屑「管理中心 / 数据分析 / 数据分析看板」；TagsView 选中「数据分析看板」；Header `admin` + 铃铛 **2**。表卡上方仍是 ChartCanvas legend **月度转化**、X **1月–6月**、Y **0–70**（已是 6.3，本条只当定位，不重开）。默认 **近 30 天** / factor=**1**（与 6.1 默认一致；本条 shot 未切 Segmented）。
  2. **page 1** 截图 `/tmp/vue-analytics-table.png`（PNG **1280×800** 浅色）。表头五列 **渠道 / 访问量 / 订单数 / 转化率 / 趋势**。五行（`baseChannels` × factor=1，`visits`/`orders` `toLocaleString()`）：
     - 直接访问 **38,400** / **920** / **2.4%** / 上升
     - 搜索引擎 **31,200** / **760** / **2.1%** / 上升
     - 社交媒体 **24,800** / **540** / **1.8%** / 持平
     - 邮件营销 **12,600** / **410** / **3.2%** / 上升
     - 付费广告 **18,900** / **620** / **2.9%** / 下降
     分页右下 **共 8 条**；页码 **1** 蓝底高亮，**2** 在旁；可见上一页 `<`。条纹行。shot **看不见** Card 标题「渠道明细」（`title` attr only — 6.2 / 6.3 已 **中**，本条不另开）。Home 4.3 是图不是这张表。
  3. **page 2** 截图 `/tmp/vue-analytics-table-p2.png`（同视口）。剩余三行：
     - 内容推荐 **9,800** / **280** / **2%** / 持平（源码 `conversion: 2.0` → 模板 `` `${c.conversion}%` `` 上屏 **2%**，shot 如此）
     - 合作渠道 **7,400** / **190** / **1.6%** / 上升
     - 线下活动 **4,200** / **130** / **2.7%** / 下降
     分页仍 **共 8 条**；页码 **2** 蓝底高亮。5+3=8 证明 **pageSize=5**。源码 `Table :pagination="false"` + 独立 `Pagination :current :total :page-size @update:current=handlePageChange`，与 shot 表下单独分页条同形。
  4. **客户端 demo：** 八行即 `baseChannels`；`visits`/`orders` = `Math.round(base * factor).toLocaleString()`；`conversion`/`trend` **不**随 factor 缩放。默认 30 天 factor=1，shot 数字 = 基线。本页 **无** `/api/analytics`（6.1 已证；本条未新抓网络）。
  5. **range/refresh 重置 page=1：** 源码 `handleRangeChange` / `handleRefresh` 都 `page.value = 1`。源码 factor 7=0.4 → 直接访问 visits **15,360** / orders **368**；factor 90=2.2 → **84,480** / **2,024**。**本条未 live 点 Segmented / 刷新**（两张 shot 都是 30 天 page 1/2）→ live range-reset **缺口**。
- **严重度：** page 1 五行 + page 2 三行、分页「共 8 条」、pageSize=5、列 渠道/访问量/订单数/转化率/趋势、factor=1 数字与 `baseChannels` 一致：通过（信息，`/tmp/vue-analytics-table.png` + `/tmp/vue-analytics-table-p2.png`）。客户端 demo、转化率/趋势不随 range 缩放：信息（本页设计，同 6.1）。Card `title="渠道明细"` 无可见 heading：6.2 已 **中**，不另开。live 切 7/90 天验证 page 回 1 且 visits/orders 缩放：**缺口**（源码有 `page.value = 1`）。暗色 / 375：**缺口**（本期不走）。

### 6.5 Dark tokens

本期隔离上下文 **`vue-analytics-dark`**（未复用 `vue-analytics` / `vue-analytics-rest` / `vue-analytics-table-write` / `vue-about` / `vue-about-rest` / `vue-about-dark-mobile` / `vue-about-shots` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`）。先开 `chrome://inspect/#remote-debugging`（未再截 inspect）。`new_page` isolatedContext 打开 Vue `http://127.0.0.1:5173/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」（**未审 Tour**）。视口桌面 **1280×800**。侧栏「数据分析 → 数据分析看板」进 `/analytics` 后 **一直停在 /analytics**。ThemeConfigDrawer **只用来切外观到深色**，关抽屉后查 `/analytics` token，**不把 Theme 当产品再走一遍**。未开 MockApi / `dev:demo` / Aspire，未重启 Api `:5137`，未动 React `:5174`。未改产品代码。

- **模块：** Analytics 暗色 token（shell / PageHeader / toolbar / KPI / 首屏 Area·Donut·Funnel·Gauge / 折下 Heatmap leftover hex / ChartCanvas `#3b82f6` / OrgChart 720 裁切）
- **端：** Vue
- **视口：** 桌面 **1280×800**，深色；隔离上下文 `vue-analytics-dark`
- **复现：**
  1. Header `button` `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`。点开 Drawer「主题配置」，外观 Segmented 默认 **跟随系统**。点 **深色**，再点关闭 ×。抽屉关掉（`[role=dialog]`「主题配置」vis=false、**0×0**；shot 无 mask）。`html` class = **`dark`**。`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`。URL 仍 `/analytics`。截图 `/tmp/vue-analytics-dark.png`（PNG **1280×800**；PageHeader + toolbar 近 7/30/90 天 + DatePicker + 刷新/导出 + KPI 四卡 + 访问趋势 Area / 流量构成 Donut 同屏）。无「演示模式」Tag。
  2. **`--tiger-*` 计算值（`documentElement`）：** `--tiger-primary=#2563eb`、`--tiger-bg-page=#0d1117`、`--tiger-bg-card=#161b22`、`--tiger-bg-hover=#1b212c`、`--tiger-text=#f0f6fc`、`--tiger-text-secondary=#8b949f`、`--tiger-border=#304050`、`--tiger-surface=#111827`、`--tiger-surface-muted=#1f2937`。另测 `--tiger-chart-1=#60a5fa` / `--tiger-chart-2=#4ade80` / `--tiger-chart-3=#fbbf24` / `--tiger-chart-4=#c084fc` / `--tiger-chart-5=#38bdf8` / `--tiger-chart-6=#f87171`。`#main-content-scroll` 底 `rgb(31,41,55)`（`#1f2937`），字 `rgb(255,255,255)`。侧栏 `aside.tiger-sidebar` 底 `rgb(17,24,39)`（`--tiger-surface`）、边 `rgb(48,64,80)`（`--tiger-border`）。壳 `header.tiger-header` 底 `color(srgb 0.086 0.106 0.133 / 0.75)`（半透明 surface）、底边 `color(srgb 0.188 0.251 0.314 / 0.5)`。无横向溢出（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` **1025===1025**）。
  3. **PageHeader：** `header.tiger-page-header` **977×65** at **(264,166)** vis=true，底透明、边 `rgb(48,64,80)` = `--tiger-border` `#304050`。leftover **`p2-icon-chip`** 48×48，色 `rgb(37,99,235)` / 底 `color(srgb 0.145 0.388 0.922 / 0.14)`（跟 `--tiger-primary`）。leftover **`p2-text-primary`**「数据分析」色 **`rgb(240,246,252)`** = `--tiger-text` `#f0f6fc`。副文 `rgb(156,163,175)`。Tag「实时演示」class `bg-[var(--tiger-tag-success-bg,#dcfce7)]`，`--tiger-tag-success-bg` 在 `html` **空**，实算底 **`rgb(220,252,231)`** / 字 `rgb(74,222,128)` / 边 `rgb(187,247,208)`（浅 pastel 落回默认）。Tag「BI」class `bg-[var(--tiger-tag-primary-bg,#dbeafe)]`，`--tiger-tag-primary-bg` 同样 **空**，实算底 **`rgb(219,234,254)`** / 字 `rgb(37,99,235)` / 边 `rgb(191,219,254)`。两枚 Tag 贴在暗 PageHeader 上是浅色岛（跟 About 5.4 leftover pastel 同类，但是缺 token 的 fallback，不是 `border-slate-200` 砖）。
  4. **toolbar：** 宿主 Card 底 `--tiger-surface` **`rgb(17,24,39)`**、边 `--tiger-border` **`rgb(48,64,80)`**，**977×132** at **(264,255)**。Segmented 轨底 `rgb(31,41,55)`（`--tiger-surface-muted`）；选中「近 30 天」字 `rgb(240,246,252)` = `--tiger-text`，未选「近 7 天 / 近 90 天」字 `rgb(139,148,159)` = `--tiger-text-secondary`。选中 pill `--tiger-segmented-active-bg` 在 `html` **空**，实算也是 `rgb(31,41,55)`（与轨同色，靠字色区分）。DatePicker `bg-[var(--tiger-surface)]` **`rgb(17,24,39)`**、边 `--tiger-border`、字 `--tiger-text`。刷新 / 导出字+边 **`rgb(37,99,235)`** = `--tiger-primary`。
  5. **KPI：** 四卡 **232×122** 同行 y **411**（访问量 x264 / 转化率 x512 / 订单数 x761 / 收入 x1009），底 `--tiger-surface` **`rgb(17,24,39)`**、边 `--tiger-border` **`rgb(48,64,80)`**。标题 `rgb(139,148,159)`、数字 `rgb(240,246,252)`。进度条轨 `rgb(48,64,80)` = `--tiger-border`，填充 `bg-[color:var(--tiger-primary)]` 实算 **`rgb(37,99,235)`**（72% / 38% / 64% / 81%）。暗底数字可读。
  6. **首屏图表（对照 6.2 浅色：Area/Donut/Funnel/Gauge FOLLOW `--tiger-chart-*` / `--tiger-primary`，无 `#3b82f6`）：**
     - **Area「访问趋势」** SVG **320×240** at **(281,574)** vis=true。面积 stop `var(--tiger-primary,#2563eb)` opacity 0.2→0.02，描边实算 **`rgb(37,99,235)`**（**不是** Home 4.6 leftover `#3b82f6`）。轴字 `rgb(139,148,159)` = `--tiger-text-secondary`，网格 `rgb(48,64,80)` = `--tiger-border`，暗底可读。
     - **Donut「流量构成」** SVG **320×240** at **(782,574)** vis=true。扇区 attr `var(--tiger-chart-1…4)`，实算 **`rgb(96,165,250)` / `rgb(74,222,128)` / `rgb(251,191,36)` / `rgb(192,132,252)`** = `--tiger-chart-1…4`。洞底 `var(--tiger-surface)` → `rgb(17,24,39)`。无 `#3b82f6`。
     - **Funnel「转化漏斗」** SVG **320×240** at **(281,900)** vis=false（首屏 800 折下，本条仍量到）。同样 `var(--tiger-chart-1…5)` → `#60a5fa` 系列；阶名 `rgb(139,148,159)`。
     - **Gauge「目标达成率」** SVG **280×240** at **(782,900)** vis=false。弧 `var(--tiger-primary,#2563eb)` → `rgb(37,99,235)`；轨 `var(--tiger-border)` → `rgb(48,64,80)`；刻度/中心字 `var(--tiger-text)` → `rgb(240,246,252)`。暗底可读。
  7. **折下 leftover（对照 6.3，暗底再量，不重开为新缺陷）：**
     - **Heatmap「活跃热力」** SVG **400×240** at **(281,1510)**。格子 fill **28** 个硬编码 hex，范围 **`#2563eb`…`#dceafd`**（含 6.3 已记 `#dceafd`…`#346eed`）。**不是** CSS 变量。最浅 `#dceafd` / `#cddffc` / `#b9d1fa` 在暗 Card 上仍是浅蓝砖；最深 `#2563eb` 碰巧等于 `--tiger-primary` 但写死 hex。轴字 `rgb(139,148,159)` 可读。
     - **ChartCanvas「自定义图表（图表基元组合）」** SVG **560×240** at **(281,2128)**。系列/图例 leftover **`#3b82f6` → `rgb(59,130,246)`**（Home 4.6 同形），**不是** `--tiger-primary` `rgb(37,99,235)`。轴字 `rgb(139,148,159)`。宿主 `overflow-auto` **943×240**，1280 下 560&lt;943 **未裁**。Card 底仍 `--tiger-surface` `rgb(17,24,39)`。
     - **OrgChart「组织 / 渠道分布」** SVG **720×240** 包在 Card **477×289**（title tooltip-only，6.2 已 **中**，不另开）里，父 `overflow-auto` **443×255**。节点色走 `var(--tiger-chart-1…6)` 实算 `#60a5fa` 系列，字 `rgb(240,246,252)` / `rgb(139,148,159)`，**不是**浅 pastel。裁切同 6.3：**运营中心 / COO** `clipRight=true`，**前端组 / 后端组** `clipBottom=true`（市场组/客服组右+底都裁）。暗色没有修好 720 塞进 477。
- **严重度：** 切深色后 `html.dark`、壳侧栏/`#main-content-scroll`/PageHeader/toolbar/KPI 跟 `--tiger-*`，首屏 Area/Donut（及折下 Funnel/Gauge）仍走 `--tiger-chart-*` / `--tiger-primary`、轴/图例暗底可读：通过（信息，`vue-analytics-dark` live + `/tmp/vue-analytics-dark.png`）。对照 Home **4.6**：Home 图表 leftover hex `#3b82f6` 不跟 `--tiger-primary` `#2563eb`；Analytics 首屏图表 **已跟 token**（6.2 浅色已证，暗色同形）。对照 About **5.4 MEDIUM**：About 内格 `border-slate-200` / `bg-slate-50/70` / `from-*-50` / `bg-*-100` / `text-slate-800` 整组停在浅色；Analytics **没有**那组 slate 砖，主区 Card/KPI 跟 `--tiger-surface`。Heatmap 硬编码浅蓝 hex（`#dceafd` 等）暗底仍浅：**低**（6.3 leftover，本条确认暗色未改）。ChartCanvas leftover `#3b82f6`：**低**（同 Home 4.6 / 6.3）。PageHeader Tag fallback 浅 `#dcfce7`/`#dbeafe`（`--tiger-tag-*-bg` 未定义）：**低**。OrgChart 720 clip in 477：**中**（6.3 已记，暗色同形，不升档）。Card title 只 tooltip：6.2 已 **中**，不另开。Theme 紧凑/主色：本条不审。375：**缺口**（6.6）。

---

## 6b. Analytics (React)

本期只走 React `http://127.0.0.1:5174/analytics`（`AnalyticsPage.tsx`）。未开 Vue `5173` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（「Allow remote debugging for this browser instance」已勾选，截图 `/tmp/react-analytics-inspect-remote-debugging.png`），再在隔离上下文 **`react-analytics`** 打开 `/login`，未复用 `vue-analytics` / `vue-analytics-rest` / `vue-analytics-dark` / `vue-analytics-table-write` / `vue-about` / `vue-about-rest` / `vue-about-dark-mobile` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-about` / `react-about-rest` / `react-about-dark-mobile` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 1/6 出现后点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `AnalyticsPage.tsx`、`PageHeader.tsx`：AnalyticsPage **有 import** `PageHeader` + Tigercat `Segmented` / `DatePicker` / `Button`/`ButtonGroup` / `Statistic` / `Progress` / `Skeleton` + 多图表。入口：侧栏 **数据分析 → 数据分析看板** → `/analytics`（与 Vue 同路由）。本期只写 **6b.1 / 6b.2**；未走 Table+Pagination 渠道明细、暗色、~375、项 7。未重写 ## 6 Vue 6.1–6.5。

### 6b.1 PageHeader + toolbar + KPI

- **模块：** Analytics PageHeader（数据分析 / 实时演示 / BI）+ 工具栏 Segmented/DatePicker/刷新/导出 + 四张 KPI Statistic/Progress
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-analytics`，浅色
- **复现：**
  1. 登录后点侧栏 **数据分析** 展开，点 **数据分析看板**。URL **`http://127.0.0.1:5174/analytics`**。标题 `tigercat-admin-react`（相对 Vue 6.1 `tigercat-admin-vue` 的预期文档标题差，不是缺陷）。壳面包屑「管理中心 / 数据分析 / 数据分析看板」；TagsView 选中「数据分析看板」（可关）；无「演示模式」Tag（`document.body.innerText` 检索「演示模式」为 false）。`html` 无 `dark`。截图 `/tmp/react-analytics-header-kpi.png`（PNG **1280×800**）。
  2. **PageHeader 已挂：** 主区第一块 `header.tiger-page-header` **977×65** at **(264,166)**，`class-name` 含 `min-w-0 overflow-hidden`，底透明、底边 `--tiger-border` `rgb(229,231,235)`。左 leftover **`p2-icon-chip`** **48×48** at **(264,166)**（`h-12 w-12`，内 Icon 24，trendingUp），色 `rgb(37,99,235)` / 底 `color(srgb 0.145098 0.388235 0.921569 / 0.14)`（跟 `--tiger-primary` `#2563eb`）。标题 **「数据分析」** leftover **`p2-text-primary`** **317×28** at **(324,166)**，色 `rgb(17,24,39)`（`--tiger-text` `#111827`）。副文 **「一站式 BI 看板，聚合趋势、构成、转化与渠道明细」** `Text` `size=sm` `color=secondary` **317×20** at **(324,194)**，色 `rgb(75,85,99)`。右侧 `#actions` tags（`hidden sm:flex`，1280 下 flex）：**实时演示** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)` **66×22** at **(1137,166)**；**BI** `variant=primary` 底 `rgb(219,234,254)` / 字 `rgb(37,99,235)` **30×22** at **(1211,166)**。
  3. **工具栏 Card：** 外卡 **977×132** at **(264,255)**，内层 `flex flex-col gap-3 lg:flex-row` **943×98** at **(281,272)**。左 **Segmented** 三项 radio：**近 7 天** / **近 30 天** / **近 90 天**，默认 **近 30 天** `aria-checked=true`（字 `rgb(17,24,39)`），7/90 未选字 `rgb(107,114,128)`。宿主 segmented 底 `--tiger-surface-muted` `rgb(249,250,251)` **244×36** at **(281,303)**。右 **DatePicker** `range` placeholder **「自定义区间」** 输入 **409×42** at **(815,272)**。**刷新** / **导出** `Button variant=outline` 在 DatePicker **下方**（刷新 **68×44** at **(815,326)**，导出 **(882,326)**，字/边 `rgb(37,99,235)` = `--tiger-primary`）。1280 下右簇仍换行，工具栏内层高 98，不是单行。本条未点开日历。
  4. **四张 KPI：** `lg:grid-cols-4`，各 **232×122** at y **411**（x **264 / 512 / 761 / 1009**），宿主底 `--tiger-surface` `#ffffff`、边 `--tiger-border` `#e5e7eb`。默认 30 天（factor=1）：**访问量 128,400** + Progress **72%**；**转化率 3.8%** + **38%**；**订单数 2,360** + **64%**；**收入 486,000 元** + **81%**。Progress 条实算 **`rgb(37,99,235)`**（跟 token，不是 `#3b82f6`）。`Statistic` 无 icon SVG（`kpiHasSvg=0`）。源码 `kpis` **没有** `icon` 字段（相对 Vue 6.1 源码 `kpis[0].icon = '#3b82f6'` 未传入 `<Statistic>` 的预期差，不是缺陷）。
  5. **切范围（客户端 demo，不打 /api）：** 点 **近 7 天** → 访问量 **51,360**、订单 **944**、收入 **194,400 元**（`128400*0.4` / `2360*0.4` / `486000*0.4`）。点 **近 90 天** → 访问量 **282,480**、订单 **5,192**、收入 **1,069,200 元**（`*2.2`）。切回 **近 30 天** → **128,400 / 2,360 / 486,000**。切 7 天时 Skeleton 采样：t=**30–419ms 共 58 枚** `[class*=skeleton]`，t=**504ms 消失**；切 90 天 t=**42–409ms 58 枚**，t=496ms 消失；切回 30 天 t=**27–412ms 58 枚**，t=501ms 消失（与源码 `triggerLoading` **420ms** 同量级）。点 **刷新** 同样：t=**29–415ms 58 枚**，t=497ms 回到 128,400。点 **导出** → Tigercat Message **「报表已导出（演示）」** live 可见（t≈34ms 文本节点 **126×20** at **(593,29)**，宿主 `bg-[var(--tiger-message-success-bg,…)]`；源码 `duration: 2400`）。range/refresh/export **没有新的** fetch/xhr：`netDelta=0`，DevTools 网络仍是登录/仪表盘那 12 条（`POST /api/auth/login`、`GET /api/home`、permissions、notifications、chat、`/api/stats/overview`、`/api/stats/trend?days=7`，部分因进 dashboard 再进 analytics 重复）。**无** `/api/analytics*`（`analyticsHits=[]`）。KPI/图是页面 `factor` 客户端演示数据，不是 live `/api`。
  6. **`--tiger-primary` vs leftover `#3b82f6`（6b.1 范围）：** `documentElement` `--tiger-primary=#2563eb`。PageHeader 芯片 / 刷新导出描边 / KPI Progress 都是 `rgb(37,99,235)`。React 源码 KPI **没有** `icon:'#3b82f6'`。首屏 KPI 区没有 `rgb(59,130,246)`。`#3b82f6` live 命中 2 处都在折下自定义图（ChartSeries `g fill="#3b82f6"` y≈2160、Legend marker `rgb(59,130,246)` y≈2381）→ 记入 6b.2 点名，本条不走。
- **严重度：** PageHeader「数据分析」+ tags 实时演示/BI + Segmented 7/30/90 默认 30 + 刷新 Skeleton ~420ms + 导出 Message「报表已导出（演示）」+ 四 KPI 数字随 factor 变：通过（信息）。图表/KPI 不打 live `/api`、纯客户端 demo：信息（本页设计）。`p2-icon-chip` / `p2-text-primary` 已绑 `--tiger-primary` / `--tiger-text`：**低**（与 Vue 6.1 / About 5.1 / Home PageHeader chrome 同形）。1280 下 DatePicker 409 宽把刷新/导出挤到下一行（工具栏内层 98 高）：**低**。暗色 / 375：**缺口**（本期不走）。
- **双端 vs Vue 6.1：** 同路由 `/analytics`、同中文文案（数据分析 / 实时演示 / BI / 近 7 天 / 近 30 天 / 近 90 天 / 自定义区间 / 刷新 / 导出 / 报表已导出（演示） / 访问量 / 转化率 / 订单数 / 收入）、同 PageHeader 977×65 at (264,166)、同 tags 像素、同 DatePicker **409×42 at (815,272)** 把刷新/导出挤到下一行（刷新 68×44 at (815,326)）、同 KPI 卡 **232×122** y411 与 factor 数字（7→51360 / 90→282480 / 30→128400）、同 58 枚 Skeleton ~420ms、同无 `/api/analytics`。预期差：文档标题 `tigercat-admin-react` vs `tigercat-admin-vue`；React KPI 源码无 Vue 那条未绑定的 `icon:'#3b82f6'` 死字段。DatePicker wrap **低** 与 Vue 6.1 **同形**。未开 `:5173` 重走 Vue。

### 6b.2 first-screen charts（Area / Donut / Funnel / Gauge）

- **模块：** Analytics 首屏图表网格（AreaChart 访问趋势 / DonutChart 流量构成 / FunnelChart 转化漏斗 / GaugeChart 目标达成率）；对照 Vue 6.2 Card `title` native tooltip only、SVG 320/280 塞 477 卡右空 123–163px、Donut 图例环右侧竖排、首屏跟 `--tiger-chart-*` / `--tiger-primary`
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 `react-analytics`，浅色
- **复现：**
  1. **6b.1 一句话核对（不重审）：** PageHeader「数据分析」+ Segmented 默认 **近 30 天** 仍在。本条把主区滚到 Area / Donut / Funnel / Gauge 同屏。截图 `/tmp/react-analytics-charts.png`（PNG **1280×800**）：KPI Progress **72% / 38% / 64% / 81%** 贴顶裁进 shot 上沿（6b.1 已写那些数字，不重开）；上行 Area + Donut 全见；下行 Funnel + Gauge 全见。shot **看不见** Card 标题「访问趋势 / 流量构成 / 转化漏斗 / 目标达成率」（与 Vue 6.2 Card `title` native tooltip only **中** 同风险）。数据仍是客户端 demo（30 天 factor=1）：面积 **1–6 月** Y **0–300** 蓝填；环中心 **100 / 总访问** + 图例 直接访问 / 搜索引擎 / 社交媒体 / 推荐；漏斗 **曝光 / 点击 / 加购 / 下单 / 支付**；仪表针 **68**、刻度 **0 / 20 / 40 / 60 / 80 / 100**。6b.1 已证 range/refresh **无** `/api/analytics*`。
  2. **Card `title` 可见 heading vs tooltip（shot + live 待填）：** shot 四卡画面无「访问趋势」等 heading。live：`title` attr / `tiger-card-header` / `h2`/`h3` / `innerText` 是否含这四词 — 见本条后续 live 补数。
  3. **AreaChart 访问趋势（shot）：** 左上卡。X **1月…6月** 六个月可读，Y **0 / 50 / 100 / 150 / 200 / 250 / 300**。折线+浅蓝填：1 月约 120 → 2 月约 200 → 3 月约 150 → 4 月约 260 → 5 月近 300 → 6 月约 260。图块贴卡左，右侧大块空白（同 Vue 6.2「固定宽不撑满」外观）。live：SVG width/height vs 卡宽 477? 描边/填是否 `--tiger-primary` `#2563eb` / `rgb(37,99,235)`，`rgb(59,130,246)` 首屏计数 — 见补数。
  4. **DonutChart 流量构成（shot）：** 右上卡。环四瓣蓝 / 绿 / 橙 / 紫；中心粗体 **100** + 「总访问」。图例 **贴卡底横排**（蓝点 直接访问 · 绿点 搜索引擎 · 橙点 社交媒体 · 紫点 推荐），**不是** Vue 6.2「环右侧竖排」。shot 上看环在卡内偏上居中、底留图例带。live：legend 相对 SVG/卡的坐标；SVG vs 卡宽 — 见补数。
  5. **FunnelChart 转化漏斗（shot）：** 左下卡。五层上宽下窄：**曝光**（蓝）/ **点击**（绿）/ **加购**（橙）/ **下单**（紫）/ **支付**（青），文案写在各层色块正中（shot 可见；Vue 6.2 记的是「左轴文案」）。图块贴卡左，右侧空白同 Area。live：SVG vs 卡；层 fill 是否 `--tiger-chart-1…5` — 见补数。
  6. **GaugeChart 目标达成率（shot）：** 右下卡。半环刻度 **0 / 20 / 40 / 60 / 80 / 100**，中心粗体 **68**，针指约 68；已走弧蓝填、未走弧浅灰。仪表在卡内，右侧仍有空。live：SVG 是否 280×240 vs 卡 477、弧是否 `--tiger-primary` — 见补数。
  7. **leftover `#3b82f6`（6b.1 已点名、本条不走折下）：** 6b.1 live 命中 ChartSeries `g fill="#3b82f6"` y≈2160、Legend marker `rgb(59,130,246)` y≈2381，都在折下自定义图。本条只 **点名**，不滚折下、不写 6b.3。首屏 `rgb(59,130,246)` 计数 live 补。Table+Pagination / 暗色 / 375：**缺口**。
- **严重度：** Area 六个月 + Donut「总访问 100」+ Funnel 五层 + Gauge **68** 客户端 demo 上屏：通过（信息，`/tmp/react-analytics-charts.png`）。shot 无可见 Card heading：与 Vue 6.2 **同风险**，severity 等 live `title` attr / header 节点后再定。Area/Funnel/Gauge 卡内右空、Donut 图例改底横排（对 Vue 6.2 环右竖排）：外观差，宽/坐标 live 补。首屏色是否跟 `--tiger-chart-*` / `--tiger-primary`：live 补。折下 ChartSeries/Legend `#3b82f6`：6b.1 点名，本条不走。Table+Pagination / 暗色 / 375：**缺口**（刻意不走）。
- **双端 vs Vue 6.2：** 未开 `:5173` 重走 Vue。shot 对照 Vue 6.2 已写入事实：同四图种、同 demo 文案与数字（1–6 月 / 总访问 100 / 曝光…支付 / Gauge 68）、同「画面无 Card heading」。差：Donut 图例 React shot **底横排**，Vue 6.2 **环右侧竖排**。SVG 宽 vs 477 卡、Card `title` 是否 tooltip-only、首屏是否跟 token、首屏 `rgb(59,130,246)` 计数：live 补完后再写死。

### 6b.3 below-fold charts（Radar / Scatter / Heatmap / TreeMap / Sunburst / OrgChart / ChartCanvas）

- **模块：** Analytics 折下图表网格（RadarChart 能力雷达 / ScatterChart 访问分布 / HeatmapChart 活跃热力 / TreeMapChart 区域份额 / SunburstChart 渠道层级构成 / OrgChart 组织 / 渠道分布 / ChartCanvas 自定义图表基元组合）
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 **`react-analytics-rest`**，浅色；`html` 无 `dark`。`#main-content-scroll` MAIN `overflow:auto` **1040×658** at **(240,142)**，`scrollHeight=2666`，`clientWidth=1025` / `clientHeight=658`。未复用 `react-analytics` / `react-analytics-write` / `vue-analytics` / `vue-analytics-rest` / `vue-analytics-dark` / `vue-analytics-table-write` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-about*` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`。PageHeader「数据分析」+ Segmented 默认 **近 30 天** 仍在（6b.1 一句话核对，不重审）。**6b.2 首屏 live 一句（不重写 6b.2）：** 十二张卡全是 native `title` attr、无 `tiger-card-header` / `h2`/`h3`（tooltip-only）；Area/Donut/Funnel SVG **320×240**、Gauge **280×240** 塞 477 卡；Area 描边 `var(--tiger-primary,#2563eb)` → `rgb(37,99,235)`、Donut `var(--tiger-chart-1…4)`、Funnel `var(--tiger-chart-1…5)`、Gauge 弧 `var(--tiger-primary)`，首屏四卡 `rgb(59,130,246)=0`。
- **复现：**
  1. 侧栏 **数据分析 → 数据分析看板** → URL **`http://127.0.0.1:5174/analytics`**。`documentElement` `--tiger-primary=#2563eb` / `--tiger-chart-1=#2563eb` / chart-2 `#16a34a` / chart-3 `#d97706` / chart-4 `#a855f7` / chart-5 `#0ea5e9` / chart-6 `#ef4444`。卡仍是 `title` attr only（十二张同形，画面无 heading）。scrollTop=**0** 时折下 y：能力雷达/访问分布 **1188**、活跃热力/区域份额 **1493**、渠道层级构成/组织 **1798**、自定义图表 **2111**（与 Vue 6.3 同像素）。数据仍是客户端 demo（factor=1），**无** `/api/analytics*`（6b.1 已证）。
  2. **`#main-content-scroll` scrollTop=1046**（雷达卡顶贴主区 y **142**）。截图 `/tmp/react-analytics-charts-below.png`（PNG **1280×800**）：上行 **能力雷达 + 访问分布** 全见；下行 **活跃热力 + 区域份额** 全见。shot 里看不见 Card 标题。
  3. **RadarChart 能力雷达：** 卡 **477×281** at **(264,142)** vis=true。SVG **`320×240`** at **(281,159)**，右空 **≈123px**。轴文 **性能 / 可用性 / 体验 / 安全 / 生态**（与源码 `radarData` 五轴一致）。面积/顶点 `fill`/`stroke` = `var(--tiger-chart-1,#2563eb)` → 实算 **`rgb(37,99,235)`**；顶点描边 `--tiger-surface` `rgb(255,255,255)`。`uniqueHex=[]`，`rgb(59,130,246)=0`。`clipKids=[]`。
  4. **ScatterChart 访问分布：** 卡 **477×281** at **(765,142)** vis=true。SVG **320×240** at **(782,159)**。**6** 个 `circle`：a11y `Point 1:(12, 22)` … `Point 6:(84, 78)`，`fillAttr=var(--tiger-primary,#2563eb)` → **`rgb(37,99,235)`**，`stroke=white`。无 leftover `#3b82f6`。`clipKids=[]`。
  5. **HeatmapChart 活跃热力：** 卡 **477×281** at **(264,447)** vis=true。SVG **`400×240`** at **(281,464)**（比 320 图右空更小 ≈43px）。X **周一…周日**，Y **00:00 / 06:00 / 12:00 / 18:00**。**28** 个格 `rect`（7×4）。格 fill **全部写死 hex**，`uniqueVar=[]`（**没有** `var(--tiger-chart-*)` / `var(--tiger-primary)`）：`#dceafd` `#cddffc` `#b9d1fa` `#aac5f8` … `#346eed` `#2765eb`，最深一格碰巧是 **`#2563eb`**（与 token 同值，但是 hex 字面量不是 CSS 变量）。计算色 `rgb(220,234,253)` … `rgb(52,110,237)` / `rgb(37,99,235)`。`rgb(59,130,246)=0`（**不是** Home leftover `#3b82f6`，是另一串 leftover 蓝阶）。`clipKids=[]`。shot 上格子从浅蓝到深蓝，未跟 chart-2/3/4 绿橙紫。
  6. **TreeMapChart 区域份额：** 卡 **477×281** at **(765,447)** vis=true。SVG **400×240** at **(782,464)**。四块文案 **华东 / 华北 / 华南 / 西部**。fill `var(--tiger-chart-1…4)` → 实算 **`rgb(37,99,235)` / `rgb(22,163,74)` / `rgb(217,119,6)` / `rgb(168,85,247)`**（跟 token；attr fallback `#22c55e`/`#f97316` 被变量盖掉）。`uniqueHex=[]`。`clipKids=[]`。shot 上蓝/绿/橙/紫四块可读。
  7. **`#main-content-scroll` scrollTop=1648**。截图 `/tmp/react-analytics-org-canvas.png`（PNG **1280×800**）：上行 **渠道层级构成 + 组织 / 渠道分布**；下行 **自定义图表（图表基元组合）** + legend「月度转化」。表头「渠道 / 访问量」贴 shot 底沿（6b.4 才走表，本条不审）。
  8. **SunburstChart 渠道层级构成：** 卡 **477×289** at **(264,142)** vis=true。SVG **320×240** at **(281,167)**，右空 **≈123px**。环文 **线上 / App / Web / 线下 / 门店 / 代理**。path fill：线上+App+Web `var(--tiger-chart-1,#2563eb)` → `rgb(37,99,235)`；线下+门店+代理 `var(--tiger-chart-2,#22c55e)` → `rgb(22,163,74)`。无 `#3b82f6`。`clipKids=[]`。shot 左蓝右绿两瓣，标签在环上可读。
  9. **OrgChart 组织 / 渠道分布：** 卡 **477×289** at **(765,142)** vis=true，卡 `overflow:hidden`。内 `div.overflow-auto` **scrollWidth=720 / clientWidth=443 / clientHeight=240**，`scrollLeft=0`，wrap **443×255** at **(782,167)**。SVG **`width=720 height=240`** 实量 **720×240** at **(782,167)**（比卡宽 477 多 **243px**）。节点文案 **总部/CEO、技术中心/CTO、前端组、后端组、运营中心/COO、市场组、客服组**。节点色走 `--tiger-chart-1…6`（蓝/绿/橙/紫/青/红），**不是** leftover hex。scrollLeft=0 时相对 wrap（wrapRight **1224** / wrapBottom **422**）：
     - **可见：** 总部 **(1110,204)**、CEO、技术中心、CTO。
     - **clippedRight：** 运营中心 **(1302,356)** right **1358** > wrapRight **1224**；COO 同。
     - **clippedBottom：** 前端组 / 后端组 y **508** bottom **524** > wrapBottom **422**（第三排在 240 高 SVG 底边外，竖向无滚动：`scrollHeight=clientHeight=240`）。
     - **clippedRight+Bottom：** 市场组 / 客服组。
     shot 上能看到 **总部 / 技术中心**，**运营中心被卡右裁掉**，底下一排（前端组/后端组）被底边裁掉，wrap 底有横向滚动条。可选横滚一次：`scrollLeft=277`（=720−443）后 **运营中心/COO visInWrap=true** at **(1025,356)**；技术中心/CTO **clippedLeft**；底排仍 **clippedBottom**。与 Vue 6.3 同形。
  10. **ChartCanvas 自定义图表：** 卡 **977×302** at **(264,455)** vis=true。SVG **`width=560 height=240`** 实量 **560×240** at **(281,472)**（源码 `CANVAS_W=560 CANVAS_H=240`）。外包 `overflow-auto` **clientWidth=scrollWidth=943**（560 < 943，**无**横裁）。X 轴 **1月…6月**，Y **0…70**。`ChartSeries` 宿主 `g fill="#3b82f6" stroke="#3b82f6"` → 计算 **`rgb(59,130,246)`**（`rgb59130=1`）。`ChartLegend`「月度转化」色点 `span` **10×10** 底 **`rgb(59,130,246)`**。`uniqueVar=[]`，折线/图例 **不跟** `--tiger-primary` `#2563eb`。shot 上折线比雷达/树图的 `#2563eb` 更亮一档，右侧大块空（977−560≈**417px**）。
  11. **对照 6b.2 首屏 + Vue 6.3：**
      - **固定宽：** 折下 Radar/Scatter/Sunburst 仍 **320×240** 塞 477 卡，右空 ≈123px（与 6b.2 Area/Donut 同）。Heatmap/TreeMap 升到 **400×240**，空右缩小。Canvas **560** 在 977 宽卡里仍空右 ≈417px。
      - **leftover hex：** 6b.2 首屏 Area/Donut/Funnel/Gauge **已跟** token（本条 live 确认 `rgb(59,130,246)=0`），无 `#3b82f6`。折下 Radar/Scatter/TreeMap/Sunburst/Org **同样跟** `--tiger-primary` / `--tiger-chart-*`。**两个 leftover 活点：** Heatmap 写死蓝阶 hex（不是 `#3b82f6`，也不走 `--tiger-chart-*`）；Canvas series/legend **`#3b82f6` → `rgb(59,130,246)`**，对 `--tiger-primary` `#2563eb`。
      - **clip：** Radar/Scatter/Heatmap/TreeMap/Sunburst/Canvas `clipKids=[]`。OrgChart **720** 在 477 卡 + 443 wrap 里裁切（右裁运营中心、底裁第三排），是本页折下唯一 clip。
      - **轴挤：** 这批都是 5–7 类目，无 Home 30 日挤轴。
- **严重度：** Radar 五轴 + Scatter 6 点 + TreeMap 四区 + Sunburst 线上/线下 客户端 demo 上屏、且 **跟** `--tiger-primary` / `--tiger-chart-*`：通过（信息，`/tmp/react-analytics-charts-below.png` + `/tmp/react-analytics-org-canvas.png`）。Heatmap 28 格写死 hex 蓝阶、`uniqueVar=[]`、不跟 `--tiger-chart-*`：**中**（leftover hex；色相是蓝阶不是 `#3b82f6`，但同类「不走 token」）。ChartCanvas **560×240** + `ChartSeries`/`ChartLegend` 写死 **`#3b82f6` / `rgb(59,130,246)`** 对 `--tiger-primary` `#2563eb`：**中**（6b.2 首屏已改走 token，折下自定义图没改）。OrgChart SVG **720×240** 塞进 477 卡 / wrap clientWidth **443**，scrollLeft=0 裁 **运营中心**（右）+ **前端组/后端组**（底），横滚 277 才能看到运营中心、底排仍裁：**中**。固定 320/400/560 不撑满卡、右空：与 6b.2 **同形中**。`Card title` 无可见 heading：6b.2 已记 tooltip-only，本条同形不另开。渠道明细 Table+Pagination / 暗色 / 375：**缺口**（6b.4 走表；暗色/375 本 slice 不走）。
- **双端 vs Vue 6.3：** 未开 `:5173` 重走 Vue。live 对照 Vue 6.3 已写入事实：**同形** — Heatmap leftover hex 蓝阶（`#dceafd`…`#2765eb` / `#2563eb` 字面量，`uniqueVar=[]`，不是 `--tiger-chart-*`，也不是 `#3b82f6`）；ChartCanvas **560×240** + `ChartSeries`/`ChartLegend` `#3b82f6` → `rgb(59,130,246)` 对 `--tiger-primary` `#2563eb`；OrgChart SVG **720×240** 在 477 卡 / wrap **443×240** 里，scrollLeft=0 裁 **运营中心**（右）+ **前端组/后端组**（底），横滚 277 后运营中心可见、底排仍裁；Radar/Scatter/TreeMap/Sunburst **跟** token；固定 320/400/560 不撑满卡。几何与 Vue 6.3 同像素（卡 477×281 / wrap 443 / SVG 720×240 / canvas 560×240 / scrollHeight 2666）。预期差：无（本批 leftover/clip 双端一致）。

### 6b.4 table/pagination（渠道明细）

- **模块：** Analytics 渠道明细 Table + 客户端 Pagination（`pageSize=5` / 共 8 条）
- **端：** React
- **视口：** 桌面 **1280×800**，浅色。截图来自隔离上下文 **`react-analytics-rest`**（6b.3 同上下文，本条只写表，不重审折下图 / 不重审 6b.1–6b.3）。live page2/range-reset 若走，隔离上下文必须叫 **`react-analytics-table-write`**（本条 shot 阶段未新开 Chrome）。未复用 `react-analytics`（first-slice）/ `react-about*` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*` / `vue-*`。
- **复现：**
  1. 壳（shot 像素，不审壳控件）：侧栏 **数据分析看板** 高亮蓝；面包屑「管理中心 / 数据分析 / 数据分析看板」；TagsView 选中「数据分析看板」；Header `admin` + 铃铛 **2**。表卡上方仍是 ChartCanvas legend **月度转化**、X **1月–6月**、Y **0–70**（已是 6b.3，本条只当定位，不重开）。默认 **近 30 天** / factor=**1**（与 6b.1 默认一致；本条 shot 未切 Segmented）。
  2. **page 1** 截图 `/tmp/react-analytics-table.png`（PNG **1280×800** 浅色）。表头五列 **渠道 / 访问量 / 订单数 / 转化率 / 趋势**。五行（`baseChannels` × factor=1，`visits`/`orders` `toLocaleString()`）：
     - 直接访问 **38,400** / **920** / **2.4%** / 上升
     - 搜索引擎 **31,200** / **760** / **2.1%** / 上升
     - 社交媒体 **24,800** / **540** / **1.8%** / 持平
     - 邮件营销 **12,600** / **410** / **3.2%** / 上升
     - 付费广告 **18,900** / **620** / **2.9%** / 下降
     分页右下 **共 8 条**；页码 **1** 蓝底高亮，**2** 在旁；可见上一页 `<`。条纹行。shot **看不见** Card 标题「渠道明细」（`title` attr only — 6b.2 / 6b.3 已 **中**，本条不另开）。Home 4b.3 是图不是这张表。
  3. **page 2：** 磁盘上 **没有** `/tmp/react-analytics-table-p2.png`。本条未 live 点分页 **2**。源码 `baseChannels` 第 6–8 行 + `PAGE_SIZE=5` + `` conversion: `${c.conversion}%` ``（`2.0` → 上屏 **2%**，与 Vue 6.4 同形）：
     - 内容推荐 **9,800** / **280** / **2%** / 持平
     - 合作渠道 **7,400** / **190** / **1.6%** / 上升
     - 线下活动 **4,200** / **130** / **2.7%** / 下降
     源码 `Table pagination={false}` + 独立 `Pagination current={page} total={allRows.length} pageSize={PAGE_SIZE} onChange={(c) => setPage(c)}`，与 shot 表下单独分页条同形。live page 2 **缺口**。
  4. **客户端 demo：** 八行即 `baseChannels`；`visits`/`orders` = `Math.round(base * factor).toLocaleString()`；`conversion`/`trend` **不**随 factor 缩放。默认 30 天 factor=1，shot 数字 = 基线。本页 **无** `/api/analytics`（6b.1 已证；本条未新抓网络）。
  5. **range/refresh 重置 page=1：** 源码 `handleRangeChange` / `handleRefresh` 都 `setPage(1)`。源码 factor 7=0.4 → 直接访问 visits **15,360** / orders **368**；factor 90=2.2 → **84,480** / **2,024**。**本条未 live 点 Segmented / 刷新**（page 1 shot 是 30 天）→ live range-reset **缺口**。
- **严重度：** page 1 五行 + 分页「共 8 条」+ 页码 1 蓝底 / 2 在旁、pageSize=5、列 渠道/访问量/订单数/转化率/趋势、factor=1 数字与 `baseChannels` 一致：通过（信息，`/tmp/react-analytics-table.png`）。客户端 demo、转化率/趋势不随 range 缩放：信息（本页设计，同 6b.1）。Card `title="渠道明细"` 无可见 heading：6b.2 已 **中**，不另开。live 点分页 2 看剩余三行、切 7/90 天验证 page 回 1 且 visits/orders 缩放：**缺口**（源码有 `setPage(1)` + 第 6–8 行）。暗色 / 375：**缺口**（本期不走）。
- **双端 vs Vue 6.4：** 未开 `:5173` 重走 Vue。shot 对照 Vue 6.4 已写入事实：**同形** — 8 渠道、`pageSize=5`、page 1 五行（直接访问…付费广告，数字/趋势一致）、分页「共 8 条」、页码 1 蓝底 + 2、列名相同、`title="渠道明细"` tooltip-only（6.2/6b.2 已中，不另开）、客户端 demo、conversion/trend 不随 factor 缩放。源码 page 2 三行与 Vue 6.4 同（内容推荐 9,800/280/**2%**/持平 + 合作渠道 7,400/190/1.6%/上升 + 线下活动 4,200/130/2.7%/下降）。预期差：无（page 1 shot 一致）。Vue 6.4 有 page 2 shot `/tmp/vue-analytics-table-p2.png`；React **没有** page 2 shot。Vue 6.4 live range-reset 也是 **缺口**；本条同缺口。

### 6b.5 Dark tokens

本期隔离上下文 **`react-analytics-dark`**（未复用 `react-analytics` / `react-analytics-rest` / `react-analytics-table-write` / `react-analytics-write` / `react-about` / `react-about-rest` / `react-about-dark-mobile` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*` / `vue-*`）。先开 `chrome://inspect/#remote-debugging`（未再截 inspect）。`new_page` isolatedContext 打开 React `http://127.0.0.1:5174/login`，`admin` / `admin123`，OnboardingTour 点「关闭引导」（**未审 Tour**）。视口桌面 **1280×800**。侧栏「数据分析 → 数据分析看板」进 `/analytics` 后 **一直停在 /analytics**。ThemeConfigDrawer **只用来切外观到深色**（`data-testid=shell-theme-config-trigger`），关抽屉后查 `/analytics` token，**不把 Theme 当产品再走一遍**。未开 MockApi / `dev:demo` / Aspire，未停 Api `:5137`，未动 Vue `:5173`。未改产品代码。不重写 6b.1–6b.4。

- **模块：** Analytics 暗色 token（shell / PageHeader / toolbar / KPI / 首屏 Area·Donut·Funnel·Gauge / 折下 Heatmap leftover hex / ChartCanvas `#3b82f6` / OrgChart 720 裁切）
- **端：** React
- **视口：** 桌面 **1280×800**，深色；隔离上下文 `react-analytics-dark`
- **复现：**
  1. Header `button` `data-testid="shell-theme-config-trigger"` `aria-label="主题配置"`。点开 Drawer「主题配置」，外观 Segmented 默认 **跟随系统**。点 **深色**，再点关闭 ×。抽屉关掉（`[role=dialog]`「主题配置」vis=false；shot 无 mask）。`html` class = **`dark`**。`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`。URL 仍 `/analytics`。截图 `/tmp/react-analytics-dark.png`（PNG **1280×800**；PageHeader + toolbar 近 7/30/90 天 + DatePicker + 刷新/导出 + KPI 四卡 + 访问趋势 Area / 流量构成 Donut 同屏）。无「演示模式」Tag。
  2. **`--tiger-*` 计算值（`documentElement`）：** `--tiger-primary=#2563eb`、`--tiger-bg-page=#0d1117`、`--tiger-bg-card=#161b22`、`--tiger-text=#f0f6fc`、`--tiger-text-secondary=#8b949f`、`--tiger-border=#304050`、`--tiger-surface=#111827`、`--tiger-surface-muted=#1f2937`。另测 `--tiger-chart-1=#60a5fa` / `--tiger-chart-2=#4ade80` / `--tiger-chart-3=#fbbf24` / `--tiger-chart-4=#c084fc` / `--tiger-chart-5=#38bdf8` / `--tiger-chart-6=#f87171`。`#main-content-scroll` 底 `rgb(31, 41, 55)`（`#1f2937` = `--tiger-surface-muted`），字 `rgb(255, 255, 255)`。侧栏 `aside.tiger-sidebar` 底 `rgb(17, 24, 39)`（`--tiger-surface`）、边 `rgb(48, 64, 80)`（`--tiger-border`）。壳 `header.tiger-header` 底 `color(srgb 0.0862745 0.105882 0.133333 / 0.75)`（半透明 surface）、底边 `color(srgb 0.188235 0.25098 0.313726 / 0.5)`。无横向溢出（`documentElement.scrollWidth===clientWidth===1280`，`#main-content-scroll` **1025===1025**）。`main *` 检索 leftover `border-slate-200` / `bg-slate-50*` / `from-*-50` / `bg-*-100` / `text-slate-800`：**0**（没有 About 5b.4 那组浅砖）。
  3. **PageHeader：** `header` **977×65** at **(264,166)** vis=true，底透明、边 `rgb(48, 64, 80)` = `--tiger-border` `#304050`。leftover **`p2-icon-chip`** 48×48 at **(264,166)**，色 `rgb(37, 99, 235)` / 底 `color(srgb 0.145098 0.388235 0.921569 / 0.14)`（跟 `--tiger-primary`）。leftover **`p2-text-primary`**「数据分析」**317×28** at **(324,166)**，色 **`rgb(240, 246, 252)`** = `--tiger-text` `#f0f6fc`。Tag「实时演示」class `bg-[var(--tiger-tag-success-bg,#dcfce7)]`，`--tiger-tag-success-bg` 在 `html` **空**，实算底 **`rgb(220, 252, 231)`** / 字 `rgb(74, 222, 128)` / 边 `rgb(187, 247, 208)`（浅 pastel 落回默认）。Tag「BI」class `bg-[var(--tiger-tag-primary-bg,#dbeafe)]`，`--tiger-tag-primary-bg` 同样 **空**，实算底 **`rgb(219, 234, 254)`** / 字 `rgb(37, 99, 235)` / 边 `rgb(191, 219, 254)`。两枚 Tag 贴在暗 PageHeader 上是浅色岛（跟 About 5b.4 leftover pastel 同类，但是缺 token 的 fallback，不是 `border-slate-200` 砖）。
  4. **toolbar：** 宿主 Card 底 `--tiger-surface` **`rgb(17, 24, 39)`**、边 `--tiger-border` **`rgb(48, 64, 80)`**，**977×132** at **(264,255)**。选中「近 30 天」字 `rgb(240, 246, 252)` = `--tiger-text`，未选「近 7 天 / 近 90 天」字 `rgb(139, 148, 159)` = `--tiger-text-secondary`。刷新 / 导出字+边 **`rgb(37, 99, 235)`** = `--tiger-primary`。
  5. **KPI：** 四卡 **232×122** 同行 y **411**（访问量 x264 / 转化率 x512 / 订单数 x761 / 收入 x1009），底 `--tiger-surface` **`rgb(17, 24, 39)`**、边 `--tiger-border` **`rgb(48, 64, 80)`**。进度条填充跟 `--tiger-primary`（72% / 38% / 64% / 81%）。暗底数字可读。class `bg-[var(--tiger-surface,#ffffff)]`，**不是** `bg-slate-50`。
  6. **首屏图表（对照 6b.2 浅色：Area/Donut/Funnel/Gauge FOLLOW `--tiger-chart-*` / `--tiger-primary`，无 `#3b82f6`）：**
     - **Area「访问趋势」** SVG **320×240** at **(281,574)** vis=true。面积 `url(#tiger-area-grad-…)`；描边 attr `var(--tiger-primary,#2563eb)` 实算 **`rgb(37, 99, 235)`**（**不是** Home 4.6 leftover `#3b82f6`）。轴字 `rgb(139, 148, 159)` = `--tiger-text-secondary`，网格 `rgb(48, 64, 80)` = `--tiger-border`，暗底可读。
     - **Donut「流量构成」** SVG **320×240** at **(782,574)** vis=true。扇区 attr `var(--tiger-chart-1…4)`，实算 **`rgb(96, 165, 250)` / `rgb(74, 222, 128)` / `rgb(251, 191, 36)` / `rgb(192, 132, 252)`** = `--tiger-chart-1…4`。洞描边 `var(--tiger-surface,#ffffff)`。无 `#3b82f6`。
     - **Funnel「转化漏斗」** SVG **320×240** at **(281,900)** vis=false（首屏 800 折下，本条仍量到）。同样 `var(--tiger-chart-1…5)` → 实算 `#60a5fa` / `#4ade80` / `#fbbf24` / `#c084fc` / `#38bdf8` 系列；阶名 `rgb(139, 148, 159)`。
     - **Gauge「目标达成率」** SVG **280×240** at **(782,900)** vis=false。弧 `var(--tiger-primary,#2563eb)` → `rgb(37, 99, 235)`；轨 `var(--tiger-border)` → `rgb(48, 64, 80)`；中心「68」`var(--tiger-text)` → `rgb(240, 246, 252)`。暗底可读。
  7. **折下 leftover（对照 6b.3，暗底再量，不重开为新缺陷）：**
     - **Heatmap「活跃热力」** SVG **400×240** at **(281,1510)**。格子 fill **28** 个硬编码 hex，范围 **`#2563eb`…`#dceafd`**（含 6b.3 已记 `#dceafd`…`#346eed`，另有 `#cddffc` / `#b9d1fa` / `#2765eb`）。**不是** CSS 变量。最浅 `#dceafd` / `#cddffc` / `#b9d1fa` 在暗 Card 上仍是浅蓝砖；最深 `#2563eb` 碰巧等于 `--tiger-primary` 但写死 hex。轴字 `rgb(139, 148, 159)` 可读。
     - **ChartCanvas「自定义图表」** SVG **560×240** at **(281,2128)**。系列 `g fill="#3b82f6" stroke="#3b82f6"` → 计算 **`rgb(59, 130, 246)`**（Home 4.6 同形），**不是** `--tiger-primary` `rgb(37, 99, 235)`。图例「月度转化」色点 **10×10** at **(281,2381)** 底 **`rgb(59, 130, 246)`**。轴字 `rgb(139, 148, 159)`。宿主 `overflow-auto` **943×240**，1280 下 560&lt;943 **未裁**。Card 底仍 `--tiger-surface` `rgb(17, 24, 39)`。
     - **OrgChart「组织 / 渠道分布」** SVG **720×240** 包在父 `overflow-auto` **443×255** at **(782,1815)**。节点色走 `var(--tiger-chart-1…6)`，字 `rgb(240, 246, 252)` / `rgb(139, 148, 159)`，**不是**浅 pastel。裁切同 6b.3：**运营中心 / COO** `clipR=true`，**前端组 / 后端组** `clipB=true`（市场组/客服组右+底都裁）。暗色没有修好 720 塞进 443 wrap。
- **严重度：** 切深色后 `html.dark`、壳侧栏/`#main-content-scroll`/PageHeader/toolbar/KPI 跟 `--tiger-*`，首屏 Area/Donut（及折下 Funnel/Gauge）仍走 `--tiger-chart-*` / `--tiger-primary`、轴/图例暗底可读：通过（信息，`react-analytics-dark` live + `/tmp/react-analytics-dark.png`）。对照 Home **4.6**：Home 图表 leftover hex `#3b82f6` 不跟 `--tiger-primary` `#2563eb`；Analytics 首屏图表 **已跟 token**（6b.2 浅色已证，暗色同形）。对照 About **5b.4 MEDIUM**：About 内格 `border-slate-200` / `bg-slate-50/70` / `from-*-50` / `bg-*-100` / `text-slate-800` 整组停在浅色；Analytics **没有**那组 slate 砖（本条 `slateCount=0`），主区 Card/KPI 跟 `--tiger-surface`。Heatmap 硬编码浅蓝 hex（`#dceafd` 等）暗底仍浅：**低**（6b.3 leftover，本条确认暗色未改）。ChartCanvas leftover `#3b82f6`：**低**（同 Home 4.6 / 6b.3）。PageHeader Tag fallback 浅 `#dcfce7`/`#dbeafe`（`--tiger-tag-*-bg` 未定义）：**低**。OrgChart 720 clip in 443 wrap：**中**（6b.3 / 6.3 已记，暗色同形，不升档）。Card title 只 tooltip：6b.2 已 **中**，不另开。Theme 紧凑/主色：本条不审。375：**缺口**（6b.6）。
- **双端 vs Vue 6.5：** 未开 `:5173` 重走 Vue。live 对照 Vue 6.5 已写入事实：**同形** — `html.dark`；壳/PageHeader/toolbar/KPI 跟 `--tiger-primary` / `--tiger-bg-card` / `--tiger-text` / `--tiger-surface` / `--tiger-border` / `--tiger-bg-page`（侧栏 `rgb(17,24,39)`、主区 `rgb(31,41,55)`、KPI `rgb(17,24,39)` / 边 `rgb(48,64,80)`）；首屏 Area/Donut/Funnel/Gauge FOLLOW `--tiger-chart-*` / `--tiger-primary`（Donut 实算 `rgb(96,165,250)` / `rgb(74,222,128)` / `rgb(251,191,36)` / `rgb(192,132,252)`；Area 描边 `rgb(37,99,235)`），**不是** Home 4.6 leftover `#3b82f6`，也 **不是** About 5b.4 leftover slate 砖。Heatmap leftover hex 暗底仍浅：**低**。ChartCanvas `#3b82f6` → `rgb(59,130,246)`：**低**。OrgChart 720 clip：**中**（cite 6.3 / 6b.3）。PageHeader tags leftover 浅岛：**低**（`--tiger-tag-*-bg` 空，fallback `#dcfce7`/`#dbeafe`）。几何与 Vue 6.5 同像素（PageHeader 977×65 at (264,166)；toolbar 977×132 at (264,255)；KPI 232×122 at y 411 x 264/512/761/1009；Area/Donut 320×240 at y 574；Org wrap 443；Canvas 560 in 943）。预期差：无。

## 7. Monitor (Vue)

本期只走 Vue `http://127.0.0.1:5173/monitor`（`MonitorPage.vue`）。未开 React `:5174` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。未停 Api `:5137`，未强制 empty/error。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（Allow remote debugging 已勾选，未再截 inspect），再在隔离上下文 **`vue-monitor`** 打开 `/login`，未复用 `vue-analytics` / `vue-analytics-rest` / `vue-analytics-dark` / `vue-about` / `vue-about-rest` / `vue-about-dark-mobile` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `MonitorPage.vue`、`src/utils/monitor.ts`、`PageHeader.vue`：MonitorPage **有 import** `PageHeader` + `PageActionPanel` + Tigercat `Segmented` / `Button` / `Tag` / `MetricGrid`/`MetricCard` / `GaugeChart` / `Progress` / `Statistic` / `AreaChart` / `LineChart` / `ActivityFeed`。入口：侧栏 **数据分析 → 实时监控** → `/monitor`。本期只写 **7.1 / 7.2**；未走节点/事件/MutedPanel/empty/error、暗色、~375、项 8。

### 7.1 PageHeader + interval/pause

- **模块：** Monitor PageHeader（实时监控 / 实时快照 / 登录可见）+ PageActionPanel 刷新控制（Segmented 2/3/5 秒、暂停/继续、Tag 刷新中|已暂停、Tag 最近 HH:mm:ss）
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 **`vue-monitor`**，浅色；`html` 无 `dark`。`#main-content-scroll` MAIN `overflow:auto` **1040×658** at **(240,142)**，`scrollHeight=3305`，`clientWidth=1025` / `clientHeight=658`。
- **复现：**
  1. 登录后点侧栏 **数据分析** 展开，点 **实时监控**。URL **`http://127.0.0.1:5173/monitor`**。标题 `tigercat-admin-vue`。壳面包屑「管理中心 / 数据分析 / 实时监控」；TagsView 选中「实时监控」（可关）；无「演示模式」Tag。截图 `/tmp/vue-monitor-header.png`（PNG **1280×800** 浅色；PageHeader + 刷新控制 + KPI 四卡 + 三 Gauge 同屏）。
  2. **PageHeader 已挂：** 主区第一块 `header.tiger-page-header` **977×65** at **(264,166)**，`class-name` 含 `min-w-0 overflow-hidden`，底透明、底边 `--tiger-border` `rgb(229,231,235)`。左 leftover **`p2-icon-chip`** **48×48** at **(264,166)**（`h-12 w-12`，内 Icon 24，monitor），色 `rgb(37,99,235)` / 底 `color(srgb 0.145098 0.388235 0.921569 / 0.14)`（跟 `--tiger-primary` `#2563eb`）。标题 **「实时监控」** leftover **`p2-text-primary`** **322×28** at **(324,166)**，色 `rgb(17,24,39)`（`--tiger-text` `#111827`）。副文 **「轮询监控快照，展示资源水位、吞吐延迟与节点事件」** `Text` `size=sm` `color=secondary` **322×20** at **(324,194)**，色 `rgb(75,85,99)`。右侧 `#actions` tags（`hidden sm:flex`，1280 下 flex）：**实时快照** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)` **66×22** at **(1101,166)**；**登录可见** `variant=info` 底 `rgb(224,242,254)` / 字 **`rgb(59,130,246)`** **66×22** at **(1175,166)**（class `text-[var(--tiger-info,#3b82f6)]`，`--tiger-info` 默认就是 `#3b82f6`，不是 `--tiger-primary` `#2563eb`）。header `innerText` 只有标题/副文/两枚 Tag，**没有** tickCount / 「轮询次数」——源码 `tickCount` 在 state 与 API `data.tickCount`，**不上屏**。
  3. **PageActionPanel「刷新控制」：** 宿主 Card 形 DIV **977×126** at **(264,255)**，底 `--tiger-surface` `#ffffff`、边 `--tiger-border` `#e5e7eb`。左标题 **「刷新控制」** 可见 `P` **558×24** at **(281,286)** 色 `rgb(17,24,39)`（**不是** About 5.1 / Analytics 6.2 那种 `Card title` tooltip-only）。副文 **「按 2 / 3 / 5 秒轮询 GET /api/monitor/snapshot，默认 3 秒；暂停后停止请求，卸载时清除定时器。」** **558×40** at **(281,310)**。右簇：`role=radiogroup` Segmented **162×36** at **(855,272)**，三项 radio **2 秒 / 3 秒 / 5 秒** 各 **51×28** at y **276**。进页默认 **3 秒** `aria-checked=true`。Tag **刷新中** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)` at **(1038,282)**。Tag **最近 HH:mm:ss** `variant=info` 底 `rgb(224,242,254)` / 字 `rgb(59,130,246)`（shot 时 **最近 23:25:43**，随后 live 更新）。**暂停** `Button variant=outline` **68×44** at **(855,320)**，字/边 `rgb(37,99,235)` = `--tiger-primary`。1280 下右簇把暂停挤到 Segmented **下一行**（面板高 126，不是单行）——与 Analytics 6.1 工具栏 98 高把刷新/导出挤下行 **同形低**。
  4. **GET `/api/monitor/snapshot` live（未停 Api）：** 进 `/monitor` 后持续 `GET http://127.0.0.1:5173/api/monitor/snapshot` **200**，`server: Kestrel`（Vite 5173 反代到 Api 5137，不是 MockApi）。请求头 **`authorization: Bearer …`**（`getAuthHeaders()`），`content-type: application/json`。例 reqid=268 body `{"code":200,"message":"Success","data":{"cpu":69,"memory":52,"disk":63,"qps":1063,"latency":30.5,...,"serverTime":"2026-08-27T23:25:43.1742297Z","tickCount":13,"lastTickAt":"2026-08-27T23:25:43.1742297Z"},"success":true}`。`tickCount` 在 JSON 里，header **不渲染**。默认 3 秒时 snapshot 约每 3s 一条。
  5. **切间隔：** 点 **2 秒** → `aria-checked=true`（3/5 false），Tag 仍「刷新中」。lastTick **23:26:20 → 23:26:22 → 23:26:26**（约 2s 一跳）。点 **5 秒** → 5 秒 checked，lastTick **23:26:36 → 23:26:41 → 23:26:46**（正好 5s）。点回 **3 秒** → 3 秒 checked，lastTick **23:26:46 → 23:26:49**（3s）。
  6. **暂停 / 继续：** 点 **暂停**：约 4.5s 后按钮文案 **继续**、状态 Tag **已暂停**（warning），lastTick **冻在 23:26:55**（等待 4.5s 未变）。点 **继续**：约 3.5s 后按钮回到 **暂停**、Tag **刷新中**，lastTick 更新到 **23:27:05**。回到 3 秒轮询。未看到「加载中」（那是 `loading && !initialized` 的首包态，进页后第一 tick 已过）。
- **严重度：** PageHeader「实时监控」+ tags 实时快照/登录可见 + Segmented 默认 3 秒、可切 2/5 再回 3 + 暂停冻 lastTick / 继续恢复 + live `GET /api/monitor/snapshot` 200 Kestrel + Bearer：通过（信息，`vue-monitor` live + `/tmp/vue-monitor-header.png`）。`tickCount` 在 API/state、header 不上屏：信息（与源码一致，不是缺陷）。`p2-icon-chip` / `p2-text-primary` 已绑 `--tiger-primary` / `--tiger-text`：**低**（与 About 5.1 / Analytics 6.1 PageHeader chrome 同形）。「登录可见」info Tag 字 `rgb(59,130,246)` = `--tiger-info` `#3b82f6`，对 `--tiger-primary` `#2563eb`：**低**（token 默认，不是 Monitor 写死 hex）。1280 下暂停落到 Segmented 下一行（面板 126 高）：**低**（同 Analytics 6.1 工具栏换行）。首屏 Gauge / QPS / 延迟 / 节点 / 事件：**缺口**（7.2 走 Gauge+曲线；节点/事件/empty/dark/375 本期不走）。

### 7.2 first-screen gauges + QPS/latency

- **模块：** Monitor 首屏 MetricGrid（当前 QPS / P95 延迟 / 健康节点 / 事件条数）+ 三张 GaugeChart（CPU/内存/磁盘 水位）+ 其下 Progress + AreaChart QPS + LineChart P95 延迟；对照 Home 4.3 leftover `#3b82f6` / 固定 320 / 轴挤，以及 Analytics 6.2 Gauge 弧 `var(--tiger-primary)` / Card `title` tooltip-only
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 **`vue-monitor`**（7.1 同上下文，本条不新开），浅色；`html` 无 `dark`。`documentElement` `--tiger-primary=#2563eb` / `--tiger-chart-1=#2563eb` / chart-2 `#16a34a` / chart-3 `#d97706` / chart-4 `#a855f7` / chart-5 `#0ea5e9` / chart-6 `#ef4444`。`#main-content-scroll` scrollTop=**0** 时 Gauge 在视口、QPS/延迟卡顶 y **816**（视口底 800，**贴折下 16px**）；截图把 scrollTop 调到 **280～300** 让 Gauge + 两曲线同屏。未走节点/事件/empty/dark/375。
- **复现：**
  1. 7.1 之后至少已过一轮 live tick（进页即 `watch immediate` 打 `GET /api/monitor/snapshot` 200，seed 被 `applyRemoteSnapshot` 盖掉）。截图 `/tmp/vue-monitor-gauges.png`（PNG **1280×800**；`#main-content-scroll` scrollTop≈**300**）：上行 KPI 下沿 + 三 Gauge 全见；下行 **QPS Area + P95 Line** 全见。无可见 Card 标题「CPU 水位 / 内存 水位 / 磁盘 水位」。shot 时 KPI **当前 QPS 1,024** / **P95 延迟 34.7** / **健康节点 3** / **事件条数 20**；Gauge **CPU 81%** / **内存 62%** / **磁盘 51%**（已不是源码 seed 54/61/67 / QPS 1056 / latency 45）。
  2. **MetricGrid 四卡（首屏上下文，不开 7.3）：** `lg:grid-cols-4`，各 **232×110** at y **405**（x **264 / 512 / 761 / 1009**），底 `--tiger-surface` `rgb(255,255,255)`、边 `--tiger-border` `rgb(229,231,235)`。标题可见：**当前 QPS** / **P95 延迟** / **健康节点** / **事件条数**。描述「近窗滚动 / 毫秒 / 共 4 个节点 / 环形缓冲 20 条」。数字随 tick 变（reload 后一次读 QPS **780** / P95 **65.8** / 健康 **1** / 事件 **20**；约 2.5s 后 QPS **791** / P95 **62.8**）。`WINDOW_SIZE=20`、事件 `FEED_CAP=20` 与「环形缓冲 20 条」一致。
  3. **Gauge 三卡 + leftover hex（对照 Analytics 6.2）：** `md:grid-cols-3`，各 **315×253** at y **539**（x **264 / 595 / 926**），scrollTop=0 时 vis=true（底边 **792**，视口 800）。宿主 DIV **`title="CPU 水位|内存 水位|磁盘 水位"`**，**没有** `tiger-card-header` / `h2` / `h3`；`innerText` 是刻度 0–100 + 中心值 + 图内 label「CPU/内存/磁盘」+ Progress「CPU 57%」等，**不含**「水位」二字。与 About 5.1 / Analytics 6.2 **同形**（`Card title` 只剩 native tooltip）。`GaugeChart` `:height=180` 实量 SVG **`width=280 height=180`** viewBox `0 0 280 180`，**280×180** at 卡内 x+17（rightGap **18px**）。三段弧 fill **写死 hex** `#22c55e` / `#f59e0b` / `#ef4444` → 计算 **`rgb(34,197,94)` / `rgb(245,158,11)` / `rgb(239,68,68)`**；底轨 `var(--tiger-border,#e5e7eb)` → `rgb(229,231,235)`；针/字 `var(--tiger-text)`。`rgb(37,99,235)=0`、`rgb(59,130,246)=0`。Analytics **6.2** Gauge「目标达成率」弧是 **`var(--tiger-primary)` → `rgb(37,99,235)`**；本页 GAUGE_SEGMENTS leftover hex **不跟** `--tiger-*` / `--tiger-chart-*`（chart-2 是 `#16a34a` 不是 `#22c55e`；chart-3 是 `#d97706` 不是 `#f59e0b`）。源码 `GAUGE_SEGMENTS` 与 live path fill 一致。
  4. **Progress 在各 Gauge 下：** 轨 `bg-[color:var(--tiger-border,#e5e7eb)]` **209×12**；填充走 token（CPU 76% 时 **`rgb(217,119,6)`** = `--tiger-warning` / chart-3；磁盘 54% 时 **`rgb(22,163,74)`** = `--tiger-success` / chart-2），**不是** Gauge 弧那组 leftover hex。文案「CPU 76%」等在条右侧。
  5. **QPS AreaChart：** 卡 **476.5×249** at **(264,816)**（scrollTop=0 时顶边比视口底多 **16px**，需下滚才全见）。`<Card>` **无** `title` attr；可见 heading 是 `Statistic` **「QPS」** + 值 + **req/s**（shot **1,024**）。SVG **`width=320 height=140`** viewBox `0 0 320 140`，**320×140** at **(281,901)**，卡宽 476.5，右侧空 **140px**。描边/面积 `var(--tiger-primary,#2563eb)` → 实算 **`rgb(37,99,235)`**，`hexes=[]`，`rgb(59,130,246)=0`。**跟 token**，与 Analytics 6.2 Area 同形，**不是** Home 4.3 写死 `#3b82f6`。X 轴 **20** 个 `HH:mm:ss`（`WINDOW_SIZE=20`），每个字宽 **54px**、相邻 x 间距约 **13px**，`xTickOverlap=true`，挤成一条不可读时间带（shot 上「23:29:23…23:30:20」糊在一起）。对照 Home **4.3**「近 30 天 30 个 MM-DD 在 320 宽里挤成字带」：**同模式中**。`clipKids=[]`（标签互相叠，没裁出卡外）。
  6. **P95 LineChart：** 卡 **476.5×249** at **(764.5,816)**，同样无 `title` attr；可见 **「P95 延迟」** Statistic + **ms**。SVG 同样 **320×140** at **(781.5,901)**，右空 **140px**。折线 `stroke="#3b82f6"` → 计算 **`rgb(59,130,246)`**，`vars=[]`，`rgb(37,99,235)=0`。源码 `line-color="#3b82f6"`。对 `--tiger-primary` `#2563eb` / 对左边 QPS Area 的 token 蓝：同排两条曲线 **一边跟 token、一边 leftover**。这是 Home **4.3** LineChart leftover 原样（cite 4.3：「折线色 gradient stop 全是 `#3b82f6`，页面 `--tiger-primary` 是 `#2563eb`」）。X 轴同样 20 个 `HH:mm:ss` 重叠。`clipKids=[]`。
  7. **固定宽 vs 卡：** Gauge **280×180** 塞 315 卡，右空仅 **18px**（Analytics 6.2 Gauge 也是 280 宽但卡 477、右空 ≈163px；本页三列卡更窄，空得少）。QPS/延迟 **320×140** 塞 **476.5** 卡，右空 **140px** —— 与 Analytics 6.2 Area **320×240** 塞 477 卡、右空 ≈123px **同形中**（高度因 `:height=140` 从 240 降到 140，宽仍 320）。不是 Home 4.3 的 320×220 塞 643 卡（右空 306），但「写死 320 不撑满」还在。
  8. **seed → 首个 live tick 会不会跳布局：** 源码 `createSeedSnapshot` cpu **54** / memory **61** / disk **67** / QPS **1056** / latency **45** / 事件 3 条，然后 `watch { immediate: true }` 立刻 `loadSnapshot`。reload 后 **150ms 内已是 live**（QPS **780**、CPU **55%**、事件 **20**、lastTick `23:30:48`），**没有截到** seed 54/61/67/1056 那一帧。随后 2.5s 内第二次 tick（lastTick `23:30:51`）QPS 780→791、CPU 55→56，**卡高不变**（Gauge **315×253**、QPS 卡 **249**、y 仍 539 / 816）。数字变、几何不跳。进页瞬间 seed→live 的数字跳 **未取证**。
  9. **DOM 点名、本条不走：** 「节点状态」Card `title` attr，y **1089** vis=false（scrollTop=0）；「实时事件」Card 同 y；`MutedPanel`「演示说明」y **3575**。error `Card` 未出现（Api 活着）。empty `ChartEmptyState` 未出现（series 已有 20 点）。暗色 / 375 / 项 8：**缺口**。
- **严重度：** live 快照上屏、三 Gauge + 两曲线在 scrollTop≈300 的 shot 可读、QPS Area **跟** `--tiger-primary` `#2563eb`：通过（信息，`/tmp/vue-monitor-gauges.png`）。Gauge 弧 leftover **`#22c55e / #f59e0b / #ef4444`** 不跟 `--tiger-*`，相对 Analytics **6.2** Gauge 已走 `var(--tiger-primary)` 是回退：**中**。P95 LineChart 写死 **`#3b82f6` → `rgb(59,130,246)`**，对 `--tiger-primary` `#2563eb`、对同排 QPS Area token 蓝：**中**（Home 4.3 leftover 原样）。QPS/延迟 SVG **320×140** 不撑满 476.5 卡、右空 140px：**中**（Analytics 6.2 / Home 4.3 同模式）。20 个 `HH:mm:ss` 在 320 宽里重叠成字带：**中**（Home 4.3 30 日轴挤同形；Analytics 6.2 六月轴可读，本页更像 Home）。Gauge `Card title="…水位"` 无可见 heading：**中**（About 5.1 / Analytics 6.2 同形；QPS/延迟卡改用可见 Statistic，不另开）。QPS/延迟在 scrollTop=0 时卡顶 y=816、贴视口底折下 16px：信息。seed 首帧数字跳：**缺口**（immediate fetch 太快，未截到 54/61/67）。节点/事件/MutedPanel/empty/error/暗色/375：**缺口**（刻意不走）。

### 7.3 nodes

- **模块：** Monitor「节点状态」Card（四节点 api-hz-1 / api-bj-1 / worker-hz-1 / cache-hz-1 + 区 华东/华北 + Tag 健康/告警/异常 + 每节点 CPU/内存 Progress）+ leftover `p2-muted-panel` 行；对照 7.2 Gauge Progress 已走 token / Card title tooltip-only
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 **`vue-monitor-rest`**（未复用 `vue-monitor` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`），浅色；`html` 无 `dark`。`documentElement` `--tiger-primary=#2563eb` / `--tiger-success=#16a34a` / `--tiger-warning=#d97706` / `--tiger-error=#dc2626` / `--tiger-border=#e5e7eb` / `--tiger-text-secondary=#6b7280` / `--tiger-surface=#ffffff`；`--tiger-bg-hover` **空**；`--tiger-danger` **空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `clientHeight=658` / `scrollHeight=3546`，本条 `scrollTop=935`。
- **复现：**
  1. 登录 `admin` / `admin123`，OnboardingTour 点「关闭引导」（未审 Tour）。侧栏 **数据分析 → 实时监控** → `/monitor`。one-line 核：PageHeader「实时监控」、Segmented **3 秒** `aria-checked`（不重走 7.1/7.2）。滚 `#main-content-scroll` 至 **935**，宿主 `[title="节点状态"]` 顶边 y **154** vis=true（7.2 DOM y **1089** at scrollTop=0 — cite，本条只当定位）。截图 `/tmp/vue-monitor-nodes.png`（PNG **1280×800** 浅色；Badge「2 个节点健康」+ 四节点行全见；无可见 Card 标题「节点状态」）。KPI「事件条数 **20**」仍在（7.2 已记 FEED_CAP=20，本条不重开 KPI）。
  2. **四节点 live（不是 seed 46/62/38/51）：** 网格 `xl:grid-cols-[1.05fr_0.95fr]` **977×2445** at **(264,154)**。左卡 `[title="节点状态"]` **500.3×2445** at **(264,154)**。shot 帧：
     - **api-hz-1** 华东 **健康** CPU **17%** / 内存 **68%**
     - **api-bj-1** 华北 **异常** CPU **96%** / 内存 **25%**
     - **worker-hz-1** 华东 **健康** CPU **52%** / 内存 **37%**
     - **cache-hz-1** 华东 **告警** CPU **64%** / 内存 **76%**
     更早一拍（scroll 刚到位）是 告警/异常/健康/异常 + CPU 30/93/26/74，随后 tick 变成 shot 这一组。健康 Badge **2**（`min-w-5 h-5` **20×20** at **(281,171)**，底 `rgb(22,163,74)` = `--tiger-success`，白字）；旁 `Text`「个节点健康」**70×20** at **(309,171)** 色 `rgb(75,85,99)`（`text-[var(--tiger-secondary,#4b5563)]`）。7.2 已记健康节点 3/4 then 1/4；本条 live 在 **1/4 ↔ 2/4**。
  3. **Tag 色 vs `--tiger-success/#16a34a` / `--tiger-warning/#d97706` / `--tiger-error/#dc2626`：** 字色跟 token — 健康 `rgb(22,163,74)`、告警 `rgb(217,119,6)`、异常 `rgb(220,38,38)`。底是 `--tiger-tag-success-bg` / `--tiger-tag-warning-bg` / `--tiger-tag-danger-bg`，html 上三枚 **都空**，实算 fallback `#dcfce7` / `#fef9c3` / `#fee2e2` → `rgb(220,252,231)` / `rgb(254,249,195)` / `rgb(254,226,226)`（与 7.1 PageHeader「实时快照」success Tag / Analytics 6.5 tag fallback 同形，不是 Monitor 写死 hex）。class 走 `variant=success|warning|danger`（源码 `NODE_STATUS_META`）。
  4. **每节点两条 Progress（对照 7.2 Gauge 下 Progress 已 token）：** 轨 class `bg-[color:var(--tiger-border,#e5e7eb)]` **360.3×12**，底 `rgb(229,231,235)` = `--tiger-border`。填充 class `bg-[color:var(--tiger-success|#16a34a)]` / `var(--tiger-warning,#f59e0b)` / `var(--tiger-error,#dc2626)`；实算 success `rgb(22,163,74)`、exception `rgb(220,38,38)`、paused/warning **`rgb(217,119,6)` = `--tiger-warning` `#d97706`**（class fallback 写的是 `#f59e0b`，live **没用** 那枚 leftover，7.2 Gauge 弧才是 `#f59e0b`）。文案「CPU n% / 内存 n%」在条右侧，字色跟填充。与 7.2 Gauge Progress **同形 token**，本条不另开。
  5. **leftover `p2-muted-panel` 行：** 每行 class `p2-muted-panel flex flex-col gap-2 px-4 py-3`，**466.3×126** at x **281**、y **203 / 341 / 479 / 617**（四行全 vis）。计算：边 `rgb(229,231,235)` = `--tiger-border` `#e5e7eb`（**不是** css fallback `#e2e8f0`）；字 `rgb(107,114,128)` = `--tiger-text-secondary` `#6b7280`（**不是** fallback `#64748b`）；底 **`rgb(248,250,252)` = `#f8fafc`**，因为 `--tiger-bg-hover` **空**，吃了 `style.css` leftover slate fallback。不是 Home 4.3 leftover `#3b82f6`。相对 Tigercat Card/Panel：行没用组件，是页面 leftover class。
  6. **Card `title="节点状态"` tooltip-only：** 宿主 DIV 有 native `title`；`h1–h4` / `.tiger-card-header` **0**；`innerText` 以 Badge +「个节点健康」+ 节点名开头，**不含**「节点状态」四字。与 7.2 Gauge `title="CPU 水位|…"` / About **5.1** / Analytics **6.2** **同形中**。
  7. **live tick 卡高：** lastTick **23:39:54 → 23:39:57**（正好 3s）。数字变（api-hz-1 CPU 20→17、cache 内存 75→76），卡 **500.3×2445** / 行高 **126** / 行 y **203/341/479/617** **不变**。与 7.2 gauges「数字变、几何不跳」同形，**没有更差**。
  8. **网格撑高：** 左卡高 **2445** 不是四行内容（4×126=504 + Badge 行 ≈50 + `p-4`），是 `xl:grid-cols-[1.05fr_0.95fr]` 跟右列「实时事件」20 条 feed **同高拉伸**。1280 视口里四行刚好落在 800 高内；卡下半截是空 surface。MetricCard leftover `p2-icon-chip` 仍 `rgb(37,99,235)` = `--tiger-primary`，**不比 7.1/7.2 chrome 更差**，不另开。
- **严重度：** 四节点 live 上屏（区 华东/华北、Tag 健康/告警/异常、每节点 CPU+内存），Tag 字色跟 `--tiger-success/#16a34a` / `--tiger-warning/#d97706` / `--tiger-error/#dc2626`，Progress 轨/填充跟 `--tiger-border` / `--tiger-success|warning|error`（cite 7.2 Gauge Progress 已 token）：通过（信息，`vue-monitor-rest` live + `/tmp/vue-monitor-nodes.png`）。`Card title="节点状态"` 无可见 heading：**中**（About 5.1 / Analytics 6.2 / 7.2 Gauge 同形）。leftover `p2-muted-panel` 底 fallback `#f8fafc`（`--tiger-bg-hover` 空）+ 行不是 Tigercat Card/Panel：**低**（边/字已跟 `--tiger-border` / `--tiger-text-secondary`；不是 Home 4.3 `#3b82f6`）。左卡被 20 条 feed 撑到 **2445**、行区下面一大块空：**中**。tick 卡高/行高不跳：通过（同 7.2）。empty/error 本条未出现（Api 活着）。事件 feed：**缺口**（7.4）。暗色 / 375 / 项 8：**缺口**。

### 7.4 ActivityFeed event feed

- **模块：** Monitor「实时事件」Card + Tigercat `ActivityFeed`（`:items` / `:group-by` →「最近事件」/ FEED_CAP=20 / ISO `time` / clip·overflow）；对照 7.2/7.3 Card title tooltip-only、7.3 左卡被 feed 撑高
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 **`vue-monitor-rest`**（7.3 同上下文，本条不新开），浅色；`html` 无 `dark`。`#main-content-scroll` `scrollTop=935`（与 7.3 同，右卡顶边跟左卡对齐）。`--tiger-text-muted=#6b7280`；`--tiger-info=#3b82f6`；`--tiger-timeline-dot` **空**；`--tiger-tag-info-bg` **空**。
- **复现：**
  1. 7.3 之后仍停 `/monitor`。右卡 `[title="实时事件"]` **452.7×2445** at **(788.3, 154)** vis=true，底 `--tiger-surface` `rgb(255,255,255)`、边 `--tiger-border` `rgb(229,231,235)`。截图 `/tmp/vue-monitor-events.png`（PNG **1280×800**；组标题「最近事件」+ 视口内约 5 条 item + 原始 ISO 时间全见；无可见 Card 标题「实时事件」）。KPI「事件条数 **20** / 环形缓冲 20 条」仍在。`body` **没有**「暂无实时事件」；无 error Card；无 `ChartEmptyState`。
  2. **FEED_CAP=20 / 最新在上：** `.tiger-activity-feed` 内 **20** 个 `li`，**20** 个 ISO 时间节点。源码 `toActivityItems = events.slice(0, FEED_CAP)`（远程 **不** `.reverse()`）。量到第一条 `2026-08-27T23:43:15.8313357Z`「自动扩容触发」> 第 20 条 `2026-08-27T23:42:18.8310753Z`「API 网关流量升高」（`localeCompare` > 0，newest first）。shot 时首条已滚到 `23:43:36`（3s 轮询），格式仍是完整 ISO。
  3. **组标题「最近事件」：** 唯一一组。`SPAN` class `text-sm font-bold text-[var(--tiger-text,#111827)] uppercase tracking-wider`，色 `rgb(17,24,39)` = `--tiger-text`，**58.8×20** at **(819.3, 171)** vis=true。`text-transform=uppercase`（汉字无视觉变化）。
  4. **ISO time：** 上屏是完整 ISO（`2026-08-27T23:43:15.8313357Z`，7 位小数 + `Z`），**不是** `HH:mm:ss` / 相对时间。时间节点 class `text-xs … text-[var(--tiger-text-muted,#6b7280)] shrink-0 whitespace-nowrap`，色 `rgb(107,114,128)`，**196.5×16** at x **1010.5**。`white-space:nowrap` / `overflow:visible` / `text-overflow:clip`。仓库内 **没有** `formatActivityTime` 符号；`MonitorPage` 把 API `item.time` 原样塞进 `ActivityItem.time`。
  5. **overflow / clip：** 宿主 Card `overflow:hidden`，`scrollHeight=clientHeight=2443`，`scrollWidth≈clientWidth=451`（**没有**卡内滚动条）。`.tiger-activity-feed` **2411×418.7** at **(805.3, 171)**，`overflow:visible`，`sh=ch=2411`。20 条时间 / 行 `clipR=0` `clipB=0`；时间相对卡右缘 `clipByCardRight=-34`（还在卡内 34px）。视口内可见时间 **5** 条（末条 vis y≈701），其余 **15** 条在视口下（卡高 2445，**不是**被 Card clip，是页面要继续滚）。`clipKids=[]`。
  6. **Tigercat token vs leftover hex：** feed 面走 `--tiger-*` — item class `tiger-activity-item` 边 `border-[var(--tiger-border,#e5e7eb)]` → `rgb(229,231,235)`，底 `bg-[var(--tiger-surface,#ffffff)]`；标题 `text-[var(--tiger-text,#111827)]` → `rgb(17,24,39)`；轴 `bg-[var(--tiger-border,#e5e7eb)]`；圆点 `bg-[var(--tiger-timeline-dot,#d1d5db)]` 因 token **空** → 实算 `rgb(209,213,219)` = fallback `#d1d5db`；描述 `text-[var(--tiger-text-muted,#6b7280)]` → `rgb(107,114,128)`。feed 上 **0** 个 `p2-muted-panel` / `p2-icon-chip`。页面级写死 hex **没有**（对照 Home 4.3 / 7.2 P95 `#3b82f6`）。info Tag「扩容 / 抖动」字 `rgb(59,130,246)` = `--tiger-info` `#3b82f6`（7.1「登录可见」info Tag 同 token，不是本页 leftover hex）。
  7. **Card `title="实时事件"` tooltip-only：** 宿主有 native `title`；`h1–h4` / `.tiger-card-header` **0**；`innerText` 以「最近事件」开头，**不含**「实时事件」四字。与 7.2 Gauge / 7.3 节点 / About **5.1** / Analytics **6.2** **同形中**。
  8. **empty / error：** Api `:5137` 仍活，未停。live **没有** `ChartEmptyState`「暂无实时事件」，**没有** error Card。empty/error **缺口**（不靠停 Api 制造）。暗色 / 375 / 项 8：**缺口**（本条后停）。
- **严重度：** 20 条封顶、最新在上、组标题「最近事件」、feed 面跟 `--tiger-text` / `--tiger-border` / `--tiger-surface` / `--tiger-text-muted`：通过（信息，`vue-monitor-rest` live + `/tmp/vue-monitor-events.png`）。时间上屏完整 ISO（小数秒 + Z）、未格式化：**中**。包裹 Card `title="实时事件"` 无可见 heading：**中**（5.1 / 6.2 / 7.2 / 7.3 同形）。20 条把卡撑到 **2445**、无卡内 scroll，连带 7.3 左列空：**中**（根因在本列；7.3 已记左卡撑高）。timeline-dot fallback `#d1d5db`（`--tiger-timeline-dot` 空）：**低**。info Tag `--tiger-info` `#3b82f6`：**低**（cite 7.1，不升档）。empty/error / 暗色 / 375 / 项 8：**缺口**。

### 7.5 Dark tokens

- **模块：** Monitor `/monitor` 暗色 token（ThemeConfigDrawer `data-testid=shell-theme-config-trigger` 切「深色」、关抽屉后仍停本页）；对照 7.2 Gauge leftover hex / P95 `#3b82f6` / 320 SVG / 20-tick 重叠 / Card title tooltip-only、7.3 `p2-muted-panel` `--tiger-bg-hover` 空 → `#f8fafc`、7.4 feed 2445 / 原始 ISO；对照 Analytics **6.5**（卡/KPI 跟 `--tiger-surface`、无 leftover slate 砖）与 About **5.4**（MEDIUM leftover slate/pastel 暗色仍浅：`border-slate-200` / `bg-slate-50/70` / `from-*-50` / `bg-*-100` / `text-slate-800`）
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 **`vue-monitor-dark`**（未复用 `vue-monitor` / `vue-monitor-rest` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`）。ThemeConfigDrawer 切「深色」后 `html.classList.contains('dark')=true`（`html.className="dark"`）。抽屉已关（shot 无遮罩）。`documentElement` 暗色 token：`--tiger-primary=#2563eb` / `--tiger-bg-card=#161b22` / `--tiger-text=#f0f6fc` / `--tiger-surface=#111827` / `--tiger-border=#304050` / `--tiger-bg-page=#0d1117` / `--tiger-bg-hover=#1b212c`（**浅色 7.3 为空，暗色有值**） / `--tiger-text-secondary=#8b949f` / `--tiger-text-muted=#8b949f` / `--tiger-success=#4ade80` / `--tiger-warning=#fbbf24` / `--tiger-error=#f87171` / `--tiger-info=#60a5fa` / `--tiger-surface-muted=#1f2937`；`--tiger-layout-content-bg` **空**；`--tiger-timeline-dot` **空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，底 `rgb(31,41,55)` = `--tiger-surface-muted`（layout-content-bg 空走 fallback），`clientWidth=1025` / `scrollWidth=1025` / `scrollHeight=3546`，本条 `scrollTop=0`。`documentElement.scrollWidth===clientWidth` **1280===1280**。
- **复现：**
  1. 登录 `admin` / `admin123`，OnboardingTour 点「关闭引导」（未审 Tour / Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme 本身 / Watermark / TagsView）。侧栏 **数据分析 → 实时监控** → `/monitor`。点 header `data-testid=shell-theme-config-trigger`（BUTTON 主题配置 **40×40** at **(1016.1,28)**），抽屉内 radio「深色」，关抽屉，仍停 `/monitor`。截图 `/tmp/vue-monitor-dark.png`（PNG **1280×800** 暗色；PageHeader「实时监控」+ Segmented 2/3/5 + 暂停 + KPI 四卡 + 三 Gauge 全见；抽屉不在画面上）。
  2. **shell / PageHeader / 刷新控制卡 / KPI 跟 `--tiger-*`：** `ASIDE.tiger-sidebar` 底 `rgb(17,24,39)` = `--tiger-surface` `#111827`，边 `rgb(48,64,80)` = `--tiger-border` `#304050`。`HEADER.tiger-header` 底 `color(srgb 0.0862745 0.105882 0.133333 / 0.75)`（约 `#161b22` = `--tiger-bg-card` @ 75%），边 `--tiger-border`。`.tiger-page-header` **977×65** at **(264,166)**，底透明、`border-b` `rgb(48,64,80)` = `--tiger-border`；`.tiger-page-header-title` 字 `rgb(240,246,252)` = `--tiger-text` `#f0f6fc`。DOM **没有** `.tiger-page-action-panel`（未发明）。「刷新控制」宿主 `.tiger-card` **977×126** at **(264,255)**，底 `rgb(17,24,39)` = `--tiger-surface`，边 `--tiger-border`。暂停 BUTTON 字/边 `rgb(37,99,235)` = `--tiger-primary` `#2563eb`。Segmented「3 秒」`aria-checked` 字 `rgb(240,246,252)` = `--tiger-text`；「2 秒 / 5 秒」字 `rgb(139,148,159)` = `--tiger-text-secondary`。KPI 四卡 `.tiger-card` **232.3×110** 底 `rgb(17,24,39)` = `--tiger-surface`、边 `--tiger-border`；标签字 `rgb(139,148,159)` = `--tiger-text-secondary`。与 Analytics **6.5**「卡/KPI 跟 `--tiger-surface`、无 leftover slate 砖」**同档**，**好于** About **5.4** MEDIUM leftover slate/pastel 暗色仍浅。
  3. **7.2 leftovers ON DARK（cite，不新开除非更差）：** 三 Gauge SVG **280×180** viewBox `0 0 280 180`，弧 `attrFill` 仍写死 **`#22c55e` / `#f59e0b` / `#ef4444`** → 实算 `rgb(34,197,94)` / `rgb(245,158,11)` / `rgb(239,68,68)`。暗色 token 是 `--tiger-success=#4ade80` / `--tiger-warning=#fbbf24` / `--tiger-error=#f87171`，弧**不跟**这些 token。不是 About 5.4 那种浅底砖，是饱和 500 色在暗卡上仍亮；相对 Analytics **6.2/6.5** Gauge 走 `var(--tiger-primary)` **仍是回退**，**没有比 7.2 更差到升档**。轨 `fill: var(--tiger-border)` → `rgb(48,64,80)`；针/字 `var(--tiger-text)` → `rgb(240,246,252)`。P95 LineChart path `stroke="#3b82f6"` → `rgb(59,130,246)`，对 `--tiger-primary` `#2563eb`、对同排 QPS Area `stroke="var(--tiger-primary,#2563eb)"`：**仍是 7.2 / Home 4.6 leftover**，暗色未修。QPS/P95 SVG 仍 **320×140** viewBox `0 0 320 140`（QPS at **(281,901)**，P95 at **(782,901)**）。20× `HH:mm:ss` 仍重叠：两图共 40 tick、相邻 x 步进 ≈13px 而字宽 **53.9**，`tickOverlap=38`（cite 7.2 字带，暗色不更差）。`[title="CPU 水位"]` / `[title="内存 水位"]` / `[title="磁盘 水位"]` `h1–h4` / `.tiger-card-header` **0**（cite 7.2 / About 5.1 / Analytics 6.2 同形中，不新开）。
  4. **7.3 leftover `p2-muted-panel` ON DARK：** 四行 class `p2-muted-panel flex flex-col gap-2 px-4 py-3`，底 **`rgb(27,33,44)` = `#1b212c` = `--tiger-bg-hover`**（暗色 token **有值**），边 `rgb(48,64,80)` = `--tiger-border`，字 `rgb(139,148,159)` = `--tiger-text-secondary`。**不是** 7.3 浅色测到的 `#f8fafc` 浅岛，**不是** About **5.4** leftover slate 砖暗色仍浅。假设「Monitor 经 muted-panel `#f8fafc` 相对 Analytics 6.5 回退」**在暗色不成立**（浅色空 token 的问题仍在 7.3，暗色 hover 已填）。首屏 shot 节点在 scrollTop=0 时 y **1089** 以下，本条用计算样式，未把 muted 当浅岛。
  5. **7.4 feed ON DARK：** `[title="实时事件"]` 仍 **452.7×2445** at y **1089**（cite 7.4 撑高，暗色几何不变）。组标题「最近事件」SPAN 字 `rgb(240,246,252)` = `--tiger-text`。item 底 `rgb(17,24,39)` = `--tiger-surface`、边 `--tiger-border`。ISO 时间 `2026-08-27T23:51:52.5589157Z` 字 `rgb(139,148,159)` = `--tiger-text-muted`，宽 **196.5**，对比足够可读，**不是**浅底上浅字。格式仍是完整 ISO（cite 7.4 中，暗色不更差）。`Card title` tooltip-only 仍（cite 7.2/7.3/7.4，不新开）。
- **严重度：** `html.dark` + 关抽屉后停 `/monitor`；shell / PageHeader / 刷新控制卡 / KPI 跟 `--tiger-surface` / `--tiger-text` / `--tiger-border` / `--tiger-primary` / `--tiger-bg-hover`：通过（信息，`vue-monitor-dark` live + `/tmp/vue-monitor-dark.png`）。卡/KPI **同档 Analytics 6.5**、**好于 About 5.4** leftover 浅砖。Gauge 弧 leftover `#22c55e/#f59e0b/#ef4444` 暗色仍写死、不跟 `--tiger-success|warning|error`：**中**（cite 7.2；相对 Analytics 6.5 token Gauge **回退**，但不升档）。P95 `#3b82f6` vs `--tiger-primary` `#2563eb`：**中**（cite 7.2 / Home 4.6）。320 SVG / 20-tick 重叠 / Card title tooltip-only：**中**（cite 7.2/7.3/7.4，暗色不更差，不新开）。`p2-muted-panel` 暗色走 `--tiger-bg-hover=#1b212c`、**不是** `#f8fafc` 浅岛：通过（相对 7.3 浅色空 token / About 5.4 浅砖 **未回退**）。feed ISO 暗色对比可读：通过（格式仍 7.4 中）。empty/error / 375 / 项 8：**缺口**（Api 未停）。

## 7b. Monitor (React)

本期只走 React `http://127.0.0.1:5174/monitor`（`MonitorPage.tsx`）。未开 Vue `:5173` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。未停 Api `:5137`，未强制 empty/error。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（Allow remote debugging 已勾选，未再截 inspect），再在隔离上下文 **`react-monitor`** 打开 `/login`，未复用 `vue-monitor` / `vue-monitor-rest` / `vue-monitor-dark` / `vue-analytics` / `vue-analytics-rest` / `vue-analytics-dark` / `vue-about` / `vue-about-rest` / `vue-about-dark-mobile` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-analytics` / `react-analytics-rest` / `react-analytics-dark` / `react-about` / `react-about-rest` / `react-about-dark-mobile` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `MonitorPage.tsx`、`src/utils/monitor.ts`、`PageHeader.tsx`：MonitorPage **有 import** `PageHeader` + `PageActionPanel` + Tigercat `Segmented` / `Button` / `Tag` / `MetricGrid`/`MetricCard` / `GaugeChart` / `Progress` / `Statistic` / `AreaChart` / `LineChart` / `ActivityFeed`。入口：侧栏 **数据分析 → 实时监控** → `/monitor`（与 Vue 同路由）。`fetchMonitorSnapshot` 走 `apiRequest('/api/monitor/snapshot')` + `getAuthHeaders()`。本期只写 **7b.1 / 7b.2**；未走节点/事件/MutedPanel/empty/error、暗色、~375、项 8。未重写 ## 7 Vue 7.1–7.5。未重写项 1–6。

### 7b.1 PageHeader + interval/pause

- **模块：** Monitor PageHeader（实时监控 / 实时快照 / 登录可见）+ PageActionPanel 刷新控制（Segmented 2/3/5 秒、暂停/继续、Tag 刷新中|已暂停、Tag 最近 HH:mm:ss）
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 **`react-monitor`**，浅色；`html` 无 `dark`（`html.className=""`）。`documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-info=#3b82f6` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-success=#16a34a`。`#main-content-scroll` MAIN `overflow:auto` **1040×658** at **(240,142)**，`scrollHeight=3546`，`clientWidth=1025` / `clientHeight=658`。
- **复现：**
  1. 登录后点侧栏 **数据分析** 展开，点 **实时监控**。URL **`http://127.0.0.1:5174/monitor`**。标题 `tigercat-admin-react`（相对 Vue 7.1 `tigercat-admin-vue` 的预期文档标题差，不是缺陷）。壳面包屑「管理中心 / 数据分析 / 实时监控」；TagsView 选中「实时监控」（可关）；无「演示模式」Tag（`document.body.innerText` 检索「演示模式」为 false）。截图 `/tmp/react-monitor-header.png`（PNG **1280×800** 浅色；PageHeader + 刷新控制 + KPI 四卡 + 三 Gauge 同屏）。
  2. **PageHeader 已挂：** 主区第一块 `header.tiger-page-header` **977×65** at **(264,166)**，`class-name` 含 `min-w-0 overflow-hidden`，底透明、底边 `--tiger-border` `rgb(229,231,235)`。左 leftover **`p2-icon-chip`** **48×48** at **(264,166)**（`h-12 w-12`，内 SVG **24×24**，monitor），色 `rgb(37,99,235)` / 底 `color(srgb 0.145098 0.388235 0.921569 / 0.14)`（跟 `--tiger-primary` `#2563eb`）。标题 **「实时监控」** leftover **`p2-text-primary`** **322×28** at **(324,166)**，色 `rgb(17,24,39)`（`--tiger-text` `#111827`）。副文 **「轮询监控快照，展示资源水位、吞吐延迟与节点事件」** `Text` `size=sm` `color=secondary` **322×20** at **(324,194)**，色 `rgb(75,85,99)`。右侧 `#actions` tags（`hidden sm:flex`，1280 下 flex）：**实时快照** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)` **66×22** at **(1101,166)**；**登录可见** `variant=info` 底 `rgb(224,242,254)` / 字 **`rgb(59,130,246)`** **66×22** at **(1175,166)**（class `text-[var(--tiger-info,#3b82f6)]`，`--tiger-info` 默认就是 `#3b82f6`，不是 `--tiger-primary` `#2563eb`）。header `innerText` 只有标题/副文/两枚 Tag，**没有** tickCount / 「轮询次数」——源码 `tickCount` 在 state 与 API `data.tickCount`，**不上屏**。
  3. **PageActionPanel「刷新控制」：** 宿主 Card 形 DIV **977×126** at **(264,255)**，底 `--tiger-surface` `#ffffff`、边 `--tiger-border` `#e5e7eb`。左标题 **「刷新控制」** 可见 `P` **558.4×24** at **(281,286)** 色 `rgb(17,24,39)`（**不是** About 5b.1 / Analytics 6b.2 那种 `Card title` tooltip-only）。副文 **「按 2 / 3 / 5 秒轮询 GET /api/monitor/snapshot，默认 3 秒；暂停后停止请求，卸载时清除定时器。」** **558.4×40** at **(281,310)**。右簇：`role=radiogroup` Segmented **162.1×36** at **(855.4,272)**，三项 radio **2 秒 / 3 秒 / 5 秒** 各 **51.4×28** at y **276**。进页默认 **3 秒** `aria-checked=true`。Tag **刷新中** `variant=success` 底 `rgb(220,252,231)` / 字 `rgb(22,163,74)` **54×22** at **(1029.5,279)**。Tag **最近 HH:mm:ss** `variant=info` 底 `rgb(224,242,254)` / 字 `rgb(59,130,246)` **99.7×22** at **(1095.5,279)**（量时 **最近 00:03:09**，随后 live 更新）。**暂停** `Button variant=outline` **68×44** at **(855.4,320)**，字/边 `rgb(37,99,235)` = `--tiger-primary`。1280 下右簇把暂停挤到 Segmented **下一行**（面板高 126，不是单行）——与 Vue 7.1 / Analytics 6b.1 工具栏换行 **同形低**。
  4. **GET `/api/monitor/snapshot` live（未停 Api）：** 进 `/monitor` 后持续 `GET http://127.0.0.1:5174/api/monitor/snapshot` **200**，`server: Kestrel`（Vite 5174 反代到 Api 5137，不是 MockApi）。请求头 **`authorization: Bearer …`**（`getAuthHeaders()`），`content-type: application/json`。例 reqid=274 body `{"code":200,"message":"Success","data":{"cpu":71,"memory":28,"disk":42,"qps":1025,"latency":49.8,...,"serverTime":"2026-08-28T00:03:09.1238690Z","tickCount":424,"lastTickAt":"2026-08-28T00:03:09.1238690Z"},"success":true}`。`tickCount` 在 JSON 里，header **不渲染**。默认 3 秒时 snapshot 约每 3s 一条（reqid 265–274 连续命中）。
  5. **切间隔：** 点 **2 秒** → `aria-checked=true`（3/5 false），Tag 仍「刷新中」。lastTick **00:03:57 → 00:03:59 → 00:04:01 → 00:04:03 → 00:04:05**（正好 2s 一跳）。点 **5 秒** → 5 秒 checked，lastTick **00:04:25 → 00:04:30 → 00:04:35**（正好 5s）。点回 **3 秒** → 3 秒 checked，lastTick **00:04:43 → 00:04:46**（3s）。
  6. **暂停 / 继续：** 点 **暂停**：约 4.5s 后按钮文案 **继续**、状态 Tag **已暂停**（warning），lastTick **冻在 00:04:46**（等待 4.5s 未变）。点 **继续**：约 3.5s 后按钮回到 **暂停**、Tag **刷新中**，lastTick 更新到 **00:04:54**。回到 3 秒轮询。未看到「加载中」（那是 `loading && !initialized` 的首包态，进页后第一 tick 已过）。
- **严重度：** PageHeader「实时监控」+ tags 实时快照/登录可见 + Segmented 默认 3 秒、可切 2/5 再回 3 + 暂停冻 lastTick / 继续恢复 + live `GET /api/monitor/snapshot` 200 Kestrel + Bearer：通过（信息，`react-monitor` live + `/tmp/react-monitor-header.png`）。`tickCount` 在 API/state、header 不上屏：信息（与源码一致，不是缺陷）。`p2-icon-chip` / `p2-text-primary` 已绑 `--tiger-primary` / `--tiger-text`：**低**（与 Vue 7.1 / About 5b.1 / Analytics 6b.1 PageHeader chrome 同形）。「登录可见」info Tag 字 `rgb(59,130,246)` = `--tiger-info` `#3b82f6`，对 `--tiger-primary` `#2563eb`：**低**（token 默认，不是 Monitor 写死 hex）。1280 下暂停落到 Segmented 下一行（面板 126 高）：**低**（同 Vue 7.1 / Analytics 6b.1 工具栏换行）。首屏 Gauge / QPS / 延迟 / 节点 / 事件：**缺口**（7b.2 走 Gauge+曲线；节点/事件/empty/dark/375 本期不走）。
- **双端 vs Vue 7.1：** 未开 `:5173` 重走 Vue。live 对照 Vue 7.1 已写入事实：**同形** — 同路由 `/monitor`、同中文文案（实时监控 / 实时快照 / 登录可见 / 刷新控制 / 2 秒 / 3 秒 / 5 秒 / 暂停 / 继续 / 刷新中 / 已暂停 / 最近）、同 PageHeader **977×65 at (264,166)**、同 tags 像素（实时快照/登录可见 **66×22** at **(1101,166)/(1175,166)**）、同芯片 48×48 / 标题 322×28 / 副文 322×20、同刷新控制卡 **977×126 at (264,255)**、同 Segmented **162×36 at (855,272)** 默认 3 秒、同暂停 **68×44 at (855,320)** 换到下一行、同 live `GET /api/monitor/snapshot` 200 Kestrel + Bearer、同 `tickCount` 不上屏。预期差：文档标题 `tigercat-admin-react` vs `tigercat-admin-vue`。暂停换行 **低** 与 Vue 7.1 **同形**。

### 7b.2 first-screen gauges + QPS/latency

- **模块：** Monitor 首屏 MetricGrid（当前 QPS / P95 延迟 / 健康节点 / 事件条数）+ 三张 GaugeChart（CPU/内存/磁盘 水位）+ 其下 Progress + AreaChart QPS + LineChart P95 延迟；对照 Vue **7.2** leftover Gauge hex / P95 `#3b82f6` / Area·Line **320×140** 塞 476.5 / 20-tick `HH:mm:ss` 重叠 / Gauge Card title tooltip-only / QPS Area 跟 `--tiger-primary`，以及 Analytics **6.2** Gauge 弧 `var(--tiger-primary)`
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 **`react-monitor`**（7b.1 同上下文，本条不新开），浅色。`documentElement` `--tiger-primary=#2563eb` / `--tiger-chart-2=#16a34a` / chart-3 `#d97706` / `--tiger-info=#3b82f6`。`#main-content-scroll` scrollTop=**0** 时 Gauge 卡 y **539** vis=true、QPS/P95 卡顶 y **816**；截图把 scrollTop 调到 **300** 让 Gauge + 两曲线同屏。未走节点/事件/empty/error/暗色/~375。
- **复现：**
  1. **7b.1 一句话核对（不重审）：** PageHeader「实时监控」+ Segmented 默认 3 秒 / 暂停仍在。本条把 `#main-content-scroll` 滚到 **300**。截图 `/tmp/react-monitor-gauges.png`（PNG **1280×800**；`scrollTop=300`）：上行 KPI 下沿 + 三 Gauge 全见；下行 **QPS Area + P95 Line** 全见。无可见 Card 标题「CPU 水位 / 内存 水位 / 磁盘 水位」（inner 从 0–100 ticks + 中心值 + CPU/内存/磁盘 起）。shot 帧 lastTick **最近 00:08:30**；KPI **当前 QPS 1296** / **P95 延迟 73** / **健康节点 0** / **事件条数 20**；Gauge **CPU 80%** / **内存 49%** / **磁盘 48%**（live，不是 seed 54/61/67 / QPS 1056 / latency 45）。量数见 `/tmp/react-monitor-7b2-measures.json`（st0 + shot 帧）。
  2. **MetricGrid 四卡（首屏上下文，不开节点/事件）：** 各 **232.3×110** at y **405**（x **264 / 512.3 / 760.5 / 1008.8**），底 `--tiger-surface`、边 `--tiger-border`。shot 可见数字 **1296 / 73 / 0 / 20**，描述「近窗滚动 / 毫秒 / 共 4 个节点 / 环形缓冲 20 条」。与 Vue 7.2 同四卡几何（Vue 记 **232×110** at y **405**，x **264 / 512 / 761 / 1009**）。数字随 live tick 变，不是双端差。
  3. **Gauge 三卡 + leftover hex（对照 Analytics 6.2 / Vue 7.2）：** `scrollTop=0` 各 **315×253** at y **539**（x **264 / 595 / 926**）vis=true；shot 帧（scrollTop=300）同宽高 at y **239** x 同。宿主 native title **`CPU 水位|内存 水位|磁盘 水位`**；headings=**0**；`innerHasShuiwei=false`。与 About 5.1 / Analytics 6.2 / Vue 7.2 **同形**（`Card title` 只剩 native tooltip）。Gauge SVG **`280×180`** viewBox `0 0 280 180`，st0 at **(281,556)/(612,556)/(943,556)**，shot at **(281,256)/(612,256)/(943,256)**，rightGap **18**。三段弧 fill **写死 hex** `#22c55e` / `#f59e0b` / `#ef4444` → **`rgb(34,197,94)` / `rgb(245,158,11)` / `rgb(239,68,68)`**；底轨 `var(--tiger-border)` → `rgb(229,231,235)`；针/字 `var(--tiger-text)` → `rgb(17,24,39)`。rgbHit **primary=0 leftover=0 gauge=3**。Analytics **6.2** Gauge「目标达成率」弧是 **`var(--tiger-primary)` → `rgb(37,99,235)`**；本页弧 leftover hex **不跟** `--tiger-*` / `--tiger-chart-*`（chart-2 `#16a34a` 不是 `#22c55e`；chart-3 `#d97706` 不是 `#f59e0b`）。与 Vue 7.2 **同形中**。
  4. **Progress 在各 Gauge 下：** 轨 **209×12** `rgb(229,231,235)` = `--tiger-border`。shot CPU 条橙（80%）、内存/磁盘条绿（49% / 48%），不是 Gauge 弧那组 leftover `#22c55e/#f59e0b/#ef4444`。与 Vue 7.2「Progress 已走 token（warning / success）」**同形**，不另开。
  5. **QPS AreaChart：** 卡 **476.5×249** at **(264,816)**，**无** `title` attr；可见 heading 是 Statistic **「QPS」** + 值 + **req/s**（shot **1,296 req/s**）。SVG **`320×140`** at **(281,901)**（shot y **601**）。描边 `var(--tiger-primary,#2563eb)` → **`rgb(37,99,235)`**，hasVarPrimary=**true** has38=**false**，qpsPrimary=**1** qpsLeftover=**0**。**跟 token**，与 Vue 7.2 QPS Area / Analytics 6.2 Area **同形**，**不是** Home 4.3 写死 `#3b82f6`。X 轴 **20** 个 `HH:mm:ss`（xTickCount=**20**），xTickW **53.9**、meanGap **12.8**，xTickOverlap=**true**，挤成一条不可读时间带（shot 上 `HH:mm:ss` 糊在一起；帧 lastTick **00:08:30**）。clipKids=**0**。inner host rightGap **122.5**（卡 476.5；Vue 7.2 记右空 **140**）。
  6. **P95 LineChart：** 卡 **476.5×249** at **(764.5,816)**；可见 Statistic **「P95 延迟」** + **ms**（shot **73.0 ms**）。SVG 同样 **320×140** at **(781.5,901)**（shot y **601**）。折线 `stroke="#3b82f6"` → **`rgb(59,130,246)`**，hasVarPrimary=**false** has38=**true**，p95Primary=**0** p95Leftover=**1**。对 `--tiger-primary` `#2563eb` / 对左边 QPS Area 的 token 蓝：同排两条曲线 **一边跟 token、一边 leftover**。与 Vue 7.2 / Home 4.3 Line leftover **同形中**。X 轴同样 20 个 `HH:mm:ss` 重叠。clipKids=**0**。
  7. **固定宽 vs 卡：** Gauge **280×180** 塞 315 卡，右空仅 **18px**（Analytics 6.2 Gauge 280 宽但卡 477、右空 ≈163px；本页三列卡更窄）。QPS/延迟 **320×140** 塞 **476.5** 卡，inner host rightGap **122.5**（Vue 7.2 记右空 **140**）——「写死 320 不撑满」与 Vue 7.2 **同形中**。
  8. **live tick 会不会跳布局：** geom 稳定：gauge **315×253** y **539** 不变，lastTick **00:07:30** QPS **1347** → **00:07:33** QPS **1318**。数字变、几何不跳。shot 帧已是 live（QPS **1296** / P95 **73** / 健康 **0** / 事件 **20**），**没有** seed 54/61/67/1056/45。
  9. **DOM 点名、本条不走：** 节点/事件 y **1089** vis=false（scrollTop=0）；Muted y **3558**。errorCard=**false** empty=**false**。暗色 / 375 / 项 8：**缺口**。
- **严重度：** live 快照上屏、三 Gauge + 两曲线在 scrollTop=300 的 shot 可读、QPS Area **跟** `--tiger-primary` `#2563eb`：通过（信息，`react-monitor` live + `/tmp/react-monitor-gauges.png` + `/tmp/react-monitor-7b2-measures.json`）。Gauge 弧 leftover **`#22c55e / #f59e0b / #ef4444`** 不跟 `--tiger-*`，相对 Analytics **6.2** Gauge 已走 `var(--tiger-primary)` 是回退：**中**（与 Vue 7.2 **同形中**）。P95 LineChart 写死 **`#3b82f6` → `rgb(59,130,246)`**，对 `--tiger-primary` `#2563eb`、对同排 QPS Area token 蓝：**中**（Home 4.3 leftover 原样；与 Vue 7.2 **同形中**）。QPS/延迟 SVG **320×140** 不撑满 476.5 卡、inner rightGap 122.5：**中**（与 Vue 7.2 **同形中**）。20 个 `HH:mm:ss` 在 320 宽里重叠成字带：**中**（Home 4.3 30 日轴挤同形；与 Vue 7.2 **同形中**）。Gauge `Card title="…水位"` 无可见 heading：**中**（About 5.1 / Analytics 6.2 / Vue 7.2 同形；QPS/延迟卡改用可见 Statistic，不另开）。Progress 轨/填充已 token：通过（cite Vue 7.2，同形，不另开）。节点/事件/MutedPanel/empty/error/暗色/375：**缺口**（刻意不走）。
- **双端 vs Vue 7.2：** 未开 `:5173` 重走 Vue。live 对照 Vue 7.2 已写入事实（五条 **中** + QPS token + Progress）：Gauge leftover `#22c55e/#f59e0b/#ef4444` **同形中**；P95 Line `#3b82f6` **同形中**；Area/Line **320×140** 塞 476.5 **同形中**（React inner rightGap **122.5**，Vue 7.2 记 **140**，卡宽同 476.5、SVG 同 320×140）；20× `HH:mm:ss` overlap **同形中**；Gauge Card title tooltip-only **同形中**；QPS Area 跟 `--tiger-primary` **同形通过**；Progress 已 token **同形**，不另开。预期差：KPI/Gauge 数字是 live tick（本条 shot 1296/73/0/20 + CPU 80/内存 49/磁盘 48，vs Vue 7.2 shot 1024/34.7/3/20 + 81/62/51），不是双端缺陷。未重写 ## 7 Vue 7.1–7.5。

### 7b.3 nodes

- **模块：** Monitor「节点状态」Card（四节点 api-hz-1 / api-bj-1 / worker-hz-1 / cache-hz-1 + 区 华东/华北 + Tag 健康/告警/异常 + 每节点 CPU/内存 Progress）+ leftover `p2-muted-panel` 行；对照 7b.2 Gauge Progress 已走 token / Card title tooltip-only，以及 Vue **7.3**
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 **`react-monitor-rest`**（未复用 `react-monitor` / `react-monitor-write` / `vue-monitor` / `vue-monitor-rest` / `vue-monitor-dark` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-analytics*` / `react-about*` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`），浅色；`html` 无 `dark`（`html.className=""`）。`documentElement` `--tiger-primary=#2563eb` / `--tiger-success=#16a34a` / `--tiger-warning=#d97706` / `--tiger-error=#dc2626` / `--tiger-border=#e5e7eb` / `--tiger-text-secondary=#6b7280` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6` / `--tiger-text=#111827`；`--tiger-bg-hover` **空**；`--tiger-danger` **空**；`--tiger-tag-success-bg` / `--tiger-tag-warning-bg` / `--tiger-tag-danger-bg` **都空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `clientHeight=658` / `scrollHeight=3546`，本条 `scrollTop=935`。
- **复现：**
  1. 登录 `admin` / `admin123`，OnboardingTour 点「关闭引导」（未审 Tour）。侧栏 **数据分析 → 实时监控** → `/monitor`。one-line 核（不重走 7b.1/7b.2）：PageHeader「实时监控」、Segmented **3 秒** `aria-checked=true`。`scrollTop=0` 时 `[title="节点状态"]` 顶边 y **1089** vis=false（cite 7b.2 DOM y≈1089）。滚 `#main-content-scroll` 至 **935**，卡顶 y **154** vis=true。截图 `/tmp/react-monitor-nodes.png`（PNG **1280×800** 浅色；「个节点健康」+ 四节点行全见；无可见 Card 标题「节点状态」；无 Badge 数字）。无「演示模式」Tag。
  2. **四节点 live（不是 seed 46/62/38/51）：** 网格 `xl:grid-cols-[1.05fr_0.95fr]` **977×2445** at **(264,154)**。左卡 `[title="节点状态"]` **500.3×2445** at **(264,154)**，底 `--tiger-surface` `rgb(255,255,255)`、边 `--tiger-border` `rgb(229,231,235)`。shot 帧 lastTick **最近 00:25:37**：
     - **api-hz-1** 华东 **告警** CPU **51%** / 内存 **76%**
     - **api-bj-1** 华北 **告警** CPU **68%** / 内存 **83%**
     - **worker-hz-1** 华东 **异常** CPU **96%** / 内存 **89%**
     - **cache-hz-1** 华东 **异常** CPU **87%** / 内存 **82%**
     健康 **0** / 4（cite 7b.2 shot 健康节点 **0**，live 不是 seed）。进页更早一拍 a11y 是 告警/异常/异常/告警 + CPU 49/58/96/70；shot 后一 tick（lastTick **00:26:31** 量时）数字变成 37/76/96/73 等，状态仍 告警/异常。`Text`「个节点健康」**70×20** at **(281,171)** 色 `rgb(75,85,99)`（`text-[var(--tiger-secondary,#4b5563)]`）。源码 `<Badge content={healthyCount} variant="success" standalone />`：shot 时 `healthyCount=0`，卡内 headerHTML **只有** 该 P，**没有** `.tiger-badge` / 数字「0」（Tigercat Badge 藏零）。相对 Vue **7.3** shot Badge **20×20** at **(281,171)** 显示 **2**、Text 在 **(309,171)**：本条 live 健康 0 所以没量到 Badge 色；Vue 7.3 健康 1/4↔2/4 才有 Badge。不是 React 页面写死 hex。
  3. **Tag 色 vs `--tiger-success/#16a34a` / `--tiger-warning/#d97706` / `--tiger-error/#dc2626`：** 本 tick **没有**「健康」Tag（四行 告警/告警/异常/异常）。量到的字色跟 token — 告警 `rgb(217,119,6)` = `--tiger-warning` `#d97706`（class fallback `text-[var(--tiger-warning,#ca8a04)]`，live **没用** `#ca8a04`）、异常 `rgb(220,38,38)` = `--tiger-error` `#dc2626`。底是 `--tiger-tag-warning-bg` / `--tiger-tag-danger-bg`，html 上 **空**，实算 fallback `#fef9c3` / `#fee2e2` → `rgb(254,249,195)` / `rgb(254,226,226)`（与 7b.1 PageHeader「实时快照」success Tag fallback / Vue 7.3 tag fallback **同形**，不是 Monitor 写死 hex）。class 走 `variant=warning|danger`（源码 `NODE_STATUS_META`）。「健康」success Tag 本 tick 未上屏，源码映射 `healthy→success` 与 Vue 7.3 相同，**未量到** `--tiger-success` 字色。
  4. **每节点两条 Progress（对照 7b.2 Gauge 下 Progress 已 token / Vue 7.3）：** 轨 class `bg-[color:var(--tiger-border,#e5e7eb)]` **360.3×12**，底 `rgb(229,231,235)` = `--tiger-border`。填充 class `bg-[color:var(--tiger-success|#16a34a)]` / `var(--tiger-warning,#f59e0b)` / `var(--tiger-error,#dc2626)`；实算 success `rgb(22,163,74)`、exception `rgb(220,38,38)`、paused/warning **`rgb(217,119,6)` = `--tiger-warning` `#d97706`**（class fallback 写的是 `#f59e0b`，live **没用** 那枚 leftover，7b.2 Gauge 弧才是 `#f59e0b`）。文案「CPU n% / 内存 n%」在条右侧。与 7b.2 Gauge Progress / Vue 7.3 **同形 token**，本条不另开。
  5. **leftover `p2-muted-panel` 行：** 每行 class `p2-muted-panel flex flex-col gap-2 px-4 py-3`，**466.3×126** at x **281**、y **203 / 341 / 479 / 617**（四行全 vis）。计算：边 `rgb(229,231,235)` = `--tiger-border` `#e5e7eb`（**不是** css fallback `#e2e8f0`）；字 `rgb(107,114,128)` = `--tiger-text-secondary` `#6b7280`（**不是** fallback `#64748b`）；底 **`rgb(248,250,252)` = `#f8fafc`**，因为 `--tiger-bg-hover` **空**，吃了 `index.css` leftover slate fallback。不是 Home 4.3 leftover `#3b82f6`。相对 Tigercat Card/Panel：行没用组件，是页面 leftover class。MetricCard leftover `p2-icon-chip` 仍只在 7b.1/7b.2 chrome，节点行 **没有** 更差的 hex，不另开。
  6. **Card `title="节点状态"` tooltip-only：** 宿主 DIV 有 native `title`；`h1–h4` / `.tiger-card-header` **0**；`innerText` 以「个节点健康」+ 节点名开头，**不含**「节点状态」四字。与 7b.2 Gauge `title="CPU 水位|…"` / About **5.1** / Analytics **6.2** / Vue **7.3** **同形中**。
  7. **live tick 卡高：** 数字变（api-hz-1 CPU 51→37、api-bj-1 告警→异常、cache 内存 82→71），卡 **500.3×2445** / 行高 **126** / 行 y **203/341/479/617** **不变**。与 7b.2 gauges「数字变、几何不跳」/ Vue 7.3「行高 126 不变」**同形**，**没有更差**。
  8. **网格撑高：** 左卡高 **2445** 不是四行内容（4×126=504 + Badge 行 ≈20 + `p-4`），是 `xl:grid-cols-[1.05fr_0.95fr]` 跟右列「实时事件」**同高拉伸**（右卡 **452.7×2445** at **(788.3,154)**）。1280 视口里四行刚好落在 800 高内；卡下半截是空 surface。与 Vue 7.3 **同形中**。
- **严重度：** 四节点 live 上屏（区 华东/华北、Tag 告警/异常、每节点 CPU+内存），Tag 字色跟 `--tiger-warning/#d97706` / `--tiger-error/#dc2626`，Progress 轨/填充跟 `--tiger-border` / `--tiger-success|warning|error`（cite 7b.2 Gauge Progress 已 token）：通过（信息，`react-monitor-rest` live + `/tmp/react-monitor-nodes.png`）。`Card title="节点状态"` 无可见 heading：**中**（About 5.1 / Analytics 6.2 / 7b.2 Gauge / Vue 7.3 同形）。leftover `p2-muted-panel` 底 fallback `#f8fafc`（`--tiger-bg-hover` 空）+ 行不是 Tigercat Card/Panel：**低**（边/字已跟 `--tiger-border` / `--tiger-text-secondary`；不是 Home 4.3 `#3b82f6`）。左卡被 feed 撑到 **2445**、行区下面一大块空：**中**。tick 卡高/行高不跳：通过（同 7b.2 / Vue 7.3）。live 健康 0 时 `Badge` 不进 DOM：信息（Tigercat 藏零；Vue 7.3 shot 健康 2 才有 Badge，不是本页写死）。本 tick 未量到「健康」Tag：信息（live 0/4）。empty/error 本条未出现（Api 活着）。事件 feed：**缺口**（7b.4）。暗色 / 375 / 项 8：**缺口**。
- **双端 vs Vue 7.3：** 未开 `:5173` 重走 Vue。live 对照 Vue 7.3 已写入事实：**同形** — 网格 **977×2445 at (264,154)**、左卡 **500.3×2445 at (264,154)**、行 **466.3×126** at x **281** y **203/341/479/617**、四节点 id/区、Tag 字色 token + 底 fallback、Progress 轨/填充 token（warning 实算 `#d97706` 不是 class fallback `#f59e0b`）、`p2-muted-panel` 底 `#f8fafc`（`--tiger-bg-hover` 空）**低**、Card title tooltip-only **中**、左卡撑到 **2445** **中**、tick 行高 126 不跳。预期差：本条 shot 健康 **0** / 无 Badge / 无「健康」Tag（Vue 7.3 shot 健康 **2** + Badge **20×20** + 健康/异常/告警混排），是 live tick 不是双端缺陷。未重写 ## 7 Vue 7.1–7.5。未重写 7b.1/7b.2。

### 7b.4 ActivityFeed event feed

- **模块：** Monitor「实时事件」Card + Tigercat `ActivityFeed`（`items` / `groupBy` →「最近事件」/ `FEED_CAP=20` / ISO `time` / clip·overflow）；对照 7b.2/7b.3 Card title tooltip-only、7b.3 左卡被 feed 撑高，以及 Vue **7.4**
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 **`react-monitor-rest`**（7b.3 同上下文，本条不新开；未复用 `react-monitor` 首片 / `vue-*` / `react-analytics*` / `react-about*` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*`），浅色；`html` 无 `dark`。`#main-content-scroll` `scrollTop=935`（cite 7b.3）。`documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-text-muted` expect `#6b7280` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6`（cite 7b.3）；`--tiger-timeline-dot` 待 live-fill。
- **复现：**
  1. 7b.3 之后仍停 `/monitor`。右卡 `[title="实时事件"]` **452.7×2445** at **(788.3,154)** vis=true（cite 7b.3；网格 **977×2445** at **(264,154)**，左卡「节点状态」同高，本条不重开节点）。截图 `/tmp/react-monitor-events.png`（PNG **1280×800** 浅色；组标题「最近事件」+ 视口内约 **5** 条 feed item + 原始 ISO 时间全见；无可见 Card 标题「实时事件」；页面最右侧有滚动条，feed 在视口下继续）。KPI「事件条数 **20** / 环形缓冲 20 条」仍在（cite 7b.2/7b.3）。shot 未见 empty「暂无实时事件」、未见 error Card。未审 Tour / Cmd-K / Bell / ChatDock / Lock / Theme / Watermark / TagsView。
  2. **FEED_CAP=20 / 最新在上：** 源码 `toActivityItems = events.slice(0, FEED_CAP)`（远程 **不** `.reverse()`），`time` 是 `item.time` 原样；`ActivityFeed emptyText="暂无实时事件"` `groupBy={() => '最近事件'}`。shot 视口内约 5 条，时间从新到旧：`2026-08-28T00:29:37.3736411Z`「磁盘清理完成」→ `…00:29:34…`「API 网关流…」→ `…00:29:31…`「磁盘清理完成」→ `…00:29:28…`「节点探活超时」→ `…00:29:25…`「节点探活超时」（5 条 `localeCompare` 递减）。**20 `li` 计数 / 第 1 条 ISO vs 第 20 条 ISO 待 live-fill。**
  3. **组标题「最近事件」：** shot 可见唯一一组，左竖条 + 粗体「最近事件」。未见第二组。`text-transform` / 像素待 live-fill 补。
  4. **ISO time：** 上屏是完整 ISO（shot 例 `2026-08-28T00:29:37.3736411Z`，**7 位小数 + `Z`**），**不是** `HH:mm:ss` / 相对时间。可见 Tag：**运维**（蓝）/ **告警**（黄）/ **异常**（红）。标题截断例「API 网关流…」。时间节点 `nowrap` 像素 / 色待 live-fill。仓库 `MonitorPage` 把 API `item.time` 原样塞进 `ActivityItem.time`（无 `formatActivityTime`）。
  5. **overflow / clip：** 宿主 Card 高 **2445**（cite 7b.3），与左列同高拉伸。shot 页面最右侧滚动条，视口内约 5 条、其余在视口下（**不是** shot 上被 Card 裁掉）。卡 `overflow` / feed `scrollHeight` vs `clientHeight` / `clipR` `clipB` **待 live-fill。**
  6. **Tigercat token vs leftover hex：** 7b.3 已量 `--tiger-text=#111827` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6`。shot 组标题深色、item 白底浅边、时间灰、info Tag 蓝、告警黄、异常红，未见 Home 4.3 / 7b.2 P95 那种页面级写死 `#3b82f6` 折线。`--tiger-timeline-dot` 是否空 → fallback `#d1d5db`、feed 面计算色 **待 live-fill。**
  7. **Card `title="实时事件"` tooltip-only：** 源码 `<Card title="实时事件">`；shot **没有**可见 heading「实时事件」，组标题是「最近事件」。`h1–h4` / `.tiger-card-header` 计数待 live-fill。与 7b.2 Gauge / 7b.3 节点 / About **5.1** / Analytics **6.2** / Vue **7.4** **同形中**（cite 7b.3 tooltip-only）。
  8. **empty / error：** Api `:5137` 仍活，未停。shot / 本条 **没有** `ChartEmptyState`「暂无实时事件」，**没有** error Card。empty/error **缺口**（不靠停 Api 制造）。暗色 / 375 / 项 8：**缺口**（本条后停）。
- **严重度：** 组标题「最近事件」、shot 视口约 5 条、原始 ISO（7 位小数 + Z）、右卡 **452.7×2445** 与左卡同高、KPI 事件条数 20 / FEED_CAP=20：通过（信息，`react-monitor-rest` + `/tmp/react-monitor-events.png`；20 `li` / first>last / overflow·clip 待 live-fill）。时间上屏完整 ISO、未格式化：**中**（cite Vue **7.4**）。包裹 Card `title="实时事件"` 无可见 heading：**中**（5.1 / 6.2 / 7b.2 / 7b.3 / Vue 7.4 同形）。20 条把卡撑到 **2445**、shot 无卡内滚动条、连带 7b.3 左列空：**中**（根因在本列；7b.3 已记左卡撑高）。timeline-dot fallback / feed token 计算色：**待 live-fill**（Vue 7.4 记 `--tiger-timeline-dot` 空 → `#d1d5db` **低**）。empty/error / 暗色 / 375 / 项 8：**缺口**。
- **双端 vs Vue 7.4：** 未开 `:5173` 重走 Vue。对照 Vue 7.4 已写入事实（shot + 7b.3 几何）：FEED_CAP 20 / `slice(0)` 不 reverse / 组标题「最近事件」/ 原始 ISO **同形中**；`Card title="实时事件"` tooltip-only **同形中**；右卡 **452.7×2445 at (788.3,154)**、feed 把网格撑到 2445、无卡内滚动条（页面右侧滚动条、15 条在视口下）**同形中**（Vue 7.4 已量 `sh=ch`、`clipKids=0`；React 同几何，精确 clip **待 live-fill**）。feed `--tiger-*` / timeline-dot fallback **待 live-fill**（Vue 7.4 **低**）。empty/error **同缺口**（Api 未停）。shot 路径 `/tmp/react-monitor-events.png` vs Vue `/tmp/vue-monitor-events.png`。未重写 ## 7 Vue 7.1–7.5。未重写 7b.1/7b.2/7b.3。

### 7b.5 Dark tokens

- **模块：** Monitor `/monitor` 暗色 token（ThemeConfigDrawer `data-testid=shell-theme-config-trigger` 切「深色」、关抽屉后仍停本页）；对照 7b.2 Gauge leftover hex / P95 `#3b82f6` / 320 SVG / 20-tick 重叠 / Card title tooltip-only、7b.3 `p2-muted-panel` `--tiger-bg-hover` 空 → `#f8fafc`、7b.4 feed 2445 / 原始 ISO；对照 Vue **7.5**（shell/PageHeader/KPI 跟 `--tiger-*`，muted-panel 暗色 **不是** `#f8fafc` 浅岛）、Analytics **6b.5**（同档 Vue 6.5，卡/KPI 跟 token、无 leftover slate 砖）与 About **5.4**（MEDIUM leftover slate/pastel 暗色仍浅：`border-slate-200` / `bg-slate-50/70` / `from-*-50` / `bg-*-100` / `text-slate-800`）
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 **`react-monitor-dark`**（未复用 `react-monitor` / `react-monitor-rest` / `react-monitor-rest-write` / `react-monitor-write` / `react-analytics` / `react-analytics-rest` / `react-analytics-dark` / `react-about` / `react-about-rest` / `react-about-dark-mobile` / `react-home-*` / `react-chatdock` / `react-shell-*` / `react-theme-*` / `react-watermark-*` / `react-tags-*` / `vue-*`）。ThemeConfigDrawer 切「深色」后 `html.classList.contains('dark')=true`（`html.className="dark"`）。抽屉已关（shot 无遮罩）。`documentElement` 暗色 token：`--tiger-primary=#2563eb` / `--tiger-bg-card=#161b22` / `--tiger-text=#f0f6fc` / `--tiger-surface=#111827` / `--tiger-border=#304050` / `--tiger-bg-page=#0d1117` / `--tiger-bg-hover=#1b212c`（**浅色 7b.3 为空，暗色有值**） / `--tiger-text-secondary=#8b949f`。`--tiger-tag-info-bg` / `--tiger-tag-success-bg` **都空**。`MAIN` 底 `rgb(31,41,55)` = `#1f2937`；`ASIDE` 底 `rgb(17,24,39)` = `--tiger-surface` `#111827`。`documentElement.scrollWidth===clientWidth` **1280===1280**。
- **复现：**
  1. 登录 `admin` / `admin123`，OnboardingTour 点「关闭引导」（未审 Tour / Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme 本身 / Watermark / TagsView）。侧栏 **数据分析 → 实时监控** → `/monitor`。点 header `data-testid=shell-theme-config-trigger`（BUTTON 主题配置），抽屉内 radio「深色」，关抽屉，仍停 `/monitor`。截图 `/tmp/react-monitor-dark.png`（PNG **1280×800** 暗色；PageHeader「实时监控」+ Segmented 2/3/5 + 暂停 + KPI 四卡 + 三 Gauge 全见；抽屉不在画面上）。
  2. **shell / PageHeader / PageActionPanel / KPI 跟 `--tiger-*`：** `ASIDE` 底 `#111827` = `--tiger-surface`。`HEADER` 底 `color(srgb 0.0862745 0.105882 0.133333 / 0.75)`（约 `--tiger-bg-card` `#161b22` @ 75%）。刷新控制 Card **977×126** 底 `#111827` = `--tiger-surface`、边 `#304050` = `--tiger-border`。暂停 BUTTON 字/边 `#2563eb` = `--tiger-primary`。KPI 四卡 **232×110** 底 `#111827` = `--tiger-surface`、边 `--tiger-border`。Gauge 三卡 **315×253**、QPS/P95 卡 **477×249** 同底同边。与 Vue **7.5** / Analytics **6b.5** 卡/KPI 跟 `--tiger-surface` **同档**，**好于** About **5.4** leftover slate 砖暗色仍浅。
  3. **7b.2 leftovers ON DARK（cite，不新开除非更差）：** 三 Gauge SVG **280×180**，弧 `attrFill` 仍写死 **`#22c55e` / `#f59e0b` / `#ef4444`** → 实算 `rgb(34,197,94)` / `rgb(245,158,11)` / `rgb(239,68,68)`。轨 `fill: var(--tiger-border)`。不是 About 5.4 浅底砖，是饱和 500 色在暗卡上仍亮；相对 Analytics **6.2/6b.5** Gauge 走 `var(--tiger-primary)` **仍是回退**，**没有比 7b.2 更差到升档**。P95 LineChart path `stroke="#3b82f6"` → `rgb(59,130,246)`，对 `--tiger-primary` `#2563eb`、对同排 QPS Area `stroke="var(--tiger-primary,#2563eb)"`：**仍是 7b.2 / Home 4.6 leftover**，暗色未修。QPS/P95 SVG 仍 **320×140**。20× `HH:mm:ss` 仍重叠（cite 7b.2 字带，暗色不更差）。`[title="CPU 水位"]` / `[title="内存 水位"]` / `[title="磁盘 水位"]` 无可见 heading（cite 7b.2 / About 5.1 / Analytics 6.2 同形中，不新开）。
  4. **7b.3 leftover `p2-muted-panel` ON DARK：** 五行 class `p2-muted-panel flex flex-col gap-2 …`，底 **`rgb(27,33,44)` = `#1b212c` = `--tiger-bg-hover`**（暗色 token **有值**），边 `rgb(48,64,80)` = `--tiger-border`，字 `rgb(139,148,159)` = `--tiger-text-secondary`。**不是** 7b.3 浅色测到的 `#f8fafc` 浅岛，**不是** About **5.4** leftover slate 砖暗色仍浅。与 Vue **7.5**「muted-panel 暗色走 `#1b212c`、NOT island」**同形通过**。假设「Monitor 经 muted-panel `#f8fafc` 相对 Analytics 6b.5 回退」**在暗色不成立**（浅色空 token 的问题仍在 7b.3，暗色 hover 已填）。
  5. **7b.4 feed ON DARK：** `[title="实时事件"]` 仍 **453×2445**（cite 7b.4 撑高，暗色几何不变）；左卡「节点状态」仍 **500×2445**。组标题「最近事件」字 `#f0f6fc` = `--tiger-text`。item 文案例「瞬时计算任务推高水位」字 `#8b949f` = `--tiger-text-secondary`。ISO 时间 `2026-08-28T00:42:42.8831493Z` 字 `#8b949f`、`font-size:12px`、`white-space:nowrap`，对比足够可读，**不是**浅底上浅字。格式仍是完整 ISO（cite 7b.4 中，暗色不更差）。`Card title` tooltip-only 仍（cite 7b.2/7b.3/7b.4，不新开）。
  6. **Tag fallback 暗色仍浅（cite 7b.1，暗色更差）：** `--tiger-tag-success-bg` / `--tiger-tag-info-bg` 暗色仍空。「实时快照」底 `#dcfce7` / 字 `#4ade80`；「登录可见」「最近 HH:mm:ss」底 `#e0f2fe` / 字 `#60a5fa` / 边 `#bae6fd`。字跟暗色 `--tiger-success` / `--tiger-info`，**底仍是浅色 fallback**（About **5.4** `bg-*-100` 暗色仍浅同形）。不是 Card 砖，是 PageHeader / 刷新控制上的两枚 info Tag + 一枚 success Tag 浅岛。Vue **7.5** 未把这组 Tag 升档；本条记 **低→中** 只因暗色对比翻了（浅底贴在 `#111827` 卡上）。不新开 Card title。
- **严重度：** `html.dark` + 关抽屉后停 `/monitor`；shell / PageHeader / 刷新控制卡 / KPI 跟 `--tiger-surface` / `--tiger-text` / `--tiger-border` / `--tiger-primary` / `--tiger-bg-hover`：通过（信息，`react-monitor-dark` live + `/tmp/react-monitor-dark.png`）。卡/KPI **同档 Vue 7.5 / Analytics 6b.5**、**好于 About 5.4** leftover 浅砖。Gauge 弧 leftover `#22c55e/#f59e0b/#ef4444` 暗色仍写死：**中**（cite 7b.2；相对 Analytics 6b.5 token Gauge **回退**，但不升档）。P95 `#3b82f6` vs `--tiger-primary` `#2563eb`：**中**（cite 7b.2 / Home 4.6）。320 SVG / 20-tick 重叠 / Card title tooltip-only：**中**（cite 7b.2/7b.3/7b.4，暗色不更差，不新开）。`p2-muted-panel` 暗色走 `--tiger-bg-hover=#1b212c`、**不是** `#f8fafc` 浅岛：通过（相对 7b.3 浅色空 token / About 5.4 浅砖 **未回退**；与 Vue 7.5 **同形**）。feed ISO 暗色对比可读：通过（格式仍 7b.4 中）。success/info Tag 底 fallback `#dcfce7` / `#e0f2fe` 暗色仍浅：**中**（cite 7b.1 Tag fallback；暗色更差，About 5.4 pastel 同形）。empty/error / 375 / 项 8：**缺口**（Api 未停）。
- **双端 vs Vue 7.5：** 未开 `:5173` 重走 Vue。live 对照 Vue 7.5 已写入事实：**同形通过** — shell/PageHeader/刷新控制/KPI 跟 `--tiger-surface` / `--tiger-border` / `--tiger-primary`；`p2-muted-panel` 暗色 `#1b212c` **不是** `#f8fafc` 浅岛（浅色 7b.3 空 token 问题在暗色不成立）。Gauge leftover hex / P95 `#3b82f6` / 320 SVG / 20-tick / Card title tooltip-only **同形中**（cite，不升档）。相对 About **5.4** leftover slate 砖：**同档好于 5.4**（卡面跟 token）。相对 Analytics **6b.5**：卡/KPI 同档 token follow；Gauge 弧仍 leftover hex **回退**（cite 7b.2）。Tag 浅底 fallback 暗色仍浅：Vue 7.5 未升档，本条因暗色对比记 **中**。empty/error **同缺口**。shot `/tmp/react-monitor-dark.png` vs Vue `/tmp/vue-monitor-dark.png`。

## 8. Performance (Vue)

本期只走 Vue `http://127.0.0.1:5173/performance`（`PerformancePage.vue`）。未开 React `:5174` 走查、未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。未停 Api `:5137`。本页是页面内造数（`LOG_COUNT=12000` / `TABLE_COUNT=10000`），**不**打 `/api/performance`、不审后端。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（Allow remote debugging 已勾选，未再截 inspect），再在隔离上下文 **`vue-performance`** 打开 `/login`，未复用 `vue-monitor` / `vue-monitor-rest` / `vue-monitor-dark` / `vue-analytics` / `vue-analytics-rest` / `vue-analytics-dark` / `vue-about` / `vue-about-rest` / `vue-about-dark-mobile` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 点「关闭引导」关掉，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。走查前已读 `PerformancePage.vue`、`MetricCard.vue`（`p2-icon-chip`）、`MutedPanel.vue`（`p2-muted-panel`）、`style.css` `.p2-muted-panel` / `.p2-icon-chip`、`PageHeader.vue`：PerformancePage **有 import** `PageHeader` + `MetricGrid`/`MetricCard` + `PageActionPanel` + `MutedPanel` + `Tabs`/`TabPane` + `VirtualList` + `VirtualTable` + `useDrag` + `Kanban`。入口：侧栏 **运维 → 大数据演示** → `/performance`。本期只写 **8.1 / 8.2**；未走 VirtualTable sticky / useDrag 排序 / Kanban vs TaskBoard（8.1 只各点一次确认挂载）、暗色、~375、项 9。

### 8.1 PageHeader + four tabs

- **模块：** Performance PageHeader（大数据演示 / 运维 / 演示数据 / 万级数据）+ 四 Tab（万级日志流 / 万行多列 / 自由拖拽 / 低层看板）smoke 挂载
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 **`vue-performance`**，浅色；`html` 无 `dark`（`html.className=""`）。`documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-text-secondary=#6b7280` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6` / `--tiger-warning=#d97706` / `--tiger-error=#dc2626` / `--tiger-success=#16a34a`；`--tiger-bg-hover` **空**；`--tiger-bg-card` **空**；`--tiger-danger` **空**；`--tiger-tag-primary-bg` / `--tiger-tag-info-bg` / `--tiger-tag-warning-bg` **都空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `clientHeight=658` / `scrollWidth=1025` / `scrollHeight=1012`，本条 `scrollTop=0`。`documentElement.scrollWidth===clientWidth` **1280===1280**。
- **复现：**
  1. 登录后点侧栏 **运维** 展开，点 **大数据演示**。URL **`http://127.0.0.1:5173/performance`**。标题 `tigercat-admin-vue`。壳面包屑「管理中心 / 运维 / 大数据演示」；TagsView 选中「大数据演示」（可关）；无「演示模式」Tag（`document.body.innerText` 检索「演示模式」为 false）。截图 `/tmp/vue-performance-header.png`（PNG **1280×800** 浅色；PageHeader + 四枚 KPI + PageActionPanel + 四个 Tab 标签 + 默认 VirtualList 上沿同屏）。未审 Tour / Cmd-K / Bell / ChatDock / Lock / Theme / Watermark / TagsView。
  2. **PageHeader 已挂：** 主区第一块 `header.tiger-page-header` **977×65** at **(264,166)**，`class-name` 含 `min-w-0 overflow-hidden`，底透明、底边 `--tiger-border` `rgb(229,231,235)`。左 leftover **`p2-icon-chip`** **48×48** at **(264,166)**（`h-12 w-12`，内 Icon 24，zap），色 `rgb(37,99,235)` / 底 `color(srgb 0.145098 0.388235 0.921569 / 0.14)`（`--p2-chip-color` 实算 `#2563eb` = `--tiger-primary`）。标题 **「大数据演示」** leftover **`p2-text-primary`** **475.6×28** at **(324,166)**，色 `rgb(17,24,39)`（`--tiger-text` `#111827`）。副文 **「万级虚拟列表 / 虚拟表格与自由拖拽、低层看板演示，数据仅在页面内存生成」** `Text` `size=sm` `color=secondary` **475.6×20** at **(324,194)**，色 `rgb(75,85,99)`。右侧 `#actions` tags（`hidden sm:flex`，1280 下 flex）**190×22** at **(1051,166)**：
     - **运维** `variant=primary` 底 `rgb(219,234,254)` / 字 `rgb(37,99,235)` **42×22** at **(1051,166)**（`--tiger-tag-primary-bg` 空 → fallback `#dbeafe`）
     - **演示数据** `variant=info` 底 `rgb(224,242,254)` / 字 **`rgb(59,130,246)`** **66×22** at **(1101,166)**（class `text-[var(--tiger-info,#3b82f6)]`，`--tiger-info` 默认就是 `#3b82f6`，不是 `--tiger-primary` `#2563eb`；`--tiger-tag-info-bg` 空 → `#e0f2fe`）
     - **万级数据** `variant=warning` 底 `rgb(254,249,195)` / 字 `rgb(217,119,6)` **66×22** at **(1175,166)**（字 = `--tiger-warning` `#d97706`，class fallback `#ca8a04` **未用**；`--tiger-tag-warning-bg` 空 → `#fef9c3`）
     header `innerText` = 标题 + 副文 + 三枚 Tag。三枚 Tag 1280 下 **可见**（shot 全见）。
  3. **MetricGrid 四卡（首屏 chrome，本条不深审 VirtualList）：** `lg:grid-cols-4`，各 **232.3×130** at y **255**（x **264 / 512.3 / 760.5 / 1008.8**），底 `--tiger-surface` `rgb(255,255,255)`、边 `--tiger-border` `rgb(229,231,235)`。标题 **日志行数 / 表格行数 / 拖拽队列 / 看板卡片**；值 **12,000 / 10,000 / 8 / 6**（`toLocaleString('zh-CN')`；看板 `countKanbanCards=6`）。描述「VirtualList 视口外不渲染 / VirtualTable 固定行高 / useDrag 自由排序 / 低层 Kanban，非 TaskBoard」。四枚 leftover **`p2-icon-chip`** **44×44**（`h-11 w-11`）at y **298 / 298 / 288 / 298**，色 `rgb(37,99,235)` / `--p2-chip-color=#2563eb` = `--tiger-primary`。与 Monitor **7.1/7.2** MetricGrid leftover `p2-icon-chip` **低** 同形（bound `--tiger-primary` / `--tiger-text`；`--p2-chip-color: var(--tiger-primary, #3b82f6)` fallback leftover，live **没用** `#3b82f6`）。
  4. **PageActionPanel「页面内造数，不走后端」：** 宿主 Card 形 DIV **977×98** at **(264,409)**，底 `--tiger-surface` `#ffffff`、边 `--tiger-border` `#e5e7eb`，native `title` **null**。左标题 **「页面内造数，不走后端」** 可见 `P` **943×24** at **(281,426)** 色 `rgb(17,24,39)`（**不是** About **5.1** / Analytics **6.2** / Monitor **7.2** 那种 `Card title` tooltip-only 中）。副文 **「四个演示都在本页内存生成。VirtualList / VirtualTable 用子路径导入；拖拽使用包入口的 useDrag（v1.5.0 没有 /Drag 组件）；看板使用低层 Kanban，区别于「任务面板」的 TaskBoard。」** 可见。
  5. **四个 Tab 标签可见：** tab bar **412.1×42** at **(264,531)**。四枚 `role=tab`：
     - **万级日志流** **112×42** at **(264,531)** `aria-selected=true`（默认 `activeTab=list`）
     - **万行多列** **96×42** at **(380,531)**
     - **自由拖拽** **96×42** at **(480,531)**
     - **低层看板** **96×42** at **(580,531)**
     字 `rgb(107,114,128)`。进页默认 list：`[data-testid=performance-virtual-list]` **977×556** at **(264,574)** vis=true；table/drag/kanban **未挂**（`lazy`）。MutedPanel leftover 标题 **VirtualList** + 描述「固定高度视口滚动 12,000 条日志…」**977×86** at **(264,574)**。包裹 list 的 Card class 含 `overflow-hidden p-0`，native `title=null`，`h1–h4` / `.tiger-card-header` **0**，`innerText` 从 **DEBUG / 2026-07-01 00:00:00 / gateway / 同步缓存分片完成 #1** 起——**没有**可见 Card 标题（cite About **5.1** / Analytics **6.2** / Monitor **7.2** tooltip-only 中：本 wrapping Card **连 `title` attr 都没有**，不是那种缺陷，是源码没传 `title`）。shot 底部可见 DEBUG/INFO/WARN 行。
  6. **Tab smoke（各点一次，不审 sticky / 拖拽 / 泳道）：** 点 **万行多列** → `aria-selected=true`，`[data-testid=performance-virtual-table]` 挂载 **977×536** at **(264,574)**；pane 文案起 **VirtualTable** + 列头 编号/服务/区域/状态/延迟(MS)/体积(KB)/时间；body 当时 **「暂无数据」**（本条只确认挂载，**不**审 stickyHeader / 万行渲染）。点 **自由拖拽** → `[data-testid=performance-drag-list]` 挂载 **977×900** at **(264,574)**；文案起 **useDrag** + 「尚未拖拽」+ 恢复顺序 + queue-1…（不审 reorder）。点 **低层看板** → `[data-testid=performance-kanban]` 挂载 **977×588** at **(264,574)**；文案起 **Kanban** + 「尚未移动卡片」+ 列 接入/处理中/验证/完成 + 泳道「前端/后端」。DOM 点名泳道圆点 `SPAN.w-2.5.h-2.5` inline `background-color: rgb(59, 130, 246)` / `rgb(34, 197, 94)` = 源码 `KANBAN_SWIMLANES` leftover **`#3b82f6` / `#22c55e`**（8 枚；**本条不走为 findings**，later slice）。点回 **万级日志流** → `aria-selected=true`，list pane 再显（`innerText` 仍从 VirtualList + DEBUG `#1` 起）。`lazy` 已访问 pane 仍留在 DOM：回 list 后 `list/table/drag/kanban` 四个 testid **都在**。
- **严重度：** PageHeader「大数据演示」+ 副文 + tags 运维/演示数据/万级数据可见 + 四 Tab 标签可见 + 默认 list 挂载 + 各点一次 table/drag/kanban 均挂 `data-testid` 再回 list：通过（信息，`vue-performance` live + `/tmp/vue-performance-header.png`）。页面内造数不上 `/api/performance`：信息（本页设计，不审后端）。`p2-icon-chip` / `p2-text-primary` 已绑 `--tiger-primary` / `--tiger-text`：**低**（与 About **5.1** / Analytics **6.1** / Monitor **7.1/7.2** PageHeader / MetricGrid chrome 同形）。「演示数据」info Tag 字 `rgb(59,130,246)` = `--tiger-info` `#3b82f6`，对 `--tiger-primary` `#2563eb`：**低**（token 默认，cite 7.1「登录可见」；不是本页写死 hex，也不是 Home **4.3** leftover `#3b82f6` 折线）。Tag 底 fallback（`--tiger-tag-*-bg` 空）：**低**（cite 7.1 Tag fallback）。list wrapping Card **无**可见 heading：通过（源码没传 `title`；对比 5.1 / 6.2 / 7.2 的 tooltip-only 中 **不是同缺陷**）。万行多列 smoke 见「暂无数据」：信息（只确认挂载；VirtualTable 渲染 **缺口**，later 不在 8.1/8.2）。Kanban 泳道 hex `#3b82f6/#22c55e`：DOM 点名，**不升档**（later）。VirtualList 滚动 / leftover muted-panel / clip / overflow：**缺口**（8.2）。table sticky / drag reorder / kanban vs TaskBoard / 暗色 / 375 / 项 9：**缺口**（刻意不走）。

### 8.2 VirtualList

- **模块：** Performance 默认 Tab「万级日志流」Tigercat `VirtualList`（`:item-count=logLines.length` / `:item-height=LIST_ITEM_HEIGHT=48` / `:height=LIST_HEIGHT=420` / `:overscan=8` / `data-testid=performance-virtual-list`）+ leftover `MutedPanel` 标题 VirtualList + wrapping Card `overflow-hidden p-0` 无 title；对照 8.1 PageHeader / 四 Tab smoke、Monitor **7.3** leftover `p2-muted-panel`
- **端：** Vue
- **视口：** 桌面 **1280×800** 浅色（cite 8.1，不重开）。隔离上下文：shot 来自先前 **`vue-performance` / `vue-performance-list`** 走查（未复用 `vue-monitor*` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`）；本条 WRITE **未**新开 `vue-performance-list-write` live。8.1 已测 `documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-text-secondary=#6b7280` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6` / `--tiger-warning=#d97706` / `--tiger-error=#dc2626` / `--tiger-success=#16a34a`；`--tiger-bg-hover` **空**；`--tiger-bg-card` **空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `clientHeight=658` / `scrollWidth=1025` / `scrollHeight=1012`，8.1 `scrollTop=0`。`documentElement.scrollWidth===clientWidth` **1280===1280**（8.1 页顶；近端滚后 live overflow **缺口**）。默认 tab **万级日志流**。`[data-testid=performance-virtual-list]` **977×556** at **(264,574)**（8.1 页顶）。KPI 日志行数 **12,000**。
- **复现：**
  1. 8.1 之后仍停 `/performance`，默认 **万级日志流**（未再点 table/drag/kanban）。先前隔离上下文把 VirtualList 滚到近端。截图 `/tmp/vue-performance-list.png`（PNG **1280×800** 浅色；MutedPanel leftover 标题 VirtualList + 描述「固定高度视口滚动 12,000 条日志。仅绘制当前窗口内的级别、时间和消息。」；wrapping Card **无** title bar；list 近端 **#11992–#12000**；Tag ERROR 红 / DEBUG 灰 / INFO 蓝 / WARN 黄 + mono 时间 `2026-07-01 03:19:51` 起 + logger auth/billing/media/jobs/gateway + 中文消息 + `#id`；list 细竖条在 420px 视口底；约 8.5 行 × 48px 可见）。未审 Tour / Cmd-K / Bell / ChatDock / Lock / Theme / Watermark / TagsView。未审 FAB `+` / 客服坞。
  2. **源码 vs shot（不发明未见像素）：** `PerformancePage.vue` `LOG_COUNT=12000` / `LIST_HEIGHT=420` / `LIST_ITEM_HEIGHT=48`；`<VirtualList :item-count="logLines.length" :item-height="LIST_ITEM_HEIGHT" :height="LIST_HEIGHT" :overscan="8">`；item = Tag level（DEBUG `default` / INFO `primary` / WARN `warning` / ERROR `danger`）+ mono time + logger（`hidden sm:inline`，1280 下可见）+ `truncate` 消息。行 `border-b border-(--tiger-border,#e5e7eb)`。先前 live 量：list height **420**，内层 `scrollHeight` **576000**（12000×48）。shot 近端行：
     - **#11992** ERROR auth 节点心跳正常
     - **#11993** DEBUG billing 批量导出任务入队
     - **#11994** INFO media 对象存储预签名成功
     - **#11995** WARN jobs 同步缓存分片完成
     - **#11996** ERROR gateway 写入审计流水
     - **#11997** DEBUG auth 消费队列消息超时重试
     - **#11998** INFO billing 节点心跳正常
     - **#11999** WARN media 批量导出任务入队
     - **#12000** ERROR jobs 对象存储预签名成功（行底被 420px 视口裁掉半行）
     420/48=**8.75** 行，shot 约 8 整行 + 第 9 行 clipB，与固定行高视口吻合。页面内造数，**不**打 `/api/performance`、不审后端。
  3. **万级未撑破壳：** 侧栏 **运维** 展开、**大数据演示** 高亮；面包屑「管理中心 / 运维 / 大数据演示」；TagsView「大数据演示」；header `admin` + bell **2** 仍在。浏览器最右侧是壳竖向滚动条（cite 8.1 `#main-content-scroll` `scrollHeight=1012` vs `clientHeight=658`，**不是** 12000×48）。list 卡内另有一条细竖条，滑块在底（近端）。shot 页顶 PageHeader / KPI / PageActionPanel 已滚出（页已下滚把 list 顶到主区上沿），**不是** list stickyHeader——VirtualList **没有** `stickyHeader`（那是 VirtualTable later）。list chrome 未见意外吸顶。MetricGrid leftover `p2-icon-chip`：cite 8.1 **低**，本 shot KPI 已滚走，不重开。
  4. **wrapping Card 无 title（cite 8.1 通过，不重开）：** 源码 `<Card class="overflow-hidden p-0">` 没传 `title`。shot Card 无标题条，行从 Tag+时间起。与 About **5.1** / Analytics **6.2** / Monitor **7.2** tooltip-only 中 **不是同缺陷**（8.1 已判通过）。
  5. **leftover MutedPanel：** shot 可见 leftover 标题 **VirtualList** + 描述「固定高度视口滚动 12,000 条日志。仅绘制当前窗口内的级别、时间和消息。」浅灰圆角岛（8.1 页顶量 **977×86** at **(264,574)**）。class `p2-muted-panel`（`MutedPanel.vue`）；`style.css` `background: var(--tiger-bg-hover, #f8fafc)` / `border: 1px solid var(--tiger-border, #e2e8f0)` / `color: var(--tiger-text-secondary, #64748b)`。8.1 `--tiger-bg-hover` **空** → 按 Monitor **7.3** 同形应吃 leftover slate fallback `#f8fafc`。本条 **未** live 算 computed bg/border/text（live leftover 计算 **缺口**）。
  6. **item clip / overflow / truncate：** wrapping Card `overflow-hidden`。shot `#12000` 行底 clipB（半行，预期 8.75）。整行 `#11992–#11999` 消息「节点心跳正常 / 批量导出任务入队 / …」+ `#id` 全见，本近端文案不够长，**未见** `truncate` 省略号。logger 1280 下可见（`sm:inline`）。shot **未见**横向滚动条（页右侧是壳竖条，list 卡内是竖条）。近端后 `documentElement.scrollWidth` vs `clientWidth`、`#main-content-scroll` `scrollWidth` vs `clientWidth`、item `clipR`/`clipB` 数值：本条 **未** live 量（live overflow/clip **缺口**）。卡顿：shot 无可见撕裂/残影；掉帧属主观，本条不标。
- **严重度：** 默认万级日志流 VirtualList 近端 `#11992–#12000` 上屏、ERROR/DEBUG/INFO/WARN Tag + mono 时间 + logger + 中文消息、内层 **576000** 未把壳撑成 12000 行（壳竖溢是 8.1 `scrollHeight=1012` vs 658）、list 视口 420 / 行高 48 / 约 8.75 行：通过（信息，先前 `vue-performance` / `vue-performance-list` shot `/tmp/vue-performance-list.png` + 8.1 量 + 先前 list height 420 / inner scrollHeight 576000）。wrapping Card 无可见 heading：通过（cite 8.1，不是 5.1/6.2/7.2 中）。`p2-icon-chip`：**低**（cite 8.1，不重开）。leftover `MutedPanel` / `p2-muted-panel` 浅岛（`--tiger-bg-hover` 空 → `#f8fafc`）：**低**（cite Monitor **7.3**；本条 shot 可见，live computed **缺口**）。`#12000` 视口底 clipB：信息（固定高度 8.75 行预期，非万级泄漏）。近端后横溢 `scrollWidth===clientWidth` / item clipR·clipB 数值：**缺口**（本条 WRITE-FROM-SHOTS，未开 `vue-performance-list-write` live）。table sticky / drag / kanban / 暗色 / 375 / 项 9：**缺口**（刻意不走）。

### 8.3 VirtualTable

- **模块：** Performance Tab「万行多列」Tigercat `VirtualTable`（页面绑 `:data=tableRows` / `:height=TABLE_HEIGHT=480` / `:row-height=TABLE_ROW_HEIGHT` / `sticky-header`；包 `@expcat/tigercat-vue` **2.1.1** 实接口 `dataSource` / `virtualHeight` 默认 400 / `virtualItemHeight` 默认 48 / `stickyHeader` 默认 true）+ leftover `MutedPanel` 标题 VirtualTable + wrapping Card 无 title；对照 8.1 四 Tab smoke「暂无数据」、8.2 leftover `p2-muted-panel`
- **端：** Vue
- **视口：** 桌面 **1280×800** 浅色（cite 8.1，不重开）。隔离上下文：**`vue-performance-rest`** shot（未复用 `vue-performance` / `vue-performance-list` / `vue-performance-list-write` / `vue-monitor*` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`）。本条 WRITE-FROM-SHOTS **未**新开 live 等行。8.1 已测 `documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-text-secondary=#6b7280` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff`；`--tiger-bg-hover` **空**；`--tiger-bg-card` **空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `clientHeight=658` / `scrollWidth=1025` / `scrollHeight=1012`。`documentElement.scrollWidth===clientWidth` **1280===1280**。KPI 表格行数 **10,000**（page-local `tableRows` / `TABLE_COUNT=10000` 存在，未进表）。
- **复现：**
  1. 先前隔离上下文 **`vue-performance-rest`** 在 `/performance` 点 **万行多列**，等过 first paint 后表体仍空。截图 `/tmp/vue-performance-table.png`（PNG **1280×800** 浅色；MutedPanel leftover 标题 **VirtualTable** + 描述「10,000 行多列表格，开启 stickyHeader，并设置 rowHeight / height。窄屏下表格区域可横向滚动。」；wrapping Card **无** title bar；列头 **编号 / 服务 / 区域 / 状态 / 延迟(MS) / 体积(KB) / 时间**；body 正中 **「暂无数据」**；**无** EVT-* 行）。侧栏 **运维** 展开、**大数据演示** 高亮；面包屑「管理中心 / 运维 / 大数据演示」；TagsView「大数据演示」；header `admin` + bell **2** 仍在。未审 FAB `+` / 客服坞。未审 Tour / Cmd-K / Bell / ChatDock / Lock / Theme / Watermark / TagsView。
  2. **空表是稳态，不是 lazy race：** 先前 live 等过 first paint 后仍「暂无数据」。`aria-rowcount=0`。live VirtualTable height **400** vs 页面 `TABLE_HEIGHT` **480**。包 `@expcat/tigercat-vue` **2.1.1** VirtualTable props：`dataSource` / `virtualHeight`（默认 400）/ `virtualItemHeight`（默认 48）/ `stickyHeader`（默认 true）。`PerformancePage.vue` 绑 `:data="tableRows"` `:height="TABLE_HEIGHT"` `:row-height="TABLE_ROW_HEIGHT"` `sticky-header`——这些 fall-through，`data` 到不了 `dataSource`，所以 Empty「暂无数据」是真实状态。KPI **表格行数 10,000** 说明 page-local `tableRows` 已造好但未进表。cite 8.1 table smoke「暂无数据」现已确认 **持续**。
  3. **wrapping Card 无 title（cite 8.1 通过）：** shot Card 无标题条，列头直接在卡内。与 list wrapping Card 同形（源码没传 `title`；不是 5.1/6.2/7.2 tooltip-only 中）。
  4. **leftover MutedPanel：** shot 可见 leftover 标题 **VirtualTable** + 描述。cite 8.2 / Monitor **7.3**：`p2-muted-panel` `--tiger-bg-hover` 空 → `#f8fafc`。本条 **未**新量 computed。
  5. **sticky / mid / end / overflow：** 表体无行，无法滚 stickyHeader / 中段 / 近端，也无法验窄屏横滚。缺口。
- **严重度：** prop 错绑 `:data` / `:height` / `:row-height` vs 包接口 `dataSource` / `virtualHeight` / `virtualItemHeight`：万行 **从不渲染**（`aria-rowcount=0`，height 吃默认 **400** 不是 `TABLE_HEIGHT` 480，KPI 10,000 闲置）：**中**（`vue-performance-rest` shot `/tmp/vue-performance-table.png` + 先前 live）。leftover `MutedPanel` / `p2-muted-panel`：**低**（cite 8.2 / 7.3）。wrapping Card 无可见 heading：通过（cite 8.1）。stickyHeader / 中段 / 近端滚动 / 滚后 overflow：**缺口**（空 body 无行可滚）。useDrag / kanban / 暗色 / 375 / 项 9：**缺口**（刻意不走）。

### 8.4 useDrag

- **模块：** Performance Tab「自由拖拽」包入口 `useDrag`（`containerId=performance-queue` / `direction=vertical` / `dragClass=opacity-50` / `data-testid=performance-drag-list`）+ leftover `MutedPanel` 标题 useDrag + 8 张 seed DIV（非 Card）+ status `lastReorder` + Button 恢复顺序；对照 8.1 drag smoke、8.2/8.3 leftover `p2-muted-panel`、8.1 wrapping Card 无 title 通过
- **端：** Vue
- **视口：** 桌面 **1280×800** 浅色（cite 8.1，不重开）。隔离上下文：shot 来自先前 **`vue-performance-rest`** 走查（未复用 `vue-performance` / `vue-performance-list` / `vue-performance-list-write` / `vue-monitor*` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`）。本条 WRITE-FROM-SHOTS **未**新开 **`vue-performance-drag-write`** live reorder。8.1 已测 `documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-text-secondary=#6b7280` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6`；`--tiger-bg-hover` **空**；`--tiger-bg-card` **空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `clientHeight=658` / `scrollWidth=1025` / `scrollHeight=1012`。`documentElement.scrollWidth===clientWidth` **1280===1280**。8.1 drag smoke：`[data-testid=performance-drag-list]` **977×900** at **(264,574)**。本 shot 页顶未滚（PageHeader / 四 KPI / PageActionPanel 仍同屏）。
- **复现：**
  1. 先前隔离上下文 **`vue-performance-rest`** 在 `/performance` 点 **自由拖拽**。截图 `/tmp/vue-performance-drag.png`（PNG **1280×800** 浅色；Tab **自由拖拽** 下划线选中；leftover MutedPanel 标题 **useDrag** + 描述「这是包入口的 useDrag 可排序队列，不是 TaskBoard。拖动卡片调整顺序后，下方展示最新排列结果。」；status **尚未拖拽**；outline Button **恢复顺序**；首卡 **日志检索超时排查 / 王小虎 · 第 1 位** + info Tag **queue-1**）。KPI **拖拽队列 8**（useDrag 自由排序）+ **日志行数 12,000 / 表格行数 10,000 / 看板卡片 6** 仍在页顶。PageHeader **大数据演示** + tags 运维/演示数据/万级数据。侧栏 **运维** 展开、**大数据演示** 高亮；面包屑「管理中心 / 运维 / 大数据演示」；TagsView「大数据演示」；header `admin` + bell **2** 仍在。shot **未见** queue-2…queue-8 与 **当前顺序** Card（below fold）。未审 FAB `+` / 客服坞。未审 Tour / Cmd-K / Bell / ChatDock / Lock / Theme / Watermark / TagsView。
  2. **源码 vs shot（不发明未见像素）：** `TabPane tab-key=drag` label **自由拖拽**。`lastReorder` 初值 **尚未拖拽**（`isDragging` →「正在拖拽…」）。Button **恢复顺序** → `resetDragItems`（seed + `lastReorder=已恢复初始顺序`）。`useDrag` `containerId=performance-queue` `direction=vertical` `dragClass=opacity-50`。8 seed（源码 `createSeedDragItems`）：queue-1 日志检索超时排查/王小虎、queue-2 万行表格首屏优化/李青、queue-3 拖拽排序回归/陈晨、queue-4 看板泳道演示/赵敏、queue-5 虚拟列表滚动抖动/周宁、queue-6 固定表头对齐/吴兰、queue-7 暗色 token 复核/郑浩、queue-8 窄屏卡片换行/孙悦；shot 只见 **queue-1** 首卡。item 是 DIV（不是 Card）`cursor-grab` `border-(--tiger-border,#e5e7eb)` `bg-(--tiger-bg-card,#fff)` + Text title + Text owner · 第 N 位 + Tag `variant=info` `item.id`。filled 8 / **尚未拖拽**（不是 empty）。页面内造数，**不**打 `/api/performance`、不审后端。
  3. **wrapping Card 无 title（cite 8.1 通过）：** 8.1 list wrapping Card 没传 `title` 已判通过；本 pane 队列项是 DIV 不是 Card。源码 **当前顺序** Card 用可见 `Text weight=bold` 子节点（**无** `title` attr），不是 5.1/6.2/7.2 tooltip-only 中——shot **未见**该 Card（below fold），live confirm **缺口**。
  4. **leftover MutedPanel：** shot 可见 leftover 标题 **useDrag** + 描述。cite 8.2 / 8.3 / Monitor **7.3**：`p2-muted-panel` `--tiger-bg-hover` 空 → `#f8fafc`。本条 **未** live 算 computed。
  5. **live reorder：** 本条 WRITE-FROM-SHOTS，**未**开 `vue-performance-drag-write` 拖第一张。未记录 drop 后 `lastReorder`「title：第 from → 第 to」/ **当前顺序** `dragOrderText` / 重排后 filled queue。live reorder **缺口**。
- **严重度：** Tab 自由拖拽挂载、filled 8、status **尚未拖拽**、Button **恢复顺序**、首卡 **日志检索超时排查 / 王小虎 · 第 1 位** + info Tag **queue-1**、leftover 标题 **useDrag**：通过（信息，先前 `vue-performance-rest` shot `/tmp/vue-performance-drag.png` + 8.1 drag smoke `[data-testid=performance-drag-list]` **977×900** at **(264,574)**）。wrapping Card 无可见 heading：通过（cite 8.1，不是 5.1/6.2/7.2 中）。`p2-icon-chip`：**低**（cite 8.1，不重开）。leftover `MutedPanel` / `p2-muted-panel`：**低**（cite 8.2 / 8.3 / 7.3）。8.3 VirtualTable prop mismatch：**中**（cite，不重开）。live reorder / 当前顺序 Card 可见 Text vs tooltip-only / item DIV border vs `--tiger-border` / bg vs `--tiger-bg-card` empty → `#fff` / overflow vs `#main-content-scroll`：**缺口**（未开 `vue-performance-drag-write`）。kanban / 暗色 / 375 / 项 9：**缺口**（刻意不走）。

### 8.5 Kanban

- **模块：** Performance Tab「低层看板」包组件 `Kanban`（`data-testid=performance-kanban` / `:draggable=true` / `:column-draggable=false` / `:show-card-count=true` / `:allow-add-card=false` / `:allow-add-column=false` / `:swimlanes=KANBAN_SWIMLANES` `swimlane-field=lane`）+ leftover `MutedPanel` 标题 Kanban + status `lastKanbanMove` + 4 列 6 卡 2 泳道 page-local seed；对照 8.1 kanban smoke、8.1 list Card 无 title 通过、8.2/8.3/8.4/7.3 leftover `p2-muted-panel`、Home 4.3 / Monitor 7.2 leftover hex 家族
- **端：** Vue
- **视口：** 桌面 **1280×800** 浅色。隔离上下文 **`vue-performance-kanban`**（未复用 `vue-performance` / `vue-performance-list` / `vue-performance-list-write` / `vue-performance-rest` / `vue-performance-rest-write` / `vue-performance-drag-write` / `vue-monitor*` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`）。live `documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-text-secondary=#6b7280` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6` / `--tiger-warning=#d97706` / `--tiger-error=#dc2626` / `--tiger-success=#16a34a`；`--tiger-bg-hover` **空**；`--tiger-bg-card` **空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `clientHeight=658` / `scrollWidth=1025` / `scrollHeight=1044`（8.1 top 为 `scrollHeight=1012`；本 tab 列更高后变 1044）。`documentElement.scrollWidth===clientWidth` **1280===1280**。cite 8.1 kanban smoke：`[data-testid=performance-kanban]` **977×588** at **(264,574)**；本条 scrollTop=0 时复测同框 **977×588** at **(264,574)**，shot 前把 MAIN `scrollTop=386` 使 leftover + 列 + 卡入镜（kanbanY **188**）。
- **复现：**
  1. 隔离上下文 **`vue-performance-kanban`** 登录 admin/admin123（无 2FA）→ `/performance`，关 OnboardingTour「关闭引导」，点 Tab **低层看板**（label 低层看板，不是「看板」；`tab-key=kanban`）。等 Tabs lazy 出列+卡。截图 `/tmp/vue-performance-kanban.png`（PNG **1280×800** 浅色；Tab **低层看板** 下划线选中；leftover MutedPanel 标题 **Kanban** + 描述「低层看板组件，带列、卡片和前后端泳道。可拖拽卡片跨列，场景与「任务面板」TaskBoard 不同：这里没有后端任务工作流。」；status **尚未移动卡片**；列 **接入 2** / **处理中 2/3** / **验证 1** + 右侧 **完成** 只露出左边框；泳道 **前端** 蓝点 + **后端** 绿点；卡 **表格首屏抖动** / **日志检索超时** / **VirtualList 行高对齐** / **索引重建** / **低层看板拖拽** 入镜，**页面内造数** 在完成列、viewport 外）。KPI **看板卡片 6**（低层 Kanban，非 TaskBoard）+ 日志行数 12,000 / 表格行数 10,000 / 拖拽队列 8。PageHeader **大数据演示** + tags 运维/演示数据/万级数据。侧栏 **运维** 展开、**大数据演示** 高亮。未审 FAB `+` / 客服坞 / Tour / Cmd-K / Bell / ChatDock / Lock / Theme / Watermark / TagsView。页面内造数，**不**打 `/api/performance`、不审后端。
  2. **列/卡/泳道（cite 8.1 smoke，本条测盒）：** seed 4 列 6 卡。接入（待分流的性能工单）k-1 **日志检索超时**/backend + k-2 **表格首屏抖动**/frontend；处理中 wipLimit=3（正在验证虚拟化方案）k-3 **VirtualList 行高对齐**/frontend + k-4 **索引重建**/backend；验证（对照 TaskBoard 场景做差异验收）k-5 **低层看板拖拽**/frontend；完成（已确认的演示项）k-6 **页面内造数**/backend。列盒 `.tiger-task-board-column` `w-76` **304×387**：接入 (288,736) clipR **592**；处理中 (612,736) clipR **916**；验证 (936,736) clipR **1240**；完成 (1260,736) clipR **1564** clipB **1123**。卡 `.tiger-task-board-card` 无 `title` attr：k-2 (301,834) 278×74；k-1 (301,957)；k-3 (625,834)；k-4 (625,957)；k-5 (949,834) 278×90 clipR **1227**；k-6 (1273,883) 278×74 clipR **1551**（clippedRight vs overflow clipR **1241**）。8 个 `SPAN.w-2.5.h-2.5` inline `background-color`（cite 8.1 点名）：前端 `rgb(59, 130, 246)` = leftover `#3b82f6`；后端 `rgb(34, 197, 94)` = leftover `#22c55e`。点 x=317 / 641 / 965 / **1289**（完成列点已过 viewport 1280）。泳道文字 **前端/后端** computed `rgb(17, 24, 39)` = `--tiger-text=#111827`。
  3. **泳道 vs `--tiger-*`：** 源码 `KANBAN_SWIMLANES` frontend `#3b82f6` / backend `#22c55e`（硬编码 hex，不是 token）。live 圆点 rgb 与源码一致。`--tiger-info` 默认 **就是** `#3b82f6`（= leftover 前端，**不是** `--tiger-primary=#2563eb`）。`--tiger-success=#16a34a`（chart-2）**不是** `#22c55e`；后端绿点 leftover 与 success token 差一档。cite Home **4.3** leftover `#3b82f6` / Monitor **7.2** Gauge leftover `#22c55e` + P95 leftover `#3b82f6` 同一家族（不重开那些页）。
  4. **Card title tooltip：** `[data-testid=performance-kanban]` 内 **0** 个 `[title]`。列/卡/wrapper **无** native `title` attr；列头可见「接入/处理中/验证/完成」，卡可见标题+描述（非 h1–h6）。本 pane **没有** wrapping `Card`（`wrappingCard=false`）。cite 8.1 list wrapping Card 无 title **通过**；**不是** About **5.1** / Analytics **6.2** / Monitor **7.2** Card title tooltip-only **中**。
  5. **overflow / column clip：** 页包 `div.overflow-x-auto` **977×450** at (264,712) `scrollWidth=977===clientWidth=977`（包层不滚）。内层 `.tiger-task-board` `overflow-x-auto` `clientWidth=977` / `scrollWidth=1324` / `scrollLeft=0`（304×4 + `gap-5`×3 + `p-6`×2 = 1324）。`#main-content-scroll` `scrollWidth=1025===clientWidth=1025`（无横向页滚）；`documentElement` **1280===1280**。4 列 **塞不进** 977 卡槽 / 1025 main：完成列 clipR **1564** vs 包层 clipR **1241** vs viewport **1280**，shot 只见完成列左边框；k-6 几乎全在屏外。纵向 MAIN `scrollHeight=1044` / `clientHeight=658`（shot 已滚 `scrollTop=386`）。
  6. **leftover vs Tigercat Kanban：** leftover `MutedPanel` `p2-muted-panel` 标题 **Kanban** 可见；computed bg **`rgb(248, 250, 252)` = `#f8fafc`**，因 `--tiger-bg-hover` 空（cite 8.2 / 8.3 / 8.4 / Monitor **7.3** **低**）。包 `Kanban` 列/卡走 `--tiger-border` / `--tiger-surface` / `--tiger-surface-muted` 带 fallback；泳道色却吃 leftover hex，不走 `--tiger-info` / `--tiger-success` token。`p2-icon-chip` **低**（cite 8.1，不重开）。
  7. **live card-move：** 未拖卡。`lastKanbanMove` 仍为 **尚未移动卡片**（源码 `handleKanbanCardMove` 会写成「卡片 cardId：fromColumnId → toColumnId」）。不发明未做的跨列成功。live card-move **缺口**。
  8. **TaskBoard 双页差：** 本条写完即停，**未**开 `/tasks`。`/tmp/vue-tasks-board-ref.png` **未拍**。TaskBoard compare **缺口**。未开项 15（不审 WIP/add-card/Modal/empty-column/column-drag）。
- **严重度：** Tab 低层看板挂载、KPI **看板卡片 6**、4 列 **接入/处理中/验证/完成**、6 卡 k-1…k-6 文案、2 泳道 **前端/后端**、leftover 标题 **Kanban**、status **尚未移动卡片**：通过（信息，隔离上下文 `vue-performance-kanban` shot `/tmp/vue-performance-kanban.png` + 8.1 kanban smoke `[data-testid=performance-kanban]` **977×588** at **(264,574)**）。wrapping / 列 / 卡无 native `title` tooltip-only：通过（cite 8.1 Card-no-title 通过；不是 5.1/6.2/7.2 **中**）。页级横向 overflow 无（`1280===1280` / main `1025===1025`）：通过。4 列需内层 `.tiger-task-board` 横向滚（`scrollWidth=1324` / `clientWidth=977`），完成列 clipR **1564** 出 977 卡槽：**低**（包层 `overflow-x-auto` 空转 977===977；内层才是真正 scroller；shot 完成列只剩左边框）。泳道 leftover hex 前端 `#3b82f6` = `--tiger-info` 默认、≠ `--tiger-primary=#2563eb`；后端 `#22c55e` ≠ `--tiger-success=#16a34a`：**低**（cite 8.1 8 点不升档；cite Home 4.3 / Monitor 7.2 同一 leftover 家族）。leftover `MutedPanel` / `p2-muted-panel` `--tiger-bg-hover` 空 → `#f8fafc`：**低**（cite 8.2/8.3/8.4/7.3）。`p2-icon-chip`：**低**（cite 8.1）。8.3 VirtualTable prop mismatch：**中**（cite，不重开）。live card-move / TaskBoard compare `/tmp/vue-tasks-board-ref.png` / 暗色 / 375 / 项 9 / 项 15：**缺口**（刻意不走）。

### 8.6 Dark tokens

- **模块：** Performance `/performance` 暗色 token（ThemeConfigDrawer `data-testid=shell-theme-config-trigger` 切「深色」、关抽屉后仍停本页，默认 Tab 万级日志流）；对照 8.2/8.4 leftover `MutedPanel` `#f8fafc`、8.3 VirtualTable prop mismatch **中**（cite，不重开）、8.5 泳道 leftover hex `#3b82f6/#22c55e`、8.1 Tag fallback / Card-no-title 通过；对照 Analytics **6.5** / Monitor **7.5**（shell/PageHeader/KPI 跟 `--tiger-*`）与 About **5.4**（MEDIUM leftover slate/pastel 暗色仍浅）
- **端：** Vue
- **视口：** 桌面 **1280×800**，深色。隔离上下文 **`vue-performance-dark`**（未复用 `vue-performance` / `vue-performance-list` / `vue-performance-list-write` / `vue-performance-rest` / `vue-performance-rest-write` / `vue-performance-drag-write` / `vue-performance-kanban` / `vue-monitor*` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `vue-tags-chat` / `react-*`）。ThemeConfigDrawer 切「深色」后 `html.classList.contains('dark')=true`（`html.className="dark"`）。抽屉已关（shot 无遮罩）。`documentElement` 暗色 token（live）：`--tiger-primary=#2563eb` / `--tiger-bg-card=#161b22` / `--tiger-text=#f0f6fc` / `--tiger-text-secondary=#8b949f` / `--tiger-surface=#111827` / `--tiger-border=#304050` / `--tiger-bg-page=#0d1117` / `--tiger-bg-hover=#1b212c`（**浅色 8.1/8.5 为空，暗色有值**） / `--tiger-info=#60a5fa` / `--tiger-success=#4ade80` / `--tiger-surface-muted=#1f2937`；`--tiger-tag-bg` / `--tiger-tag-info-bg` / `--tiger-tag-success-bg` / `--tiger-tag-warning-bg` / `--tiger-tag-error-bg` **都空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，底 `rgb(31,41,55)` = `#1f2937` = `--tiger-surface-muted`，`clientWidth=1025` / `scrollWidth=1025` / `scrollHeight=1012` / `scrollTop=0`。`documentElement.scrollWidth===clientWidth` **1280===1280**。
- **复现：**
  1. 先前 NEW grok-4.6 隔离上下文 **`vue-performance-dark`** 登录 `admin` / `admin123`（无 2FA），OnboardingTour 点「关闭引导」（未审 Tour / Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme 本身 / Watermark / TagsView）。侧栏 **运维 → 大数据演示** → `/performance`，默认 Tab **万级日志流**。点 header `data-testid=shell-theme-config-trigger`（BUTTON 主题配置 **40×40** at **(1016,28)**），抽屉内切「深色」，关抽屉，仍停 `/performance`。live 量时抽屉曾仍开（`drawerOpen=true`）；截图前已关。截图 `/tmp/vue-performance-dark.png`（PNG **1280×800** 暗色；PageHeader「大数据演示」+ KPI 四卡 12,000 / 10,000 / 8 / 6 + PageActionPanel「页面内造数，不走后端」+ 四 Tab + leftover MutedPanel 标题 VirtualList + 两行 DEBUG/INFO 日志；抽屉不在画面上）。无「演示模式」Tag。页面内造数，**不**打 `/api/performance`、不审后端。
  2. **shell / PageHeader 跟 `--tiger-*`：** `ASIDE.tiger-sidebar` 底 `rgb(17,24,39)` = `--tiger-surface` `#111827`，边 `rgb(48,64,80)` = `--tiger-border` `#304050`。`HEADER.tiger-header` 底 `color(srgb 0.0862745 0.105882 0.133333 / 0.75)`（约 `#161b22` = `--tiger-bg-card` @ 75%），边 `--tiger-border`，字 `rgb(255,255,255)`。`header.tiger-page-header` **977×65** at **(264,166)**，底透明、`border-b` `rgb(48,64,80)` = `--tiger-border`。与 Analytics **6.5** / Monitor **7.5** shell/PageHeader 跟 `--tiger-*` **同档**，**好于** About **5.4** leftover slate 砖暗色仍浅。shot 可见 KPI 四卡与 PageActionPanel 均为暗底（live KPI/PageActionPanel 选择器未命中，不发明卡面 rgb）。
  3. **8.2 leftover `MutedPanel` ON DARK（本题）：** `.p2-muted-panel` **977×86** at **(264,574)**，底 **`rgb(27,33,44)` = `#1b212c` = `--tiger-bg-hover`**（暗色 token **有值**），边 `rgb(48,64,80)` = `--tiger-border`，字 `rgb(139,148,159)` = `--tiger-text-secondary`。**不是** 8.2/8.4/8.5 浅色测到的 `#f8fafc` 浅岛，**不是** About **5.4** leftover slate 砖暗色仍浅。与 Monitor **7.5**「muted-panel 暗色走 `#1b212c`、NOT island」**同形通过**。假设「Performance 经 MutedPanel `#f8fafc` 相对 Monitor 7.5 / Analytics 6.5 回退」**在暗色不成立**（浅色空 token 的问题仍在 8.2/8.4/8.5，暗色 hover 已填）。
  4. **PageHeader / TagsView Tag fallback 暗色仍浅（cite 8.1 低 / Analytics 6.5 低 / React Monitor 7b.5 中）：** `--tiger-tag-*-bg` 暗色仍空。live：TagsView 选中「大数据演示」底 `rgb(219,234,254)` = `#dbeafe` / 字 `rgb(37,99,235)`；PageHeader **运维** 底 `#dbeafe` / 字 `#2563eb`；**演示数据** 底 `rgb(224,242,254)` = `#e0f2fe` / 字 `rgb(96,165,250)` = `--tiger-info` `#60a5fa`；**万级数据** 底 `rgb(254,249,195)` = `#fef9c3` / 字 `rgb(251,191,36)`。字跟暗色 info/warning token，**底仍是浅色 fallback**（About **5.4** `bg-*-100` / React **7b.5** Tag 浅底同形）。不是 Card 砖，是 PageHeader + TagsView 上的浅岛。暗色对比翻了，本条记 **中**（cite 7b.5；Vue Analytics **6.5** 同形记低，本页对照 7b.5 升一档）。
  5. **8.3 / 8.5 ON DARK：** 本条只走默认 list Tab。VirtualTable 空表（prop mismatch **中**）**未**再点，cite 8.3，**不重开、不重 debug**。8.5 泳道 leftover `#3b82f6/#22c55e` 暗色是否仍 leftover vs 暗色 `--tiger-info=#60a5fa` / `--tiger-success=#4ade80`：**缺口**（未拍 `/tmp/vue-performance-dark-kanban.png`）。list wrapping Card 无 title：通过（cite 8.1，不是 5.1/6.2/7.2 **中**）。`p2-icon-chip`：**低**（cite 8.1，不重开）。
- **严重度：** `html.dark` + 关抽屉后停 `/performance`；shell / PageHeader / `#main-content-scroll` 跟 `--tiger-surface` / `--tiger-text` / `--tiger-border` / `--tiger-bg-hover`：通过（信息，`vue-performance-dark` live + `/tmp/vue-performance-dark.png`）。卡面 **同档 Analytics 6.5 / Monitor 7.5**、**好于 About 5.4** leftover 浅砖。`p2-muted-panel` 暗色走 `--tiger-bg-hover=#1b212c`、**不是** `#f8fafc` 浅岛：通过（相对 8.2/8.4/8.5 浅色空 token / About 5.4 浅砖 **未回退**；与 Monitor **7.5** **同形**）。PageHeader/TagsView Tag 底 fallback `#dbeafe` / `#e0f2fe` / `#fef9c3` 暗色仍浅：**中**（cite 8.1 Tag fallback 低；暗色对比翻，同 React **7b.5**）。8.3 VirtualTable prop mismatch：**中**（cite，不重开）。8.5 泳道 leftover hex 暗色：**缺口**（未拍 kanban 暗色）。375 / 项 9 / 项 15：**缺口**。

### 8.7 Mobile ~375px

- **模块：** Performance `/performance` 窄屏 ~375（四 Tab 换行 / list·table 高度 / kanban 横溢是否比 8.5 桌面更差）
- **端：** Vue
- **视口：** ~375×812 浅色。**未 live。**
- **复现：**
  1. 第一场 NEW grok-4.6（`vue-performance-dark`，max-turns 25）拍完 `/tmp/vue-performance-dark.png` 后 max-turns，未做 375。
  2. 第二场 NEW grok-4.6（计划 isolatedContext `vue-performance-375`，max-turns 15）在 heading check 后约 25s `exit_code unknown` 崩溃，未开 Chrome、未 resize、无 `/tmp/vue-performance-mobile-375.png`。
  3. 按计划 **不**开第三场。四 Tab 换行、`LIST_HEIGHT=420` / `TABLE_HEIGHT=480` 是否吃掉 375 视口、kanban 相对 8.5 桌面 `scrollWidth=1324` / `clientWidth=977` 是否更差、`documentElement.scrollWidth===clientWidth` / `#main-content-scroll` 横溢：**均未测**。
- **严重度：** ~375 走查 **缺口**（两场失败，不开第三场）。cite 8.5 桌面完成列 clip **低** / 8.3 prop mismatch **中**，375 是否更差未知。项 9 / React Performance：**缺口**（刻意不走）。

### 8.6 Dark tokens — table / drag / kanban fill

本期 **不重写** 8.6 / 8.7。隔离上下文 **`vue-performance-dark`** 仍挂着（`html.dark`，theme `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`，URL `/performance`）。补 8.6 复现 5 标的 table/drag/kanban 暗色 **缺口**。未开新 375（8.7 已记两场失败不开第三场）。未改产品代码。未停 Api。未审 Tour / Cmd-K / Bell / ChatDock / Lock / Theme 本身 / Watermark / TagsView。

- **模块：** Performance 暗色四 Tab 补拍（万行多列 / 自由拖拽 / 低层看板）
- **端：** Vue
- **视口：** 桌面 **1280×800**，深色；隔离上下文 **`vue-performance-dark`**
- **复现：**
  1. 点 Tab **万行多列**。截图 `/tmp/vue-performance-dark-table.png`。body 仍 **「暂无数据」**，`aria-rowcount=0`，VirtualTable 盒 **943×400** at y **693**（默认 `virtualHeight` 400，不是 `TABLE_HEIGHT` 480）。列头 编号/服务/区域/状态/延迟(MS)/体积(KB)/时间 字 `rgb(139,148,159)` = `--tiger-text-secondary`。表面底 `rgb(22,27,34)` = `--tiger-bg-card` `#161b22`，边 `--tiger-border` `#304050`。Empty 字 `rgb(139,148,159)`。MutedPanel 标题 **VirtualTable** 底 `rgb(27,33,44)` = `--tiger-bg-hover` `#1b212c`（同 8.6 list，**不是** `#f8fafc`）。KPI 表格行数仍 **10,000**。cite 8.3 prop mismatch **中**，暗色未修好。
  2. 点 Tab **自由拖拽**。截图 `/tmp/vue-performance-dark-drag.png`。status **尚未拖拽**；Button **恢复顺序**；首卡 **日志检索超时排查 / 王小虎 · 第 1 位** + Tag **queue-1** 入镜。grab 项底 **`rgb(22,27,34)` = `--tiger-bg-card` `#161b22`**、边 `--tiger-border` `#304050`、字白（浅色 8.4 `--tiger-bg-card` 空 → `#fff`，暗色 token 有值）。MutedPanel **useDrag** 底 `#1b212c`。**当前顺序** Card 底 `--tiger-surface` `#111827` at y **1388** vis=false（below fold）。queue-2…8 折下。未 live reorder。
  3. 点 Tab **低层看板**，MAIN `scrollTop=380`。截图 `/tmp/vue-performance-dark-kanban.png`。MutedPanel **Kanban** 底 `#1b212c`。列 **接入/处理中/验证/完成** 底 `rgb(31,41,55)` = `--tiger-surface-muted` `#1f2937`；卡底 `--tiger-surface` `#111827`、字 `rgb(255,255,255)`。8 枚泳道圆点仍 leftover **`rgb(59,130,246)` = `#3b82f6`** / **`rgb(34,197,94)` = `#22c55e`**（暗色 `--tiger-info=#60a5fa` / `--tiger-success=#4ade80` **未吃**）。内层 `.tiger-task-board` `scrollWidth=1324` / `clientWidth=977`（cite 8.5 同数）；`documentElement` / `#main-content-scroll` 仍无页级横溢。完成列 clipR **1564** vis 边缘。未拖卡，status **尚未移动卡片**。
  4. **list 行 Tag 暗色浅岛（8.6 默认 Tab 补量）：** DEBUG Tag 底 `rgb(31,41,55)` / 字 `--tiger-text` `#f0f6fc`（跟 muted）；INFO 底 `rgb(219,234,254)` = `#dbeafe` / 字 `--tiger-primary`；WARN 底 `#fef9c3` / 字 `--tiger-warning` `#fbbf24`；ERROR 底 `rgb(254,226,226)` = `#fee2e2` / 字 `--tiger-error` `#f87171`。行边 `--tiger-border` `#304050`。INFO/WARN/ERROR Tag 底 fallback 暗色仍浅，与 8.6 复现 4 PageHeader Tag **同形中**（不另开）。
- **严重度：** 暗色 table/drag/kanban 均挂载、MutedPanel 三 Tab 都走 `--tiger-bg-hover=#1b212c`、drag 项 / kanban 列卡跟 `--tiger-bg-card` / `--tiger-surface` / `--tiger-surface-muted`：通过（信息，`vue-performance-dark` + `/tmp/vue-performance-dark-table.png` / `/tmp/vue-performance-dark-drag.png` / `/tmp/vue-performance-dark-kanban.png`）。8.3 VirtualTable 空表 + height 400：**中**（cite，暗色同形不升档）。泳道 leftover hex `#3b82f6/#22c55e` 暗色仍 leftover，对暗色 `--tiger-info/#60a5fa` / `--tiger-success/#4ade80`：**低**（cite 8.5，补 8.6 缺口，不升档）。list INFO/WARN/ERROR Tag 底浅 fallback：**中**（cite 8.6 复现 4，同形不另开）。live reorder / card-move / 375：**缺口**（8.7 已记；本条不重开 375）。

---

## 8b. Performance (React)

本期只走 React `http://127.0.0.1:5174/performance`（`PerformancePage.tsx`）。未重启三端（Api 5137 / Vue 5173 / React 5174 仍为项 1 进程）。不是 MockApi / `dev:demo` / Aspire。未改产品代码。未停 Api。chrome-devtools：先开 `chrome://inspect/#remote-debugging`（Allow 已勾选，截图 `/tmp/react-performance-inspect-remote-debugging.png`），再在隔离上下文 **`react-performance`** 打开 `/login`，未复用 `vue-performance*` / `vue-monitor*` / `vue-analytics*` / `vue-about*` / `vue-home-*` / `vue-shell-*` / `react-monitor*` / `react-analytics*` / `react-about*` / `react-home-*` / `react-shell-*`。账号 `admin` / `admin123`（无 2FA）。首登 OnboardingTour 点「关闭引导」，**未审 Tour**。未审 Cmd-K / Bell / ShellQuickActions / ChatDock / Lock / Theme / Watermark / TagsView。视口桌面 **1280×800**，浅色。页面内造数，**不**打 `/api/performance`。包 `@expcat/tigercat-react` **2.1.1** VirtualTable 实接口 `dataSource` / `virtualHeight` / `virtualItemHeight`。源码绑 `data={tableRows}` `height={TABLE_HEIGHT}` `rowHeight={TABLE_ROW_HEIGHT}`。

### 8b.1 PageHeader + four tabs

- **模块：** Performance PageHeader + 四 Tab 标签可见；对照 Vue **8.1**
- **端：** React
- **视口：** 桌面 **1280×800**，隔离上下文 **`react-performance`**，浅色；`html.className=""`。`documentElement` `--tiger-primary=#2563eb` / `--tiger-text=#111827` / `--tiger-text-secondary=#6b7280` / `--tiger-border=#e5e7eb` / `--tiger-surface=#ffffff` / `--tiger-info=#3b82f6` / `--tiger-warning=#d97706`；`--tiger-bg-hover` **空**；`--tiger-bg-card` **空**；`--tiger-tag-*-bg` **空**。`#main-content-scroll` MAIN **1040×658** at **(240,142)**，`clientWidth=1025` / `scrollWidth=1025` / `scrollHeight=1012`。`documentElement` **1280===1280**。
- **复现：**
  1. 登录后 URL **`http://127.0.0.1:5174/performance`**。标题 `tigercat-admin-react`。壳面包屑「管理中心 / 运维 / 大数据演示」；TagsView 选中「大数据演示」；无「演示模式」Tag。截图 `/tmp/react-performance-header.png`（PNG **1280×800** 浅色）。
  2. **PageHeader** `header.tiger-page-header` **977×65** at **(264,166)**。leftover `p2-icon-chip` **48×48** 色 `rgb(37,99,235)`；`p2-text-primary`「大数据演示」色 `--tiger-text` `#111827`。副文与 tags **运维 / 演示数据 / 万级数据** 同 Vue 8.1。KPI **12,000 / 10,000 / 8 / 6**。PageActionPanel 可见标题「页面内造数，不走后端」。
  3. **四 Tab 标签：** 万级日志流 **112×42** at **(264,531)** `aria-selected=true`；万行多列 **112×42** at **(376,531)**；自由拖拽 **112×42** at **(488,531)**；低层看板 **112×42** at **(600,531)**（Vue 8.1 后三枚宽 **96**，本端 **112**）。默认 `[data-testid=performance-virtual-list]` **977×556** at **(264,574)**。
  4. **Tab 切换路径：** chrome-devtools `click` 万行多列 / 低层看板只把 `role=tab` 置 focus，**不**改 `aria-selected`、不挂 pane（Enter 同）。Vue 8.1 同工具可切。包 `data-tiger-tab-key=s:table`，chunk 会 `slice(2)` 再 `onChange`；页面 `handleTabChange` 守卫认 `'table'`，源码路径应能切。本条 **未**用物理指针，不断定产品 Tab 坏。为拍 table/drag/kanban，用 React fiber `useState.dispatch('table'|'drag'|'kanban')` 强切（不改产品文件）。真实鼠标是否可切：**缺口**。
- **双端 vs Vue 8.1：** PageHeader / KPI / PageActionPanel / 默认 list **同形通过**。错位：React Tab 后三枚宽 112 vs Vue 96。CDP click 切 Tab Vue 可、React 本会话不可（人工鼠标缺口）。
- **严重度：** PageHeader + 四 Tab 标签 + 默认 list 挂载：通过（信息，`react-performance` + `/tmp/react-performance-header.png`）。`p2-icon-chip` / `p2-text-primary`：**低**（cite 8.1）。CDP 切 Tab 失败、人工鼠标：**缺口**。

### 8b.2 VirtualList

- **模块：** 默认 Tab 万级日志流 `VirtualList`（`LOG_COUNT=12000` / `LIST_HEIGHT=420` / `LIST_ITEM_HEIGHT=48`）
- **端：** React
- **视口：** 桌面 **1280×800** 浅色（cite 8b.1）
- **复现：**
  1. 内层 scroller height **420** / `scrollHeight` **576000**（12000×48）。近端 `scrollTop=575580`。截图 `/tmp/react-performance-list.png`。可见 `#11984–#12000`（ERROR/DEBUG/INFO/WARN Tag + mono 时间 + logger + 中文消息）。
  2. leftover `MutedPanel` 底 **`rgb(248,250,252)` = `#f8fafc`**（`--tiger-bg-hover` 空）。wrapping Card 无 `title` / 无 `tiger-card-header`。壳未撑成 12000 行（MAIN `scrollHeight=1012`）。
- **双端 vs Vue 8.2：** 近端行、576000 内高、MutedPanel `#f8fafc`、无 title wrapping Card **同形**。
- **严重度：** 万级 VirtualList 近端上屏、内层 576000 不撑破壳：通过（信息，`/tmp/react-performance-list.png`）。leftover `p2-muted-panel`：**低**（cite Vue 8.2 / Monitor 7.3）。

### 8b.3 VirtualTable

- **模块：** Tab 万行多列；对照 Vue **8.3** `:data` vs `dataSource` **中**
- **端：** React
- **视口：** 桌面 **1280×800** 浅色
- **复现：**
  1. fiber 强切 `activeTab='table'` 后挂 `[data-testid=performance-virtual-table]`。截图 `/tmp/react-performance-table.png`。列头 编号/服务/区域/状态/延迟(MS)/体积(KB)/时间；body **「暂无数据」**；`aria-rowcount=0`。KPI 表格行数仍 **10,000**。
  2. 源码 `data={tableRows}` `height={TABLE_HEIGHT}` `rowHeight={TABLE_ROW_HEIGHT}`。包 2.1.1 接口 `dataSource` / `virtualHeight`（默认 400）/ `virtualItemHeight`。`data` 到不了 `dataSource`。表体盒约 **977×434** at y **676**（Vue 8.3 live height **400**；本端量到含 chrome 434，空 body 同）。MutedPanel 底 `#f8fafc`。
- **双端 vs Vue 8.3：** **同形中** — 两端都把万行绑到不存在的 `data`/`height`/`row-height`，Empty 稳态，KPI 10,000 闲置。
- **严重度：** prop 错绑 `data` vs `dataSource`：万行从不渲染：**中**（`/tmp/react-performance-table.png` + 源码 + 包 `.d.mts`）。leftover MutedPanel：**低**（cite 8b.2）。sticky/中段/近端：**缺口**（空表无行）。

### 8b.4 useDrag

- **模块：** Tab 自由拖拽 `useDrag`
- **端：** React
- **视口：** 桌面 **1280×800** 浅色
- **复现：**
  1. fiber 强切 `drag`。截图 `/tmp/react-performance-drag.png`。status **尚未拖拽**；Button **恢复顺序**；queue-1…queue-8 文案与 Vue 8.4 同（首卡「日志检索超时排查 / 王小虎 · 第 1 位」）。**当前顺序** 文案可见（Vue 8.4 shot 折下未见；本端 snapshot 有全文）。MutedPanel `#f8fafc`。未 live reorder。
- **双端 vs Vue 8.4：** filled 8 / 尚未拖拽 / 恢复顺序 / seed 文案 **同形**。live reorder 两端都缺口。
- **严重度：** 挂载 filled 8：通过（信息，`/tmp/react-performance-drag.png`）。leftover MutedPanel：**低**。live reorder：**缺口**。

### 8b.5 Kanban

- **模块：** Tab 低层看板 `Kanban`；对照 Vue **8.5**
- **端：** React
- **视口：** 桌面 **1280×800** 浅色；MAIN `scrollTop=380`
- **复现：**
  1. fiber 强切 `kanban`。截图 `/tmp/react-performance-kanban.png`。KPI 看板卡片 **6**；status **尚未移动卡片**；列接入 2 / 处理中 2/3 / 验证 1 / 完成 1；6 卡文案同 Vue 8.5。
  2. 泳道 8 点 leftover **`rgb(59,130,246)` / `rgb(34,197,94)`** = `#3b82f6` / `#22c55e`。内层 `.tiger-task-board` `scrollWidth=1324` / `clientWidth=977`；完成列 clipR **1564**；页级 `1280===1280` / main `1025===1025`。MutedPanel `#f8fafc`。未拖卡。未开 `/tasks`。
- **双端 vs Vue 8.5：** 4 列几何 / 泳道 hex / 1324 vs 977 **同形**。TaskBoard compare 两端缺口（项 15）。
- **严重度：** 挂载 4 列 6 卡 2 泳道：通过（信息，`/tmp/react-performance-kanban.png`）。完成列需内层横滚：**低**（cite 8.5）。泳道 leftover hex：**低**（cite 8.5）。8b.3 prop mismatch：**中**（cite）。live card-move / TaskBoard / 暗色 / 375：**缺口**（8b.6/8b.7 走）。

### 8b.6 Dark tokens

本期隔离上下文 **`react-performance`**（与 8b.1–8b.5 同一上下文，未新开）。ThemeConfigDrawer 只切「深色」，关抽屉后仍停 `/performance`。未把 Theme 当产品再走。视口 **1280×800**。

- **模块：** Performance 暗色 token（默认 list Tab）
- **端：** React
- **视口：** 桌面 **1280×800**，深色；隔离上下文 `react-performance`
- **复现：**
  1. 点 `data-testid=shell-theme-config-trigger` → 外观 **深色** → 关 ×。`html` class = **`dark`**。`localStorage tigercat.admin.theme` = `{"mode":"dark","primaryColor":"#2563eb","compactMode":false}`。截图 `/tmp/react-performance-dark.png`（PageHeader + KPI 12,000/10,000/8/6 + PageActionPanel + 四 Tab + VirtualList 上沿）。无「演示模式」Tag。
  2. **token：** `--tiger-primary=#2563eb` / `--tiger-bg-page=#0d1117` / `--tiger-bg-card=#161b22` / `--tiger-bg-hover=#1b212c` / `--tiger-text=#f0f6fc` / `--tiger-text-secondary=#8b949f` / `--tiger-border=#304050` / `--tiger-surface=#111827` / `--tiger-surface-muted=#1f2937` / `--tiger-info=#60a5fa` / `--tiger-warning=#fbbf24` / `--tiger-success=#4ade80`。`--tiger-tag-*-bg` **空**。`#main-content-scroll` 底 `rgb(31,41,55)`。页级无横溢。
  3. **PageHeader** 边 `--tiger-border`；`p2-text-primary` 字 `#f0f6fc`。MutedPanel 底 **`rgb(27,33,44)` = `#1b212c`**（不是浅色 `#f8fafc`）。Tag **运维** 底 `#dbeafe` / **演示数据** `#e0f2fe` / **万级数据** `#fef9c3` 暗色仍浅 fallback。
- **双端 vs Vue 8.6：** shell/PageHeader/KPI/MutedPanel `#1b212c` **同形通过**；Tag 浅底 fallback **同形中**（cite 8.6 / 7b.5）。好于 About 5.4 leftover slate 砖。
- **严重度：** `html.dark` + 壳/PageHeader/MutedPanel 跟 `--tiger-*`：通过（信息，`/tmp/react-performance-dark.png`）。Tag 底 fallback 暗色仍浅：**中**（cite Vue 8.6，同形不升档）。8b.3 空表：**中**（cite，不重开）。375：**缺口**（8b.7）。

### 8b.7 Mobile ~375px

本期隔离上下文 **`react-performance-375`**（浅色默认，未复用 `react-performance` 暗色）。emulate **375×812×2,mobile,touch**。Vue **8.7** 已记两场失败不开第三场，本条是 Performance 唯一一次 375 取证。

- **模块：** Performance `/performance` 窄屏 ~375（壳汉堡 / KPI 单列 / 四 Tab 是否换行 / list 高度 / 页级横溢）
- **端：** React
- **视口：** ~**375×812**，浅色；隔离上下文 `react-performance-375`
- **复现：**
  1. 登录 admin 后进 `/performance`，再 emulate。截图 `/tmp/react-performance-mobile-375.png`（PNG 视口 375×812）。汉堡三条杠；品牌「管理中心」折成两行；面包屑「管理中心 / 运维 / 大数据演示」折三行；TagsView 仪表盘 + 大数据演示；无侧栏（`aside` 不在 375 盒）；无「演示模式」Tag。
  2. **PageHeader** **327×85** at y **238**：标题「大数据演示」+ 副文折两行。tags 运维/演示数据/万级数据 **不见**（`hidden sm:flex`）。
  3. **KPI 单列：** 四卡各 **327×110** at y **347 / 473 / 599 / 725**（桌面 8b.1 是 4 列 232）。第四张「看板卡片 6」被视口底 + FAB `+` / 聊天气泡裁切。
  4. **四 Tab** 同行 y **1041** vis=false（折下），各宽 **82**，x 24/106/188/269（4×82+间距仍进 375，**未换行**）。list y **1108** vis=false，`LIST_HEIGHT=420` 不在首屏。kanban 横溢本条未切 Tab。
  5. **overflow：** `documentElement` **375===375**；`#main-content-scroll` **375===375** / `scrollHeight=1494` / `clientHeight=598`（竖溢预期）。无页面横溢。
- **双端 vs Vue 8.7：** Vue 8.7 **缺口**（两场失败不开第三场）。本条是 Performance 仅有的 375 事实，不能声称 Vue 同形。
- **严重度：** 375 浅色首屏壳 + KPI 单列 + 无页级横溢：通过（信息，`/tmp/react-performance-mobile-375.png`）。四 Tab / VirtualList / Kanban 折下未拍：**缺口**（本条只一次 375，不二开）。FAB 压第四 KPI：信息（壳，不审 Chat）。品牌/面包屑折行：信息（壳）。

---

## 9. Projects + ProjectDetail (Vue)

本期隔离上下文 **`vue-projects`**。先 `chrome://inspect/#remote-debugging`（Allow 仍勾，未再截）。`http://127.0.0.1:5173/login` → admin/admin123 → 关 OnboardingTour。未改产品代码。未停 Api。未审 Tour / Cmd-K / Bell / ChatDock。视口桌面 **1280×800** 浅色，后 emulate 一次 **375×812**。入口：侧栏 **项目 → 项目列表** → `/projects`。详情 `/projects/:id` 不进侧栏。

### 9.1 列表卡片网格 + 筛选分页

- **模块：** `/projects` PageHeader + KPI + 筛选 + 卡片网格 + Pagination
- **端：** Vue
- **视口：** 桌面 **1280×800**，隔离上下文 `vue-projects`
- **复现：**
  1. URL **`http://127.0.0.1:5173/projects`**。截图 `/tmp/vue-projects-list.png`。PageHeader「项目列表」+ tags 项目/演示数据。KPI **项目总数 8 / 进行中 3 / 已完成 2 / 平均进度 58**。筛选 Input + Segmented 全部/规划中/进行中/已暂停/已完成（默认全部）。网格 `xl:grid-cols-3` live `315px 315px 315px`，page 1 六卡 **1001–1006**（智能运营台 68% 进行中 … 监控可观测性 72%）。Pagination「共 8 条」第 1/2 页。侧栏 **项目列表** 高亮。TagsView 选中「项目列表」。无「演示模式」Tag。`documentElement` / `#main-content-scroll` 无横溢（MAIN `scrollHeight=1169`）。
  2. 点 **第 2 页**。截图 `/tmp/vue-projects-page2.png`。卡 **1007 导入向导优化** 8% 规划中 / **1008 帮助中心改版** 100% 已完成。下一页 disabled。
  3. 搜索 **`zzz-no-match`**。截图 `/tmp/vue-projects-empty.png`。Empty「没有符合条件的项目，试试调整搜索或状态筛选。」KPI 仍 8/3/2/58（stats 不随当前页筛选）。分页消失。
- **严重度：** 8 项目、pageSize=6、网格 3 列、筛选空态：通过（信息，三张 shot）。error Alert：**缺口**（Api 未停）。暗色：**缺口**（本期 375 优先）。

### 9.2 ProjectDetail + 未知 id

- **模块：** `/projects/:id` Tabs/锚点/Steps/评论；未知 id 空态；侧栏仍高亮项目列表；TagsView 标题
- **端：** Vue
- **视口：** 桌面 **1280×800**
- **复现：**
  1. `/projects/1001`。截图 `/tmp/vue-projects-detail.png`。PageHeader「智能运营台」+ tags 进行中/平台研发部。KPI 进度 68 / 成员 4 / 预算 86 / 剩余 38。Tabs 概览/成员/动态。概览 Descriptions + Steps 需求评审/开发实现/联调验收（当前）/发布上线。右栏锚点 概览/成员/动态 `#project-*`。面包屑仍「项目 / 项目列表」。侧栏 **项目列表** `aria-current=page`。TagsView **仍是「项目列表」**（详情不新开标签）。
  2. 点 Tab **成员**。截图 `/tmp/vue-projects-detail-members.png`。`aria-selected=true`。成员列表上屏。动态/评论区未深滚（body 含「评论」字样，细节 **缺口**）。
  3. `/projects/no-such-id`。截图 `/tmp/vue-projects-unknown.png`。PageHeader「未找到项目 / 没有编号为 no-such-id 的项目」+ tag 未找到。Empty「该项目不存在或已被移除…」。按钮「返回项目列表」。侧栏仍 **项目列表** 高亮；TagsView 仍「项目列表」；面包屑仍「项目 / 项目列表」。
- **严重度：** 详情 1001 + 未知 id 空态 + 侧栏/TagsView 仍「项目列表」：通过（信息）。动态/评论交互、锚点 smooth scroll：**缺口**。

### 9.3 Mobile ~375px

- **模块：** `/projects` 窄屏卡片单列（Roadmap 移动主从）
- **端：** Vue
- **视口：** ~**375×812**，浅色；同上下文 emulate
- **复现：**
  1. 回 `/projects` 后 emulate **375×812×2,mobile,touch**。截图 `/tmp/vue-projects-mobile-375.png`。汉堡 + 品牌折行；无侧栏。KPI 单列入首屏。网格 `grid-cols-1` **327px**；六卡 y **1087+** 均 vis=false（折下）。`documentElement` / main **375===375** 无横溢。
- **严重度：** 375 单列 + 无横溢：通过（信息）。折下卡片 / 详情 375 主从：**缺口**（一次 375 只拍列表首屏）。

---

## 9b. Projects + ProjectDetail (React)

本期隔离上下文 **`react-projects`**。`http://127.0.0.1:5174/login` admin/admin123，关 Tour。未复用 `vue-projects` / `react-performance*`。桌面 **1280×800** 浅色。未改产品代码。未停 Api。

### 9b.1 列表 + 分页 + 空筛选

- **模块：** `/projects` 卡片网格 / 筛选分页 / Empty
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：**
  1. `/projects`。截图 `/tmp/react-projects-list.png`。KPI **8 / 3 / 2 / 58**。page 1 六卡 1001–1006 文案/进度与 Vue 9.1 同。Pagination 共 8 条。无「演示模式」Tag。
  2. 第 2 页。截图 `/tmp/react-projects-page2.png`。1007 导入向导优化 8% / 1008 帮助中心改版 100%。
  3. 搜索 `zzz-no-match`。截图 `/tmp/react-projects-empty.png`。Empty「没有符合条件的项目，试试调整搜索或状态筛选。」
- **双端 vs Vue 9.1：** KPI/六卡/分页/空文案 **同形**。错位：React 卡内「1001 · 王小虎」拆成三枚 StaticText（Vue 一整句）。
- **严重度：** 通过（信息）。error：**缺口**（Api 未停）。暗色 / 375：**缺口**（Vue 9.3 已拍 375；本端未 emulate）。

### 9b.2 Detail + 未知 id

- **模块：** `/projects/1001` 与 `/projects/no-such-id`
- **端：** React
- **视口：** 桌面 **1280×800**
- **复现：**
  1. `/projects/1001`。截图 `/tmp/react-projects-detail.png`。PageHeader 智能运营台 + 进行中/平台研发部。KPI 68/4/86/38。Tabs 概览/成员/动态。Steps 需求评审→发布上线，当前 联调验收。锚点 `#project-overview|members|activity`。侧栏 **项目列表** 高亮。TagsView 仍「项目列表」。a11y 树 Steps 旁多出 StaticText **「3」「4」**（Vue 9.2 快照未见这两枚独立数字）。
  2. `/projects/no-such-id`。截图 `/tmp/react-projects-unknown.png`。未找到项目 / 没有编号为 no-such-id 的项目 / Empty 该项目不存在… / 返回项目列表。侧栏+TagsView 仍「项目列表」。
- **双端 vs Vue 9.2：** 未知 id 空态 + 侧栏/标签仍列表 **同形通过**。成员 Tab 本条未点（Vue 9.2 已点）。Steps 数字节点 **错位（低）**。
- **严重度：** 详情+未知 id：通过（信息）。成员/动态/评论/375：**缺口**。
