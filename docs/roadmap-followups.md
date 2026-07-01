# 路线图收尾与待统一处理事项

本文集中记录执行 [Roadmap.md](../Roadmap.md) 各阶段时**主动推迟**的收尾、人工核验与 workaround 清理事项，统一在全部阶段完成后批量处理或验证，不在单个阶段内提前修复。

组件层面的上游缺口见 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)；本文聚焦本项目侧需要回头执行的事项。

> 处理约定：每完成一个阶段，把该阶段推迟的事项按下方结构追加；最终统一执行时逐条勾选。

---

## 阶段 0 — 全局 Shell 增强

### 人工核验（自动化 e2e 未覆盖）

- [ ] **移动端 375px**：命令面板、消息铃铛 Popover、在线客服 Drawer、悬浮按钮组、BackTop、Tour 在窄屏下不溢出、不互相遮挡；确认 Tour 在移动端已跳过依赖侧栏可见的步骤（已用 `skipWhen`，需目测确认）。
- [ ] **暗色模式（`.dark`）**：以上挂件 token 生效、文本可读、浮层背景不透出底层内容。
- [ ] **弹层焦点与键盘路径**：Spotlight / Popover / Drawer / Tour 的 Esc 与外部点击关闭、关闭后焦点恢复到触发器；`⌘/Ctrl+K` 打开后焦点进入搜索框。（demo e2e 已覆盖打开/关闭与跳转，焦点恢复尚未断言。）

### workaround 待清理（依赖上游，见 [frontend-upstream-suggestions.md](frontend-upstream-suggestions.md)）

- [ ] **Notification 富交互**：上游补齐 `actions` / `btn` 后，把消息铃铛单条通知的「整条 `onClick` 跳转」回归为带操作按钮的 toast（upstream #1）。
- [ ] **BackTop 定位**：上游提供容器定位 props 后，移除 `ShellQuickActions` 中 `!fixed !bottom-6 !left-6 !right-auto !ml-0 !mr-0` 覆盖类（upstream #2）。
- [ ] **独立 FloatButton 定位**：上游提供悬浮定位/偏移后，移除 `ChatDock` 中自包的 `fixed bottom-6 right-6 z-40` 容器（upstream #3）。

### 可选增强

- [ ] demo e2e 目前仅在 Desktop Chrome 运行；如需，补移动视口 / 暗色 `colorScheme` 的 Playwright 断言（覆盖上述人工核验项）。

---

## 阶段 1 — 个人中心 / 数据分析

### 人工核验（自动化 e2e 未覆盖）

- [ ] **移动端 375px**：`/analytics` 图表网格、KPI 卡、工具栏（Segmented + DatePicker + ButtonGroup）与明细表分页在窄屏不溢出、不横向滚动溢出视口；`/profile` 的 Tabs 在窄屏可横向滑动/换行，QRCode、Signature 画布、ColorSwatch、Slider 不超出卡片。
- [ ] **暗色模式（`.dark`）**：两页所有图表（含 Heatmap/TreeMap/Sunburst/Gauge/Org 与图表基元自定义图）配色、坐标轴与文本在暗色下可读；Descriptions 边框、Timeline 连接线、Progress 轨道 token 生效。
- [ ] **弹层焦点与键盘路径**：`/profile` 的 DatePicker / TimePicker 浮层 Esc 与外部点击关闭、关闭后焦点恢复；Tabs 方向键切换；`/analytics` DatePicker 区间选择浮层同上。（demo e2e 已覆盖选项卡切换、头像下拉进入、Segmented 切换与图表渲染，焦点恢复尚未断言。）

### workaround / 点到为止待回访

- [ ] **图表基元自定义图（ChartCanvas + ChartAxis/Grid/Series/Legend/Tooltip）**：当前为「点到为止」演示，序列点用 `createBandScale`/`createLinearScale` 预映射为像素坐标，未做坐标系/坐标轴位置的精细对齐与交互式 Tooltip 联动；后续可视觉打磨或改用高层图表组件。
- [ ] **ScatterChart / HeatmapChart 视觉**：使用静态构造数据，未接入真实区间/坐标轴格式化，统一核验时确认坐标轴刻度与 tooltip 文案。

---

## 阶段 2 — 协作沟通（工单中心 / 团队日历）

### 人工核验（自动化 e2e 未覆盖）

- [ ] **移动端 375px**：`/tickets` 主从分栏在窄屏切换为上下 `Splitter`（`vertical`），列表/详情、`Resizable` 对话面板、`ChatWindow`、`CommentThread`、`Mentions` 不溢出、不横向滚动溢出视口；`/calendar` 月视图 `Calendar`、倒计时卡、当日日程列表与“新建事件” `Drawer` 在窄屏不溢出。
- [ ] **暗色模式（`.dark`）**：两页 `Splitter`/`Resizable` 分隔条、`Steps` 连接线、`CommentThread` 分隔线、`Calendar` 单元格与今日高亮、`Badge` 圆点、`Popover` 浮层背景在暗色下可读、不透出底层内容。
- [ ] **弹层焦点与键盘路径**：`/tickets` 新建/关闭 `Drawer`、字段 `Popover` 的 Esc 与外部点击关闭、关闭后焦点恢复到触发器；`/calendar` 新建事件 `Drawer` 内 `DatePicker`/`TimePicker` 浮层 Esc 与外部点击关闭、关闭后焦点恢复；日程 `Popover` 键盘可达。（demo e2e 已覆盖导航与关键内容渲染，焦点恢复尚未断言。）

### workaround / 点到为止待回访

- [ ] **Calendar 格内事件标记**：当前 `Calendar` 类型签名未暴露按日期格的事件渲染插槽，事件标记以右侧“当日日程”列表 + `Badge`/`Popover` 近似呈现；后续若上游补齐单元格渲染插槽，可在日历格内直接标注事件圆点。
- [ ] **协作数据为内存态**：`/tickets` 的对话、内部备注、附件与 `/calendar` 事件均为页面内内存数据（与阶段 1 一致，未接 MockApi/真实端点），刷新后重置；如需“类服务端”分页/筛选，再按 [api.md](api.md) 约定补 demo/mock 契约。
- [ ] **Resizable 对话面板**：`/tickets` 详情对话区用 `Resizable`（`axis=vertical`）演示竖向调整高度，统一核验时确认与 `ChatWindow` 内部滚动、窄屏上下分栏的交互无冲突。

---

## 阶段 3 — 内容与媒体（内容编辑 / 媒体图库）

### 人工核验（自动化 e2e 未覆盖）

- [ ] **移动端 375px**：`/content` 编辑器工具条（`Segmented` + `Switch` + 操作按钮）、富文本/Markdown/代码编辑区、元数据侧栏（`TreeSelect`/`Cascader`/`AutoComplete`/`Mentions`/`Upload`）在窄屏堆叠不溢出；`/gallery` 精选 `Carousel`、图片网格、`Skeleton` 骨架、`ImageViewer`/`ImagePreview` 灯箱与标注/裁剪 `Drawer` 在窄屏不溢出。
- [ ] **暗色模式（`.dark`）**：两页编辑器边框/占位、`Watermark` 水印对比度、`Result` 图标配色、图片卡背景、`ImageViewer`/`ImagePreview` 遮罩与工具条、`Empty` 插画在暗色下可读、不透出底层内容。
- [ ] **弹层焦点与键盘路径**：`/content` `TreeSelect`/`Cascader`/`AutoComplete` 下拉浮层 Esc 与外部点击关闭、关闭后焦点恢复；`/gallery` `ImageViewer`/`ImagePreview` 与标注/裁剪 `Drawer` 的 Esc 关闭与焦点恢复。（demo e2e 已覆盖编辑器切换/发布与相册切换/空态，焦点恢复尚未断言。）

### workaround / 点到为止待回访

- [ ] **编辑器为内置演示引擎**：`RichTextEditor`/`MarkdownEditor`/`CodeEditor` 使用组件内置引擎（contenteditable / 内置高亮），未接 Quill/TipTap/Prism 等可插拔 `engine`/`highlighter`；如需富功能再按上游 `engine` 接口替换。
- [ ] **图片为 SVG 占位**：`/gallery` 图片用内联 SVG data-URI 占位（离线、确定性、e2e 友好）；`ImageAnnotation`/`ImageCropper` 基于该占位图演示，统一核验时确认换用真实位图后裁剪输出（`getCropResult` 的 canvas/blob）与标注坐标无异常。
- [ ] **内容与图库数据为内存态**：`/content` 草稿正文、标签、协作者与 `/gallery` 标注/裁剪结果均为页面内内存数据（与阶段 1–2 一致，未接 MockApi/真实端点），刷新后重置；如需持久化或“类服务端”分页/筛选，再按 [api.md](api.md) 约定补 demo/mock 契约。
- [ ] **Upload 未接后端**：`/content` 附件 `Upload` 设为 `autoUpload=false` 仅做选择演示，不触发上传请求；接入真实存储时再补 `customRequest`/`action`。

---

## 阶段 4 — 运维自动化（定时任务 / 数据导入）

### 人工核验（自动化 e2e 未覆盖）

- [ ] **移动端 375px**：`/jobs` 概览指标卡、任务表格（在窄屏横向滚动而非撑破布局）、`Gantt` 执行时间轴（横向滚动）、`Steps` 运行阶段、以及新建/编辑 `Drawer` 内 `CronEditor`（5 段字段）、`Stepper`、`InputGroup`、`NumberKeyboard` 键盘不溢出；`/import` `FormWizard` 步骤条、`Transfer` 穿梭双栏（窄屏可上下堆叠/横向滚动）、`Upload` 拖拽区、`Slider`、`Cascader` 浮层不溢出。
- [ ] **暗色模式（`.dark`）**：两页 `Gantt` 色条/网格/今日参考线、`Progress` 轨道、`NumberKeyboard` 按键、`CronEditor` 输入框、`Transfer` 面板边框、`Descriptions` 边框、`Result` 图标配色在暗色下可读、不透出底层内容。
- [ ] **弹层焦点与键盘路径**：`/jobs` 新建/编辑 `Drawer` 的 Esc 与外部点击关闭、关闭后焦点恢复到触发器；`CronEditor`/`Cascader` 下拉浮层 Esc 与外部点击关闭；`/import` `Cascader` 目标表浮层同上；`FormWizard` 上一步/下一步/完成按钮键盘可达。（demo e2e 已覆盖导航、表格渲染、抽屉打开、向导步进与完成结果，焦点恢复尚未断言。）

### workaround / 点到为止待回访

- [ ] **调度与执行数据为内存态**：`/jobs` 任务列表、启停、进度、运行阶段与 `/import` 向导选择均为页面内内存数据（与阶段 1–3 一致，未接 MockApi/真实端点），刷新后重置；如需“类服务端”分页/筛选或持久化，再按 [api.md](api.md) 约定补 demo/mock 契约。
- [ ] **Gantt 为静态运行窗口**：`/jobs` 执行时间轴用手工构造的近一周窗口（`scale=day`），未接真实执行历史；接入真实运行记录后确认时间轴刻度、依赖连线与今日参考线对齐。
- [ ] **Upload 未接后端**：`/import` 文件 `Upload` 设为 `autoUpload=false` 仅做选择演示，不触发上传/解析请求；示例数据用于字段映射与预览。接入真实存储/解析时再补 `customRequest`/`action` 与源字段动态探测。
- [ ] **导入执行为定时器模拟**：`/import` 「开始导入」用 `setInterval` 按批推进 `Progress` 到 100% 后展示 `Result`，非真实批处理；接入真实导入时改为按后端进度回调驱动。

---

*后续阶段（5–6）的推迟项请按相同结构追加到本文。*
