# 日历 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录（`RequireLogin`），不额外校验权限码。

日历页没有删除控件，因此不提供 `DELETE /api/calendar/events/{id}`。创建是请求-响应，不做 WebSocket。

## 对象

`CalendarEventResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | string | 事件 ID |
| `date` | string | 日期 `YYYY-MM-DD` |
| `start` | string | 开始时间 `HH:mm` |
| `end` | string | 结束时间 `HH:mm` |
| `title` | string | 标题，最长 120 |
| `type` | string | `meeting`、`review`、`release`、`reminder` |
| `location` | string | 地点；空则存 `—` |

类型与页上色标对应：会议 `primary`、评审 `warning`、发布 `danger`、提醒 `info`。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/calendar/events` | 登录 | Query：`from`、`to` 可选，`YYYY-MM-DD`，日期闭区间 | 事件数组，按日期、开始时间升序 | `400` 日期格式无效或 `from` 晚于 `to` |
| `POST /api/calendar/events` | 登录 | Body：`date`、`start`、`end`、`title` 必填；`type` 必填；`location` 可选 | 创建后的事件对象 | `400` 标题为空、日期/时间格式或类型非法、长度超限 |

前端按可见月请求 `from`/`to`，并把区间延伸到今天与后续约 90 天，以便「今日」「即将到来」列表覆盖当前月以外的事件。
