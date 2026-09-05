# 聊天坞 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

当前是单会话模型：发送后服务端追加 `self`，再生成一条 `other` 演示回复。无会话 ID。发送仍走 `POST /api/chat/messages`；SignalR `/hubs/chat` 只把同一份消息列表 fan-out 给已登录连接。WebSocket 不可用时 REST GET/POST 仍可用（无跨页即时同步）。不是通知 inbox 产品。

## 对象

`ChatMessageResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 消息 ID |
| `content` | string | 正文，最长 2000 |
| `direction` | string | `self` 或 `other` |
| `time` | string | UTC ISO-8601 |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/chat/messages` | 登录 | 无 | 消息数组，按时间升序 | |
| `POST /api/chat/messages` | 登录 | Body：`content` | 追加 self 与 other 后的完整消息列表 | `400` 内容为空或过长 |

## SignalR

`/hubs/chat` 需登录（`X-Token`、`Authorization: Bearer`，或 `access_token` 查询参数）。连接后即可收事件；发送不要走 hub 方法。

| 方向 | 名称 | 载荷 |
| ---- | ---- | ---- |
| 服务端 → 客户端 | `messages` | 与 POST 成功 `data` 相同的完整 `ChatMessageResponse[]`（无 `ApiResponse` 包络） |

`POST` 成功写入后 fan-out 给全部已连接客户端。未登录连接 `401`。不要把 hub 事件当成 `Message` toast 或通知中心 inbox。

种子含一条客服欢迎语：`你好，我是在线客服小虎，有任何关于后台的问题都可以问我～`。
