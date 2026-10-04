# Tigercat 组件修复需求与发布验收

来源：[本轮问题记录](findings.md)，Admin 基线 53305f8、Tigercat 3.0.0-preview.8。用户已要求将组件问题交给 Tigercat 新任务直接修复，并在本地测试、打包通过后提交、打 tag、推送，走 Tigercat 自身发布流程发布下一个 preview.x。

交付：以下组件修复已实现，Tigercat 3.0.0-preview.9 已经既有 tag 流程发布；Admin 正式 npm 的类型、双端 API / Mock 构建和 146 项 E2E 通过。具体 commit / tag、工作流、逐包比对与覆盖率 / 体积的既有门禁缺口只维护在 [视觉报告](../../frontend-visual-review.md#发布与正式-npm-依赖)，本文件作为已完成修复的验收记录。

## 必须修复的组件行为

| 对应记录 | 组件 / 症状 | 修复验收 |
| -------- | ----------- | -------- |
| [VR-009](findings.md#vr-009) | 双端 DatePicker；Escape 关闭后 activeElement=BODY | 单日期、范围日期、嵌套 Drawer 均回原触发器；只关闭最上层，后续 Tab 延续表单路径 |
| [VR-011](findings.md#vr-011) | 双端 TreeSelect；Escape 后树仍可见、aria-expanded=true | 关闭并恢复焦点，恢复焦点不触发重新打开；Cascader 已正常，不改坏其路径 |
| [VR-010](findings.md#vr-010) | Vue AreaChart；填充区域拦截命中，空白区域却有 Tooltip | 同一 x 的整幅绘图区反馈一致；移出关闭，双端一致，不复制图表实现 |
| [VR-005](findings.md#vr-005) | 双端 Table / DataTableWithToolbar 分页；375px 下完整统计与页码被逐字压缩 | 320 / 375px 下控件合理换行或紧凑，统计词组可读；切页、页大小、Card 模式仍可用 |
| [VR-006](findings.md#vr-006) | 双端 NotificationCenter；标题被同行时间和动作挤成单字竖排 | 窄屏标题保持横向阅读，元信息和已读操作合理换行；桌面布局不退化 |
| [VO-007](findings.md#vo-007) | 双端 CronEditor；460px Drawer 模式选择显示“指”“任”等片段 | 当前模式值可辨认，必要时按字段重排；每种模式与完整选项保持可操作 |
| [VO-011](findings.md#vo-011) | 双端 WorkflowDesigner Inspector 操作表；375px 标题和位置值挤压 | 窄屏按动作分组或合理布局，位置值可辨；操作配置与字段权限页仍可用、命名正确 |
| [VR-013](findings.md#vr-013) | React Input 动态 errorMessage 改变根节点，输入框重建后丢焦点 | 动态添加 / 清除错误与计数提示时保留原生 input、值和焦点；核对 Vue 同路径 |
| [VR-015](findings.md#vr-015) | 双端 TimePicker；时间范围浮层内部按 Escape 后焦点落到 BODY | 单时间 / 范围时间及嵌套抽屉恢复原触发控件，Tab 延续原表单；与 DatePicker 一起验证 |
| [VR-016](findings.md#vr-016)、[VO-009](findings.md#vo-009) | Anchor 不尊重调用方取消默认导航，getCurrentAnchor 外部状态变动后高亮未同步 | onClick.preventDefault 可取消组件滚动 / hash；外部页签变动后同步 aria-current，不靠 key 重建、不丢焦点；普通锚点滚动保持可用 |
| [VR-017](findings.md#vr-017) | 双端 CronEditor；every / range 的连续分钟说明撑出横滚 | 320 / 375px 长词换行，模式输入和值保持完整；不靠 Admin 隐藏 overflow |
| [VR-018](findings.md#vr-018) | React ContextMenu 选中编辑后未关闭，取消 Modal 后仍残留 | 选择操作关闭菜单；编辑弹窗与菜单不叠留，取消返回合理行操作焦点；双端 Escape / 外部点击保持可用 |

## 先核对归属，再以最小方案处理

- [VR-002](findings.md#vr-002)：64px Sidebar 边框内 nav.clientWidth=63，Menu.scrollWidth=64。确认 Menu 固定宽度能否随实际容器适配；若已有公开能力，告知 Admin 正确调用，不新建兼容层。
- [VR-004](findings.md#vr-004)：仪表盘 LineChart 的 7 个日期在手机粘连。先核对 xTicks 等现有能力，Admin 可根据视口减少刻度；若高层图默认算法本身应避免标签重叠，则修正共享算法并给出调用建议。
- [VR-001](findings.md#vr-001) 的 inline expandedKeys 与 popup openKeys 复用，以及 [VR-003](findings.md#vr-003)、[VR-007](findings.md#vr-007) 的控件名称，由 Admin 先处理调用层。仅在组件无法保留正确调用 / aria 属性时扩包侧修复。

所有截图已在本轮检查，文件可从本文件相对链接进入；复现说明和 DOM / AX 结果以问题记录为准。组件任务不得改 Admin 源码。

## 本地验证与发布

1. 先读 Tigercat AGENTS.md、tests/README.md、scripts/README.md、CONTRIBUTING.md、当前 ROADMAP 与 release reference；有 .codegraph 时先用 CodeGraph 定位。
2. 保留已有未提交维护改动。组件修复、必要的定向回归、示例与文档使用最小写入集；只按仓库生成器同步生成物。
3. 根据真实远程 tag / npm / 版本确定下一个 preview.x，五个包及 runtime version 对齐，更新 CHANGELOG / MIGRATION。
4. **提交和 tag 前**实际运行本地发布门禁，包括受影响组件测试、要求的 e2e、构建、tarball 及消费项目打包检查。门禁须对应最终待发布内容；不能仅凭旧日志、跳过失败或 CI 将来会跑就打 tag。
5. 使用既有 tag 自动发布流程；不得重写自动发布工作流或另行 npm 手工发布。完成后核对运行状态、npm preview 版本与 published smoke。
6. 最终给出改动列表、每项状态、版本 / commit / tag、工作流结果和实际测试 / 打包证据，供 Admin 升级并复验。仍有阻塞须明确说明。
