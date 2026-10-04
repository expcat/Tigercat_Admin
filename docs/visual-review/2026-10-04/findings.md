# 视觉 Review 逐项记录（2026-10-04）

本文件记录本轮实际浏览器走查。环境：走查开始时工作区干净（main / origin/main，53305f8）、Tigercat 3.0.0-preview.8、React/Vue 本地 Vite Mock 演示。截图与观察均来自本轮，旧结论不作为证据。18 项缺陷（初轮 12 项，修复复验追加 6 项）和 11 项效果优化已实现并复验；preview.9 候选与正式 npm 的 Admin 类型、API / Mock 构建及 146 项 E2E 均通过。覆盖、发布与门禁边界见 [视觉报告](../../frontend-visual-review.md)，开发顺序见 [Roadmap](../../../Roadmap.md)。

<a id="vr-001"></a>

## VR-001 — 侧栏收缩时复用展开状态，自动弹出二级菜单

- 状态：双端已修复；preview.9 tarball 的收缩、hover / 移出、Enter / Escape 浏览器复验及现有 e2e 通过。严重度：P1。
- 操作：仪表盘 → 展开「系统管理」→ 点击侧栏底部「收起菜单」。
- 实际：收缩为 64px 后，系统管理二级菜单自动 portal 到内容区上方。鼠标与焦点位于收起按钮，用户尚未 hover / 聚焦系统管理入口。
- 预期：收缩本身不打开 popup；主动进入图标入口后才打开。再次展开可以恢复之前的 inline 分组状态。
- 证据：[004-react-collapse-unwanted-popup.jpg](004-react-collapse-unwanted-popup.jpg)；DOM 中 popup rect 为 x=67,y=313,w=180,h=362；activeElement 是「收起菜单」按钮。Escape 后 [005-react-menu-escape.jpg](005-react-menu-escape.jpg) 无 popup。
- 初步定位：双端 `components/MainSidebar` 将同一 `expandedKeys` 传到展开态 inline 与折叠态 popup 的 `openKeys`。需核对切换模式和 hover / focus 使用的开关状态，不在页面重写 Menu。

- Vue 对照：[006-vue-collapse-unwanted-popup.jpg](006-vue-collapse-unwanted-popup.jpg) 复现相同现象。纯鼠标 hover 打开并移出后能关闭（[011-vue-hover-mouse-leave.jpg](011-vue-hover-mouse-leave.jpg)）；键盘 Enter 打开 / Escape 关闭会恢复到正确父入口。因此本项集中修复「inline 状态自动变成 popup 打开状态」，保留正常 hover / 键盘二级导航。
- 修复：展开分组与折叠 popup 使用独立状态；切换显示模式清空 popup，重新展开保留 inline 分组。

- 复验：收缩无 popup；hover 打开、移出关闭；Enter 打开、Escape 关闭并回父入口。[React 修复](fixes/react-sidebar-collapsed.jpg)、[Vue 修复](fixes/vue-sidebar-collapsed.jpg)。


<a id="vr-002"></a>

## VR-002 — 折叠侧栏出现无用途的横向滚动条

- 状态：双端已修复；preview.9 tarball 浏览器宽度与截图复验通过。严重度：P2。
- 操作：桌面折叠侧栏，观察主菜单与底部「关于」之间。
- 实际：64px 图标栏出现横向滚动条；双端主菜单外层 nav `clientWidth=63`、`scrollWidth=64`、`overflow-x=auto`。
- 预期：图标栏不应横滚，也不需要这一条滚动槽。
- 证据：[009-vue-desktop-size-check.jpg](009-vue-desktop-size-check.jpg)、[011-vue-hover-mouse-leave.jpg](011-vue-hover-mouse-leave.jpg)、[020-react-collapsed-width.jpg](020-react-collapsed-width.jpg)。
- 定位方向：Sidebar 边框内可用宽度与 Menu 宽度相差 1px；核对父子宽度，避免仅靠隐藏滚动条掩盖更大的内容截断。

- 修复与复验：Menu 折叠宽度适配父容器；双端 nav clientWidth / scrollWidth=63 / 63、内层=61 / 61，无图标截断。[React](fixes/react-sidebar-collapsed.jpg)、[Vue](fixes/vue-sidebar-collapsed.jpg)。


<a id="vr-003"></a>

## VR-003 — 折叠按钮的可访问名称仍为「收起菜单」

- 状态：双端已修复；浏览器名称 / aria-expanded 与定向 e2e 通过。严重度：P2。
- 操作：收缩侧栏后键盘定位底部向右箭头按钮。
- 实际：可访问名称仍为「收起菜单」，无 `aria-expanded` 状态；视觉文案已隐藏，只能看到展开箭头。
- 预期：名称随状态切为「展开菜单」，暴露当前展开状态。
- 证据：[005-react-menu-escape.jpg](005-react-menu-escape.jpg)、[007-vue-collapsed-tab-focus.jpg](007-vue-collapsed-tab-focus.jpg) 的相邻折叠入口；实际名称见本轮 AX 与 MainSidebar 源码。
- 定位：双端 MainSidebar 底部原生 button，固定文本「收起菜单」。
- 修复：原生按钮按状态显示展开 / 收起名称，并暴露 aria-expanded 与 type=button。


<a id="vr-004"></a>

## VR-004 — 手机仪表盘日期刻度相互粘连

- 状态：双端已修复；preview.9 tarball 窄屏浏览器复验通过。严重度：P2。
- 操作：仪表盘 → 向下滚动到「用户创建趋势」，保持默认「近 7 天」。
- 实际：7 个 MM-DD 刻度在窄图中连成 `09-2809-29…`，相邻日期之间没有可辨间隔。
- 预期：随有效图宽减少刻度、缩短日期或调整布局，使相邻标签不重叠。
- 证据：本轮双端 [React](react-mobile-dashboard-scroll-1.jpg), [Vue](vue-mobile-dashboard-scroll-1.jpg)，桌面 1440px 无该问题。

- 修复与复验：共享刻度采样均匀保留端点；Admin 低于 640px 设置 xTicks=3，桌面保留原密度。375px 默认 7 天与 320px 90 天均为三个不重叠标签。[React 320px](fixes/react-dashboard-ticks-320.jpg)、[Vue 320px](fixes/vue-dashboard-ticks-320.jpg)。


<a id="vr-005"></a>

## VR-005 — 手机审批列表分页文字被逐字挤换行

- 状态：双端已修复；preview.9 tarball 窄屏浏览器复验通过。严重度：P2。
- 操作：审批中心、用户管理、角色管理 → 下滚到列表底部。
- 实际：卡片模式下分页仍横向排列全部控件；「共 1 条」「第 1 页，共 1 页」被压成多行，行高与旁边按钮明显失衡。
- 预期：手机使用简短分页或合理换行，统计与页码保持完整词组。
- 证据：本轮双端 [React](react-mobile-approvals-scroll-1.jpg)、[Vue](vue-mobile-users-scroll-2.jpg)、[Vue](vue-mobile-roles-scroll-2.jpg)。

- 修复与复验：组件分页 flex-wrap，统计 / 页码 nowrap；320px 双端分页 clientWidth=scrollWidth=233，统计和页码各保持一行，整组合理换行。[React](fixes/react-pagination-320.jpg)、[Vue](fixes/vue-pagination-320.jpg)。


<a id="vr-006"></a>

## VR-006 — 手机通知标题被挤成单字竖排

- 状态：双端已修复；preview.9 tarball 窄屏浏览器复验通过。严重度：P2。
- 操作：通知中心 → 滚动到「通知中心组件验证」。
- 实际：「发布窗口确认」被压到约一个汉字宽逐字竖排；时间与「设为已读」占据同行，标题失去正常阅读顺序。
- 预期：窄屏标题单独占行，时间/状态另行安排；全文或合理截断保持横向阅读。
- 证据：[React 通知标题](react-mobile-notifications-scroll-1.jpg)、[Vue 通知标题](vue-mobile-notifications-scroll-1.jpg)。

- 修复与复验：通知标题、时间与动作合理重排；320px 标题仍横向阅读，两行显示六字，区域 clientWidth=scrollWidth=231。[React](fixes/react-notifications-320.jpg)、[Vue](fixes/vue-notifications-320.jpg)。


<a id="vr-007"></a>

## VR-007 — 多处设置与业务控件缺少可访问名称

- 状态：双端已修复；主题、个人中心、系统设置、内容发布和 Jobs 的 DOM / AX 名称已逐处核验，并发数方向键调整与取消焦点路径通过。严重度：P2。
- 操作：375px 打开「主题配置」，键盘定位「紧凑密度」开关。
- 实际：AX 只读出无名 switch；input 无 aria-label / aria-labelledby，组件内部 label 没有设置名称。旁边的「紧凑密度」「登录提醒」等是独立文本，无法作为控件名称。
- 预期：键盘和读屏能识别正在切换的设置，名称与可见标题一致。
- 证据：[022-react-mobile-theme.jpg](022-react-mobile-theme.jpg)、[026-vue-mobile-theme.jpg](026-vue-mobile-theme.jpg)、[031-react-mobile-profile-security.jpg](031-react-mobile-profile-security.jpg)、[032-vue-mobile-profile-security.jpg](032-vue-mobile-profile-security.jpg) 及本轮 DOM/AX。系统设置三个 switch 同样只有空文本 label，无 aria-label / aria-labelledby；本轮系统设置浅色、深色全滚动均已检查。
- 定位：双端 ThemeConfigDrawer 中 Switch 与 Text 未关联；优先使用库已有命名属性。
- 修复：沿用 Switch 的 aria-label，将名称与可见设置标题对齐。
- 复验追加：内容编辑的「立即发布」、Jobs 列表启停及「保存后立即启用」也缺少名称；应用侧一并补齐，列表名称包含具体任务名。任务 Drawer 的「并发数」输入补充 aria-label；增减按钮已有名称且不进入 Tab 顺序，键盘可直接使用上下箭头。菜单节点的三个 Switch 已由 FormItem 正确关联标签，无需重复命名。


<a id="vr-008"></a>

## VR-008 — Vue 偏好页密度不显示选中值，字号默认值错误

- 状态：Vue 已修复；浏览器默认适中 / 14、点击宽松及键盘改为 15 均通过。严重度：P2。
- 操作：个人中心 → 偏好；点击「适中」。
- 实际：首次打开三个密度单选框均未选中，点击「适中」后仍全部未选中；字号滑块读数为 12。源码默认值分别为 comfortable 和 14，React 正确显示「适中」与 14。
- 预期：控件显示当前绑定值，点击或键盘修改后正确反映选择。
- 证据：[033-react-mobile-profile-preference.jpg](033-react-mobile-profile-preference.jpg)、[034-vue-mobile-profile-preference.jpg](034-vue-mobile-profile-preference.jpg)；本轮 DOM checked=false 与 Slider AX value=12。
- 定位：ProfilePage.vue 的 RadioGroup / Slider 仍使用 :value 和 @update:value；已核验 preview.8 安装包类型声明只提供 modelValue / update:modelValue，需最小修正绑定。
- 修复：RadioGroup / Slider 使用 modelValue 与 update:modelValue，复验后恢复默认设置；[修复截图](fixes/vue-profile-preferences.jpg)。


<a id="vr-009"></a>

## VR-009 — 日期弹层 Escape 关闭后焦点丢到 body

- 状态：双端已修复；单日期、日期范围与嵌套抽屉从面板内部 Escape 的浏览器复验及 e2e 通过。严重度：P2。
- 操作：个人中心 → 偏好 →「打开日历」按 Enter → Tab 进入上个月按钮 → Escape。
- 实际：日历关闭后 document.activeElement 为 BODY，没有返回日期输入框或打开日历按钮。继续 Tab 会从页面外层重新进入，打断当前表单路径。
- 预期：关闭后恢复到原触发控件；嵌套抽屉时先关闭日期层，再恢复抽屉内输入。
- 证据：[035-react-mobile-birthday-picker.jpg](035-react-mobile-birthday-picker.jpg)、[037-vue-mobile-birthday-picker.jpg](037-vue-mobile-birthday-picker.jpg)、[038-react-date-escape-focus.jpg](038-react-date-escape-focus.jpg) 以及键盘/activeElement 记录。
- 补充：1440px 分析页范围选择同样返回 BODY；日历新建抽屉内先 Escape 会正确只关闭日期层，但焦点也落到 BODY。第二次 Escape 能关闭抽屉并恢复「新建事件」。见 [039-react-calendar-nested-date.jpg](039-react-calendar-nested-date.jpg)、[040-vue-calendar-nested-date.jpg](040-vue-calendar-nested-date.jpg)、[041-react-analytics-range.jpg](041-react-analytics-range.jpg)。
- 定位方向：核对 DatePicker 关闭后的焦点恢复与模态 focus scope；层级关闭顺序已通过，不应把它重写成另一套弹层。TimePicker 后续已独立复现，另列 VR-015，不从日期组件外推。

- 修复与复验：共享 popup overlay 可显式恢复到输入 ref，DatePicker 单值、范围及嵌套抽屉采用该能力；从 gridcell / 月切换 / 确定按钮内部 Escape 后焦点为对应 INPUT，最上层关闭顺序保留。


<a id="vr-010"></a>

## VR-010 — Vue 面积图 hover 填充区域时没有 Tooltip

- 状态：Vue 已修复；preview.9 tarball 双端同 x 的填充区 / 空白区 hover 与移出复验通过。严重度：P2。
- 操作：1440px 数据分析看板 → 鼠标从卡片外移入「访问趋势」蓝色填充区域；再移到相同 x 的曲线上方空白处。
- 实际：填充区没有 Tooltip；空白区出现「系列 1 · 4月: 260」。同样是图表内 hover，反馈取决于是否落在图形上。
- 预期：整个绘图区按相同 x 提供一致的 hover 数据反馈，移出绘图区关闭。
- 证据：[042-react-analytics-chart-hover.jpg](042-react-analytics-chart-hover.jpg)、[044-vue-analytics-hover-point.jpg](044-vue-analytics-hover-point.jpg)、[045-vue-analytics-hover-empty-plot.jpg](045-vue-analytics-hover-empty-plot.jpg)；命中测试分别为 area path 与 data-plot-hit rect。
- 定位方向：preview.8 Vue AreaChart 的透明命中 rect 位于有填充 path 下方，检查事件目标与 pointer-events；先确认组件最小复现再向上游同步，不在业务页复制图表实现。

- 修复与复验：装饰图形不再拦截透明命中层。同一 x 双端空白和填充区均显示「系列 1 · 3月: 150」，移出后 Tooltip 数量为 0。[React](fixes/react-area-hover.jpg)、[Vue](fixes/vue-area-hover.jpg)。


<a id="vr-011"></a>

## VR-011 — TreeSelect 按 Escape 后仍保持展开

- 状态：双端已修复；一次 Escape 后树隐藏、aria-expanded=false、焦点恢复，浏览器与 e2e 通过。严重度：P2。
- 操作：内容编辑 → 分类 TreeSelect → Enter 或点击展开 → Escape。
- 实际：焦点返回分类输入，但 aria-expanded 仍为 true，树 popup 继续覆盖栏目控件；等待实际关闭状态仍未隐藏。Cascader 同路径能正常关闭。
- 预期：Escape 关闭树层并恢复到分类触发控件；恢复焦点不应再次打开 popup。
- 证据：[051-vue-tree-select-after-escape.jpg](051-vue-tree-select-after-escape.jpg)、[053-react-tree-select-after-escape.jpg](053-react-tree-select-after-escape.jpg) 及双端 aria-expanded=true、role=tree 仍可见。
- 定位方向：优先核对 TreeSelect 搜索输入 onFocus 自动打开与 Escape 焦点恢复的相互触发；业务页未实现另一套树层。

- 修复与复验：恢复焦点时抑制本次自动打开；双端一次 Escape 后 role=tree 数量为 0，aria-expanded=false，activeElement 为原 combobox。[React](fixes/react-tree-closed.jpg)、[Vue](fixes/vue-tree-closed.jpg)。


<a id="vr-012"></a>

## VR-012 — Vue 审计保留策略未显示已加载的天数

- 状态：Vue 已修复；重新加载后显示 90，未执行保存或清理。严重度：P2。
- 操作：审计日志 → 下滚到「保留策略」，聚焦保留天数输入框。
- 实际：Vue 只显示 placeholder「保留天数」，原生 input.value 和 value 属性均为空；React 显示 90。Vue 源码默认值为 90，并从保留策略接口加载值，却仍使用 :value / @change 绑定。
- 预期：已加载的保留天数可见，重新加载后与服务端值一致；编辑、保存后也保留可见值。
- 证据：[097-react-audit-retention-visible.jpg](097-react-audit-retention-visible.jpg)、[098-vue-audit-retention-visible.jpg](098-vue-audit-retention-visible.jpg)，双端 DOM value 对照。
- 定位：AuditLogsPage.vue 的 Input 仍传 :value；已读取 preview.8 `Input.d.mts`，受控值属性为 modelValue，更新事件为 update:modelValue（同时仍提供 change）。和 VR-008 一并修正当前错误绑定，不把仍有效的 change 事件误判为已删除。尚未执行保存或清理，不据此推断已造成数据删除。
- 修复：Input 使用 v-model 绑定已加载的保留天数；[修复截图](fixes/vue-audit-retention.jpg)。


<a id="vr-013"></a>

## VR-013 — React Input 动态错误提示导致输入框重建、焦点丢失

- 状态：组件已修复，Tigercat 定向回归确认保留 input、值和焦点；Admin 表单浏览器与现有 e2e 通过。严重度：P2。
- 操作：新增用户 Input 从无 `errorMessage` 切换为错误文案；或输入首个字符清除错误文案。
- 实际：React Input 在有无底部提示时返回不同根节点，原生 input 被重建；显示或清除错误后 activeElement 变为 BODY，连续输入中断。
- 预期：提示和计数字段动态变化时保留同一个 input、值与焦点。
- 定位：preview.8 React Input 的条件返回结构；双端组件回归由 Tigercat 补充。Admin 使用已有 FormItem.error 展示字段校验，避免引入第二套 Input。
- 应用验证：双端空提交保留弹窗并聚焦用户名，短密码聚焦密码，取消恢复新增按钮；定向 e2e 4/4 通过。修复状态见 [React](fixes/react-user-invalid.jpg)、[Vue](fixes/vue-user-invalid.jpg)。动态提示保留节点的组件主路径由 Tigercat 定向测试验证。

<a id="vr-014"></a>

## VR-014 — Vue 新增用户无效提交后弹窗自动关闭

- 状态：修复与回归中已确认、应用已修复，定向自动门禁通过。严重度：P2。
- 操作：Vue 新增用户 → 空提交，或用户名有效但密码不足 6 位 → 确定。
- 实际：校验阻止请求，但 async onOk 返回 undefined；Modal 按成功完成处理并触发 v-model 关闭，无法在原表单继续纠正。
- 预期：无效提交保持弹窗与输入值，显示就地错误，焦点定位首个无效字段。
- 修复：校验失败明确返回 false；沿用当前 Modal 的公开关闭约定。未执行有效保存。
- 验证：定向 e2e 同时检查弹窗、错误文案、首个无效字段与取消后的焦点；[Vue 修复截图](fixes/vue-user-invalid.jpg)。

<a id="vr-015"></a>

## VR-015 — 时间浮层 Escape 关闭后焦点丢到 BODY

- 状态：双端已修复；范围时间与嵌套单时间内部 Escape 恢复原输入焦点，浏览器与 e2e 通过。严重度：P2。
- 操作：个人中心 → 偏好 → 免打扰时段「打开时间选择器」→ 聚焦浮层内「时」下拉框 → Escape。
- 实际：时间浮层关闭，document.activeElement 为 BODY；原时间输入、打开按钮都没有焦点。默认时间范围仍为 22:00–07:00，未改变或保存偏好。
- 预期：恢复到时间输入或原打开按钮，后续 Tab 可沿当前表单继续。
- 证据：本轮浏览器 DOM / AX 独立记录；双端从 role=dialog「时间选择器」内 combobox「时」发送 Escape 后，浮层不在 AX 中，activeElement.tagName=BODY。此项不由 DatePicker 结论外推。
- 范围：将 TimePicker 单时间 / 范围时间及嵌套抽屉关闭路径纳入组件定向回归；不更改已通过的弹层关闭顺序。

- 修复与复验：TimePicker 使用同一共享 overlay 焦点恢复能力；范围浮层「结束」页签和事件抽屉单时间 option 内部 Escape 均回 INPUT，后续 Tab 延续表单。


<a id="vr-016"></a>

## VR-016 — 项目锚点 Enter 改写路由并丢失焦点

- 状态：双端已修复；目录 Enter、外部页签同步、URL 与链接焦点保持均已浏览器复验。严重度：P1。
- 操作：1440px 项目详情 `/projects/1001` → 在右侧「动态」锚点按 Enter。
- 实际：尚未挂载的目标让原生 `#project-activity` 导航生效；HashRouter 转到 `/404`，倒计时后回仪表盘，activeElement=BODY。组件的已有目标路径仍会无视调用方 preventDefault 执行默认滚动；共享 hash 写入工具已避让 #/ 路由，此处不把它误记为重复改写路由。Vue 临时以 `key=activeTab` 同步目录高亮会重建链接并丢焦点，已撤掉该修补方式。
- 预期：目录切换同页内容，保持项目路由和当前链接焦点；页签变化后目录同步高亮，普通文档锚点仍可滚动。
- 证据：[Enter 后 404](fixes/react-project-anchor-route-before.jpg)，本轮 URL / DOM / activeElement 记录。
- 定位：Admin 应取消默认锚点导航并切换页签；Tigercat Anchor 应尊重 onClick.preventDefault，并主动同步 getCurrentAnchor 的外部状态变化，不要求消费者重建 DOM。

- 修复与复验：Admin preventDefault 切换页签，组件尊重取消并同步 getCurrentAnchor；Enter 切动态 / 成员不改变 #/projects/1001，焦点停在原链接，aria-current 与页签一致。[React](fixes/react-project-members.jpg)、[Vue](fixes/vue-project-members.jpg)。


<a id="vr-017"></a>

## VR-017 — Cron 长分钟说明撑出抽屉横向滚动条

- 状态：双端已修复；第二轮 preview.9 tarball 的 320 / 375px 五种分钟模式浏览器复验通过。严重度：P2。
- 操作：375×812 → 定时任务 → 新建任务 → 分钟模式选择「每隔」或「范围」（默认 0–59）。
- 实际：模式和输入框已经完整显示，但连续分钟列表 0,1,…,59 撑出横向滚动条；说明段落 clientWidth=286 / scrollWidth=1090，CronEditor clientWidth=310 / scrollWidth=1102。
- 预期：语义说明在 320 / 375px 换行，抽屉宽度不被文本撑开；桌面与其他模式仍正常。
- 证据：[375px 横滚条](fixes/vue-cron-overflow-before.jpg)；双端各五种模式的 DOM 宽度记录。
- 定位：`data-tiger-cron-summary` 的长词没有断行机会；由组件补长词换行，不在 Admin 隐藏 overflow 掩盖内容。
- 修复与复验：组件摘要使用 overflow-wrap:anywhere；375px CronEditor / 摘要 clientWidth=scrollWidth=310 / 286，320px 为 255 / 231，Drawer 与页面根均无横溢。[React 320px](fixes/react-cron-summary-320.jpg)、[Vue 320px](fixes/vue-cron-summary-320.jpg)；深色对照：[React](fixes/react-cron-summary-dark-320.jpg)、[Vue](fixes/vue-cron-summary-dark-320.jpg)。

<a id="vr-018"></a>

## VR-018 — React 右键菜单选中编辑后仍保持可见

- 状态：组件已修复；最终 preview.9 tarball 的双端真实界面复验通过。严重度：P2。
- 操作：1440×900 用户管理 → 右键 admin 行 → 选择「编辑」→ 取消编辑用户弹窗。
- 实际：编辑弹窗打开时菜单没有关闭；取消弹窗后「编辑 / 删除」仍可见，经过后续观察仍 visible=true，焦点返回残留的编辑菜单项。
- 预期：执行菜单操作后关闭菜单，编辑弹窗独立获得焦点；取消后恢复合理的行操作焦点，不恢复到残留弹层。
- 证据：[选择并取消编辑后的残留菜单](fixes/react-context-menu-after-selection-before.jpg)，本轮实际键盘 / DOM 观察。Vue 刚选中时也能观察到菜单，但取消后消失，未据此认定为同样持久缺陷。
- 定位：Tigercat 全量 E2E 同时发现 ContextMenu 弹层上下文问题，由组件任务核对 provider 与选择关闭路径；Admin 不增加手动关闭补丁。
- 修复与复验：组件补齐菜单 / 子菜单上下文，先关闭再执行回调；选择编辑后菜单隐藏，取消 Modal 后无残留菜单项，activeElement 回到 MAIN（main-content-scroll）。双端 Escape / 外部点击关闭也通过。[React 编辑弹窗](fixes/react-context-menu-edit-after.jpg)、[React 取消后](fixes/react-context-menu-cancel-after.jpg)、[Vue 取消后](fixes/vue-context-menu-cancel-after.jpg)。

<a id="visual-improvements"></a>

## 优化观察（不等同于已确认缺陷）

<a id="vo-001"></a>

- **VO-001 登录页宣传标题**：桌面标题末尾单字换行，建议调整行宽或断句；见 [001-react-login-desktop.jpg](001-react-login-desktop.jpg)。
- 修复状态：双端已实现明确的两行标题，桌面截图已检查：[React](fixes/react-login-desktop.jpg)、[Vue](fixes/vue-login-desktop.jpg)。

<a id="vo-002"></a>

- **VO-002 工单详情密度**：1440px 下列表、详情和生命周期三栏嵌套，编号和时间被多次换行；可增加详情宽度或用页签切换辅助信息。见 [React 桌面工单](react-desktop-tickets.jpg)，Vue 对照密度相同。
- 修复状态：双端已调整桌面主从宽度为 28% / 72%，辅助卡片纵向排列，时间允许按词换行；桌面浏览器已检查：[React 桌面](fixes/react-tickets-desktop.jpg)、[Vue 桌面](fixes/vue-tickets-desktop.jpg)。
- 窄屏复验追加：320px 下固定 900px 垂直 Splitter 将详情压成约 214px 内滚区，编号继续挤换行、操作栏横滚，见 [React](fixes/react-tickets-mobile-nested-before.jpg)、[Vue](fixes/vue-tickets-mobile-nested-before.jpg)。应用侧移除窄屏高度约束与 Splitter，沿用同一份列表 / 详情内容顺序排列；Descriptions 使用已有 vertical 布局，操作条保持源码顺序、粘在主区底部并换行，外层 Card 在窄屏不建立隐藏滚动容器。320px 正文仅由 MAIN 滚动，操作条 clientWidth=scrollWidth=223，Tab 从同意到拒绝；375px 现有响应式回归通过。修复后：[React](fixes/react-tickets-mobile.jpg)、[Vue](fixes/vue-tickets-mobile.jpg)。桌面仍保留主从 Splitter、详情内滚和钉底操作。

<a id="vo-003"></a>

- **VO-003 表单错误定位**：新增用户空提交只显示「请输入用户名」toast，焦点仍在确定按钮；可将焦点移到首个无效字段并就地标示错误。现有校验已拦截提交；见 [019-react-user-modal-validation.jpg](019-react-user-modal-validation.jpg)。
- 修复状态：双端使用 FormItem.error 与首个无效字段聚焦；无效提交保留 Modal，输入清错不丢焦点，取消返回新增按钮。定向 e2e 通过。

<a id="vo-004"></a>

- **VO-004 多标签布局**：打开很多页面后标签条出现横滚槽，主内容可用高度从 765px 变为 754px；可固定标签区高度并增强当前标签的定位。现有标签均仍可导航。见 [多标签桌面](react-desktop-tickets.jpg)，高度差来自本轮 DOM 测量。
- 修复复验补充：桌面缩到 375px 后当前「工单中心」标签在可视区外，原逻辑只在 activeKey / keys 变化时定位。双端补容器宽度变化后的定位，沿用 scrollIntoView；不改变手动横滚行为。
- 修复状态：双端固定标签条高度 48px，容器缩窄时定位当前标签；1440→320px 当前标签可见已核验。

<a id="vo-005"></a>

- **VO-005 手机浮动入口**：BackTop 在左下可覆盖滚动内容的标题或页脚文字；可评估与其他浮动入口一起安排位置、降低滚动时遮挡。见 [react-mobile-dashboard-scroll-3.jpg](react-mobile-dashboard-scroll-3.jpg)。
- 修复状态：低于 640px 隐藏全局 BackTop；手机浏览器检查已通过。

<a id="vo-006"></a>

- **VO-006 帮助示例冗余**：快速开始同时显示同一份 curl 的 Highlight 与 Code，手机重复占空间；统一为一份可复制代码并使用项目实际 API 地址。见 [手机帮助示例](react-mobile-help-scroll-1.jpg)，双端均重复；初轮 HelpPage SAMPLE_CODE 使用演示域名 api.tigercat.demo 和 /v1/profile 路径。
- 修复复验补充：FAQ 将改密入口误写为个人中心，组件文档链到 GitHub 首页，并把 API 模式也描述为无后端写入。双端同步修正文案、实际组件仓库链接和演示反馈说明；不新增改密或帮助文章能力。
- 修复状态：双端保留一份可复制 Code，使用实际 /api/health 地址，并修正文档链接、改密入口与 Mock/API 说明；手机复制操作已验证：[React](fixes/react-help-mobile.jpg)、[Vue](fixes/vue-help-mobile.jpg)。

<a id="vo-007"></a>

- **VO-007 Cron 编辑密度**：1440px 下 460px 的任务抽屉里，Cron 各字段的模式选择仍窄到只能显示「指」「任」等片段；可调整列宽或按字段分行。下拉仍能展开读取完整选项，属于可读性优化。见 [React Cron](059-react-jobs-cron-drawer.jpg)、[Vue Cron](060-vue-jobs-cron-drawer.jpg)。
- 修复状态：组件字段采用完整模式选择与自适应输入布局，320 / 375px 五种模式可辨认和操作。[React 320px](fixes/react-cron-range-320.jpg)、[Vue 320px](fixes/vue-cron-range-320.jpg)、[React 375px](fixes/react-cron-range-375.jpg)、[Vue 375px](fixes/vue-cron-range-375.jpg)。长摘要另由 VR-017 修复；中文与范围摘要属于后续能力 R3.4。

<a id="vo-008"></a>

- **VO-008 日历空态倒计时**：没有即将到来的事件时，顶部同时显示「暂无即将到来的日程」和 45 分钟倒计时；建议空态停止倒计时或明确它是演示计时器。冻结的 6 月演示数据本身不列为显示缺陷。见 [暗色日历空态](react-dark-calendar.jpg)，双端对照相同。
- 修复状态：双端空态显示“—”，不再生成 45 分钟计时；320px 浏览器已核验：[React](fixes/react-calendar-empty-320.jpg)、[Vue](fixes/vue-calendar-empty-320.jpg)。

<a id="vo-009"></a>

- **VO-009 项目详情目录状态**：点击成员或动态页签后，右侧目录仍高亮概览；可统一页签与目录的当前区块状态。修复复验又发现锚点键盘导航改写路由，另记 VR-016。见 [075-react-project-members.jpg](075-react-project-members.jpg)、[077-vue-project-members.jpg](077-vue-project-members.jpg)。

- 修复状态：双端目录由 getCurrentAnchor 与当前页签同步；取消默认导航且不重建链接，键盘焦点保留。详见 VR-016。


<a id="vo-010"></a>

- **VO-010 游客流程双端一致性**：忘记密码页 React 主操作为青绿色、Vue 为紫色，且 React 三步条没有 Vue 的步骤说明；注册成功页按钮与倒计时上下顺序也不同。建议同名页面统一颜色、说明和操作顺序。差异已在桌面与 375px 对照，并核对页面源码，未发现因此无法操作；见本轮双端 [React](react-guest-mobile-forgot-password.jpg), [Vue](vue-guest-mobile-forgot-password.jpg)、[React](react-guest-mobile-register-success.jpg), [Vue](vue-guest-mobile-register-success.jpg) 截图。
- 修复状态：React 忘记密码主操作与三步说明、注册成功倒计时顺序已与 Vue 对齐；双端 375px 浏览器已检查：[React 找回](fixes/react-forgot-mobile.jpg)、[Vue 找回](fixes/vue-forgot-mobile.jpg)、[React 成功](fixes/react-register-success-mobile.jpg)、[Vue 成功](fixes/vue-register-success-mobile.jpg)。

<a id="vo-011"></a>

- **VO-011 手机流程节点编辑密度**：375px 的「操作按钮」表格中「启用」「意见必填」标题多行，位置选择只剩「底…」「更…」；建议按动作分组换行，或为选择值留足宽度。表单权限区可读，操作控件已提供名称，下拉完整选项仍可用。见 [112-react-workflow-mobile-actions.jpg](112-react-workflow-mobile-actions.jpg)、[114-vue-workflow-mobile-actions.jpg](114-vue-workflow-mobile-actions.jpg)。

- 修复状态：操作表设最小 24rem 宽度并放入局部横滚容器，标题 nowrap；320px 双端根宽仍为 320，表宽 384，可横向浏览完整位置值，不影响页面根布局。[React](fixes/react-workflow-actions-320.jpg)、[Vue](fixes/vue-workflow-actions-320.jpg)。


## 已通过的专项路径与对应证据

这些是本轮检查的具体状态，不代表所有业务分支已通过。关闭与焦点恢复结论来自实际键盘、DOM 观察，截图只显示操作状态。

| 路径 | 本轮结果与截图 |
| ---- | -------------- |
| 全局弹层 | [主题焦点](012-react-theme-drawer-focus.jpg)、[通知](013-react-notification-popover.jpg)、[账号](014-react-account-menu.jpg)、[Spotlight](015-react-spotlight-focus.jpg)；关闭后焦点恢复已观察 |
| 移动导航与窄屏表单 | [移动导航](029-vue-mobile-navigation.jpg)、[React 320px Modal](089-react-narrow-user-modal.jpg)、[Vue 320px 列弹层](092-vue-narrow-columns-popup.jpg)，显示与关闭可用 |
| Cascader | [React 键盘](049-react-content-cascader-keyboard.jpg)、[Vue 键盘](052-vue-content-cascader-keyboard.jpg)，Escape 可关闭 |
| 图库 | [React 查看器](054-react-gallery-viewer.jpg)、[裁剪](055-react-gallery-crop.jpg)、[Vue 标注](099-vue-gallery-annotation-drawer.jpg)，关闭恢复焦点已观察；未验证真实位图输出 |
| 导入向导 | [映射](061-vue-import-mapping.jpg)、[参数](062-react-import-parameters.jpg)、[确认](065-vue-import-confirm.jpg)，步骤 1–4 往返可用，未启动真实文件导入 |
| 万行表 | [React 首次进入](066-react-performance-first-table.jpg)、[Vue 首次进入](067-vue-performance-first-table.jpg)、[内部滚动](071-vue-performance-table-scroll.jpg)，表头稳定；未重做拖拽重排 |
| 详情与确认 | [审批更多](079-react-approval-more.jpg)、[拒绝取消](084-vue-approval-reject-dialog.jpg)、[未知项目](100-vue-project-empty.jpg)、[未知审批](101-react-approval-empty.jpg)，已查路径可用 |
| 认证与权限 | [OTP 就绪](104-react-otp-mobile-ready.jpg)、[验证后仪表盘](106-vue-otp-verify-result.jpg)、[受限路由 403](107-vue-demo-permission-403.jpg)，双端 OTP 与导航通过；未执行改密 |
| 流程 Inspector | [React 桌面](108-react-workflow-inspector.jpg)、[Vue 桌面](109-vue-workflow-inspector.jpg)、[手机字段权限](115-vue-workflow-mobile-permissions.jpg)，四页签可操作；手机操作表另列 VO-011 |
| Vue 刷新 | [用户页刷新](021-vue-users-reload.jpg)，本轮 Mock 路径保留会话 |
