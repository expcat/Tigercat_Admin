# Tigercat 上游组件需求

面向 Tigercat 组件库开发。本仓库包版本 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` `3.0.0-rc.1`。

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

### 2.2 Cron 中文与范围摘要 — P2（后续增强）

- **场景：** Jobs 使用 CronEditor 配置调度，界面为中文，摘要仍显示英文；0–59 范围会展开成六十个分钟值。
- **现状：** 模式和输入布局、长词换行已修复，320 / 375px 无横溢。换行解决显示缺陷，尚未改变摘要的语言和表达方式。
- **建议：** 复用现有 locale / Cron 解析能力，给当前 zhCN 提供分钟范围与步长的简洁摘要；不让 Admin 自行翻译或重复解析，不引入运行时语言切换。验收与顺序见 [R3.4](../Roadmap.md)。

## 3. 本次不纳入的额外范围

- 当前已有动态菜单管理与审批工作流；不把它们列为未实现。不给现有域之外新增部门、岗位、字典、租户等产品域。
- 运行时 i18n 语言包切换（本仓库只加载 `zhCN` + `appText`）。
- .NET 已有 2FA / 忘记密码端点，见 [认证契约](api/auth.md)；真实 TOTP、短信 / 邮件投递推迟。
