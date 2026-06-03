# Tigercat Admin 组件使用盘点

> 本文是 `ROADMAP.md` 中 P1「双端组件使用盘点」的交付物，用于记录当前 React / Vue 双端页面的 Tigercat 组件接入、手写 UI、显示风险、双端差异和后续优化入口。

最后更新：2026-06-04

---

## 盘点方法

- 源码范围：`Tigercat.Admin.React/src/pages`、`Tigercat.Admin.React/src/components`、`Tigercat.Admin.Vue/src/pages`、`Tigercat.Admin.Vue/src/components`。
- 导入范围：统计 `@expcat/tigercat-react`、`@expcat/tigercat-vue`、`@expcat/tigercat-core` 的真实导入，并结合页面源码复核组件用法。
- 样式范围：记录页面级手写 Tailwind、Tigercat token、硬编码颜色、渐变、圆角、固定宽度、移动端布局和弹层/菜单风险。
- 上游结论：只有确认由 Tigercat 组件 API、交互或可访问性能力导致且可复现的问题，才同步到 [upstream-requirements.md](upstream-requirements.md)。

当前双端样式入口均已加载 Tigercat Tailwind 插件与组件源码 source：

| 端 | 样式入口 | Tigercat source |
| :-- | :-- | :-- |
| React | `Tigercat.Admin.React/src/index.css` | `@expcat/tigercat-react`、`@expcat/tigercat-core` |
| Vue | `Tigercat.Admin.Vue/src/style.css` | `@expcat/tigercat-vue`、`@expcat/tigercat-core` |

## 页面级组件矩阵

| 页面/组件 | React / Vue 文件 | 已用 Tigercat 组件 | 手写 UI 与样式风险 | 双端差异 | P2 优化入口 | 验证方式 | 上游结论 |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| Users | `pages/UsersPage.tsx` / `pages/UsersPage.vue` | `Avatar`、`DataTableWithToolbar`、`Button`、`CropUpload`、`Dropdown`、`DropdownMenu`、`DropdownItem`、`Input`、`Modal`、`Form`、`FormItem`、`Popconfirm`、`Select`、`Tag`、`Tooltip`、`Message`、`Popover`、`Checkbox`；core 类型含 `TableColumn`、`SortState`、`TableToolbarFilterValue` | 批量操作区、列开关内容、头像/角色列、导出字段选择和删除确认仍有手写 flex/Tailwind；`CropUpload` 已改为子路径导入；存在固定宽度菜单和表格右侧固定列风险 | 语义基本一致；React 额外使用 `PermissionGuard` 包装操作，Vue 使用指令/模板组合 | 检查表格列渲染、批量删除、角色多选下拉遮挡、行操作菜单 detach、弹层 footer/focus | `pnpm build:frontend`；`pnpm e2e:react --grep 用户管理` / `pnpm e2e:vue --grep 用户管理`；桌面与移动视口截图 | 暂无新增上游缺口 |
| Roles | `pages/RolesPage.tsx` / `pages/RolesPage.vue` | `DataTableWithToolbar`、`Button`、`Dropdown`、`DropdownMenu`、`DropdownItem`、`Input`、`Modal`、`Form`、`FormItem`、`Popconfirm`、`Select`、`Checkbox`、`Tag`、`Tree`、`Tooltip`、`Message`、`Popover`；core 类型含 `TableColumn`、`SortState` | 权限数量、列开关、导出字段、权限树弹层说明和操作列有手写 UI；存在 `slate` 色值、固定宽度菜单和表格固定列风险 | 语义基本一致；React 操作权限由组件包装，Vue 由模板条件/指令承载 | 检查权限树键盘路径、行操作菜单 detach、权限弹层滚动、导出弹层字段换行 | `pnpm build:frontend`；`pnpm e2e:react --grep 角色` / `pnpm e2e:vue --grep 角色`；弹层焦点路径手工复核 | 暂无新增上游缺口；Modal 默认 footer 约定已在上游文档记录为使用约定 |
| Files | `pages/FilesPage.tsx` / `pages/FilesPage.vue` | `Button`、`Card`、`FileManager`、`Message`、`Modal`、`Select`、`Tag`、`Text`、`Upload`；core 类型含 `FileItem`、`UploadRequestOptions` | 上传、删除、类型筛选和选中数量由页面工具栏承载；`FileManager`、`Upload` 已改为子路径导入；按钮组在移动端仍需关注换行 | 双端组件和交互语义一致 | 检查上传按钮、类型筛选、删除确认、`FileManager` 选中态、移动端工具栏换行 | `pnpm build:frontend`；`pnpm e2e:react --grep 运维` / `pnpm e2e:vue --grep 运维`；上传/删除手工 smoke | 暂无新增上游缺口；FileManager 当前可覆盖浏览、搜索、选择和空状态 |
| Tasks | `pages/TasksPage.tsx` / `pages/TasksPage.vue` | `Button`、`Card`、`Input`、`Tag`、`TaskBoard`、`Text`、`Statistic`、`notification`；core 类型含 `TaskBoardCard`、`TaskBoardCardMoveEvent`、`TaskBoardColumn`、`TaskBoardColumnMoveEvent` | 任务统计块、入口说明和最近动作提示已收敛到共享片段；自定义卡片 render 仍保留页面级布局；`TaskBoard` 已改为子路径导入 | 语义一致；React 使用 `useMemo/useCallback`，Vue 使用 `computed/ref` | 检查拖拽反馈、WIP 限制、卡片内容换行、移动端横向滚动、通知提示一致性 | `pnpm build:frontend`；`pnpm e2e:react --grep 任务` / `pnpm e2e:vue --grep 任务`；拖拽手工复核 | 暂无新增上游缺口；拖拽键盘替代路径如确认为组件能力问题再登记 |
| Notifications | `pages/NotificationsPage.tsx` / `pages/NotificationsPage.vue` | `Badge`、`Button`、`Card`、`NotificationCenter`、`Text`、`Statistic`、`notification`；core 类型含 `NotificationItem` | 通知统计块、操作说明和最近通知摘要已收敛到共享片段；`NotificationCenter` 已改为子路径导入；统计块移动端密度仍需 smoke | 语义一致；React/Vue 对通知 API 调用写法不同但业务一致 | 检查通知统计、已读/未读操作、分组卡片、移动端文本换行和暗色模式 | `pnpm build:frontend`；`pnpm e2e:react --grep 通知` / `pnpm e2e:vue --grep 通知`；消息 DOM 断言继续使用 `.first()` | 保留已有 `Message` Vue DOM 重复节点待确认项；不新增 NotificationCenter 缺口 |
| Home | `pages/HomePage.tsx` / `pages/HomePage.vue` | `Alert`、`Card`、`Text`、`Tag`、`Select`、`LineChart`、`BarChart`、`PieChart`、`Loading`、`Statistic`、`Empty` | 统计块、系统信息和图表空状态已收敛到共享片段；欢迎区、快捷操作和图表数据色仍有页面级布局；图表已改为子路径导入 | 双端页面内容和布局基本对齐；React 图标来自 `Icons.tsx`，Vue 图标来自 `Icon.vue` | 检查图表容器高度、移动端两列网格、统计 loading 和暗色模式错色 | `pnpm build:frontend`；桌面/移动截图；首页数据加载 smoke | 暂无新增上游缺口 |
| AuditLogs | `pages/AuditLogsPage.tsx` / `pages/AuditLogsPage.vue` | `ActivityFeed`、`Alert`、`Button`、`Card`、`Input`、`Tag`、`Text`、`Timeline`、`Statistic`、`Empty`；React 额外导入 core `ActivityItem`、`TimelineItem` 类型 | 查询操作区、时间线空状态和底部统计说明已收敛到共享片段；保留策略、JSON 预览和详情按钮仍为页面级布局；`ActivityFeed`、`Timeline` 已改为子路径导入 | 语义一致；类型导入差异仅限 React 显式 core 类型 | 检查筛选工具栏、CSV 导出、保留策略输入、JSON 预览横向滚动、统计块移动端 | `pnpm build:frontend`；`pnpm e2e:react --grep 审计` / `pnpm e2e:vue --grep 审计`；导出按钮 smoke | 暂无新增上游缺口 |
| Settings | `pages/SettingsPage.tsx` / `pages/SettingsPage.vue` | `Card`、`Button`、`ColorPicker`、`Input`、`InputNumber`、`Modal`、`Popconfirm`、`Select`、`Segmented`、`Switch`、`Message`、`Text`、`Tag`、`Upload`；core 类型含 `UploadRequestOptions` | Logo 上传预览、设置项说明、默认值提示和按钮区为手写布局；`ColorPicker`、`Upload` 已改为子路径导入；仍需关注固定预览尺寸 | 语义一致；React/Vue 表单绑定语法不同 | 检查设置表单控件绑定、保存确认弹层、恢复默认值、Logo 预览、移动端双列收缩 | `pnpm build:frontend`；`pnpm e2e:react --grep 系统设置` / `pnpm e2e:vue --grep 系统设置` | 暂无新增上游缺口；InputNumber 已确认可用 |
| Login | `pages/LoginPage.tsx` / `pages/LoginPage.vue` | `Button`、`Card`、`Form`、`FormItem`、`Input`、`Message` | 认证标题、Logo、卡片阴影和注册链接为手写布局；存在 `gray/blue` 硬编码色与固定 `max-w-md` | 语义一致；Vue 使用 `@update:modelValue`，React 使用 controlled `onChange` | 检查移动端居中、暗色模式、错误提示、输入框 label/placeholder 可访问性 | `pnpm build:frontend`；`pnpm e2e:react --grep 登录` / `pnpm e2e:vue --grep 登录`；移动端截图 | 暂无新增上游缺口 |
| Register | `pages/RegisterPage.tsx` / `pages/RegisterPage.vue` | `Button`、`Card`、`Form`、`FormItem`、`Input`、`Message` | 与 Login 相同，注册提示和跳转链接为手写布局；存在 `gray/blue` 硬编码色与固定 `max-w-md` | 语义一致；Vue 使用 `@update:modelValue`，React 使用 controlled `onChange` | 检查移动端居中、暗色模式、密码输入、提交后跳转 | `pnpm build:frontend`；认证 E2E；移动端截图 | 暂无新增上游缺口 |
| MainLayout | `components/MainLayout.tsx` / `components/MainLayout.vue` | `Layout`、`Content` | 移动端 overlay、sidebar transform、主内容滚动容器为手写布局；存在固定定位、宽度和 z-index 风险 | 语义一致；React 使用 state/callback，Vue 使用 refs/watch | 检查移动端 sidebar 覆盖层、关闭行为、内容滚动、桌面折叠菜单 | `pnpm build:frontend`；桌面和 375px 移动截图；键盘/点击关闭 smoke | 暂无新增上游缺口 |
| MainHeader | `components/MainHeader.tsx` / `components/MainHeader.vue` | `Text`、`Avatar`、`Header`、`Breadcrumb`、`BreadcrumbItem`、`Dropdown`、`DropdownMenu`、`DropdownItem` | 移动菜单按钮、演示环境 badge、用户胶囊按钮和头像渐变为手写布局；存在 `rounded-xl`、`rounded-full`、渐变和固定菜单宽度 | 语义一致；React 回调 props，Vue emit | 检查移动端标题换行、用户菜单定位、面包屑溢出、暗色模式 | `pnpm build:frontend`；桌面/移动 header 截图；下拉菜单键盘路径 | 暂无新增上游缺口 |
| MainSidebar | `components/MainSidebar.tsx` / `components/MainSidebar.vue` | `Sidebar`、`Menu`、`MenuItem`、`SubMenu` | 品牌区、底部环境信息和折叠按钮为手写布局；存在收起状态宽度、菜单滚动和移动端关闭风险 | 语义一致；React 使用 `openKeys/onOpenChange`，Vue 使用 `:open-keys/@update:open-keys` | 检查折叠菜单、子菜单展开、移动端点击菜单后关闭、长菜单滚动 | `pnpm build:frontend`；桌面/移动 sidebar 截图；菜单导航 smoke | 暂无新增上游缺口 |
| PageHeader | `components/PageHeader.tsx` / `components/PageHeader.vue` | `Card`、`Tag`、`Text` | 页面头背景渐变、图标容器、标签区域为手写布局；存在渐变、硬编码色、`rounded-xl` 和小屏标签隐藏风险 | 语义一致；React 用 children/props，Vue 用 props/slot | 优先 token 化渐变和标题色；检查移动端标题换行、标签隐藏是否符合业务 | `pnpm build:frontend`；代表页面桌面/移动截图 | 暂无新增上游缺口；属于 P2/P3 共享片段收敛 |

## 汇总结论

- React / Vue 双端核心页面已广泛接入 Tigercat 组件，业务页面的主要差异集中在框架绑定语法、权限包装方式和图标实现。
- P3 已将 Home、Tasks、Notifications、AuditLogs 的统计块、操作说明区、提示区和图表空状态收敛为双端共享页面片段；Files、Settings、Users 的页面专属重组件已改为子路径导入。
- 当前剩余风险主要是业务表格/菜单 detach、弹层 footer 与焦点路径、移动端工具栏换行和少量页面级硬编码色，后续按具体缺陷或新路线推进。
- 本次 P3 未发现新的上游组件 API、交互或可访问性缺口；普通页面布局和样式收敛不写入上游需求文档。

## P3 复核记录

P3 新增双端轻量页面片段：React 使用 `PageFragments.tsx`，Vue 使用 `MetricCard.vue`、`MetricGrid.vue`、`PageActionPanel.vue`、`MutedPanel.vue` 和 `ChartEmptyState.vue`。这些片段内部优先复用 Tigercat `Card`、`Text`、`Badge`、`Statistic`、`Empty`、`Loading`，只承载页面级布局语义，不新增后端 API、数据库 schema 或业务数据契约。

重组件导入策略已按 Tigercat performance 文档调整：图表、`TaskBoard`、`NotificationCenter`、`FileManager`、`ActivityFeed`、`Timeline`、`ColorPicker`、`Upload`、`CropUpload` 改为 React / Vue 对应子路径导入；普通基础组件继续使用包级导入。双端路由级懒加载已存在，本次未改 Vite `manualChunks`。

构建对比：P3 前 `vendor-ui` 基线为 React 328.52 kB / gzip 98.61 kB，Vue 367.71 kB / gzip 106.43 kB；P3 后为 React 332.15 kB / gzip 99.68 kB，Vue 372.13 kB / gzip 107.66 kB。`vendor-ui` 小幅增加来自 `Statistic` / `Empty` 等 Tigercat 原生组件接入；重点页面 chunk 明显下降，例如 React Home 8.54 -> 6.48 kB、Tasks 8.21 -> 6.98 kB、Notifications 6.71 -> 4.78 kB、AuditLogs 6.84 -> 5.78 kB，Vue Home 8.65 -> 6.61 kB、Tasks 8.39 -> 7.25 kB、Notifications 7.11 -> 5.14 kB、AuditLogs 7.51 -> 6.41 kB。

## 验证记录

- 2026-06-04：`pnpm build:frontend`、`pnpm e2e:react`、`pnpm e2e:vue` 通过，确认 P3 共享片段、子路径导入、双端生产构建和主流程回归均正常；未发现需要新增到 [upstream-requirements.md](upstream-requirements.md) 的组件缺口。
- 2026-06-03：`pnpm build:frontend` 通过，确认 React / Vue 在 API 数据模式下均可完成生产构建。
