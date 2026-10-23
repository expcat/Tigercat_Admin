# 内容文章 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。本期没有 CMS 列表页或独立内容权限模型。

`GET /api/content/articles` 的 `data` 是 **文章数组**（不是 `PagedResponse`）。内容编辑页加载种子文章 `a1`，缺失或加载失败时显示错误与重试。图片标注走 [媒体 API](media.md)。

## 对象

`ArticleResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 文章 ID，种子为 `a1` |
| `title` | string | 标题，最长 120 |
| `editorType` | string | `rich`、`markdown`、`code` |
| `body` | string | 当前编辑器正文，最长 20000 |
| `tags` | string[] | 标签，最多 12 个 |
| `category` | string | 分类树 key，如 `frontend` |
| `column` | string[] | 栏目级联路径，如 `["docs","guide"]` |
| `published` | boolean | 是否已发布 |
| `attachments` | MediaItemResponse[] | 已保存附件，字段见 [媒体对象](media.md#对象)，`referenceCount` 为实际引用数 |

协作者备注仍为页面本地参考。附件通过 `attachmentIds` 保存：最多 12 个不同的正整数 ID，必须指向未删除媒体。省略此字段保持原附件，`[]` 清空；响应按媒体 ID 升序返回。附件使用现有 `MediaReferences`，`referenceType=content.attachment`、`referenceKey={articleId}:{mediaId}`，与文章同次保存；普通删除返回 `409`，强删清除此引用后，文章刷新不再包含该附件。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/content/articles` | 登录 | 无 | 文章数组 | — |
| `GET /api/content/articles/{id}` | 登录 | Path：文章 ID | 文章对象 | `404` 文章不存在 |
| `PUT /api/content/articles/{id}` | 登录 | Body：`title`、`editorType`、`body`、`tags`、`category`、`column`、`published`、`attachmentIds`（均可选；发布时 `published=true` 且标题必填） | 更新后的文章对象 | `400` 标题为空（发布时）、编辑器类型非法、长度超限、附件过多或不存在；`404` 文章不存在 |

保存草稿：`PUT` 且 `published=false`。发布：`PUT` 且 `published=true`。加载时用返回的 `editorType` 把 `body` 填入对应编辑器。

附件先通过 `POST /api/media` 上传，或从 `GET /api/media` 选择；分别需要 `media:upload` / `media:view`。文章仍沿用登录契约，不新增内容权限域。上传相同内容返回的 `409 { existing }` 可复用。移除附件先改变编辑草稿，保存后才移除业务引用。上传后取消文章编辑不会删除媒体本身。
