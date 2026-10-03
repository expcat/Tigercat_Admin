# 路线图收尾与待统一处理事项

本文集中记录执行 [Roadmap.md](../Roadmap.md) 各阶段时**主动推迟**的收尾、人工核验与 workaround 清理事项，统一在全部阶段完成后批量处理或验证，不在单个阶段内提前修复。已完成核验的条目从本文删除，不留记录。

组件层面的上游缺口见 [tigercat-upstream-requirements.md](tigercat-upstream-requirements.md)（开放项短清单：[frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)）；本文聚焦本项目侧需要回头执行的事项。

---

## 阶段 1 — 个人中心 / 数据分析

- [ ] **图表基元自定义图（ChartCanvas + ChartAxis/Grid/Series/Legend/Tooltip）**：折线与底轴已按画布宽度对齐，`ChartTooltip` 仍固定 `open={false}`，未做交互式 Tooltip 与轴的精细联动；后续可视觉打磨或改用高层图表组件。
- [ ] **ScatterChart / HeatmapChart 视觉**：使用静态构造数据，未接入真实区间/坐标轴格式化，统一核验时确认坐标轴刻度与 tooltip 文案。

## 阶段 3 — 内容与媒体（内容编辑 / 媒体图库）

- [ ] **编辑器为内置演示引擎**：`RichTextEditor`/`MarkdownEditor`/`CodeEditor` 使用组件内置引擎（contenteditable / 内置高亮），未接 Quill/TipTap/Prism 等可插拔 `engine`/`highlighter`；如需富功能再按上游 `engine` 接口替换。
- [ ] **图片为 SVG 占位**：`/gallery` 图片用内联 SVG data-URI 占位（离线、确定性、e2e 友好）；`ImageAnnotation`/`ImageCropper` 基于该占位图演示，统一核验时确认换用真实位图后裁剪输出（`getCropResult` 的 canvas/blob）与标注坐标无异常。
- [ ] **内容与图库数据为内存态**：`/content` 草稿正文、标签、协作者与 `/gallery` 标注/裁剪结果均为页面内内存数据（未接 MockApi/真实端点），刷新后重置；如需持久化或“类服务端”分页/筛选，再按 [api.md](api.md) 约定补 demo/mock 契约。
- [ ] **Upload 未接后端**：`/content` 附件 `Upload` 设为 `autoUpload=false` 仅做选择演示，不触发上传请求；接入真实存储时再补 `customRequest`/`action`。

## 阶段 4 — 运维自动化（定时任务 / 数据导入）

- [ ] **调度与执行数据为内存态**：`/jobs` 任务列表、启停、进度、运行阶段与 `/import` 向导选择均为页面内内存数据（未接 MockApi/真实端点），刷新后重置；如需“类服务端”分页/筛选或持久化，再按 [api.md](api.md) 约定补 demo/mock 契约。
- [ ] **Gantt 为静态运行窗口**：`/jobs` 执行时间轴用手工构造的近一周窗口（`scale=day`），未接真实执行历史；接入真实运行记录后确认时间轴刻度、依赖连线与今日参考线对齐。
- [ ] **Upload 未接后端**：`/import` 文件 `Upload` 设为 `autoUpload=false` 仅做选择演示，不触发上传/解析请求；示例数据用于字段映射与预览。接入真实存储/解析时再补 `customRequest`/`action` 与源字段动态探测。
- [ ] **导入执行为定时器模拟**：`/import` 「开始导入」用 `setInterval` 按批推进 `Progress` 到 100% 后展示 `Result`，非真实批处理；接入真实导入时改为按后端进度回调驱动。

## 阶段 5 — 帮助与报表（帮助中心 / 报表打印）

- [ ] **锚点滚动容器耦合 Shell**：`/help` 的 `Anchor`/`ScrollSpy` 通过 `getContainer` 指向 `#main-content-scroll`（Shell 内容滚动区）、`Affix` 通过 `target="#main-content-scroll"` 吸顶。若上游支持组件内部自动探测最近滚动祖先或 Shell 改为 window 滚动，可移除该显式绑定。
- [ ] **Anchor 与 ScrollSpy 双导航为点到为止**：同一批章节同时用侧栏 `Anchor`（纵向目录）与顶部 `ScrollSpy`（横向章节条）演示，功能重叠；真实项目二选一即可。
- [ ] **帮助/报表数据为内存态**：`/help` 文章列表、FAQ 与 `/reports` 报表指标/明细均为页面内静态数据（未接 MockApi/真实端点），`InfiniteScroll` 用 `setTimeout` 模拟分页，刷新后重置。
- [ ] **打印依赖 `window.print()`**：`/reports` 「打印」直接调用浏览器打印；`PrintLayout` 的 A4/页眉页脚/分页仅在打印介质（或另存 PDF）下完整生效，屏幕预览为近似呈现。统一核验时确认打印分页 `PrintPageBreak` 与水印在实际输出中的位置。

## 阶段 6 — 异常页与路由健壮性

- [ ] **无权限直访刷新场景**：demo e2e 已覆盖登录后直访 `/users` → 403；直开受限路由并整页刷新（权限需守卫内补偿加载）的场景建议人工在 api 模式（真实后端）复核一次。
- [ ] **Vue demo hash 整页刷新 `/users`**：`demo-static` 浏览核心页后 `reload` 落到登录页（React 正常）。非键盘/弹层 P0；刷新会话与守卫竞态仍可目测。

### 说明

- **MockApi `demo` 账号权限收窄**：静态演示模式下 `demo`/`demo` 现返回只读权限集（无 `user:view`/`role:view`/`media:view`），用于演示 403；`admin`/`admin123` 与真实 .NET 端行为不变。
- **`/500` 为演示入口**：按 Roadmap 定义仅提供直访演示，未接入全局错误边界/请求失败自动跳转；后续如需真实兜底，在两端 request 层或错误边界统一处理。

## 阶段 7 — 登录流程增强（忘记密码 / 两步验证 / 注册成功）

- [ ] **api 模式复核**：真实后端无 2FA/forgot 端点，`demo` 账号登录走原直通流程；建议在 api 模式人工登录一次确认游客路由（`/forgot-password`、`/register-success`）在真实后端下正常渲染。

### 说明

- **两步验证仅 MockApi 演示**：`demo`/`demo` 在静态演示模式返回 `requiresTwoFactor`，验证码固定 `123456`；真实 .NET 后端未加对应端点（契约见 [api/auth.md](api/auth.md) 的 MockApi 标注）。
- **忘记密码不真正改密**：Mock 契约只校验验证码与密码长度并返回成功，不落库；表单行为是演示目的。

## 阶段 10 — 大数据性能（`/performance`）

- [ ] **造数为页面内存态**：日志 12,000 行、表格 10,000 行、拖拽队列与看板卡片均为页面内生成（未接 MockApi / 真实端点），刷新后重置。
- [ ] **Drag 组件评估**：排序演示走包入口 `useDrag`（React `getDragItemProps` / Vue `getDragItemAttrs`）；上游 `3.0.0-preview.7` 已提供 `/Drag` 组件（render prop 包装同一 hook），可评估是否替换。
- [ ] **泳道看板区别于任务流**：`/performance` 用 `TaskBoard` 泳道（3.0 已无 `Kanban`），`/tasks` 仍走 `TaskBoard` 接任务工作流。统一核验时确认两侧文案与交互不会被当成同一块。
- [ ] **万级数据首次进入**：VirtualList / VirtualTable 在选项卡首次激活时挂载（`lazy`）；统一核验时确认切到「万行多列」后表头吸顶与滚动窗口稳定。

*后续阶段如有推迟项，请按相同结构追加到本文。*
