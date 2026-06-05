# 数据库提供程序说明

## 支持矩阵

| Provider     | 适用场景             | 持久化 | 配置要求                                                                                        |
| ------------ | -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `Sqlite`     | 本地开发默认方案     | 是     | `Database:Provider=Sqlite`，`ConnectionStrings:DefaultConnection=Data Source=tigercat_admin.db` |
| `InMemory`   | 自动化测试、临时验证 | 否     | `Database:Provider=InMemory`                                                                    |
| `PostgreSql` | 生产或独立部署       | 是     | `Database:Provider=PostgreSql`，并提供 PostgreSQL 连接串                                        |

后端会优先读取 `Database:Provider`。如果没有显式配置，为了兼容旧配置，仍然会沿用以下回退逻辑：

- 存在 `ConnectionStrings:DefaultConnection` 时，按 `Sqlite` 处理。
- 不存在 `ConnectionStrings:DefaultConnection` 时，按 `InMemory` 处理。

## 默认开发配置

仓库默认使用 SQLite，本地数据库文件位于 `Tigercat.Admin.Api/tigercat_admin.db`。如果文件不存在，API 启动时会自动创建并应用 SQLite 迁移。

对应配置位于 [Tigercat.Admin.Api/appsettings.json](../Tigercat.Admin.Api/appsettings.json)：

```json
{
  "Database": {
    "Provider": "Sqlite"
  },
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=tigercat_admin.db"
  }
}
```

本地启动：

```bash
cd Tigercat.Admin.Api
dotnet run
```

如果需要重建 SQLite 文件，可删除旧库后重新启动 API，或者先执行：

```bash
cd Tigercat.Admin.Api
dotnet ef database update
```

## 切换到 InMemory

InMemory 仅建议用于测试、临时调试或完全不需要持久化的场景。切换方式：

```bash
export Database__Provider=InMemory
unset ConnectionStrings__DefaultConnection
```

该模式下认证存储和业务数据都保存在进程内，API 重启后数据会全部丢失。

## PostgreSQL 生产配置

生产或独立环境请显式设置为 `PostgreSql`，并提供标准 PostgreSQL 连接串：

```bash
export Database__Provider=PostgreSql
export ConnectionStrings__DefaultConnection="Host=db.example.internal;Port=5432;Database=tigercat_admin;Username=tigercat_admin;Password=<password>;Pooling=true;SSL Mode=Require;Trust Server Certificate=false"
```

PostgreSQL 与 SQLite 共用 EF Core migrations。应用启动会执行 `MigrateAsync`，但生产发布仍建议先生成、评审并执行 SQL artifact，再启动新版本，避免把 schema 变更完全交给应用启动时隐式完成。

推荐同时保留：

- 独立数据库账号，而不是复用超级用户。
- `SSL Mode=Require` 或等价 TLS 配置。
- 生产环境通过密钥管理系统注入密码，不直接写入仓库文件。

## 迁移、种子数据与回滚

- SQLite：API 启动时执行 EF Core migrations，适合本地开发和自动化验证。
- PostgreSQL：API 启动时同样执行 EF Core migrations；生产环境应先生成幂等 SQL 并纳入发布评审。
- 迁移 SQL：仓库提供 design-time `AdminDbContext` factory，生成 SQL 不依赖 Redis 或 API 完整启动。命令会输出到 `artifacts/sql/tigercat-admin-postgres.sql`：

```bash
pnpm db:script:postgres
```

发布建议流程：

1. 备份 PostgreSQL 数据库，并记录当前应用镜像版本。
2. 在 CI 或发布机生成 SQL artifact，人工评审 DDL、索引、外键和潜在数据影响。
3. 在预发库执行 SQL，启动新版本 API，完成 `/api/health`、登录、设置读取和用户列表 smoke。
4. 在生产维护窗口由流水线或 DBA 执行已评审 SQL，再发布 API 与前端镜像。
5. 回滚时优先使用已评审的 Down SQL 或备份恢复；涉及媒体本地存储时同时恢复 `Media:LocalRoot`。

- P7 媒体生产化迁移 `AddMediaProductionFields` 会为 `MediaResources` 增加 provider、storage key、SHA256、图片尺寸和删除标记字段，并建立 `Sha256Hash + SizeBytes` 索引。
- 种子数据：权限、角色、默认管理员、系统设置、通知和任务数据由 `DbInitializer` 幂等写入。已存在的业务数据不会被清空；内置通知会补齐站内 `linkUrl`，内置任务包含阻塞原因和完成说明字段。
- 运维工作流：`AdminTasks` 持久化 `BlockedReason` 与 `CompletionNote`；`AdminNotifications` 继续保存 `GroupKey`、`LinkUrl` 与脱敏元数据。Redis Streams 仍是审计事件来源，事件消费者会把任务、设置、审计保留清理、媒体删除失败和用户治理事件转化为通知。
- 媒体资源表：`MediaResources` 记录 `PublicId`、原始文件名、`StorageProvider`、`StorageKey`、MIME、扩展名、大小、`Sha256Hash`、图片 `Width` / `Height`、上传人和创建时间；`MediaReferences` 记录 `site.logo`、`user.avatar` 等引用来源。
- 媒体删除治理：单个或批量删除媒体时，如资源仍被引用，普通删除不删除任何文件或记录，并发布 `admin.media.delete.failed` 到 `stream:admin`；强制删除只会清理已知 `site.logo` 和 `user.avatar` 引用，并发布 `admin.media.delete.forced`。未知业务引用始终阻止删除。
- 媒体文件治理：上传会校验大小、MIME、扩展名匹配、图片尺寸并计算 SHA256；同内容重复上传返回已有媒体资源。`POST /api/media/orphans/cleanup` 可预览或清理本地存储中无数据库记录的孤儿文件。
- 权限漂移识别：`security.permissionSeedVersion` 和 `security.permissionSeedChecksum` 会写入系统设置，用于识别权限目录版本和摘要。
- 回滚：发布前备份数据库；生产使用本地媒体存储时同时备份 `Media:LocalRoot` 目录。若应用回滚但 schema 已发生不兼容变化，应先执行已评审的回滚 SQL 或从备份恢复，再启动旧版本应用。

## 回归验证

数据库切换相关的自动化回归测试包括：

- InMemory 集成回归：验证 API 在无持久化 provider 下可正常登录、鉴权和读写数据。
- SQLite 集成回归：验证 SQLite 启动、迁移和 EF 存储路径。
- Provider 解析测试：验证 `Database:Provider` 对 `InMemory`、`Sqlite`、`PostgreSql` 的解析，以及缺失连接串时的失败行为。
- Design-time factory 测试：验证 `dotnet ef` 可以在 PostgreSQL provider 下创建 `AdminDbContext` 并生成发布 SQL。

建议命令：

```bash
dotnet test Tigercat.Admin.sln
pnpm db:script:postgres
```

如果要在部署前做 PostgreSQL 冒烟验证，至少补一轮真实环境检查：

1. 使用 `Database__Provider=PostgreSql` 和目标连接串启动 API。
2. 调用 `/api/health` 与 `/api/info`，确认服务可用。
3. 完成一次登录、设置读取和用户列表读取，确认认证与 EF 查询链路可用。
