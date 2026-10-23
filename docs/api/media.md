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

详情对象为上述字段去掉 `referenceCount`，加上 `references[]`（`id`、`referenceType`、`referenceKey`、`displayName`）与 `annotations[]`。引用数取 `references.length`。`annotations` 默认 `[]`，使用 Tigercat rc.2 `ImageAnnotation` 原始对象，不渲染到图片像素。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` / 返回 | 错误 / 事件 |
| ---------- | ---- | ------------- | ------------- | ----------- |
| `GET /api/media` | `media:view` | Query：`page` 默认 `1`；`pageSize` 默认 `20`、范围 `1-100`；`keyword`；`contentType`；`sortBy=name|size|type|createdAt`；`sortOrder=asc|desc` | 分页媒体对象 | 只返回未删除资源 |
| `POST /api/media` | `media:upload` | `multipart/form-data`：`file` 必填；`usage=logo|avatar|file` 可选，`logo`/`avatar` 仅允许图片 | 媒体对象 | `400` 非 multipart、未选文件、空文件、过大、不支持 MIME/扩展名、MIME 与扩展名不匹配、Logo/头像非图片、图片尺寸超限；`409` 文件内容已存在，返回 `{ existing }` |
| `GET /api/media/{id}` | `media:view` | Path：媒体 ID | 媒体详情 | `404` 媒体资源不存在 |
| `PUT /api/media/{id}/annotations` | `media:upload` | Body：`{ annotations }` | 更新后的媒体详情 | `404` 不存在；`400` 非图片、形状字段无效、超过 100 个或 JSON 超过 64000 字符 |
| `GET /api/media/{publicId}/content` | 否 | Path：`publicId` | 文件流 | `404` 媒体资源或本地文件不存在；响应含 `Cache-Control` 和 `X-Content-Type-Options: nosniff` |
| `DELETE /api/media/{id}` | `media:delete` | Query：`force=true` 可强制删除已知引用 | `{ message }` | `404` 不存在；`409` 被引用或存在未知业务引用；失败事件 `admin.media.delete.failed`，强制删除事件 `admin.media.delete.forced` |
| `POST /api/media/batch-delete` | `media:delete` | Body：`ids` 必填；`force` 可选 | `{ message }` | `400` 未选择；`404` 任一 ID 不存在；`409` 任一资源被引用或存在未知引用；事件同删除 |
| `POST /api/media/orphans/cleanup` | `media:delete` | Body：`dryRun` | `dryRun`、`matchedCount`、`deletedCount`、`items[]` | 非 dry-run 发事件 `admin.media.orphans.cleaned` |

强制删除会清理已知 `site.logo`、`user.avatar` 与 `content.attachment` 引用（文章附件以此为唯一来源）；遇到未知业务引用时即使 `force=true` 也返回 `409`。

标注每项必需非空字符串 `id` 与 `type`。`rectangle` / `ellipse` 必需有限数字 `x`、`y`、`width`、`height`，宽高非负；`polygon` / `freehand` 必需 `points: { x, y }[]`（有限数字，至少 3 / 2 个点）。可选 `label`、`color` 必须为字符串，`data` 必须为对象。无效请求不覆盖已保存标注；.NET 与 Mock 使用相同校验。

列表排序以 ID 为次序保证同值时稳定。文件列表每页 20 条，图库“已保存”每页 12 张图片；站内详情路由 `/files/:id` 独立读取详情。图库裁剪上传 `CropResult.blob`，反馈尺寸来自解码后的输出像素；保存失败保留裁剪与标注草稿供重试。Mock 在当前标签页的 `sessionStorage` 保存原文件 data URL、SHA256、尺寸与标注，刷新可恢复；容量不足时写入失败会反馈错误。

## 关键示例

上传请求：

```text
POST /api/media
Content-Type: multipart/form-data

file=<binary>
usage=avatar
```
