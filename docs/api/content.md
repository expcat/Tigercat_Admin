# 内容文章 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。本期没有 CMS 列表页或独立内容权限模型。

`GET /api/content/articles` 的 `data` 是 **文章数组**（不是 `PagedResponse`）。内容编辑页加载种子文章 `a1`（缺失时再取列表第一篇）。图库标注与帮助文章仍是前端内存态，不走本组接口。

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

协作者与附件不在 PUT 契约内，仅页面本地态。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/content/articles` | 登录 | 无 | 文章数组 | — |
| `GET /api/content/articles/{id}` | 登录 | Path：文章 ID | 文章对象 | `404` 文章不存在 |
| `PUT /api/content/articles/{id}` | 登录 | Body：`title`、`editorType`、`body`、`tags`、`category`、`column`、`published`（均可选；发布时 `published=true` 且标题必填） | 更新后的文章对象 | `400` 标题为空（发布时）、编辑器类型非法或长度超限；`404` 文章不存在 |

保存草稿：`PUT` 且 `published=false`。发布：`PUT` 且 `published=true`。加载时用返回的 `editorType` 把 `body` 填入对应编辑器。
