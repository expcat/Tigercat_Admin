# 系统设置 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。本组接口均需登录并按端点校验权限。

## 对象

`SettingItemResponse`：

| 字段 | 类型 | 说明 |
| ---- | ---- | ---- |
| `id` | number | 设置项 ID |
| `key` | string | 设置键名 |
| `value` | string | 当前值 |
| `defaultValue` | string | 默认值 |
| `description` | string \| null | 描述 |
| `createdAt` | string | UTC 创建时间 |
| `updatedAt` | string \| null | UTC 更新时间 |

## 端点

| 方法与路径 | 权限 | 参数 / 请求体 | `data` | 错误 / 事件 |
| ---------- | ---- | ------------- | ------ | ----------- |
| `GET /api/settings` | `setting:view` | 无 | 设置项数组，按 `key` 升序 | - |
| `GET /api/settings/{key}` | `setting:view` | Path：`key` | 设置项对象 | `404` 设置项不存在 |
| `PUT /api/settings` | `setting:edit` | Body：`settings[]` 必填，至少一项；元素为 `key`、`value`；`value` 不能为 `null` 且最长 2000 | 更新后的设置项数组，按 `key` 升序 | `400` 空数组、Key 空白、Value 为 null、Value 超长、安全策略值非法、Logo 媒体不存在或非图片；`404` Key 不存在；事件 `admin.setting.updated` |

更新规则：

- 仅支持更新已存在的 Key，不支持新增。
- Key 自动去除首尾空格。
- 重复 Key 以最后一个为准。
- 保存 `site.logo` 时会同步媒体引用；通知中心会生成可跳转到 `/settings?key=...` 的提醒。

## 预置设置

| Key | 默认值 | 描述 |
| --- | ------ | ---- |
| `site.name` | `Tigercat Admin` | 站点名称 |
| `site.logo` | 空 | 站点 Logo URL |
| `auth.sessionTimeout` | `1440` | 会话超时时间，分钟，范围 `5-43200` |
| `auth.maxAttempts` | `5` | 最大登录失败次数，范围 `1-20` |
| `auth.loginLockoutMinutes` | `5` | 登录失败锁定分钟，范围 `1-1440` |
| `auth.passwordMinLength` | `6` | 密码最小长度，范围 `6-128` |
| `auth.requireComplexPassword` | `false` | 是否要求密码同时包含字母和数字 |
| `theme.mode` | `system` | `light` / `dark` / `system` |
| `theme.primaryColor` | `#2563eb` | HEX 主色 |
| `theme.compactMode` | `false` | 紧凑模式 |
| `ops.auditRetentionDays` | `90` | 审计日志保留天数 |
| `security.permissionSeedVersion` | `2026.06.02.1` | 权限种子数据版本 |
| `security.permissionSeedChecksum` | 自动生成 | 权限种子数据摘要 |

## 关键示例

批量更新：

```json
{
  "settings": [
    { "key": "site.name", "value": "My Admin" },
    { "key": "auth.sessionTimeout", "value": "720" }
  ]
}
```
