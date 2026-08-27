# 聊天坞 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

当前是单会话、请求-响应模型：发送后服务端追加 `self`，再生成一条 `other` 演示回复。无会话 ID，无 WebSocket / SignalR。

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

种子含一条客服欢迎语：`你好，我是在线客服小虎，有任何关于后台的问题都可以问我～`。
