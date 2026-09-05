# Tigercat.Admin.Api

Tigercat Admin 后端 API 服务，基于 .NET 10 Minimal API。

## 技术栈

- .NET 10
- Minimal API
- Aspire ServiceDefaults
- CORS
- OpenAPI + Scalar UI

## 文档

- API 契约索引：[../docs/api.md](../docs/api.md)
- API 专题文档：[../docs/api](../docs/api)
- 运行、数据库、部署和健康检查：[../docs/operations.md](../docs/operations.md)

## OpenAPI

开发环境提供 Scalar，方便对照契约：

- OpenAPI JSON：`/openapi/v1.json`
- Scalar UI：`/scalar`

生产默认关闭这两条路由（会列出内部模型）。仅当 `OpenApi:Enabled=true` 时打开，并要求已登录。权威字段以 [../docs/api.md](../docs/api.md) 及其专题为准，运行与探针见 [../docs/operations.md](../docs/operations.md)。
