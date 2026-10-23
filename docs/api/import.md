# 用户 CSV 导入 API

返回结构、认证头和通用错误见 [../api.md](../api.md)。预览、创建和读取均要求 `user:create`；未登录返回 `401`，缺少权限返回 `403`。用户约束与 [users.md](users.md) 的创建接口共用校验。

## 输入和映射

浏览器读取真实文件，以 `TextDecoder('utf-8', { fatal: true })` 拒绝无效编码，然后通过 JSON 提交。文件名须以 `.csv` 结尾且最多 500 字符；内容最多 1 MiB、1000 条数据行、50 列。首条记录为表头，表头去空格后不能为空或重复（忽略大小写）。支持 UTF-8 BOM、CRLF / LF / CR、带引号的逗号与换行，以及 `""` 转义引号；空行忽略。引号语法错误拒绝整次请求，列数不一致记为行失败。

```json
{
  "source": "users.csv",
  "csv": "username,password,displayName,roleIds\r\nnew.user,example123,新用户,1;2\r\n",
  "mappings": { "username": 0, "password": 1, "displayName": 2, "roleIds": 3 }
}
```

映射值为从 0 开始的列索引或 `null`（忽略），同一列不能映射到两个字段。省略 `mappings` 时按 `username/password/displayName/roleIds` 或 `用户名/密码/显示名称/角色ID` 自动识别。预览允许缺少必填映射，以便页面补齐；创建必须映射用户名和密码。`mode` / `conflict` 可省略，仅支持 `append` / `skip`。

| 用户字段 | 规则 |
| -------- | ---- |
| `username` | 必填，trim 后转小写；2–50 个 UTF-16 字符；沿用 `char.IsLetterOrDigit`（含中文等 Unicode 字母和数字）以及 `_`、`-`、`.` |
| `password` | 必填；按当前 `AuthPolicySettings` 的最小长度和字母数字复杂度策略校验 |
| `displayName` | 可选，最多 100 字符 |
| `roleIds` | 可选；多个正整数 ID 用分号分隔，角色必须存在且不能重复；空值为无角色 |

新用户写入现有 `Users` / `UserRoles`，状态为 Active（`0`）。状态和头像不参与映射。已有用户名及文件内规范化后重复的合法行跳过，其他无效行失败；提交时重新校验。每个成功用户发布现有 `admin.user.created` 事件。

## 端点

| 方法与路径 | 请求 / `data` | 错误 |
| ---------- | ------------- | ---- |
| `POST /api/import-jobs/preview` | 上述输入；返回 `headers`、`mappings`、`total`、`valid`、`skipped`、`failed`、`passwordHint`、`rows`；只校验，不创建用户或任务 | `400` 文件、CSV、表头、映射或模式非法 |
| `POST /api/import-jobs` | 同上；返回新建任务，初始 `pending`，`processed=0` | `400` 同上或必填映射缺失 |
| `GET /api/import-jobs/{id}` | 只读当前任务；刷新和直接访问 `/import/:id` 可恢复 | `404` 任务不存在 |

所有端点返回的行只有 `rowNumber`、`username`、`displayName`、`roleIds`、`status`、`message`、`userId`。`rowNumber` 是原 CSV 记录开始的物理行号，带引号的多行字段会使后续行号跳号。预览状态为 `ready/skipped/failed`，任务状态为 `pending/success/skipped/failed`；成功后填充 `userId`。

任务包含 `id`、`source`、`resource="users"`、`mode="append"`、`conflict="skip"`、`status`、`progress`、`total`、`processed`、`result`、`rows`。`result` 始终有值，字段为 `imported/skipped/failed/message`，计数只统计已处理行。

后台 `ImportJobProgressService` 每个间隔为每个活动任务处理一行；`progress=floor(processed*100/total)`，`GET` 不推进任务。间隔 `ImportJobs:ProgressIntervalMilliseconds` 默认 250 ms，范围 25–10000 ms。全部行处理后为 `completed`，混合行失败也可完成；数据库等异常中断时为 `failed`，已提交行保留。重新选择原 CSV 创建新任务时，已创建用户名会跳过。关系数据库中用户写入和该行任务更新处于同一事务；启动后继续已有待处理行，不需要打开结果页。

## 密码与结果下载

原 CSV 和明文密码仅在页面内存及请求体中使用，服务端不落盘、不保存原文件。任务仅保存成功候选行的 ASP.NET Identity PBKDF2 密码哈希，处理后清除该行临时哈希；公开预览、创建和读取响应均不包含密码或哈希。用户密码使用现有哈希存储。

结果页在浏览器生成失败行 CSV，列为 `username,password,displayName,roleIds,rowNumber,error`；密码列始终为空，重新导入前须重新填写。下载包含 UTF-8 BOM 和 CSV 引号转义，不包含原文件的额外列。未处理行仍需从原文件重试。

MockApi 使用同一契约和逐行结果，将哈希和任务保存到现有演示存储。只在存在 `pending/running` 任务时续跑计时器；安装 / 刷新检查待处理任务，创建后恢复推进，完成后停止。Mock 导入用户的登录验证使用 PBKDF2，保存的哈希本身不能作为密码登录。
