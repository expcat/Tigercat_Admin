# Tigercat 上游组件需求

面向 Tigercat 组件库开发。本仓库目标包版本 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` `2.2.0`。

**单一事实源：** 这里记录「Admin 场景需要、但包侧尚未提供或能力不够」的上游需求。已落地的用法只写在 [frontend.md](frontend.md)。当前仍开放、需要立刻跟进的短清单在 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)，该文件只做索引，不复写本文细节。

## 与 suggestions 的关系

| 文件 | 写什么 | 不写什么 |
| ---- | ------ | -------- |
| 本文 | 场景 → 缺口映射、对标依据、优先级、建议 API/行为 | 本仓库页面怎么用已有组件 |
| [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md) | 当前待办条目的指针（状态 + 链到本文锚点） | 第二份需求正文 |
| [frontend.md](frontend.md) | 本仓库已采用的组件、workaround、双端约定 | 上游路线图 |

新缺口先写入本文对应小节，再把开放项同步到 suggestions；缺口落地后从 suggestions 删除，并在本文把状态改为「已在 vX.Y 落地」。

## 对标依据（简要）

对照开源/商业 Admin 的**场景完整度**，不照搬品牌或产品域：

- Ant Design Pro / Arco Pro：Workplace + Analysis、高级筛选表、结果/异常页、描述列表可复制。
- Vue Vben Admin 5：锁屏、水印、命令面板、多标签、主题抽屉、**侧栏菜单搜索**、**内容区全屏**、页脚。
- Naive Admin / Soybean：精简 CRUD 工作台、空/错/加载路径完整。
- Refine：资源 CRUD + 权限边界清晰，不发明新业务域。

本仓库已覆盖多数 Pro 场景（Shell、用户/角色 CRUD、监控、工单、日历、内容、图库、任务、审计、导入、报表）。下面只列**组件库**缺口，不要求 Admin 新增无关产品模块。

## 优先级

| 级 | 含义 |
| -- | ---- |
| P0 | 挡住 Admin 去掉 workaround，或文档已承诺但包 API 盖不到 |
| P1 | 对标 Admin 的常见交互，有合理 API 即可加深现有页 |
| P2 | 增强体验或覆盖长尾组件能力，可等下一批 |

---

## 1. 数据展示与日历

### 1.1 Calendar 单元格事件插槽 — P1（已在 v2.2.0 落地）

- **场景：** `/calendar` 要在月视图格子里标事件圆点/条。
- **现状：** 类型未暴露按日期格的渲染插槽；Admin 用右侧「当日日程」+ `Badge`/`Popover` 近似。
- **对标：** Ant Design Calendar `dateCellRender` / Vben 日程格内标记。
- **建议 API：** `dateCellRender?(date, extra)` 或具名插槽 `#dateCell="{ date, events }"`；格子 `aria-label` 含当天事件数。React/Vue 对称。
- **Admin 落地：** `/calendar` 已用 `events` + React `dateCellRender` / Vue `#dateCell` 在格子内标色点与数量；右侧列表只保留选中日详情，不再当格内事件的唯一展示。

### 1.2 Text 可复制 — P1（已在 v2.2.0 落地）

- **场景：** 用户 ID、审计事件 ID、设置键名一键复制。
- **现状：** `Text` 有 `truncate`，无 `copyable`；`Code` 已有 `copyable`。
- **对标：** Ant Design `Typography.Text copyable`。
- **建议 API：** `copyable?: boolean | { text?, tooltip?, onCopy? }`；成功走现有 `Message` 或内部 tooltip；键盘可操作。
- **Admin 落地：** 用户表、审计详情、设置键名去掉手写 clipboard 按钮。

### 1.3 Code 语法高亮 — P2（已在 v2.2.0 落地）

- **场景：** `/help` 示例、`/audit-logs` JSON、内容页代码预览。
- **现状：** `Code` 纯文本 + 复制，无 `language`。
- **建议 API：** 可选 `language?: string`，默认仍纯文本；高亮引擎可插拔，避免默认打进主包。
- **Admin 落地：** 帮助示例与审计 JSON 按语言着色。

---

## 2. 布局与滚动

### 2.1 滚动祖先自动探测 — P1（已在 v2.2.0 落地）

- **场景：** Shell 内容滚在 `#main-content-scroll`，不是 `window`。
- **现状：** `/help` 的 `Anchor`/`ScrollSpy` 要显式 `getContainer`，`Affix` 要 `target="#main-content-scroll"`。
- **建议 API：** 未传 `target`/`getContainer` 时沿 DOM 找最近 overflow 滚动祖先，找不到再回落 `window`；保留显式覆盖。
- **Admin 落地：** 去掉 Help 页硬编码容器绑定。

### 2.2 Footer 在 App Shell 中的密度 — P2（已在 v2.2.0 落地）

- **场景：** 内容区底部版权条（本仓库已用 `Footer`）。
- **现状：** `Footer` 可用；缺与 `Layout` 内容滚动、紧凑密度的约定示例。
- **建议：** 官方 LayoutDemo 补「Content 内滚动 + Footer 随内容」和「固定页脚」两种；紧凑模式缩小垂直 padding。
- **Admin 落地：** 已按「随内容滚动」使用，无需等包。

---

## 3. 表单

### 3.1 AutoComplete 受控输入与自由文本 — P2（已在 v2.2.0 补文档/示例）

- **场景：** `/content` 标题联想，同时允许未出现在选项里的标题。
- **现状：** `allowFreeInput` + `searchValue`/`onSearchChange` 已够用；Admin 已接上。
- **仍建议：** 文档明确「打字只改 query、提交才改 value」；给 combobox 受控示例（`value` + `searchValue` 同步）。
- **不是缺口：** 不要为此再加第二套 `onInput`。

### 3.2 动态表单项 / schema 表单 — P2（推迟：Admin 不做表单设计器）

- **场景：** 对标 Vben/Pro 的配置驱动表单。Admin **不**做表单设计器产品。
- **现状：** `Form`/`FormItem` + `FormWizard` 够演示；无 schema 渲染器。
- **建议：** 若做，保持纯数据描述（字段、校验、显隐），不要绑后台代码生成。优先级低于日历插槽与 Text copyable。

### 3.3 人机验证码组件 — P2（推迟：Admin 无明示需求）

- **场景：** 对标 Vben 滑块/点选验证码。Admin 登录已有 OTP 演示。
- **建议：** 若提供，做成无后端耦合的展示+回调组件；Admin 无明示需求前不接。

---

## 4. 导航与 Shell

### 4.1 内置全屏控件 — P2（已在 v2.2.0 落地）

- **场景：** Header 进入/退出浏览器全屏（Vben 常见）。
- **现状：** 无 `Fullscreen`/`useFullscreen`；Admin 用 `Icon` + Fullscreen API。
- **建议 API：** `useFullscreen()` 或 `FullscreenButton`，处理 `fullscreenchange`、无权限失败、SSR 空操作；内置 expand/collapse 图标。
- **Admin 落地：** 上游提供后替换 Header 自定义 `IconDefinition`。

### 4.2 Menu 搜索在折叠态 — P2（已在 v2.2.0 落地）

- **场景：** 侧栏 `Menu searchable`（Admin 已在展开时开启）。
- **现状：** 折叠态搜索框会挤占 64px 栏。
- **建议：** `collapsed` 时自动隐藏搜索，或提供 `searchable="auto"`。
- **Admin 落地：** 已用 `searchable={!collapsed}`。

### 4.3 Icon 覆盖面 — P1（已在 v2.2.0 落地）

- **场景：** Shell 菜单、Header 全屏、页脚。
- **现状：** 内置 `name` 集偏小（无 fullscreen/maximize、ticket、zap 等）；Admin 仍大量用本地 SVG。
- **建议：** 扩官方 outline 集（fullscreen、ticket、bell 已有、chart、database）；或允许 `@expcat/tigercat-core/icons/registry` 注册应用级名称且 tree-shake。
- **Admin 落地：** 能映射的入口改 `Icon name`，其余继续本地图标。

---

## 5. 高级 / 复合

### 5.1 独立 Drag 组件 — P2（已在 v2.2.0 落地）

- **场景：** `/performance` 自由排序。
- **现状：** 无 `/Drag` 子路径，走 `useDrag`。
- **建议：** 若提供独立组件，保持与 hook 同一套 item props/attrs，避免双轨。
- **Admin 落地：** 有组件再评估替换，不提前抽象。

### 5.2 编辑器可插拔 engine — P2（已在 v2.2.0 补适配示例）

- **场景：** `/content` 富文本/Markdown/代码。
- **现状：** 内置 contenteditable / 高亮，未接 TipTap/Quill/Prism。
- **建议：** 保持现有 `engine`/`highlighter` 插口稳定，文档给最小适配示例。
- **Admin 落地：** 演示继续内置引擎。

### 5.3 图表基元联动 — P2（推迟：高层图已够用）

- **场景：** `/analytics` `ChartCanvas` 系列。
- **现状：** 点到为止，像素坐标预映射，Tooltip 未与轴精细联动。
- **建议：** 高层图已够用；基元若要生产级，补 axis↔tooltip 共享 scale 示例，而不是逼 Admin 自绘。

---

## 6. 明确不做（Admin 侧也不发明）

- 动态后端菜单管理、部门/岗位/字典/租户/工作流等新产品域。
- 运行时 i18n 语言包切换（本仓库只加载 `zhCN` + `appText`）。
- 把 Mock 2FA/忘记密码做成真实 .NET 端点（契约已标注 Mock only）。

## Admin 本轮已用包能力（无需上游）

| 场景 | 组件 | 页面 |
| ---- | ---- | ---- |
| 标题联想 | `AutoComplete` | `/content` |
| 页脚 | `Footer` + `Icon` | Shell |
| 全屏 | `Icon` + Fullscreen API | Header |
| 菜单过滤 | `Menu searchable` | 侧栏展开态 |
| 设置分组 | `Collapse` + 加载 `Skeleton` | `/settings` |
| 栅格 | `Row` / `Col` | 仪表盘系统信息、项目卡片、个人中心 KPI |
| JSON 复制 | `Code copyable` | `/audit-logs` |
