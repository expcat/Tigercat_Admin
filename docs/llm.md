# LLM 按需读取指南

本文件是 LLM / Agent 的默认入口。先判别文档线，再按任务读取最小必要文档，避免一次性加载全部上下文：

- **创建新项目线**：以本仓库为蓝本，在其他目录创建新的 React / Vue + Tigercat 后台 → 入口 [docs/guide/new-project.md](guide/new-project.md)。本仓库的 AGENT.md、文档同步规则和「维护本仓库」各任务行对此类任务**不适用**。
- **维护本仓库线**：运行、修改、审查、扩展本仓库 → 按下表路由。

## 默认读取

| 任务 | 必读 | 需要时再读 |
| ---- | ---- | ---------- |
| 以本仓库为蓝本创建新项目（其他目录） | [docs/guide/new-project.md](guide/new-project.md) | [docs/frontend.md](frontend.md)（按 guide 引用章节）、[docs/guide/backend.md](guide/backend.md) |
| 新项目选择或对接后端 | [docs/guide/backend.md](guide/backend.md) | [docs/api.md](api.md)、[docs/operations.md](operations.md) 数据库/生产配置节 |
| 理解项目或快速开始 | [README.md](../README.md) | [docs/operations.md](operations.md) |
| 编码、审查、重构、文档整理 | [AGENT.md](../AGENT.md) | 相关专题和现有实现 |
| 前端页面、布局、Tigercat UI | [docs/frontend.md](frontend.md) | [docs/api.md](api.md)、[上游建议](frontend-upstream-suggestions.md)、双端同名页面 |
| API 对接或后端端点 | [docs/api.md](api.md) | 对应 [docs/api](api) 专题、`Tigercat.Admin.Api/Endpoints/*` |
| 数据库、Redis、媒体、部署、CI | [docs/operations.md](operations.md) | API 或前端专题 |
| 新增跨领域能力 | 本文件 + 受影响专题 | 必要时新增专题文档 |

## Skill 路由

- 支持 skills 时，编码、审查、重构和文档整理优先使用 `karpathy-guidelines`。
- 涉及 Tigercat UI、主题、跨框架迁移、组件属性映射或显示问题时，先读 [docs/frontend.md](frontend.md) 和仓库现有实现；表格、`DataTableWithToolbar`、Card 模式和卡片排列任务先读 [表格使用约定](frontend.md#表格使用约定v1244)。
- 只有仓库缺少信息或需要核对最新 breaking change 时，才查 Tigercat 官方文档。
- Skill 给出的是工作方法；本仓库事实以代码、配置、专题文档、已安装或已核验的 Tigercat 类型为准。

## API 按需读取

先读 [docs/api.md](api.md) 获取通用响应、认证、错误码和端点分组，再按资源域读取：

| 资源域 | 文档 |
| ------ | ---- |
| 健康检查、应用信息、认证、权限 | [docs/api/auth.md](api/auth.md) |
| 用户管理 | [docs/api/users.md](api/users.md) |
| 角色与权限 | [docs/api/roles.md](api/roles.md) |
| 仪表盘统计、导出 | [docs/api/dashboard-export.md](api/dashboard-export.md) |
| 审计日志 | [docs/api/audit.md](api/audit.md) |
| 通知中心 | [docs/api/notifications.md](api/notifications.md) |
| 任务面板 | [docs/api/tasks.md](api/tasks.md) |
| 系统设置 | [docs/api/settings.md](api/settings.md) |
| 媒体资源 | [docs/api/media.md](api/media.md) |

## 后续文档同步

- API 端点、请求/响应字段、权限、错误码、事件、分页/排序规则变更：同步更新 [docs/api.md](api.md) 和对应 [docs/api](api) 专题；没有合适专题时新增专题文档。
- 前端页面、路由、菜单、权限入口、Tigercat UI 用法、双端映射、组件缺口或页面生成规则变更：同步更新 [docs/frontend.md](frontend.md)；独立主题可新增 `docs/frontend-*.md` 并在本文件和 [README.md](../README.md) 登记。
- 数据库、Redis、媒体存储、部署、CI、健康检查、观测、Docker、发布 smoke 或回滚流程变更：同步更新 [docs/operations.md](operations.md)；内容过长时拆出专题并在入口文档链接。
- 脚手架步骤、依赖版本策略、App Shell 复制清单或后端方案变更：同步更新 [docs/guide](guide) 对应文档；升级 `@expcat/tigercat-*` 版本时更新 [guide/new-project.md](guide/new-project.md) 的「当前蓝本版本」。
- 文档入口只写导航和决策规则，细节放专题，避免同一事实多处维护。

事实归属（单一事实来源）：

| 事实 | 归属 | 其他文档的引用方式 |
| ---- | ---- | ------------------ |
| 组件用法、视觉规则、双端映射、表格约定、页面验收 | [docs/frontend.md](frontend.md) | guide 按锚点引用，不复写 |
| API 字段与契约 | [docs/api.md](api.md) + [docs/api](api) | [guide/backend.md](guide/backend.md) 只写抽象层 |
| 本仓库运行、数据库、部署、CI | [docs/operations.md](operations.md) | guide 引用章节 |
| 新项目脚手架、依赖版本、复制清单、后端方案 | [docs/guide](guide) | 入口文件只放链接 |
| 配置代码细节（vite / css / tsconfig） | 蓝本源文件 | 文档片段标注「以源文件为准」 |

## 验证

文档 only 改动至少运行：

```bash
pnpm run check:links
```

必要时用 `rg` 检查旧链接、旧术语和重复事实。
