# Tigercat 3.0.0-preview.7 升级

2026-10-02。npm 上 3.0 最新 preview 仍是 `3.0.0-preview.7`（无 preview.5 / preview.8；稳定版 `latest` 仍是 `2.9.4`）。Vue、React、MockApi 都钉死该版本，`pnpm-lock.yaml` 已同步。pnpm 11 把这三个包的 `3.0.0-preview.7` 写入 `minimumReleaseAgeExclude`，并允许 `esbuild` 安装后构建。

未改 `/workspace/Tigercat`。本地上游检出仍是 preview.6，调用面以已安装的 preview.7 类型为准。

## 改过的用法

- 去掉 `@expcat/tigercat-core/tailwind/modern`。两端 `src/tigercat-modern-plugin.js` 默认导出 `createTigercatPlugin({ preset: modernTheme })`，CSS 用 `@plugin "./tigercat-modern-plugin.js"`。
- 根 `ConfigProvider` 写 `theme="modern"`。`colorScheme` 用 `resolveEffectiveMode` 得到的 `light` / `dark`（`auto` 不写 `.dark`，也不会跟着系统变）。`applyTheme` 在 provider 写完内联变量后再补用户主色；暗色时把 `--tiger-text`、`--tiger-text-secondary`、`--tiger-border`、`--tiger-shadow` 写回应用色。React 把 `ConfigProvider` 放进 `App`，这样补写发生在 provider 之后。
- `Stepper` → `InputNumber`，两侧按钮 `controlsPosition="both"`（任务并发、设置里的数字项）。
- `Marquee` 的 `direction="left"` → `start`。
- 表格固定列 `fixed: 'right'` → `'end'`。
- `Button` 的 `htmlType` → `type`。
- React 文件批量删除的 `Modal.onOk` 不再把点击事件当成强制删除布尔值。
- 流程设计器校验从 `@expcat/tigercat-core/workflow-designer` 导入；条件从 `expression` 字符串改为 `{ field, operator, value }`。
- 工单底栏的 `--tiger-bg`（3.0 已从主题变量删除）改为应用自己的 `--tiger-bg-card`。`--tiger-bg-page` / `--tiger-bg-hover` 是应用令牌，保留。
- 页脚与流程设计器版本标改为 `3.0.0-preview.7`。性能页不再把泳道说成 `Kanban` 组件；e2e 仍认「低层看板」和「低层看板组件」。

`docs/frontend.md`、`docs/guide/new-project.md` 的蓝本版本与插件示例已对齐。`docs/midplatform-roadmap.md` 里的 `2.6.0` 是已完成里程碑，没有改写。

## 验证

- `pnpm --filter tigercat-admin-vue typecheck`、`pnpm --filter tigercat-admin-react typecheck` 通过。
- `pnpm build:frontend` 通过（Vue、React 都完成生产构建；工单底栏改完后又构建一次）。
- 演示模式（hash 路由 + MockApi）用 Playwright 打开 Vue `5173` 与 React `5174`：桌面 1280 与移动 375。登录后 `data-tiger-theme=modern`，主色仍是 `#2563eb`；主题抽屉切到深色后 `html.dark`、`colorScheme=dark`，文字 `#f0f6fc`、边框 `#304050`。任务抽屉里的 `InputNumber` 方向键能步进。页脚可见 `UI 3.0.0-preview.7`。两种视口都没有横向溢出。

## 未做

- 没有重跑整套 Playwright。主套件要真实后端；demo 套件要先 `pnpm build:demo`。上面只覆盖登录、主题、任务并发步进和页脚版本。
- `docs/roadmap-followups.md` 里已勾选的旧走查仍写着当时的 `Kanban` 字样，当作历史记录留下。
- 没有 preview.7 的独立 changelog 可对照；破坏性清单来自上游 `docs/MIGRATION-3.0.md` 和已安装类型。
