# Tigercat Admin 视觉走查 — 剩余项

全站 Vue + React 视觉走查已完成（记录于 `feat/visual-review`）。可修缺陷已在 `feat/visual-fix` 落地。本文只保留**已确认**的项：包 API 盖不到的英文、产品口径、允许的 leftover glue，以及本会话 live 取证后仍成立的结论。不发明新产品功能。未再 live 复验的 Shell / 仪表盘 / About·Analytics·Monitor / Performance / 业务页交互·暗色·375 / Exception 缺口见 [`Roadmap.md`](../Roadmap.md)，那些不是实现清单。

路径前缀：Vue = `Tigercat.Admin.Vue/src/`，React = `Tigercat.Admin.React/src/`。

---

## 本会话 live 取证（游客 / Auth）

2026-08-28。先开 `chrome://inspect/#remote-debugging`（Allow 已勾选）。Vue 隔离上下文 `vue-auth-verify` `http://127.0.0.1:5173`，React 隔离上下文 `react-auth-verify` `http://127.0.0.1:5174`，未复用。Api `http://127.0.0.1:5137` 仍为原进程，未停、未换 MockApi / `dev:demo` / Aspire。视口桌面 **1280×800**，浅色。同一账号、同一路由、同一操作两端各走一遍。

这些原先缺 PNG / 只靠后续 a11y 的项，本会话有 live DOM + 网络。**通过，不是缺陷。**

| 项 | 操作 | Vue | React |
| -- | ---- | --- | ----- |
| 登录空校验 | `/login` 空表点「登录」 | 用户名/密码 `aria-invalid=true`，红字「请输入用户名」「请输入密码」，描边 `oklch(0.396 0.141 25.723)`。`scrollWidth===clientWidth===1280`。`/tmp/vue-auth-empty-validation.png` | 同文案、同 `aria-invalid`、同描边色。`/tmp/react-auth-empty-validation.png` |
| 错密 toast | `admin` / `wrongpass` 点「登录」 | `POST /api/auth/login` **401**。`role=alert` **用户名或密码错误**（约 354ms 进容器），`color rgb(220, 38, 38)`。仍停 `/login`「欢迎回来」。 | 同文案、同 token 错误 Message 类、约 353ms。仍停 `/login`。 |
| 2FA 错码 | `demo` / `demo` → OTP `000000` 点「验证」 | 两步验证卡 + Alert「演示验证码：123456」。`POST /api/auth/two-factor/verify` **401**。顶栏 toast 与行内 Alert 均为 **验证码错误**。仍停 `/login` OTP 步。`/tmp/vue-auth-2fa-wrong-code.png` | 同形：toast + 行内 **验证码错误**。`/tmp/react-auth-2fa-wrong-code.png` |
| 注册成功 Result | `/register` 一次性账号点「注册」 | `POST /api/auth/register` **200**。URL `/register-success`。Result **注册成功** / 「账号已创建，即将返回登录页」；Countdown「即将自动返回登录」当时 **3秒**；「立即登录」。约 5s 后自动 `/login`。`/tmp/vue-auth-register-success.png` | 同 Result 文案 + Countdown 当时 **4秒** + 「立即登录」。`POST` **200** → `/register-success` → 自动 `/login`。左栏卖点句与 Vue 不完全相同（既有低档 leftover，不升档）。 |

---

## 包 API / 口径（本仓库盖不到或不宜当缺陷修）

| 项 | 端 | 说明 |
| -- | -- | ---- |
| Settings ColorPicker「Pick color」 | 双端 | `@expcat/tigercat-*` ColorPicker 无 labels / placeholder。Review 12。 |
| 表格卡片排序「Select an option」 | 双端 Users 10.2 / Tasks 15 | `TigerLocaleSelect` 只有 `doneText`，无 placeholder 键。 |
| 内容编辑器 Bold / Italic 等工具条文案 | 双端 Content 19 | 编辑器内部 chrome，页面无 labels。 |
| Calendar「今日」KPI=0 vs 选中日 2 条 | 双端 18 | 演示冻结 6 月与「今日」口径不同，不是布局坏。 |
| Performance Kanban 完成列需内层横滚 | 双端 8.5 | `.tiger-task-board` `scrollWidth=1324` / 卡槽 977；页级无横溢。包内 scroller。 |
| `p2-*` 页面 glue 类名 | 双端 | `docs/frontend.md` 允许：`p2-icon-chip` / `p2-text-primary` / `p2-page-accent` / `p2-action-tile` / `p2-muted-panel`。不挡功能，不改名。 |
| Header 调色板原生 `<button>` | 双端 3.2 | leftover 入口，功能正常。 |
| Watermark 宿主 `relative relative` | React 3b.3 | 组件总会加 `relative`，不挡点击。 |
| 审计页 Redis Alert | 双端 16 | 环境 `redis.target=in-memory`，布局按设计同时出 Alert + Empty。 |

---

走查当时标「通过（信息）」的项不再复述。已修缺陷的对照见已删除的实现日志（`feat/visual-fix` 提交历史）。
