# Tigercat Admin 路线图

> 项目定位：以 .NET 10 Aspire + Tigercat UI 为基础，验证 Vue 3 与 React 双端后台管理体验，并持续把真实业务场景中的组件诉求反馈给上游。

最后更新：2026-05-28

---

## 文档职责边界

- 本文只记录当前基线、已完成模块的升级计划、后续重建计划和验证门禁。
- API 细节以 [api.md](api.md) 为准。
- 组件缺口与上游诉求以 [upstream-requirements.md](upstream-requirements.md) 为准。
- Tigercat UI 最新使用方式以官方文档为准：[Vue 3](https://expcat.github.io/Tigercat/vue/) / [React](https://expcat.github.io/Tigercat/react/) / [迁移指南](https://raw.githubusercontent.com/expcat/Tigercat/main/docs/MIGRATION.md)。

---

## 当前基线

| 项目 | 当前状态                                                                                                    |
| ---- | ----------------------------------------------------------------------------------------------------------- |
| 后端 | .NET 10 Minimal API，Aspire 编排，EF Core InMemory / SQLite Provider，Redis 缓存与 Streams 事件总线         |
| 前端 | Vue 3.5 与 React 19 双实现，Vite 构建，React Router / Vue Router 路由懒加载                                 |
| UI   | `@expcat/tigercat-core` / `@expcat/tigercat-vue` / `@expcat/tigercat-react` 升级到 `1.2.0`                  |
| 样式 | Tailwind CSS v4，CSS 入口使用 `@plugin "@expcat/tigercat-core/tailwind/modern"` 与 `@source` 扫描组件库产物 |
| 文档 | API 文档覆盖认证、用户、角色、统计、导出、设置接口；Roadmap 改为活跃计划文档                                |

### Tigercat 1.2.0 对齐项

| 项目                 | 状态   | 说明                                                                                                |
| -------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| 依赖升级             | 已完成 | 两端 UI 包与 core 包升级到 `^1.2.0`                                                                 |
| Tailwind modern 接入 | 已完成 | 两端 CSS 入口接入官方 modern 插件；保留 `@source` 以覆盖组件库 class 扫描                           |
| Modal 可见性语义     | 已完成 | Vue 端从 `visible` 迁移到 `open` / `update:open`；React 端已使用 `open`                             |
| Button 原生类型      | 已完成 | 双端登录/注册按钮使用 `htmlType` / `html-type`                                                      |
| 文档链接             | 已完成 | Roadmap、README、子项目 README 与仓库指令均指向最新官方文档入口                                     |
| 组件缺口复核         | 已完成 | 已完成首轮 1.2.0 复核，`InputNumber`、`Layout`、`Sidebar`、`SubMenu` 已在双端源码导入并通过生产构建 |

---

## 已完成模块升级规划

已完成模块不再继续按旧 Phase 展开，而是按“升级目标 + 回归验证 + 可替换组件”管理。

| 模块       | 当前完成内容                                         | 1.2.0 升级重点                                                                    | 验证要求                                                       |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 认证与会话 | 注册、登录、退出、修改密码、权限获取、Redis 审计事件 | 保持表单控件、按钮 loading 与错误反馈 API 对齐；补充会话过期体验                  | 双端登录/注册构建通过；后续补 E2E 登录流                       |
| 主布局     | Header、Sidebar、路由保护、权限过滤菜单              | 复核 `Layout`、`Sidebar`、`Menu`、`SubMenu` 最新能力，减少自定义布局逻辑          | 桌面与窄屏菜单可用；权限过滤后不出现空分组                     |
| 用户管理   | 分页、搜索、状态筛选、排序、行选择、批量删除、导出   | 尝试用 `DataTableWithToolbar` 或 `VirtualTable` 收敛表格组合逻辑；保留权限守卫    | 用户 CRUD、批量删除、导出 CSV/JSON/XLSX 回归                   |
| 角色与权限 | 角色 CRUD、权限分组配置、角色导出                    | 复核 `Tree` / `TreeSelect` 是否更适合权限配置；保留扁平权限数据兼容               | 权限保存、Admin 保护规则、导出回归                             |
| 仪表板     | 统计概览、趋势图、用户状态分布派生图表               | 引入更多 1.2.0 图表能力时优先复用现有 API 数据，不先扩接口                        | `/api/stats/overview`、`/api/stats/trend` 可用；图表空状态清晰 |
| 系统设置   | 设置读取、批量更新、主题/安全/站点配置表单           | 用 `InputNumber`、`ColorPicker`、`Segmented` 等新版组件替换临时 Select/Input 方案 | 设置保存后双端状态一致，非法值提示清楚                         |
| 数据导出   | 用户/角色导出，支持 `csv`、`json`、`xlsx` 与字段选择 | 评估 `@expcat/tigercat-core/utils/table-export` 是否能减少本地导出辅助逻辑        | 文件名、内容类型、字段过滤和权限校验回归                       |

---

## 后续重建路线

### Milestone A：1.2.0 升级收口

目标：完成依赖升级后的兼容性回归，把旧版“上游缺失”判断全部重新审计。

- [x] 升级 `@expcat/tigercat-core`、`@expcat/tigercat-vue`、`@expcat/tigercat-react` 到 `1.2.0`。
- [x] 按迁移指南处理 `Modal visible -> open` 与 `Button type -> htmlType`。
- [x] 按最新文档接入 Tailwind v4 modern 插件。
- [x] 更新 README、子项目 README 与仓库 Copilot 指南中的 Tigercat 文档链接。
- [x] 基于 1.2.0 重跑组件覆盖清单，关闭已不再成立的上游需求。
- [x] 整理构建产物与 lockfile 策略，明确根 workspace lockfile 为准还是保留子项目 lockfile。

### Milestone B：后台骨架重建

目标：把自定义布局逻辑逐步迁移到 Tigercat 1.2.0 原生组件能力上。

- [x] 双端 `MainLayout` 已把移动端侧边栏隐藏宽度收敛到 `Sidebar collapsedWidth`，移除外层手写宽度切换。
- [x] 双端导航标题、菜单结构与路由映射已抽到 `shell-navigation` 工具，`MainLayout` / `MainSidebar` 改为消费统一配置。
- [ ] 用最新版 `Layout` / `Sidebar` / `Menu` / `SubMenu` 复核并重构 `MainLayout`、`MainSidebar`、`MainHeader`。
- [x] 增加 `Breadcrumb`，让用户、角色、设置、关于页拥有一致导航层级。
- [x] 引入 `Dropdown` 或 `Popover` 统一用户菜单、主题切换、快捷操作入口。
- [x] 处理移动端侧边栏折叠、遮罩关闭与键盘可访问性。

### Milestone C：数据工作台重建

目标：让用户和角色模块成为 Tigercat 表格高级能力的主验证场景。

- [x] 用户页已用 `DataTableWithToolbar` 替代手写 Card + Toolbar + Table 组合，承接搜索、状态筛选、分页、排序、选择与批量删除。
- [ ] 对大数据列表引入 `VirtualTable` 或服务端分页边界提示，避免前端误用大数组渲染。
- [ ] 使用 `Tooltip`、`Popover`、`Dropdown` 规范行操作、列配置与危险操作确认。
- [ ] 复核 Table 固定列、列显隐、排序、选择、分页在 Vue/React 的 API 差异。

### Milestone D：权限与设置体验重建

目标：让权限配置和系统设置从“能用”升级为“可长期维护”。

- [ ] 权限配置评估 `Tree` / `TreeSelect` / `Transfer`，保留扁平权限数据并提供分组视图。
- [ ] 设置页用 `InputNumber` 管理数值配置，用 `ColorPicker` 管理主题色，用 `Segmented` 管理轻量选项。
- [ ] 增加设置变更确认与恢复默认值流程，优先使用 `Popconfirm` / `Modal`。
- [ ] 为站点 Logo 与头像预留 `Upload` / `CropUpload` 场景。

### Milestone E：可观测与运维扩展

目标：把 Redis Streams、审计事件和导出能力扩展为真实后台常见工作流。

- [ ] 新增审计日志页面，使用 `Timeline` / `ActivityFeed` 展示认证与用户管理事件。
- [ ] 新增通知中心，验证 `Notification` / `NotificationCenter` / `Badge`。
- [ ] 新增任务面板，验证 `TaskBoard` 或 `Kanban` 作为后续异步任务入口。
- [ ] 完成 SQLite 开发持久化与 PostgreSQL 生产配置文档，补充数据库切换回归测试。

---

## 组件覆盖重审清单

Tigercat 1.2.0 已提供 133+ 组件，Roadmap 不再维护完整组件字典，只保留本项目近期需要优先验证的组件集合。

| 场景       | 优先组件                                                                            | 目标                               |
| ---------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| 应用骨架   | `Layout`、`Sidebar`、`Menu`、`SubMenu`、`Breadcrumb`、`Dropdown`                    | 减少自定义后台框架代码             |
| 表格工作台 | `Table`、`VirtualTable`、`DataTableWithToolbar`、`Popover`、`Tooltip`、`Popconfirm` | 统一用户/角色列表交互              |
| 表单设置   | `Form`、`Input`、`InputNumber`、`ColorPicker`、`Segmented`、`Switch`、`Slider`      | 设置页从临时控件升级到语义化控件   |
| 权限配置   | `Tree`、`TreeSelect`、`Transfer`、`Checkbox`、`Tabs`                                | 支持复杂权限分组与批量配置         |
| 仪表板     | `Statistic`、`LineChart`、`BarChart`、`PieChart`、`DonutChart`、`GaugeChart`        | 扩展统计展示，不重复造图表封装     |
| 运维扩展   | `Timeline`、`ActivityFeed`、`NotificationCenter`、`TaskBoard`、`FileManager`        | 支撑审计、通知、任务、文件管理计划 |

---

## 上游需求处理规则

1. 先用 Tigercat 1.2.0 官方文档和本地构建验证确认缺口是否仍存在。
2. 若组件已提供能力，优先改造本项目实现并关闭旧需求。
3. 若组件存在但 API 不满足后台场景，在 [upstream-requirements.md](upstream-requirements.md) 记录具体平台、期望 API、业务场景和替代方案。
4. 涉及上游 breaking change 时，同步检查官方 [迁移指南](https://raw.githubusercontent.com/expcat/Tigercat/main/docs/MIGRATION.md) 与本项目双端代码。

---

## 验证门禁

| 改动类型             | 最小验证                                                           |
| -------------------- | ------------------------------------------------------------------ |
| Tigercat UI 依赖升级 | `pnpm install`、`pnpm build`                                       |
| React 前端改动       | `pnpm --filter tigercat-admin-react build`                         |
| Vue 前端改动         | `pnpm --filter tigercat-admin-vue build`                           |
| API 改动             | `dotnet test Tigercat.Admin.sln`，并确认 [api.md](api.md) 同步更新 |
| Roadmap / docs only  | 检查链接、状态与当前代码一致，必要时运行 Markdown 格式检查         |
| 组件覆盖重审         | 记录组件是否真实导入、构建通过、双端交互一致，以及是否需要上游需求 |

---

## 近期任务看板

- [x] 升级 Tigercat UI 到 `1.2.0` 并完成前端生产构建验证。
- [x] 重写 Roadmap，按最新 Tigercat 文档规划已完成模块升级与后续重建。
- [x] 更新 README 与 `.github/copilot-instructions.md` 中的 Tigercat 官方文档链接。
- [x] 重审 [upstream-requirements.md](upstream-requirements.md)，移除或更新 1.2.0 已解决的历史缺口。
- [x] 明确根 workspace lockfile 为唯一安装基线，并清理子项目 lockfile 漂移风险。
- [ ] 补充用户/角色/设置核心流程的 E2E 回归计划。
