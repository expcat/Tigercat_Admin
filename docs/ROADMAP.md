# 开发路线图 (ROADMAP)

> **项目定位**：演示 & 验证项目，以模拟全功能后台管理系统为载体，磨合 .NET 10 + Tigercat UI 组件库，持续优化并反馈上游组件需求。

**最后更新**：2026-02-25

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

> **目标**：完成路由库集成、EF Core 内存数据库改造、Redis 集成，为后续功能开发奠定基础

#### 1.1 前端路由升级

**当前状态分析**：

- 两端均使用手写 Hash 路由（`window.location.hash` + `hashchange` 事件）
- 路由逻辑分散在 `App.vue/tsx`、`utils/auth.ts`、`utils/constants.ts`
- 页面切换通过条件渲染实现，无法支持嵌套路由和路由守卫

**改造目标**：

| 任务           | Vue 项目               | React 项目                |
| -------------- | ---------------------- | ------------------------- |
| 安装路由依赖   | `vue-router@4`         | `react-router-dom@6`      |
| 创建路由配置   | `src/router/index.ts`  | `src/router/index.tsx`    |
| 定义路由表     | `src/router/routes.ts` | `src/router/routes.tsx`   |
| 实现路由守卫   | `beforeEach` 导航守卫  | `ProtectedRoute` 高阶组件 |
| 改造 App 组件  | 使用 `<RouterView>`    | 使用 `<RouterProvider>`   |
| 改造页面导航   | `router.push()`        | `useNavigate()`           |
| 移除旧路由代码 | 删除 hash 路由逻辑     | 删除 hash 路由逻辑        |

**需要移除的旧代码**：

| 文件                  | 移除内容                                         |
| --------------------- | ------------------------------------------------ |
| `utils/auth.ts`       | `getPageFromHash()` 函数                         |
| `utils/constants.ts`  | `PAGE_KEYS` 常量                                 |
| `App.vue` / `App.tsx` | `page` 状态、`hashchange` 监听、条件渲染页面逻辑 |

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

**路由守卫逻辑**：

```typescript
// 认证守卫伪代码
beforeEach((to, from, next) => {
  const isAuthenticated = !!getSession();

  // 需要认证但未登录 → 跳转登录页
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login', query: { redirect: to.fullPath } });
  }

  // 已登录访问登录/注册页 → 跳转首页
  if (isAuthenticated && ['Login', 'Register'].includes(to.name)) {
    return next({ name: 'Dashboard' });
  }

  next();
});
```

#### 1.2 后端 EF Core 集成

**当前状态分析**：

- 使用 `InMemoryUserStore` 和 `InMemorySessionStore`（`ConcurrentDictionary` 存储）
- 接口为**同步**设计（`bool TryCreateUser(...)` 等）
- 无 EF Core 依赖，无 `Data/` 目录

**改造目标**：

| 任务              | 说明                                                     |
| ----------------- | -------------------------------------------------------- |
| 添加 EF Core 依赖 | `Microsoft.EntityFrameworkCore.InMemory`                 |
| 创建 DbContext    | `Data/AdminDbContext.cs` + 实体配置                      |
| 定义实体类        | `User`, `Session` (Phase 1)；`Role`, `Permission` 预留   |
| 接口异步化        | `IUserStore`, `ISessionStore` 方法改为 `Task<T>` 返回    |
| 实现 EF Store     | `EfUserStore`, `EfSessionStore` 基于 DbContext           |
| 适配调用方        | `AuthEndpoints`, `HomeEndpoints`, `LoginFilter` 改为异步 |
| 种子数据          | 保留默认用户 `admin/admin123`                            |

**接口异步化对照表**：

| 原方法签名                                       | 异步化后签名                                                    |
| ------------------------------------------------ | --------------------------------------------------------------- |
| `bool TryCreateUser(username, passwordHash)`     | `Task<bool> TryCreateUserAsync(username, passwordHash, ct)`     |
| `bool ValidateUser(username, passwordHash)`      | `Task<bool> ValidateUserAsync(username, passwordHash, ct)`      |
| `bool UpdatePassword(username, newPasswordHash)` | `Task<bool> UpdatePasswordAsync(username, newPasswordHash, ct)` |
| `bool Exists(username)`                          | `Task<bool> ExistsAsync(username, ct)`                          |
| `SessionRecord CreateSession(username, ttl)`     | `Task<SessionRecord> CreateSessionAsync(username, ttl, ct)`     |
| `SessionRecord? ValidateSession(token)`          | `Task<SessionRecord?> ValidateSessionAsync(token, ct)`          |
| `void Revoke(token)`                             | `Task RevokeAsync(token, ct)`                                   |

**实体定义**：

```csharp
// Data/Entities/User.cs
public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

// Data/Entities/Session.cs
public class Session
{
    public int Id { get; set; }
    public required string Token { get; set; }
    public required string Username { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
```

**目录结构变更**：

```
Tigercat.Admin.Api/
├── Data/                        # [新增]
│   ├── AdminDbContext.cs
│   └── Entities/
│       ├── User.cs
│       └── Session.cs
├── Auth/
│   ├── IUserStore.cs            # [改造] 异步接口
│   ├── ISessionStore.cs         # [改造] 异步接口
│   ├── InMemoryUserStore.cs     # [改造] 实现异步接口
│   ├── InMemorySessionStore.cs  # [改造] 实现异步接口
│   ├── EfUserStore.cs           # [新增]
│   ├── EfSessionStore.cs        # [新增]
│   └── LoginFilter.cs           # [改造] 调用异步方法
└── Endpoints/
    ├── AuthEndpoints.cs         # [改造] 调用异步方法
    └── HomeEndpoints.cs         # [改造] 调用异步方法
```

#### 1.3 Redis 缓存与事件总线集成

**依赖说明**：此模块依赖 1.2 后端 EF Core 集成完成后进行。

**改造目标**：

| 任务                 | 说明                                                  |
| -------------------- | ----------------------------------------------------- |
| 添加 Redis 依赖      | `StackExchange.Redis`（缓存）+ `FreeRedis`（Streams） |
| 配置 Aspire Redis    | `AppHost.cs` 添加 Redis 容器编排                      |
| 实现 ICacheService   | 基于 StackExchange.Redis 的缓存服务封装               |
| 定义事件信封模型     | `EventEnvelope` 统一事件格式                          |
| 实现 IEventPublisher | 基于 FreeRedis 的 XADD 发布实现                       |
| 实现 IEventConsumer  | 基于 FreeRedis 的 XREADGROUP 消费实现                 |
| 实现幂等去重         | 基于 `eventId` 的去重机制                             |
| 实现 Pending 回收    | 后台服务定期 XCLAIM 处理超时消息                      |
| 实现 DLQ 处理        | 死信队列写入与查询（超过重试次数的消息）              |

**目录结构变更**：

```
Tigercat.Admin.Api/
├── Caching/                     # [新增]
│   ├── ICacheService.cs
│   └── RedisCacheService.cs
├── EventBus/                    # [新增]
│   ├── EventEnvelope.cs         # 事件信封模型
│   ├── IEventPublisher.cs       # 发布接口
│   ├── IEventConsumer.cs        # 消费接口
│   ├── RedisStreamPublisher.cs  # FreeRedis 发布实现
│   ├── RedisStreamConsumer.cs   # FreeRedis 消费实现
│   └── PendingReclaimService.cs # 后台回收服务
```

**Aspire 编排变更**：

```csharp
// Tigercat.Aspire/AppHost.cs
var redis = builder.AddRedis("redis");

var api = builder.AddProject<Projects.Tigercat_Admin_Api>("api")
    .WithReference(redis);  // [新增] 注入 Redis 连接
```

**配置项规范**：

```json
{
  "ConnectionStrings": {
    "Redis": "localhost:6379"
  },
  "EventBus": {
    "Streams": {
      "ConsumerGroup": "tigercat-admin",
      "BlockMs": 5000,
      "ReadCount": 10,
      "MaxDeliveries": 3
    }
  }
}
```

#### 1.4 新增页面组件

**依赖说明**：此模块依赖 1.1 前端路由升级完成后进行。

**需要新增的页面**（双端同步）：

| 页面         | 路由路径           | 功能说明     | 关联组件验证      |
| ------------ | ------------------ | ------------ | ----------------- |
| UsersPage    | `/system/users`    | 用户管理列表 | Table, Pagination |
| RolesPage    | `/system/roles`    | 角色管理列表 | Table, Tag        |
| SettingsPage | `/system/settings` | 系统设置表单 | Form, Switch      |
| AboutPage    | `/about`           | 关于页面     | Card, Text        |

**页面组件目录结构**：

```
src/pages/
├── auth/
│   ├── Login.vue/tsx      # [已有]
│   └── Register.vue/tsx   # [已有]
├── dashboard/
│   └── Home.vue/tsx       # [已有]
├── system/                # [新增]
│   ├── Users.vue/tsx
│   ├── Roles.vue/tsx
│   └── Settings.vue/tsx
└── about/                 # [新增]
    └── About.vue/tsx
```

**数据库切换预留**（Phase 4 使用）：

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

**前置依赖**：Phase 1 完成

#### 2.1 用户管理模块

**后端 API 设计**：

| 端点               | 方法   | 功能     | 请求体/参数                           |
| ------------------ | ------ | -------- | ------------------------------------- | -------- | ------------ |
| `/api/users`       | GET    | 用户列表 | `?page=1&size=10&keyword=&enabled=`   |
| `/api/users/{id}`  | GET    | 用户详情 | -                                     |
| `/api/users`       | POST   | 创建用户 | `{ username, password, email?, ... }` |
| `/api/users/{id}`  | PUT    | 更新用户 | `{ email?, avatar?, isEnabled, ... }` |
| `/api/users/{id}`  | DELETE | 删除用户 | -                                     |
| `/api/users/batch` | POST   | 批量操作 | `{ ids: [], action: 'delete'          | 'enable' | 'disable' }` |

**前端页面功能**：

| 功能     | 组件验证                  | 说明                     |
| -------- | ------------------------- | ------------------------ |
| 用户列表 | `Table`, `Pagination`     | 分页展示用户数据         |
| 搜索筛选 | `Input`, `Select`         | 按用户名搜索、按状态筛选 |
| 创建用户 | `Modal`, `Form`, `Input`  | 弹窗表单创建新用户       |
| 编辑用户 | `Modal`, `Form`, `Switch` | 弹窗表单编辑用户信息     |
| 删除确认 | `Popconfirm` 或 `Modal`   | 删除前二次确认           |
| 批量操作 | `Checkbox`, `Button`      | 多选后批量删除/启用/禁用 |
| 用户详情 | `Drawer` 或 `Modal`       | 展示用户完整信息         |

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

**后端 API 设计**：

| 端点                          | 方法   | 功能       | 请求体/参数                            |
| ----------------------------- | ------ | ---------- | -------------------------------------- |
| `/api/roles`                  | GET    | 角色列表   | `?page=1&size=10`                      |
| `/api/roles/{id}`             | GET    | 角色详情   | -                                      |
| `/api/roles`                  | POST   | 创建角色   | `{ name, description?, permissions }`  |
| `/api/roles/{id}`             | PUT    | 更新角色   | `{ name?, description?, permissions }` |
| `/api/roles/{id}`             | DELETE | 删除角色   | -                                      |
| `/api/roles/{id}/permissions` | PUT    | 配置权限   | `{ permissions: string[] }`            |
| `/api/roles/{id}/users`       | GET    | 角色下用户 | -                                      |

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
    public string? ParentCode { get; set; }        // 父级权限，用于树形展示
}

// 关联表
public class UserRole
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;
}

public class RolePermission
{
    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;
    public int PermissionId { get; set; }
    public Permission Permission { get; set; } = null!;
}
```

#### 2.3 权限控制集成

**后端权限中间件**：

```csharp
// 权限验证过滤器
public class PermissionFilter(string requiredPermission) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(
        EndpointFilterInvocationContext ctx,
        EndpointFilterDelegate next)
    {
        var permissions = ctx.HttpContext.Items["Permissions"] as string[];
        if (permissions?.Contains(requiredPermission) != true)
        {
            return Results.Json(ApiResponse.Fail(403, "权限不足"), statusCode: 403);
        }
        return await next(ctx);
    }
}

// 端点使用示例
app.MapPost("/api/users", CreateUser)
   .AddEndpointFilter(new PermissionFilter("user:create"));
```

**前端权限控制**：

| 实现方式      | Vue                      | React                      |
| ------------- | ------------------------ | -------------------------- |
| 权限存储      | `usePermissionStore()`   | `PermissionContext`        |
| 权限指令/Hook | `v-permission="code"`    | `usePermission(code)`      |
| 菜单权限      | 根据权限过滤菜单项       | 根据权限过滤菜单项         |
| 按钮权限      | `v-if="hasPermission()"` | `{hasPermission && <Btn>}` |

**权限码设计规范**：

```
user:list      - 查看用户列表
user:detail    - 查看用户详情
user:create    - 创建用户
user:update    - 更新用户
user:delete    - 删除用户
role:list      - 查看角色列表
role:create    - 创建角色
role:update    - 更新角色
role:delete    - 删除角色
role:assign    - 分配角色权限
system:settings - 系统设置
```

---

### Phase 3：数据展示模块 📊

> **目标**：实现仪表板增强、数据表格高级功能、图表展示、数据导出

**前置依赖**：Phase 2 完成

#### 3.1 仪表板增强

**统计数据 API**：

| 端点                      | 功能     | 返回数据                     |
| ------------------------- | -------- | ---------------------------- |
| `/api/stats/overview`     | 总览统计 | 用户数、角色数、今日登录数   |
| `/api/stats/trend`        | 趋势数据 | 近 7/30 天用户增长、登录趋势 |
| `/api/stats/distribution` | 分布数据 | 角色分布、权限使用分布       |

**仪表板组件**：

| 组件     | 说明                       | 组件验证                 |
| -------- | -------------------------- | ------------------------ |
| 统计卡片 | 用户数、角色数、今日登录等 | `Card`, `Badge`          |
| 趋势图表 | 用户增长趋势、登录统计     | `LineChart`, `AreaChart` |
| 饼图展示 | 角色分布、权限使用情况     | `PieChart`, `DonutChart` |
| 柱状图   | 月度活跃用户对比           | `BarChart`               |
| 数据刷新 | 手动/自动刷新机制          | `Button`, `Loading`      |
| 时间筛选 | 日期范围选择器             | `DatePicker`             |

#### 3.2 数据表格高级功能

| 功能     | 说明             | 组件验证               |
| -------- | ---------------- | ---------------------- |
| 基础表格 | 列定义、数据绑定 | `Table`                |
| 排序功能 | 列头点击排序     | `Table`                |
| 筛选功能 | 列筛选器         | `Table`, `Select`      |
| 分页功能 | 分页器集成       | `Pagination`           |
| 行选择   | 单选/多选        | `Table`, `Checkbox`    |
| 行展开   | 展开详情区域     | `Table`                |
| 固定列   | 左右固定列       | `Table`                |
| 自定义列 | 列显示/隐藏切换  | `Checkbox`, `Dropdown` |

#### 3.3 数据导出

**导出 API 设计**：

| 端点                | 功能     | 参数         |
| ------------------- | -------- | ------------ | ---- | ---------------- |
| `/api/export/users` | 导出用户 | `?format=csv | xlsx | json&fields=...` |
| `/api/export/roles` | 导出角色 | `?format=csv | xlsx | json`            |

**前端实现**：

- 导出按钮触发 API 请求
- 使用 Blob 处理文件下载
- 支持选择导出字段
- 支持 CSV、Excel、JSON 格式

---

### Phase 4：系统设置与优化 ⚙️

> **目标**：系统配置功能、主题切换、性能优化、数据库切换验证

**前置依赖**：Phase 3 完成

#### 4.1 系统设置页面

**设置项设计**：

| 分类     | 设置项               | 组件验证                    |
| -------- | -------------------- | --------------------------- |
| 基础设置 | 站点名称、Logo、描述 | `Input`, `Upload`           |
| 安全设置 | 密码策略、会话时长   | `Input`, `Switch`, `Slider` |
| 通知设置 | 邮件、消息配置       | `Switch`, `Input`           |

**后端 API**：

| 端点            | 方法 | 功能         |
| --------------- | ---- | ------------ |
| `/api/settings` | GET  | 获取系统设置 |
| `/api/settings` | PUT  | 更新系统设置 |

#### 4.2 主题与个性化

| 功能     | 说明                | 组件验证                   |
| -------- | ------------------- | -------------------------- |
| 主题切换 | 亮色/暗色模式       | `Switch`, `ConfigProvider` |
| 主色调   | 自定义主题色        | `ColorPicker`（如有）      |
| 布局设置 | 侧边栏位置、宽度    | `Radio`, `Slider`          |
| 偏好存储 | localStorage 持久化 | -                          |

#### 4.3 数据库切换验证

| 任务            | 说明                                        |
| --------------- | ------------------------------------------- |
| SQLite 集成     | 添加 `Microsoft.EntityFrameworkCore.Sqlite` |
| 迁移脚本        | EF Core Migrations 生成与执行               |
| 配置切换        | `appsettings.{env}.json` 多环境配置         |
| 功能验证        | 全流程回归测试                              |
| PostgreSQL 预留 | 文档说明 + 配置示例                         |

#### 4.4 性能优化

| 优化项       | 说明                         |
| ------------ | ---------------------------- |
| 路由懒加载   | `() => import('./Page.vue')` |
| 组件按需引入 | Tree-shaking 优化包体积      |
| API 响应缓存 | 适当的缓存策略（SWR 模式）   |
| 虚拟滚动     | 大数据表格使用虚拟滚动优化   |

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
| `Tag`     | 用户列表：状态标签       | 2     | ✅ 已使用 |
| `Badge`   | 仪表板：统计数字         | 3     | 📋 待验证 |
| `Avatar`  | 用户头像展示             | 2     | ✅ 已使用 |
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
| `Descriptions` | 用户详情展示       | 2     | ⏭️ 跳过（Phase 2 使用 Modal 展示详情） |
| `Skeleton`     | 加载占位           | 2     | 📋 待验证     |

### 表单组件 (Form)

| 组件            | 计划场景           | Phase | 状态      |
| --------------- | ------------------ | ----- | --------- |
| `Form`          | 全局：表单容器     | 1     | ✅ 已使用 |
| `Input`         | 全局：文本输入     | 1     | ✅ 已使用 |
| `InputNumber`   | 设置页：数值配置   | 4     | 📋 待验证 |
| `Textarea`      | 角色描述、备注     | 2     | 📋 待验证 |
| `Select`        | 用户角色选择、筛选 | 2     | ✅ 已使用 |
| `Checkbox`      | 权限多选           | 2     | ✅ 已使用 |
| `CheckboxGroup` | 批量权限配置       | 2     | ⏭️ 跳过（使用独立 Checkbox 实现） |
| `Radio`         | 单选配置项         | 4     | 📋 待验证 |
| `RadioGroup`    | 布局选择           | 4     | 📋 待验证 |
| `Switch`        | 启用/禁用开关      | 2     | ⏭️ 跳过（Phase 2 使用 Select 实现状态切换） |
| `Slider`        | 会话时长设置       | 4     | 📋 待验证 |
| `DatePicker`    | 时间范围筛选       | 3     | 📋 待验证 |
| `TimePicker`    | 定时任务配置       | 4     | 📋 待验证 |
| `Upload`        | 头像上传、Logo上传 | 4     | 📋 待验证 |

### 导航组件 (Navigation)

| 组件         | 计划场景       | Phase | 状态      |
| ------------ | -------------- | ----- | --------- |
| `Breadcrumb` | 页面导航路径   | 1     | 📋 待验证 |
| `Menu`       | 侧边栏菜单     | 1     | ✅ 已使用 |
| `Tabs`       | 用户详情多标签 | 2     | ⏭️ 跳过（Phase 2 未实现多标签详情） |
| `Pagination` | 列表分页       | 2     | ✅ 已使用 |
| `Steps`      | 向导式表单     | 4     | 📋 待验证 |
| `Tree`       | 权限树、组织树 | 2     | ⏭️ 跳过（权限使用扁平 Checkbox/Select 实现） |

### 反馈/浮层组件 (Feedback)

| 组件           | 计划场景           | Phase | 状态      |
| -------------- | ------------------ | ----- | --------- |
| `Message`      | 全局：操作反馈     | 1     | ✅ 已使用 |
| `Modal`        | 确认弹窗、表单弹窗 | 2     | ✅ 已使用 |
| `Notification` | 系统通知           | 3     | 📋 待验证 |
| `Alert`        | 警告信息展示       | 2     | ✅ 已使用 |
| `Drawer`       | 用户详情抽屉       | 2     | ⏭️ 跳过（Phase 2 使用 Modal 替代） |
| `Popover`      | 快捷操作面板       | 3     | 📋 待验证 |
| `Popconfirm`   | 删除确认           | 2     | ⏭️ 跳过（Phase 2 使用 Modal 实现删除确认） |
| `Tooltip`      | 图标/按钮提示      | 2     | 📋 待验证 |
| `Dropdown`     | 用户菜单、更多操作 | 1     | 📋 待验证 |
| `Loading`      | 加载状态           | 1     | 📋 待验证 |
| `Progress`     | 上传进度、任务进度 | 4     | 📋 待验证 |

### 数据展示组件 (Data)

| 组件       | 计划场景           | Phase | 状态      |
| ---------- | ------------------ | ----- | --------- |
| `Table`    | 用户列表、角色列表 | 2     | ✅ 已使用 |
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

### Phase 2 组件覆盖验证小结

> 验证日期：2026-02-25（Issue #42）

**已验证通过的 Phase 2 组件**：

| 组件 | Vue 项目 | React 项目 | 使用场景说明 |
|------|----------|------------|-------------|
| `Table` | ✅ UsersPage, RolesPage | ✅ UsersPage, RolesPage | 用户/角色列表展示，支持排序、行选择 |
| `Pagination` | ✅ 通过 Table pagination prop | ✅ 通过 Table pagination prop | 分页切换、每页条数切换，非独立组件 |
| `Tag` | ✅ UsersPage, RolesPage | ✅ UsersPage, RolesPage | 用户状态标签、角色标签、权限数/关联用户数展示 |
| `Select` | ✅ UsersPage, RolesPage | ✅ UsersPage, RolesPage | 状态筛选、角色多选、权限多选 |
| `Checkbox` | ✅ RolesPage | ❌ 未使用（使用 Select 多选替代） | Vue 端权限配置弹窗使用分组 Checkbox |
| `Modal` | ✅ UsersPage, RolesPage | ✅ UsersPage, RolesPage | 创建/编辑表单弹窗、删除确认弹窗 |
| `Alert` | ✅ HomePage, AboutPage | ✅ HomePage, AboutPage | 信息提示展示 |
| `Avatar` | ✅ MainHeader | ✅ MainHeader | 用户头像展示 |

**设计决策导致跳过的组件**：

| 组件 | 原计划场景 | 实际替代方案 | 说明 |
|------|-----------|-------------|------|
| `Tree` | 权限树形展示 | Checkbox 分组 (Vue) / Select 多选 (React) | 当前权限结构为扁平列表，无需树形展示 |
| `Drawer` | 用户详情抽屉 | Modal 弹窗 | 用户详情通过编辑弹窗查看，无独立详情视图 |
| `Switch` | 用户启用/禁用 | Select 下拉选择 | 状态切换使用 Select 组件实现 |
| `Popconfirm` | 删除确认 | Modal 确认弹窗 | 删除操作通过独立 Modal 进行二次确认 |
| `Tabs` | 用户详情多标签 | 未实现 | Phase 2 未实现多标签详情视图 |
| `CheckboxGroup` | 批量权限配置 | 独立 Checkbox | Vue 端使用独立 Checkbox 实现分组逻辑 |
| `Descriptions` | 用户详情展示 | Modal 内 Form | 详情通过编辑表单展示 |

**双端一致性说明**：

- Vue 与 React 在核心组件（Table, Tag, Select, Modal, Form）的使用上保持一致
- 唯一差异：Vue 端 RolesPage 权限配置使用 `Checkbox` 分组勾选，React 端使用 `Select` 多选；两种方式均可正常工作，交互逻辑略有不同

---

## 📋 任务看板

> 详细开发计划文档见 [docs/plan/](plan/) 目录

### Phase 1 - 基础设施升级

#### 1.1 前端路由升级

- [ ] **[Vue]** 安装 vue-router@4 + 创建路由结构
- [ ] **[Vue]** 实现路由守卫（认证检查）
- [ ] **[Vue]** 改造 App.vue 使用 RouterView
- [ ] **[Vue]** 页面组件适配路由导航
- [ ] **[Vue]** 清理旧 hash 路由代码
- [ ] **[React]** 安装 react-router-dom@6 + 创建路由结构
- [ ] **[React]** 实现 ProtectedRoute 组件
- [ ] **[React]** 改造 App.tsx 使用 RouterProvider
- [ ] **[React]** 页面组件适配路由导航
- [ ] **[React]** 清理旧 hash 路由代码

#### 1.2 后端 EF Core 集成

- [ ] **[后端]** 添加 EF Core InMemory 依赖
- [ ] **[后端]** 创建实体类（User, Session）
- [ ] **[后端]** 创建 AdminDbContext
- [ ] **[后端]** IUserStore / ISessionStore 接口异步化
- [ ] **[后端]** 更新 InMemory 实现为异步
- [ ] **[后端]** 实现 EfUserStore / EfSessionStore
- [ ] **[后端]** 改造 AuthEndpoints 适配异步
- [ ] **[后端]** 改造 LoginFilter 适配异步
- [ ] **[后端]** 服务注册 + 种子数据初始化

#### 1.3 Redis 集成（依赖 1.2 完成）

- [ ] **[后端]** 添加 Redis 依赖（StackExchange.Redis + FreeRedis）
- [ ] **[Aspire]** 配置 Redis 容器编排
- [ ] **[后端]** 实现 ICacheService
- [ ] **[后端]** 定义 EventEnvelope 模型
- [ ] **[后端]** 实现 IEventPublisher
- [ ] **[后端]** 实现 IEventConsumer
- [ ] **[后端]** 实现幂等去重 + Pending 回收

#### 1.4 新增页面（依赖 1.1 完成）

- [ ] **[双端]** 创建 UsersPage（占位）
- [ ] **[双端]** 创建 RolesPage（占位）
- [ ] **[双端]** 创建 SettingsPage（占位）
- [ ] **[双端]** 创建 AboutPage

#### 🔄 上游阻塞

- [ ] **Menu 多级菜单** → 依赖上游 submenu 功能
- [ ] **Layout 组件** → 依赖上游标准 Admin Layout

---

### Phase 2 - 用户与权限系统

#### 后端

- [ ] 扩展 User 实体（Email, Avatar, IsEnabled）
- [ ] 创建 Role, Permission, UserRole, RolePermission 实体
- [ ] 实现用户 CRUD API（6 个端点）
- [ ] 实现角色 CRUD API（7 个端点）
- [ ] 实现权限验证中间件 PermissionFilter
- [ ] 实现 `/api/auth/permissions` 端点

#### 前端

- [ ] **[Vue]** 用户管理页面（列表、表单、搜索）
- [ ] **[Vue]** 角色管理页面（列表、表单、权限配置）
- [ ] **[Vue]** 实现 `v-permission` 指令
- [ ] **[React]** 用户管理页面
- [ ] **[React]** 角色管理页面
- [ ] **[React]** 实现 `usePermission` Hook

#### 文档

- [ ] 更新 api.md（用户、角色端点）

---

### Phase 3 - 数据展示模块

- [ ] **[后端]** 实现统计数据 API（overview, trend, distribution）
- [ ] **[后端]** 实现数据导出 API
- [ ] **[双端]** 仪表板图表集成
- [ ] **[双端]** 数据表格高级功能（排序、筛选、固定列）
- [ ] **[双端]** 数据导出功能
- [ ] **[验证]** 测试全部图表组件

---

### Phase 4 - 系统设置与优化

- [ ] **[后端]** 系统设置 CRUD API
- [ ] **[后端]** SQLite Provider 集成 + Migrations
- [ ] **[双端]** 设置页面实现
- [ ] **[双端]** 主题切换功能
- [ ] **[双端]** 路由懒加载优化
- [ ] **[测试]** 数据库切换回归测试
- [ ] **[验证]** 剩余组件覆盖验证

---

## 🔗 上游需求管理

### 流程说明

1. **发现问题**：在开发过程中发现组件缺陷或功能缺失
2. **记录需求**：在 [upstream-requirements.md](upstream-requirements.md) 添加详细描述
3. **标注状态**：在本文档相关任务标注 `🔄 上游依赖`
4. **跟踪进展**：定期检查上游仓库更新，同步状态
5. **验证完成**：上游修复后进行验证，更新两份文档

### 当前上游依赖项

| 需求              | 阻塞任务       | 上游状态  | 替代方案            |
| ----------------- | -------------- | --------- | ------------------- |
| Menu submenu 支持 | 侧边栏多级菜单 | ⏳ 待处理 | 先用单级菜单        |
| Layout 组件       | 主布局框架     | ⏳ 待处理 | 自行实现 MainLayout |
| Sidebar 组件      | 侧边栏折叠     | ⏳ 待处理 | 自行实现折叠逻辑    |

---

## 📝 变更日志

| 日期       | 变更内容                                                  |
| ---------- | --------------------------------------------------------- |
| 2026-02-25 | Phase 2 组件覆盖验证完成，更新覆盖矩阵状态（#42）                |
| 2026-01-30 | 优化 ROADMAP 结构，增加详细改造说明、接口设计、代码示例   |
| 2026-01-28 | 新增 Redis Streams 事件总线架构设计，补充基础设施组件规划 |
| 2026-01-28 | 初始化开发路线图，规划四阶段里程碑                        |
