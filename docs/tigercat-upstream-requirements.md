# Tigercat 上游组件需求

面向 Tigercat 组件库开发。本仓库包版本 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` `3.0.0-rc.2`。

**单一事实源：** 这里记录「Admin 场景需要、但包侧尚未提供或能力不够」的上游需求；已落地的条目从本文删除，用法只写在 [frontend.md](frontend.md)。当前仍开放、需要立刻跟进的短清单在 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)，该文件只做索引，不复写本文细节。

## 与 suggestions 的关系

| 文件 | 写什么 | 不写什么 |
| ---- | ------ | -------- |
| 本文 | 场景 → 缺口映射、对标依据、优先级、建议 API/行为 | 本仓库页面怎么用已有组件 |
| [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md) | 当前待办条目的指针（状态 + 链到本文锚点） | 第二份需求正文 |
| [frontend.md](frontend.md) | 本仓库已采用的组件、workaround、双端约定 | 上游路线图 |

新缺口先写入本文对应小节，再把开放项同步到 suggestions；缺口落地后从 suggestions 删除，并从本文移除该条目。

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

## 1. 表单

### 1.1 schema 高级能力 — P2（推迟：Admin 不做表单设计器）

- **场景：** 对标 Vben/Pro 的配置驱动表单。Admin **不**做表单设计器产品。
- **现状：** 已有 SchemaForm，审批发起弹层已采用；不能把 schema 渲染器列为缺失能力。
- **建议：** 只有现有 SchemaForm 无法覆盖明确需求时，再增强字段、校验或显隐等纯数据能力；不新增表单设计器或后台代码生成。

### 1.2 人机验证码组件 — P2（推迟：Admin 无明示需求）

- **场景：** 对标 Vben 滑块/点选验证码。Admin 登录已有 OTP 演示。
- **建议：** 若提供，做成无后端耦合的展示+回调组件；Admin 无明示需求前不接。

## 2. 高级 / 复合

### 2.1 图表基元联动 — P2（推迟：高层图已够用）

- **场景：** `/analytics` `ChartCanvas` 系列。
- **现状：** 点到为止，像素坐标预映射，Tooltip 未与轴精细联动。
- **建议：** 高层图已够用；基元若要生产级，补 axis↔tooltip 共享 scale 示例，而不是逼 Admin 自绘。

<a id="cron-summary"></a>

### 2.2 Cron 中文、范围摘要与草稿校验 — P2（rc.2 开放项）

- **场景：** Jobs 使用 CronEditor 配置调度，界面为中文，摘要仍显示英文；0–59 范围会展开成六十个分钟值。
- **rc.2 实装：** 两端摘要直接调用 Core `describeCronExpression(expressionDraft)`；`zhCN.cronEditor` 提供控件和错误文案，没有摘要字段。`0 2 * * *` 仍返回 `Runs at minute 0, hour 2, every day, every month.`，`0-59 2 * * *` 仍展开全部分钟。已有换行解决显示溢出，尚未改变语言和表达方式。
- **草稿缺口：** 数值子字段通过 `patchDraft` 更新草稿，只有 Core `parseOptionalInt` 非空才写回表达式；分钟值填 `bad` 或清空时，`onValidate` / `validate` 仍只反映旧表达式。双端浏览器已复现：输入 `bad` 后保存会提交旧 `0 2 * * *`。建议组件的校验包含所有当前子字段草稿，并在非法草稿时发出校验结果、显示对应错误。
- **当前处理：** Admin 继续用组件与 Core 校验，提交前复用 `parseOptionalInt` 阻止非法数值草稿；每次打开 Drawer 更新组件 key，取消后重开从默认 / 已保存值重建草稿。没有复制 Cron 解析器或摘要翻译。`validateCronExpression('0 0 31 2 *').valid` 为 `true`、`nextCronRun` 为 `null`，页面保留其合法性。
- **建议：** 复用现有 locale / Cron 解析能力，给当前 zhCN 提供分钟范围与步长的简洁摘要；不引入运行时语言切换。验收与顺序见 [UP-09](../Roadmap.md)。

<a id="notification-bell-actions"></a>

### 2.3 通知铃铛组合扩展 — P1（保留现有业务行为后再迁移）

- **场景：** Header 展示最近五条通知和未读数；打开时刷新，单条点击关闭 Popover 并显示带「查看」动作的 toast，动作跳转通知中心并关闭 toast；另有「全部已读」和「查看全部通知」。整条 toast 点击缺口见 2.4。
- **实装依据：** rc.2 React `/NotificationBell` 类型为 `items?: NotificationItem[]`、`locale?: string`、`onItemReadChange(item, read)`；Vue 对应 `item-read-change`，另发 `update:open`，但没有受控 `open` prop。两端内部均只将单项已读事件透传给 NotificationCenter。Core 的简化类型不能替代框架包实装类型。
- **缺口：** 无单项点击回调、查看全部 / 批量已读入口与回调、完整受控打开和双端一致的打开事件；也无法定制触发器以保留中文可访问名、40px Header 布局和 `data-tour`。只靠已读回调推断点击会改变业务语义，且已读项无法触发原有 toast。
- **建议：** 在现有组件上提供上述回调与 trigger / footer 扩展点，保留 `onItemReadChange`；加载状态和空态允许由调用方提供。数据请求、路由、toast 类型与 `notification.actions` 仍由 Admin 负责，不把业务依赖放进库。
- **当前处理：** Admin 继续使用本地 Popover / Badge / Button 组合。验收应覆盖未读与已读项的 toast、查看动作、批量已读持久化、查看全部、打开刷新以及 Esc 焦点恢复。

<a id="notification-toast-click"></a>

### 2.4 通知 toast 整条点击 — P1（rc.2 实装缺口）

- **实装依据：** rc.2 两端 `NotificationContainer` 仅为顶层 `onClick` 渲染一个兼容动作按钮，容器没有点击处理；同时传 `actions` 会出现两个「查看」。浏览器与已安装包源码已核对。
- **当前处理：** Admin 仅传 `actions`，保留一个「查看」及点击后导航、关闭行为。历史文档所述整条点击当前不可用，不添加 DOM 代理或另一套 toast 实现。
- **建议：** 上游区分 toast 容器点击与操作按钮，并明确两者组合规则；支持整条点击后，再恢复 Admin 的整条导航验收。

<a id="upload-strict-mode"></a>

### 2.5 React Upload 在 StrictMode 下不发请求 — P0（rc.2 实装缺口）

- **复现：** 开发模式全局 StrictMode 内渲染 Upload，传合法文件和同步返回 `{ abort }` 的 `customRequest`；选择文件后没有请求或列表更新。生产构建与 Vue 的结果不能代替此路径。
- **根因：** React `dist/chunk-5E22X3BS.mjs` 用 `useRef(createUploadController(...))` 保留控制器，空依赖 effect 的清理调用 `controllerRef.current.dispose()`。Core `dist/index.js` 的 `createUploadController` 将 `disposed` 永久设为 true；StrictMode 的 effect 重放复用该 ref，随后 `enqueue` / `processFilesInner` 直接退出。
- **当前处理：** Content、Settings Logo 和 Import 双端沿用 FilesPage 的原生文件输入和现有 API，保留重试、AbortController 取消和名额校验；Logo 支持取消与焦点恢复，工单未接附件 API 因而移除演示选择器。不关闭全局 StrictMode，不修改 node_modules。
- **建议：** 使控制器创建与清理适配 effect 重放，验证初次选择、失败重试、移除取消、真正卸载与迟到回调。Vue Upload 的 `update:fileList` 事件及实现中 `abort(uid?)` 的类型遗漏也需保持文档 / 类型对齐。

## 3. 本次不纳入的额外范围

- 当前已有动态菜单管理与审批工作流；不把它们列为未实现。不给现有域之外新增部门、岗位、字典、租户等产品域。
- 运行时 i18n 语言包切换（本仓库只加载 `zhCN` + `appText`）。
- .NET 已有 2FA / 忘记密码端点，见 [认证契约](api/auth.md)；真实 TOTP、短信 / 邮件投递推迟。
