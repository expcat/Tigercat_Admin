# Visual-fix status (`feat/visual-fix`)

- **Branch:** `feat/visual-fix` (from `feat/visual-review` @ `f3e1de5`)
- **HEAD:** `2add6586c385d82699aa792e04f87d58086130e3`
- **Not merged to `main`.**
- **Not pushed.**

Review file `docs/REVIEW-visual.md` was left untouched. The executable list is `Roadmap.md` (commit `92dfd16`).

## Commits since `f3e1de5`

| Hash | Subject |
| ---- | ------- |
| `92dfd16` | rewrite Roadmap as visual-fix plan from REVIEW-visual |
| `da043ee` | fix Vue 2FA error/resend feedback and align OTP copy |
| `69e6287` | stop forgot-password OTP clipping on 375px |
| `16bd24d` | wire Vue compact switch to modelValue |
| `5b16ca7` | make dashboard charts fill cards and follow tokens |
| `e1ac3ca` | show About card headings and drop leftover slate bricks |
| `12012c6` | bind VirtualTable to dataSource and token swimlanes |
| `586b837` | fix Analytics and Monitor chart headings, tokens, and overflow |
| `6b34f59` | format notification times instead of raw ISO |
| `486c866` | stack users table toolbar on narrow screens |
| `450e08f` | align guest copy, wrapping, and forgot-password pane |
| `1e9a266` | localize lock PIN keyboard and stop overlay scrollbars |
| `bd23512` | format ChatDock times and keep the composer visible |
| `79d4bec` | cover leftover English via locale, calendar, and labels |
| `d112589` | hide exception empty-history when SPA can go back |
| `467f351` | stop React Steps from rendering empty description numbers |
| `844b2a5` | bind Vue Switch and RadioGroup to modelValue |
| `e328c77` | give dark-mode Tag backgrounds token values |
| `2add658` | record visual-fix status on feat/visual-fix |

## What was fixed (mapped to Review)

| Roadmap | Review | Fix |
| ------- | ------ | --- |
| V1 / V22 | 2.20, 2b.8, 2b.99, 2b.7 | Vue Message host `#tiger-message-container-root`; OTP card Alerts for wrong code / resend; React 2FA description sentence |
| V2 | 2.22, 2b.17 | Forgot OTP stacked above the six slots, `size=sm`, no `overflow-hidden` clip |
| V3 | 3.2 | Vue Theme drawer Switch → `modelValue` / `update:modelValue` |
| V4 / V12 | 4.3, 4b.3 | Dashboard charts `responsive`, fewer 30-day ticks, inside pie labels, token colors, 启用/停用 |
| V5 (About) | 5.1, 5b.1 | About `Card` uses `#header` / `header` |
| V6 | 5.4, 5b.4 | About leftover slate/pastel tiles → `--tiger-*` |
| V5+V7+V16 | 6.2–6.3, 6b.* | Analytics visible headings, heatmap/canvas tokens, OrgChart taller + scroll, DatePicker `max-w-56` |
| V5+V8 | 7.2–7.4, 7b.* | Monitor token Gauge/P95, responsive 6-tick series, formatted event time, capped feed scroll, visible headings |
| V9 / V17 | 8.3, 8b.3, 8.5 | VirtualTable `dataSource` / `virtualHeight` / `virtualItemHeight`; swimlane token colors |
| Tag dark | 8.6, 7b.5 | `.dark` `--tiger-tag-*-bg` filled so TagsView/PageHeader tags are not pastel islands |
| V10 | 10.2 | Users toolbar stacks at ≤767px |
| V11 | 14 | `buildNotificationGroups` uses `formatDisplayDateTime` |
| V13 / V22 | 2.18, 2b.12–15 | Guest `text-pretty`, RegisterSuccess Card wrap, Forgot left pane/copy/toast/empty-password aligned |
| V14 | 3.1, 3b.1 | Lock keyboard 删除/确定; overlay `overflow-hidden` |
| V15 | 3.5, 3b.5 | ChatDock short times, `客服回复` display rewrite, `resize-none` composer |
| V18 | 19, 21, 22 | Vue Switch/RadioGroup bound to `modelValue` so publish/append/job enabled match React |
| V19 | 11.1, 12, 15, 17, 18 | `tigercatText` datePicker/calendar/select; permission group Chinese; Signature `clearText=清除`; Calendar `locale=zh-CN` |
| V20 | 26 | Exception Empty only when there is no returnable history |
| V21 | 9b.2, 25 | React Steps omit empty `description` |

## Could not fully fix (and why)

- **ColorPicker “Pick color”** (Review 12): `@expcat/tigercat-*` ColorPicker has no labels/placeholder API.
- **Select “Select an option”** (Users 10.2 / Tasks 15): `TigerLocaleSelect` only exposes `doneText`. No placeholder key.
- **Rich-text Bold/Italic and similar engine chrome** (Review 19): editor internals; no labels on this page.
- **Calendar “今日 KPI=0 vs 选中日 2 条”** (Review 18 低): frozen demo month vs “today” KPI; product口径, not a layout bug.
- **Kanban fourth column needs inner horizontal scroll** (Review 8.5 低): board `scrollWidth=1324` vs 977 is the package scroller; page-level overflow was already none.
- **Review 缺口 / 未取证**: empty/error charts, Tour full path, demo 403, most 375 fold-below, live drag/kanban moves — not defects to implement.
- **`p2-*` leftover class names** allowed by `docs/frontend.md`; not restyled.
- **Typecheck / `tsc --noEmit` / `vue-tsc`**: already failing on this branch for pre-existing Analytics/Table prop types (including the old VirtualTable `data` binding). Not used as a green gate. No new test framework. Frontend **build** was not run in this session (heavy; typecheck already red on unrelated files).
- **Browser verification** was not repeated against live Api/Vue/React in this implementation session.

## Explicit

Not merged to `main`. Not pushed. No PR.
)
