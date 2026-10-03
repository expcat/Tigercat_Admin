# Tigercat 上游组件需求

面向 Tigercat 组件库开发。本仓库目标包版本 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` `3.0.0-preview.7`。

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

### 1.1 动态表单项 / schema 表单 — P2（推迟：Admin 不做表单设计器）

- **场景：** 对标 Vben/Pro 的配置驱动表单。Admin **不**做表单设计器产品。
- **现状：** `Form`/`FormItem` + `FormWizard` 够演示；无 schema 渲染器。
- **建议：** 若做，保持纯数据描述（字段、校验、显隐），不要绑后台代码生成。

### 1.2 人机验证码组件 — P2（推迟：Admin 无明示需求）

- **场景：** 对标 Vben 滑块/点选验证码。Admin 登录已有 OTP 演示。
- **建议：** 若提供，做成无后端耦合的展示+回调组件；Admin 无明示需求前不接。

## 2. 高级 / 复合

### 2.1 图表基元联动 — P2（推迟：高层图已够用）

- **场景：** `/analytics` `ChartCanvas` 系列。
- **现状：** 点到为止，像素坐标预映射，Tooltip 未与轴精细联动。
- **建议：** 高层图已够用；基元若要生产级，补 axis↔tooltip 共享 scale 示例，而不是逼 Admin 自绘。

## 3. 运行时缺陷（本地 patch 期间跟踪）

`3.0.0-preview.7` 的以下缺陷由根 `patches/` 修复（声明见 `pnpm-workspace.yaml`），上游修复发布后移除对应补丁并从本节删除条目：

- React `OverlayPortal` 在 StrictMode 下注册时机过晚导致浮层丢失；定位重试需可取消并等待 outlet 挂载。
- 双端 `WorkflowActionBar` 确认触发器未铺满定位区域，「更多」确认层锚点偏移。
- Vue `Spotlight` 输入节点挂载后未自动聚焦。

另：Tabs 溢出菜单文案 `navLabels.moreTabs` 未接入 locale，Admin 在 `utils/tigercatText.ts` 直接改写；上游进语言包后移除该赋值。

## 4. 明确不做（Admin 侧也不发明）

- 动态后端菜单管理、部门/岗位/字典/租户/工作流等新产品域。
- 运行时 i18n 语言包切换（本仓库只加载 `zhCN` + `appText`）。
- 把 Mock 2FA/忘记密码做成真实 .NET 端点（契约已标注 Mock only）。
