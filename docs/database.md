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

仓库默认使用 SQLite，本地数据库文件位于 [Tigercat.Admin.Api/tigercat_admin.db](../Tigercat.Admin.Api/tigercat_admin.db)。如果文件不存在，API 启动时会自动创建并应用 SQLite 迁移。

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

当前样例在 PostgreSQL 下会在启动时自动建表，适合配置验证和样例部署。若需要严格的变更审计、灰度发布或 DBA 托管迁移，请将 PostgreSQL 的 schema 迁移独立到部署流程中，而不要完全依赖应用启动。

推荐同时保留：

- 独立数据库账号，而不是复用超级用户。
- `SSL Mode=Require` 或等价 TLS 配置。
- 生产环境通过密钥管理系统注入密码，不直接写入仓库文件。

## 回归验证

数据库切换相关的自动化回归测试包括：

- InMemory 集成回归：验证 API 在无持久化 provider 下可正常登录、鉴权和读写数据。
- SQLite 集成回归：验证 SQLite 启动、迁移和 EF 存储路径。
- Provider 解析测试：验证 `Database:Provider` 对 `InMemory`、`Sqlite`、`PostgreSql` 的解析，以及缺失连接串时的失败行为。

建议命令：

```bash
dotnet test Tigercat.Admin.sln
```

如果要在部署前做 PostgreSQL 冒烟验证，至少补一轮真实环境检查：

1. 使用 `Database__Provider=PostgreSql` 和目标连接串启动 API。
2. 调用 `/api/health` 与 `/api/info`，确认服务可用。
3. 完成一次登录、设置读取和用户列表读取，确认认证与 EF 查询链路可用。
