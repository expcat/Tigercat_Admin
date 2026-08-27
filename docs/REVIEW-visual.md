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
- **视口：** 未拍
- **复现：** 13 张均为浅色 **1280×800**。未见 `.dark`、未见 `.compact`、未见 `≤767px` / `375px`、未见窄屏溢出。未见已登录态再打开 `/login` `/register` `/register-success` `/forgot-password` 后进仪表盘。
- **严重度：** 未做（本会话）

