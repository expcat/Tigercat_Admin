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
| `end` | string | 结束时间 `HH:mm`，同一天内必须晚于 `start` |
| `title` | string | 标题，最长 120 |
| `type` | string | `meeting`、`review`、`release`、`reminder` |
| `location` | string | 地点，最长 200；空则存 `—` |

类型与页上色标对应：会议 `primary`、评审 `warning`、发布 `danger`、提醒 `info`。

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 |
| ---------- | ---- | ------------- | ------ | ---- |
| `GET /api/calendar/events` | 登录 | Query：`from`、`to` 可选，`YYYY-MM-DD`，日期闭区间 | 事件数组，按日期、开始时间升序 | `400` 日期格式无效或 `from` 晚于 `to` |
| `POST /api/calendar/events` | 登录 | Body：`date`、`start`、`end`、`title` 必填；`type` 必填；`location` 可选 | 创建后的事件对象 | `400` 标题为空、日期/时间格式或类型非法、结束时间不晚于开始时间、长度超限 |

前端按可见月请求 `from`/`to`，并把区间延伸到今天与后续约 90 天，以便「今日」「即将到来」列表覆盖当前月以外的事件。

工作台单独查询本机今天至第 30 天（含首尾）的共享日程，排除已经开始的事件后显示前 5 条及范围内总数。`/calendar?date=YYYY-MM-DD&eventId=ID` 选择目标日期 / 月份并聚焦、展开原日程详情 Popover；刷新保留定位，日期非法或目标不存在时显示页内提示。

这是共享日程，模型没有 owner 或 timezone。`date`、`start`、`end` 保存填写值，不自动换算时区；前端倒计时按浏览器本机时区解释这些值。默认打开当天，翻月重新获取可见范围；倒计时结束后选择下一条尚未开始的事件。真实 API 与 MockApi 均校验真实日期、24 小时时间、标题 / 地点长度以及 `end > start`，不支持跨午夜事件。

创建抽屉校验失败或请求失败时保留草稿；提交期间防重复并禁止关闭，取消不发送 POST。创建成功后独立刷新列表，刷新失败显示加载错误，避免误报创建失败。
