# 工作流 + 动态菜单中台 — 递进 Roadmap（2.3.x → 2.4）

- **基线**: Tigercat `v2.3.2` + Admin 菜单轻页（M1-S4）
- **日期**: 2026-09-08
- **原则**: 库做 schema / helpers / 展示组件；应用做路由、Mock 流转、管理页。不接 Flowable/Camunda；禁止与现有 Menu / Timeline 双轨。小切片交付，上游按 2.3.x（每次 +1）发版后再回灌 Admin。

权威副本：
- Tigercat: `docs/ROADMAP.md`「中台递进里程碑」
- Admin: `docs/midplatform-roadmap.md`

---

## 0. 已完成（冻结）

| 版本 | 内容 |
| ---- | ---- |
| 2.3.0 | MenuSchema helpers；WorkflowTimeline / WorkflowActionBar；双端 demo |
| 2.3.1 | live-review 批次 + Admin 对应修复 |

---

## 1. 工作流：还要继续强化吗？

**要。** 现状够「进度条 + 操作条」，对标钉钉/飞书仍缺「一眼看懂结构」和「业务闭环」。分三层，避免一次上引擎。

### L1 展示增强（库，优先）
- WorkflowViewer：只读钉钉风树（发起→审批→抄送→条件分支 stub），同一套 step 模型
- children 并行/抄送视觉落地（core 已有 children 字段）
- 会签/或签/依次展示字段 + locale
- ActionBar + 确认框配方（文案进 locale）
- 当前路径高亮 / 驳回回退点（只读语义）

### L2 业务演示闭环（Admin）
- 待办 / 已办 / 抄送 / 发起列表
- Mock 状态机（同意/驳回/转交写回实例，非 toast-only）
- 详情：表单区 + Viewer/Timeline + ActionBar
- 与工单等现有域挂一条演示链路

### L3 配置与引擎边界（有产品信号再开）
- WorkflowDesigner（simple JSON 树，可选子路径，可 tree-shake）
- 字段权限 / 超时提醒的展示约定（仍无引擎）
- 明确不做进主包：BPMN 设计器、Flowable/Camunda 运行时

---

## 2. 动态菜单递进

| 层 | 内容 |
| -- | ---- |
| 库 | schema 元数据 hideInBreadcrumb / flatMenu / badge / iframeSrc；schemaToRouteRecords 纯函数（不做 addRoute） |
| Admin | 菜单管理轻页（CRUD + 按角色预览）；mixed 动态路由 + pageMap；按钮级 permission 演示 |

---
## 3. 版本里程碑（递进）

### M1 — 2.3.2（展示中台加深）
**Tigercat**
- WorkflowViewer（只读树）+ children/会签展示 + ActionBar 确认配方
- MenuSchema 元数据扩展 + 可选 schemaToRouteRecords
- 文档/示例/测试；Vue/React 对称

**Admin**（升 ^2.3.2 后）
- 菜单管理轻页（基于 `/api/menus/schema` + 节点 CRUD；角色预览）— 本切片已做
- 工单/审批 Mock 流转（待办 + 详情动作写回）— 本切片已做
- 真机 Review 一轮 — Vue + React 已走查（菜单 CRUD / Viewer 角色预览；审批车道与详情同意/驳回/转交写回实例+关联工单；无 P0）

**验收**: Viewer 双端 demo；菜单 CRUD 预览；审批非纯 toast；走查无 P0

### M2 — 2.3.3（应用层动态化）
**Tigercat**: 仅当 M1 暴露上游缺口（按钮 permission helper、菜单 badge 等）— M2-S1 扫描为 NO_GAP（badge / schemaToRouteRecords / dateCellRender / Admin 按钮权限工具已在 2.3.2 与应用层就绪）

**Admin**
- mixed 动态路由 + pageMap 懒加载 — M2-S1 已做（Vue + React；游客/异常/参数详情路由仍静态）
- 按钮级权限演示 — M2-S2 已做（`/permission-demo`，现有 PermissionGuard / v-permission / usePermission，无新 Tigercat helper）
- Calendar dateCellRender 替换格内事件双轨 — M2-S2 已做（`events` + React `dateCellRender` / Vue `#dateCell`；右侧保留选中日详情）
- 真机 Review — M2-S3 已走查 Vue + React（mixed schema 路由 / iframeSrc 嵌入 / permission-demo 含 demo 缺权隐藏 / Calendar 格内色点+数量；SPA 登录补 live schema 刷新；无 P0；库仍 NO_GAP 未发 2.3.3）

**验收**: 壳主要业务路由可由 schema 驱动；按钮权限可演示

### M3 — 2.3.4（体验与工程债）
**Tigercat（按需）**: 图表基元 axis↔tooltip；审批打印配方 — M3-S1 扫描为 NO_GAP（高层图已联动轴与 tooltip；PrintLayout 已覆盖报表打印；审批打印配方无独立库缺口）

**Admin**
- roadmap-followups：弹层焦点 e2e — M3-S1 已做（`/profile` DatePicker/TimePicker/Tabs、`/analytics` DatePicker、`/content` 下拉、`/gallery` 灯箱与标注裁剪 Drawer）
- 内存态页按需 MockApi — 未在 S1 迁（单页收益不够，留给后续切片）
- Chat/Resizable/窄屏与审批同屏打磨 — 窄屏溢出已有 viewport 覆盖，非 P0/P1
- Upload/编辑器可插拔 — 仓库无明示产品需求，S1 跳过

**验收**: followups 勾一批；无新 P0

### M4 — 2.4.0（可选大步，有信号再开）
- WorkflowDesigner（simple）
- Schema 表单 / Captcha — 仅真实产品需求
- 不做：若依全家桶；租户/组织/字典组件化进 Tigercat

## 4. 跨仓节奏

1. **Tigercat 先发**：每个 M 对应一次 `2.3.x` 小版本（+1）；库内只做 schema / helpers / 展示组件与文档/示例/测试。
2. **Admin 后跟**：升依赖到对应 `^2.3.x` 后再做路由、Mock 流转、管理页与真机 Review。
3. **切片**：单里程碑内可再拆 PR；不跨仓同时大改同一语义。
4. **回写**：发版后同步 CHANGELOG / 本 roadmap / Admin `docs/midplatform-roadmap.md`；上游缺口只登记到 Admin 上游清单。
5. **门禁**：M1→M2→M3 递进；M4（2.4.0）仅在有明确产品信号时开。

## 5. 明确不做（全里程碑）
- Flowable / Camunda / Activiti 嵌入
- BPMN 2.0 设计器进主包
- 第二套 Menu / Timeline 渲染系统
- 租户 / 部门 / 岗位 / 字典作为 Tigercat 组件
