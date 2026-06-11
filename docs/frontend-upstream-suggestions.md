# Tigercat UI 上游修改建议

仅记录当前待上游改进的事项。已落地能力的本项目使用方式见 [frontend.md](frontend.md)。

## 当前状态

当前暂无待上游改进事项。

本次核查：npm 最新 `@expcat/tigercat-core` / `@expcat/tigercat-react` / `@expcat/tigercat-vue` 为 `v1.2.44`（2026-06-12 核查）。当前仓库已升级到 `^1.2.44` 并在用户/角色页启用 Card 网格排列；后续升级或更新 lockfile 时需重新验证前端页面。

## 已由上游完善

### 1. Table 锁定列在斑马纹行的背景为半透明，遮不住下层内容（`v1.2.43` 已修复）

- **现象**：`striped` + 锁定列（`fixed` / `column-lockable`）组合下，斑马纹激活行（行索引 0、2、4…，即视觉上第 1、3 行）的锁定单元格背景使用 50% 半透明条纹色，横向滚动时透出下层列内容；非斑马纹行使用不透明表格底色，表现正常。
- **根因**：core `table-utils.ts` 中 `getTableFixedCellClasses` 在 `stripedActive` 时返回 `tableRowStripedClasses`（`bg-[...stripe-bg...]/50`，半透明），而非斑马纹行返回的 `tableBackgroundClasses` 是不透明的。
- **建议修复**：斑马纹激活的 fixed 单元格改用等效不透明色，例如 `color-mix(in srgb, var(--tiger-table-stripe-bg, …) 50%, var(--tiger-table-bg, …))`，替换 `/50` 透明叠加。
- **上游结果**：`@expcat/tigercat-core@1.2.43` 新增 `tableFixedCellStripedClasses`，`getTableFixedCellClasses` 在 `stripedActive` 时改用不透明 `color-mix(...)` 背景。
- **本项目复现**：RolesPage（`striped` + `column-lockable`），锁定「操作」列后缩窄窗口横向滚动，观察第 1、3 行。
- **本项目处理**：不做本地覆盖；当前仓库已升级到 `v1.2.44`，后续验证 RolesPage 时关注锁定列斑马纹背景即可。

---

*后续发现新的上游改进事项时，请同步更新本文档及 [frontend.md](frontend.md) 中的使用约定。*
