# 开发路线图 (ROADMAP)

> **项目定位**：演示 & 验证项目，以模拟全功能后台管理系统为载体，磨合 .NET 10 + Tigercat UI 组件库，持续优化并反馈上游组件需求。

**最后更新**：2026-01-28

---

## 📌 项目愿景

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Tigercat Admin                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  .NET 10     │    │  Vue 3 +     │    │  React 19 +  │          │
│  │  Minimal API │◄──►│  Tigercat UI │    │  Tigercat UI │          │
│  │  + EF Core   │    │  + Vue Router│    │  + React Rtr │          │
│  └──────┬───────┘    └──────────────┘    └──────────────┘          │
│         │                                                           │
│  ┌──────▼───────┐    ┌──────────────┐                              │
│  │    Redis     │    │  PostgreSQL  │  (Phase 4 可选切换)          │
│  │ Cache+Stream │    │   / SQLite   │                              │
│  └──────────────┘    └──────────────┘                              │
│         │                   │                   │                   │
│         └───────────────────┴───────────────────┘                   │
│                    Aspire 服务编排 + 观测                           │
└─────────────────────────────────────────────────────────────────────┘
```

### 核心目标

| 目标     | 说明                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| **演示** | 展示 .NET 10 + Tigercat UI 构建现代后台的最佳实践                                   |
| **验证** | 覆盖 Tigercat UI 全部组件，验证真实场景下的可用性                                   |
| **反馈** | 发现组件缺陷或需求，及时记录到 [upstream-requirements.md](upstream-requirements.md) |
| **磨合** | 双前端（Vue/React）保持一致，验证组件库跨框架一致性                                 |

---

## 🏗️ 技术架构

### 后端架构

```
Tigercat.Admin.Api/
├── Data/                    # [新增] EF Core 数据层
│   ├── AdminDbContext.cs    # DbContext 定义
│   ├── Entities/            # 实体类
│   │   ├── User.cs
│   │   ├── Session.cs
│   │   ├── Role.cs
│   │   ├── Permission.cs
│   │   └── OutboxEvent.cs   # [新增] Outbox 事件表
│   └── Configurations/      # 实体配置
├── Auth/                    # 认证模块
│   ├── IUserStore.cs        # [改造] 异步接口
│   ├── ISessionStore.cs     # [改造] 异步接口
│   ├── EfUserStore.cs       # [新增] EF Core 实现
│   └── EfSessionStore.cs    # [新增] EF Core 实现
├── EventBus/                # [新增] 事件总线
│   ├── IEventPublisher.cs   # 事件发布接口
│   ├── IEventConsumer.cs    # 事件消费接口
│   ├── EventEnvelope.cs     # 事件信封模型
│   ├── RedisStreamPublisher.cs    # FreeRedis 发布实现
│   ├── RedisStreamConsumer.cs     # FreeRedis 消费实现
│   ├── OutboxPublisher.cs   # Outbox 后台发布服务
│   └── PendingReclaimer.cs  # Pending 回收服务
├── Caching/                 # [新增] 缓存服务
│   ├── ICacheService.cs     # 缓存接口
│   └── RedisCacheService.cs # StackExchange.Redis 实现
├── Endpoints/               # API 端点
│   ├── AuthEndpoints.cs
│   ├── UserEndpoints.cs     # [新增] 用户管理
│   ├── RoleEndpoints.cs     # [新增] 角色管理
│   └── SystemEndpoints.cs   # [新增] 系统设置
└── Program.cs               # [改造] 注册服务
```

### 基础设施组件

| 组件                    | 用途                              | Phase | 必要性 |
| ----------------------- | --------------------------------- | ----- | ------ |
| **EF Core InMemory**    | 业务持久化（开发阶段）            | 1     | 必须   |
| **Redis**               | 缓存 + Streams 事件总线           | 1     | 推荐   |
| **SQLite / PostgreSQL** | 业务持久化（生产切换）            | 4     | 可选   |
| **Aspire Dashboard**    | 服务编排 + 观测（日志/指标/链路） | 1     | 必须   |

### 服务通信架构

#### 通信模型

| 模式         | 技术选型            | 适用场景                         |
| ------------ | ------------------- | -------------------------------- |
| **同步通信** | HTTP REST API       | 前端调用、查询、校验、强一致流程 |
| **异步通信** | Redis Streams       | 事件驱动、削峰、最终一致、解耦   |
| **实时推送** | SignalR (WebSocket) | 前端实时通知、消息推送           |

#### Redis 双客户端策略

为避免 StackExchange.Redis 多路复用导致的阻塞命令问题，采用职责分离：

| 客户端                  | 用途             | 命令类型                                        |
| ----------------------- | ---------------- | ----------------------------------------------- |
| **StackExchange.Redis** | 常规缓存读写     | GET/SET、Hash、计数器、轻量锁（非阻塞）         |
| **FreeRedis**           | Streams 事件消费 | XADD、XREADGROUP(BLOCK)、XACK、XPENDING、XCLAIM |

#### 事件总线设计（Redis Streams）

**Stream 命名规范**（按领域拆分）：

- `stream:admin` - 后台管理事件
- `stream:auth` - 认证授权事件
- `stream:system` - 系统事件（审计/配置变更）

**事件信封（Envelope）模型**：

```json
{
  "eventId": "uuid",
  "eventType": "admin.user.created",
  "schemaVersion": "1.0",
  "occurredAtUtc": "2026-01-28T00:00:00Z",
  "traceId": "optional-trace-id",
  "data": {
    /* 业务数据 */
  }
}
```

**消费模式**：消费者组（Consumer Group）

- 同组多实例：负载均衡
- Pending 列表：失败重试、宕机恢复
- 支持消息认领（Claim）处理未确认消息

**交付语义**：至少一次（At-least-once）

- 事件携带 `eventId`
- 消费端实现**幂等去重**（必须）

### 前端架构

```
src/
├── router/                  # [新增] 路由配置
│   ├── index.ts             # 路由实例
│   ├── routes.ts            # 路由定义
│   └── guards.ts            # 路由守卫
├── pages/                   # 页面组件
│   ├── auth/
│   │   ├── Login.vue/tsx
│   │   └── Register.vue/tsx
│   ├── dashboard/
│   │   └── Home.vue/tsx
│   ├── system/              # [新增]
│   │   ├── Users.vue/tsx
│   │   ├── Roles.vue/tsx
│   │   └── Settings.vue/tsx
│   └── about/               # [新增]
│       └── About.vue/tsx
├── components/
│   ├── MainLayout/
│   └── common/              # [新增] 通用业务组件
└── utils/
```

---

## 🎯 里程碑规划

### Phase 1：基础设施升级 🏗️

> **目标**：完成路由库集成、EF Core 内存数据库改造，为后续功能开发奠定基础

**预计周期**：1-2 周

#### 1.1 前端路由升级

| 任务           | Vue 项目               | React 项目              | 状态    |
| -------------- | ---------------------- | ----------------------- | ------- |
| 安装路由依赖   | `vue-router@4`         | `react-router-dom@6`    | 📋 待办 |
| 创建路由配置   | `src/router/index.ts`  | `src/router/index.tsx`  | 📋 待办 |
| 定义路由表     | `src/router/routes.ts` | `src/router/routes.tsx` | 📋 待办 |
| 实现路由守卫   | `beforeEach` 导航守卫  | `ProtectedRoute` 组件   | 📋 待办 |
| 改造 App 组件  | 使用 `<RouterView>`    | 使用 `<RouterProvider>` | 📋 待办 |
| 改造页面导航   | `router.push()`        | `useNavigate()`         | 📋 待办 |
| 移除旧路由代码 | 删除 hash 路由逻辑     | 删除 hash 路由逻辑      | 📋 待办 |

**路由结构设计**：

```typescript
const routes = [
  // 公开路由
  { path: '/login', name: 'Login', component: LoginPage },
  { path: '/register', name: 'Register', component: RegisterPage },

  // 需认证路由（嵌套在 MainLayout 内）
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard', name: 'Dashboard', component: HomePage },
      { path: 'system/users', name: 'Users', component: UsersPage },
      { path: 'system/roles', name: 'Roles', component: RolesPage },
      { path: 'system/settings', name: 'Settings', component: SettingsPage },
      { path: 'about', name: 'About', component: AboutPage },
    ],
  },

  // 404 回退
  { path: '/:pathMatch(.*)*', redirect: '/login' },
];
```

#### 1.2 后端 EF Core 集成

| 任务                  | 说明                                      | 状态    |
| --------------------- | ----------------------------------------- | ------- |
| 添加 EF Core 依赖     | `Microsoft.EntityFrameworkCore.InMemory`  | 📋 待办 |
| 创建 DbContext        | `AdminDbContext` + 实体配置               | 📋 待办 |
| 定义 User 实体        | Id, Username, PasswordHash, CreatedAt     | 📋 待办 |
| 定义 Session 实体     | Id, Token, Username, ExpiresAt, CreatedAt | 📋 待办 |
| 定义 OutboxEvent 实体 | Outbox 模式支持（可选）                   | 📋 待办 |
| 改造 IUserStore       | 同步 → 异步接口                           | 📋 待办 |
| 改造 ISessionStore    | 同步 → 异步接口                           | 📋 待办 |
| 实现 EfUserStore      | 基于 EF Core 的用户存储                   | 📋 待办 |
| 实现 EfSessionStore   | 基于 EF Core 的会话存储                   | 📋 待办 |
| 改造 API 端点         | 适配异步接口                              | 📋 待办 |
| 数据初始化            | 种子数据（默认用户）                      | 📋 待办 |

#### 1.3 Redis 缓存与事件总线集成

| 任务                 | 说明                                | 状态    |
| -------------------- | ----------------------------------- | ------- |
| 添加 Redis 依赖      | `StackExchange.Redis` + `FreeRedis` | 📋 待办 |
| 配置 Aspire Redis    | AppHost 添加 Redis 容器编排         | 📋 待办 |
| 实现 ICacheService   | StackExchange.Redis 缓存封装        | 📋 待办 |
| 定义事件信封模型     | `EventEnvelope` 统一事件格式        | 📋 待办 |
| 实现 IEventPublisher | FreeRedis XADD 发布                 | 📋 待办 |
| 实现 IEventConsumer  | FreeRedis XREADGROUP 消费           | 📋 待办 |
| 实现幂等去重         | 基于 eventId 的去重机制             | 📋 待办 |
| 实现 Pending 回收    | 后台服务定期 XCLAIM                 | 📋 待办 |
| 实现 DLQ 处理        | 死信队列写入与查询                  | 📋 待办 |
| Outbox 发布服务      | 后台异步发布 outbox 事件（可选）    | 📋 待办 |

**配置项规范**：

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379",
    "RedisStreams": "localhost:6379"
  },
  "EventBus": {
    "Streams": {
      "ConsumerGroup": "tigercat-admin",
      "BlockMs": 5000,
      "ReadCount": 10,
      "MaxDeliveries": 3,
      "Pending": {
        "ReclaimIntervalSeconds": 60,
        "MinIdleSeconds": 300
      }
    }
  }
}
```

**数据库切换预留**：

```csharp
// Program.cs - 通过配置切换数据库
var dbProvider = builder.Configuration.GetValue<string>("Database:Provider") ?? "InMemory";

builder.Services.AddDbContext<AdminDbContext>(options =>
{
    switch (dbProvider)
    {
        case "InMemory":
            options.UseInMemoryDatabase("TigercatAdmin");
            break;
        case "Sqlite":
            options.UseSqlite(builder.Configuration.GetConnectionString("Sqlite"));
            break;
        case "PostgreSQL":
            options.UseNpgsql(builder.Configuration.GetConnectionString("PostgreSQL"));
            break;
    }
});
```

---

### Phase 2：用户与权限系统 👥

> **目标**：实现完整的用户管理、角色管理、RBAC 权限控制

**预计周期**：2-3 周

#### 2.1 用户管理模块

| 任务         | 后端                     | 前端            | 状态    |
| ------------ | ------------------------ | --------------- | ------- |
| 用户列表 API | `GET /api/users`         | 表格展示 + 分页 | 📋 待办 |
| 用户详情 API | `GET /api/users/{id}`    | 详情弹窗/抽屉   | 📋 待办 |
| 创建用户 API | `POST /api/users`        | 表单弹窗        | 📋 待办 |
| 更新用户 API | `PUT /api/users/{id}`    | 编辑表单        | 📋 待办 |
| 删除用户 API | `DELETE /api/users/{id}` | 确认弹窗        | 📋 待办 |
| 批量操作     | 批量删除/启用/禁用       | 多选操作栏      | 📋 待办 |
| 搜索筛选     | 查询参数支持             | 搜索框 + 筛选器 | 📋 待办 |

**用户实体扩展**：

```csharp
public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public string? Email { get; set; }
    public string? Avatar { get; set; }
    public bool IsEnabled { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // 关联
    public ICollection<UserRole> UserRoles { get; set; } = [];
}
```

#### 2.2 角色管理模块

| 任务         | 后端                              | 前端         | 状态    |
| ------------ | --------------------------------- | ------------ | ------- |
| 角色列表 API | `GET /api/roles`                  | 表格展示     | 📋 待办 |
| 创建角色 API | `POST /api/roles`                 | 表单弹窗     | 📋 待办 |
| 更新角色 API | `PUT /api/roles/{id}`             | 编辑表单     | 📋 待办 |
| 删除角色 API | `DELETE /api/roles/{id}`          | 确认弹窗     | 📋 待办 |
| 权限配置 API | `PUT /api/roles/{id}/permissions` | 权限树选择器 | 📋 待办 |
| 用户分配     | 角色关联用户                      | 穿梭框/多选  | 📋 待办 |

**角色与权限实体**：

```csharp
public class Role
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public ICollection<RolePermission> RolePermissions { get; set; } = [];
    public ICollection<UserRole> UserRoles { get; set; } = [];
}

public class Permission
{
    public int Id { get; set; }
    public required string Code { get; set; }      // e.g., "user:create"
    public required string Name { get; set; }      // e.g., "创建用户"
    public string? ParentCode { get; set; }        // 父级权限
}
```

#### 2.3 权限控制集成

| 任务          | 说明                                         | 状态    |
| ------------- | -------------------------------------------- | ------- |
| 权限中间件    | 基于角色的 API 访问控制                      | 📋 待办 |
| 权限端点      | `GET /api/auth/permissions` 获取当前用户权限 | 📋 待办 |
| 前端权限存储  | 登录后缓存权限列表                           | 📋 待办 |
| 权限指令/Hook | `v-permission` / `usePermission()`           | 📋 待办 |
| 菜单权限控制  | 根据权限动态渲染菜单                         | 📋 待办 |
| 按钮权限控制  | 根据权限显示/隐藏操作按钮                    | 📋 待办 |

---

### Phase 3：数据展示模块 📊

> **目标**：实现仪表板增强、数据表格、图表展示、数据导出

**预计周期**：2-3 周

#### 3.1 仪表板增强

| 任务     | 说明                       | 组件验证                 | 状态    |
| -------- | -------------------------- | ------------------------ | ------- |
| 统计卡片 | 用户数、角色数、今日登录等 | `Card`, `Badge`          | 📋 待办 |
| 趋势图表 | 用户增长趋势、登录统计     | `LineChart`, `AreaChart` | 📋 待办 |
| 饼图展示 | 角色分布、权限使用情况     | `PieChart`, `DonutChart` | 📋 待办 |
| 柱状图   | 月度活跃用户对比           | `BarChart`               | 📋 待办 |
| 数据刷新 | 手动/自动刷新机制          | `Button`, `Loading`      | 📋 待办 |
| 时间筛选 | 日期范围选择器             | `DatePicker`             | 📋 待办 |

#### 3.2 数据表格功能

| 任务     | 说明             | 组件验证               | 状态    |
| -------- | ---------------- | ---------------------- | ------- |
| 基础表格 | 列定义、数据绑定 | `Table`                | 📋 待办 |
| 排序功能 | 列头点击排序     | `Table`                | 📋 待办 |
| 筛选功能 | 列筛选器         | `Table`, `Select`      | 📋 待办 |
| 分页功能 | 分页器集成       | `Pagination`           | 📋 待办 |
| 行选择   | 单选/多选        | `Table`, `Checkbox`    | 📋 待办 |
| 行展开   | 展开详情区域     | `Table`                | 📋 待办 |
| 固定列   | 左右固定列       | `Table`                | 📋 待办 |
| 自定义列 | 列显示/隐藏切换  | `Checkbox`, `Dropdown` | 📋 待办 |

#### 3.3 数据导出

| 任务     | 说明                               | 状态    |
| -------- | ---------------------------------- | ------- |
| 导出 API | `GET /api/export/users?format=csv` | 📋 待办 |
| 前端下载 | Blob 下载处理                      | 📋 待办 |
| 格式支持 | CSV, Excel, JSON                   | 📋 待办 |
| 导出配置 | 选择导出字段                       | 📋 待办 |

---

### Phase 4：系统设置与优化 ⚙️

> **目标**：系统配置功能、主题切换、性能优化、数据库切换验证

**预计周期**：1-2 周

#### 4.1 系统设置页面

| 任务     | 说明                 | 组件验证                    | 状态    |
| -------- | -------------------- | --------------------------- | ------- |
| 基础设置 | 站点名称、Logo、描述 | `Input`, `Upload`           | 📋 待办 |
| 安全设置 | 密码策略、会话时长   | `Input`, `Switch`, `Slider` | 📋 待办 |
| 通知设置 | 邮件、消息配置       | `Switch`, `Input`           | 📋 待办 |
| 设置保存 | 表单提交与反馈       | `Form`, `Button`, `Message` | 📋 待办 |

#### 4.2 主题与个性化

| 任务     | 说明                | 组件验证                   | 状态    |
| -------- | ------------------- | -------------------------- | ------- |
| 主题切换 | 亮色/暗色模式       | `Switch`, `ConfigProvider` | 📋 待办 |
| 主色调   | 自定义主题色        | `ColorPicker`(如有)        | 📋 待办 |
| 布局设置 | 侧边栏位置、宽度    | `Radio`, `Slider`          | 📋 待办 |
| 偏好存储 | localStorage 持久化 | -                          | 📋 待办 |

#### 4.3 数据库切换验证

| 任务            | 说明                   | 状态    |
| --------------- | ---------------------- | ------- |
| SQLite 集成     | 添加 SQLite Provider   | 📋 待办 |
| 迁移脚本        | EF Core Migrations     | 📋 待办 |
| 配置切换        | appsettings 多环境配置 | 📋 待办 |
| 功能验证        | 全流程回归测试         | 📋 待办 |
| PostgreSQL 预留 | 文档说明 + 配置示例    | 📋 待办 |

#### 4.4 性能优化

| 任务         | 说明                 | 状态    |
| ------------ | -------------------- | ------- |
| 路由懒加载   | 动态 import 页面组件 | 📋 待办 |
| 组件按需引入 | Tree-shaking 优化    | 📋 待办 |
| API 响应缓存 | 适当的缓存策略       | 📋 待办 |
| 虚拟滚动     | 大数据表格优化       | 📋 待办 |

---

## 🧩 组件覆盖矩阵

> 追踪 Tigercat UI 组件在项目中的使用情况，确保全面验证

### 基础组件 (Basic)

| 组件      | 计划场景                 | Phase | 状态      |
| --------- | ------------------------ | ----- | --------- |
| `Button`  | 全局：表单提交、操作按钮 | 1     | ✅ 已使用 |
| `Icon`    | 全局：菜单图标、操作图标 | 1     | 📋 待验证 |
| `Text`    | 全局：文本展示           | 1     | ✅ 已使用 |
| `Code`    | 关于页：版本信息展示     | 4     | 📋 待验证 |
| `Link`    | 全局：链接跳转           | 1     | 📋 待验证 |
| `Tag`     | 用户列表：状态标签       | 2     | 📋 待验证 |
| `Badge`   | 仪表板：统计数字         | 3     | 📋 待验证 |
| `Avatar`  | 用户头像展示             | 2     | 📋 待验证 |
| `Divider` | 表单分隔、内容分隔       | 2     | 📋 待验证 |

### 布局组件 (Layout)

| 组件           | 计划场景           | Phase | 状态          |
| -------------- | ------------------ | ----- | ------------- |
| `Space`        | 按钮组、表单项间距 | 1     | ✅ 已使用     |
| `Grid`         | 仪表板卡片布局     | 3     | 📋 待验证     |
| `Layout`       | 主布局框架         | 1     | 🔄 上游待完善 |
| `Card`         | 仪表板统计卡片     | 3     | ✅ 已使用     |
| `Collapse`     | 设置页分组折叠     | 4     | 📋 待验证     |
| `List`         | 操作日志列表       | 3     | 📋 待验证     |
| `Descriptions` | 用户详情展示       | 2     | 📋 待验证     |
| `Skeleton`     | 加载占位           | 2     | 📋 待验证     |

### 表单组件 (Form)

| 组件            | 计划场景           | Phase | 状态      |
| --------------- | ------------------ | ----- | --------- |
| `Form`          | 全局：表单容器     | 1     | ✅ 已使用 |
| `Input`         | 全局：文本输入     | 1     | ✅ 已使用 |
| `InputNumber`   | 设置页：数值配置   | 4     | 📋 待验证 |
| `Textarea`      | 角色描述、备注     | 2     | 📋 待验证 |
| `Select`        | 用户角色选择、筛选 | 2     | 📋 待验证 |
| `Checkbox`      | 权限多选           | 2     | 📋 待验证 |
| `CheckboxGroup` | 批量权限配置       | 2     | 📋 待验证 |
| `Radio`         | 单选配置项         | 4     | 📋 待验证 |
| `RadioGroup`    | 布局选择           | 4     | 📋 待验证 |
| `Switch`        | 启用/禁用开关      | 2     | 📋 待验证 |
| `Slider`        | 会话时长设置       | 4     | 📋 待验证 |
| `DatePicker`    | 时间范围筛选       | 3     | 📋 待验证 |
| `TimePicker`    | 定时任务配置       | 4     | 📋 待验证 |
| `Upload`        | 头像上传、Logo上传 | 4     | 📋 待验证 |

### 导航组件 (Navigation)

| 组件         | 计划场景       | Phase | 状态      |
| ------------ | -------------- | ----- | --------- |
| `Breadcrumb` | 页面导航路径   | 1     | 📋 待验证 |
| `Menu`       | 侧边栏菜单     | 1     | ✅ 已使用 |
| `Tabs`       | 用户详情多标签 | 2     | 📋 待验证 |
| `Pagination` | 列表分页       | 2     | 📋 待验证 |
| `Steps`      | 向导式表单     | 4     | 📋 待验证 |
| `Tree`       | 权限树、组织树 | 2     | 📋 待验证 |

### 反馈/浮层组件 (Feedback)

| 组件           | 计划场景           | Phase | 状态      |
| -------------- | ------------------ | ----- | --------- |
| `Message`      | 全局：操作反馈     | 1     | ✅ 已使用 |
| `Modal`        | 确认弹窗、表单弹窗 | 2     | ✅ 已使用 |
| `Notification` | 系统通知           | 3     | 📋 待验证 |
| `Alert`        | 警告信息展示       | 2     | 📋 待验证 |
| `Drawer`       | 用户详情抽屉       | 2     | 📋 待验证 |
| `Popover`      | 快捷操作面板       | 3     | 📋 待验证 |
| `Popconfirm`   | 删除确认           | 2     | 📋 待验证 |
| `Tooltip`      | 图标/按钮提示      | 2     | 📋 待验证 |
| `Dropdown`     | 用户菜单、更多操作 | 1     | 📋 待验证 |
| `Loading`      | 加载状态           | 1     | 📋 待验证 |
| `Progress`     | 上传进度、任务进度 | 4     | 📋 待验证 |

### 数据展示组件 (Data)

| 组件       | 计划场景           | Phase | 状态      |
| ---------- | ------------------ | ----- | --------- |
| `Table`    | 用户列表、角色列表 | 2     | 📋 待验证 |
| `Timeline` | 操作日志时间线     | 3     | 📋 待验证 |

### 图表组件 (Charts)

| 组件         | 计划场景           | Phase | 状态      |
| ------------ | ------------------ | ----- | --------- |
| `LineChart`  | 用户增长趋势       | 3     | 📋 待验证 |
| `AreaChart`  | 登录统计趋势       | 3     | 📋 待验证 |
| `BarChart`   | 月度活跃对比       | 3     | 📋 待验证 |
| `PieChart`   | 角色分布           | 3     | 📋 待验证 |
| `DonutChart` | 权限使用分布       | 3     | 📋 待验证 |
| `RadarChart` | 用户能力图（可选） | 4     | 📋 待验证 |

---

## 📋 任务看板

### Phase 1 - 基础设施升级

#### 📋 待办 (To Do)

**前端路由升级**

- [ ] **[前端-Vue]** 安装 vue-router@4 依赖
- [ ] **[前端-Vue]** 创建 router 目录结构
- [ ] **[前端-Vue]** 配置路由表和守卫
- [ ] **[前端-Vue]** 改造 App.vue 使用 RouterView
- [ ] **[前端-Vue]** 迁移页面组件到路由
- [ ] **[前端-React]** 安装 react-router-dom@6 依赖
- [ ] **[前端-React]** 创建 router 目录结构
- [ ] **[前端-React]** 配置路由表和 ProtectedRoute
- [ ] **[前端-React]** 改造 App.tsx 使用 RouterProvider
- [ ] **[前端-React]** 迁移页面组件到路由

**后端 EF Core 集成**

- [ ] **[后端]** 添加 EF Core InMemory 依赖
- [ ] **[后端]** 创建 AdminDbContext
- [ ] **[后端]** 定义 User, Session, OutboxEvent 实体
- [ ] **[后端]** 改造 IUserStore 为异步接口
- [ ] **[后端]** 改造 ISessionStore 为异步接口
- [ ] **[后端]** 实现 EfUserStore
- [ ] **[后端]** 实现 EfSessionStore
- [ ] **[后端]** 改造认证端点适配异步
- [ ] **[后端]** 配置种子数据初始化

**Redis 缓存与事件总线**

- [ ] **[后端]** 添加 StackExchange.Redis + FreeRedis 依赖
- [ ] **[后端]** 配置 Aspire Redis 容器编排
- [ ] **[后端]** 实现 ICacheService（StackExchange.Redis）
- [ ] **[后端]** 定义 EventEnvelope 事件信封模型
- [ ] **[后端]** 实现 IEventPublisher（FreeRedis XADD）
- [ ] **[后端]** 实现 IEventConsumer（FreeRedis XREADGROUP）
- [ ] **[后端]** 实现幂等去重机制
- [ ] **[后端]** 实现 Pending 回收后台服务
- [ ] **[后端]** 实现 DLQ 死信队列处理

#### 🚧 进行中 (In Progress)

（暂无）

#### ✅ 完成 (Done)

（暂无）

#### 🔄 上游依赖 (Blocked)

- [ ] **Menu 多级菜单支持** → 依赖上游 submenu 功能
- [ ] **Layout 组件** → 依赖上游标准 Admin Layout

---

### Phase 2 - 用户与权限系统

#### 📋 待办 (To Do)

- [ ] **[后端]** 扩展 User 实体（Email, Avatar, IsEnabled）
- [ ] **[后端]** 创建 Role, Permission 实体
- [ ] **[后端]** 实现用户 CRUD API（5个端点）
- [ ] **[后端]** 实现角色 CRUD API（5个端点）
- [ ] **[后端]** 实现权限中间件
- [ ] **[后端]** 实现 `/api/auth/permissions` 端点
- [ ] **[前端-Vue]** 创建用户列表页
- [ ] **[前端-Vue]** 创建用户表单弹窗
- [ ] **[前端-Vue]** 创建角色列表页
- [ ] **[前端-Vue]** 创建角色表单弹窗
- [ ] **[前端-Vue]** 实现权限指令 v-permission
- [ ] **[前端-React]** 创建用户列表页
- [ ] **[前端-React]** 创建用户表单弹窗
- [ ] **[前端-React]** 创建角色列表页
- [ ] **[前端-React]** 创建角色表单弹窗
- [ ] **[前端-React]** 实现 usePermission Hook
- [ ] **[文档]** 更新 API 文档（用户、角色端点）

---

### Phase 3 - 数据展示模块

#### 📋 待办 (To Do)

- [ ] **[后端]** 实现统计数据 API
- [ ] **[后端]** 实现数据导出 API
- [ ] **[前端-Vue]** 增强仪表板（图表集成）
- [ ] **[前端-Vue]** 实现数据表格高级功能
- [ ] **[前端-Vue]** 实现数据导出功能
- [ ] **[前端-React]** 增强仪表板（图表集成）
- [ ] **[前端-React]** 实现数据表格高级功能
- [ ] **[前端-React]** 实现数据导出功能
- [ ] **[验证]** 测试全部图表组件

---

### Phase 4 - 系统设置与优化

#### 📋 待办 (To Do)

- [ ] **[后端]** 实现系统设置 API
- [ ] **[后端]** 集成 SQLite Provider
- [ ] **[后端]** 创建 EF Core Migrations
- [ ] **[前端-Vue]** 创建设置页面
- [ ] **[前端-Vue]** 实现主题切换
- [ ] **[前端-Vue]** 路由懒加载优化
- [ ] **[前端-React]** 创建设置页面
- [ ] **[前端-React]** 实现主题切换
- [ ] **[前端-React]** 路由懒加载优化
- [ ] **[测试]** 数据库切换回归测试
- [ ] **[验证]** 测试剩余未覆盖组件

---

## 🔗 上游需求管理

### 流程说明

1. **发现问题**：在开发过程中发现组件缺陷或功能缺失
2. **记录需求**：在 [upstream-requirements.md](upstream-requirements.md) 添加详细描述
3. **标注状态**：在本文档相关任务标注 `🔄 上游依赖`
4. **跟踪进展**：定期检查上游仓库更新，同步状态
5. **验证完成**：上游修复后进行验证，更新两份文档

### 当前上游依赖项

| 需求              | 文档位置                 | 阻塞任务       | 上游状态  |
| ----------------- | ------------------------ | -------------- | --------- |
| Menu submenu 支持 | upstream-requirements.md | 侧边栏多级菜单 | ⏳ 待处理 |
| Layout 组件       | upstream-requirements.md | 主布局框架     | ⏳ 待处理 |
| Sidebar 组件      | upstream-requirements.md | 侧边栏折叠     | ⏳ 待处理 |

---

## 📊 进度统计

| Phase    | 总任务 | 完成  | 进行中 | 阻塞  | 进度   |
| -------- | ------ | ----- | ------ | ----- | ------ |
| Phase 1  | 29     | 0     | 0      | 2     | 0%     |
| Phase 2  | 16     | 0     | 0      | 0     | 0%     |
| Phase 3  | 9      | 0     | 0      | 0     | 0%     |
| Phase 4  | 11     | 0     | 0      | 0     | 0%     |
| **总计** | **65** | **0** | **0**  | **2** | **0%** |

---

## 📝 变更日志

| 日期       | 变更内容                                                  |
| ---------- | --------------------------------------------------------- |
| 2026-01-28 | 新增 Redis Streams 事件总线架构设计，补充基础设施组件规划 |
| 2026-01-28 | 初始化开发路线图，规划四阶段里程碑                        |
