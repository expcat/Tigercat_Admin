# 媒体资源 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。管理接口需登录并按端点校验权限；内容读取接口不需要登录。

## 对象

`MediaItemResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 媒体资源 ID |
| `publicId` | string | 公开访问标识 |
| `originalFileName` | string | 原始文件名 |
| `storageProvider` | string | 当前内置为 `Local` |
| `contentType` | string | MIME 类型 |
| `extension` | string \| null | 扩展名 |
| `sizeBytes` | number | 文件大小 |
| `sha256Hash` | string \| null | SHA256 摘要 |
| `width` | number \| null | 图片宽度 |
| `height` | number \| null | 图片高度 |
| `url` | string | 内容访问 URL |
| `uploadedBy` | string \| null | 上传人 |
| `createdAt` | string | UTC 创建时间 |
| `referenceCount` | number | 引用数量 |

详情对象额外包含 `references[]`，元素为 `id`、`referenceType`、`referenceKey`、`displayName`。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` / 返回 | 错误 / 事件 |
| ---------- | ---- | ------------- | ------------- | ----------- |
| `GET /api/media` | `media:view` | Query：`page` 默认 `1`；`pageSize` 默认 `20`、范围 `1-100`；`keyword`；`contentType`；`sortBy=name|size|type|createdAt`；`sortOrder=asc|desc` | 分页媒体对象 | 只返回未删除资源 |
| `POST /api/media` | `media:upload` | `multipart/form-data`：`file` 必填；`usage=logo|avatar|file` 可选，`logo`/`avatar` 仅允许图片 | 媒体对象 | `400` 非 multipart、未选文件、空文件、过大、不支持 MIME/扩展名、MIME 与扩展名不匹配、Logo/头像非图片、图片尺寸超限；`409` 文件内容已存在，返回 `{ existing }` |
| `GET /api/media/{id}` | `media:view` | Path：媒体 ID | 媒体详情 | `404` 媒体资源不存在 |
| `GET /api/media/{publicId}/content` | 否 | Path：`publicId` | 文件流 | `404` 媒体资源或本地文件不存在；响应含 `Cache-Control` 和 `X-Content-Type-Options: nosniff` |
| `DELETE /api/media/{id}` | `media:delete` | Query：`force=true` 可强制删除已知引用 | `{ message }` | `404` 不存在；`409` 被引用或存在未知业务引用；失败事件 `admin.media.delete.failed`，强制删除事件 `admin.media.delete.forced` |
| `POST /api/media/batch-delete` | `media:delete` | Body：`ids` 必填；`force` 可选 | `{ message }` | `400` 未选择；`404` 任一 ID 不存在；`409` 任一资源被引用或存在未知引用；事件同删除 |
| `POST /api/media/orphans/cleanup` | `media:delete` | Body：`dryRun` | `dryRun`、`matchedCount`、`deletedCount`、`items[]` | 非 dry-run 发事件 `admin.media.orphans.cleaned` |

强制删除只会清理已知 `site.logo` 和 `user.avatar` 引用；遇到未知业务引用时即使 `force=true` 也返回 `409`。

## 关键示例

上传请求：

```text
POST /api/media
Content-Type: multipart/form-data

file=<binary>
usage=avatar
```
