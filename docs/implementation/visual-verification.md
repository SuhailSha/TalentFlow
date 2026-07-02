# Visual Verification — Pre-Phase-3 Gate

**Purpose.** Confirm the implemented UI converges toward the approved
TalentFlow mockups before Candidate Workspace (Phase 3) starts. The
Workspace is the flagship screen; it should compose *proven* primitives,
not drive corrections into them.

**Scope.** Seven surfaces:
1. Sidebar — expanded
2. Sidebar — collapsed
3. Workspace switcher (popover)
4. Command palette (⌘K)
5. Inbox shell (empty, list, detail)
6. Candidate list
7. Dashboard

For each surface: (a) how to capture pixels, (b) side-by-side mockup
map, (c) drift assessment across nine dimensions, (d) classification.

Classification legend:
- ✅ **Exact match** — pixel-diff should be near-zero after fixture seed.
- 🟡 **Acceptable deviation** — deliberate delta or minor spacing; note
  it and keep.
- ❌ **Requires correction** — must be fixed before Phase 3 starts.

---

## Why screenshots can't be produced in this shell

Embedded PG must run under the `pgrunner` Windows user via a
ProcessStartInfo bridge — this shell doesn't own that identity. The
capture pipeline is therefore staged, and the artifacts below give
whoever runs it in CI (or on a staging box with PG-as-a-service) a
one-command path from clean box → pixel baselines committed.

---

## Capture pipeline

### Prerequisites (staging or CI)
- PostgreSQL 14+ reachable at `DATABASE_URL` (managed service in staging,
  or the postgres service container in GHA).
- `pnpm install` completed at the monorepo root.
- Node 20+ and Chromium browser dependencies (`apt-get install ...` in
  Linux CI; `playwright install --with-deps` handles this).

### Step-by-step

```bash
# 1. Apply migrations (safe re-run)
pnpm --filter @repo/database exec prisma migrate deploy

# 2. Seed the deterministic VR fixture tenant
#    Anchor = 2026-07-01T09:00Z. All timestamps are relative offsets
#    from this anchor so re-runs produce byte-identical rows.
#    Current scope: org + user + skills + 60 candidates.
#    Follow-up (during first capture PR): extend with jobs, submissions,
#    interviews, reminders, vendors. See § "Follow-up during first
#    capture run" below.
pnpm --filter @repo/database db:seed:vr

# 3. Install Playwright browsers (once per box)
pnpm --filter @repo/web exec playwright install --with-deps chromium

# 4. Start API + Web (VR needs both alive; VR_TENANT_SLUG must match)
pnpm --filter @repo/api  dev &
pnpm --filter @repo/web  dev &

# 5. Wait for /api/health + / to be 200
until curl -sf http://localhost:3000/api/health > /dev/null; do sleep 2; done
until curl -sf http://localhost:3001            > /dev/null; do sleep 2; done

# 6. Run the VR suite
E2E_VR_TENANT=vr-tenant \
E2E_VR_EMAIL=vr@vr-tenant.demo \
E2E_VR_PASSWORD='Demo1234!' \
pnpm --filter @repo/web vr

# 7. On design changes only — update baselines and commit them
pnpm --filter @repo/web vr:update
git add apps/web/tests/vr/__screenshots__
```

### GHA wiring (drop into `.github/workflows/vr.yml`)

```yaml
name: Visual regression
on:
  pull_request:
    paths:
      - 'apps/web/**'
      - 'apps/web/tests/vr/**'
      - 'packages/database/prisma/**'

jobs:
  vr:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: talentflow
          POSTGRES_PASSWORD: talentflow
          POSTGRES_DB: talentflow_vr
        ports: [ 5432:5432 ]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgres://talentflow:talentflow@localhost:5432/talentflow_vr
      E2E_VR_TENANT:   vr-tenant
      E2E_VR_EMAIL:    vr@vr-tenant.demo
      E2E_VR_PASSWORD: Demo1234!
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter @repo/database exec prisma migrate deploy
      - run: pnpm --filter @repo/database db:seed:vr
      - run: pnpm --filter @repo/web exec playwright install --with-deps chromium
      - run: pnpm --filter @repo/api build && pnpm --filter @repo/api start &
      - run: pnpm --filter @repo/web build && pnpm --filter @repo/web start &
      - run: until curl -sf http://localhost:3001 > /dev/null; do sleep 2; done
      - run: pnpm --filter @repo/web vr
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```

---

## Surface-by-surface verification

Each surface points to (a) its mockup HTML for side-by-side comparison,
(b) the implementation files that render it, (c) the Playwright spec
that captures its baselines, and (d) a nine-dimension drift table.

Fill the **Actual** column after running the pipeline. `Static
assessment` is the best-effort read done from source code + mockup CSS
in this pass — it flags obvious drift that a designer should also
verify visually.

### 1. Sidebar — expanded

| Ref | Path |
|---|---|
| Mockup | [apps/web/public/mockups/sidebar-expanded.html](apps/web/public/mockups/sidebar-expanded.html) |
| Impl   | [apps/web/src/components/layout/sidebar.tsx](apps/web/src/components/layout/sidebar.tsx) |
| Spec   | [apps/web/tests/vr/shell.spec.ts › expanded (light)](apps/web/tests/vr/shell.spec.ts) |
| Baseline | `apps/web/tests/vr/__screenshots__/shell.spec.ts/sidebar-expanded-light.png` |

| Dimension | Mockup | Static assessment | Actual | Class |
|---|---|---|---|---|
| Layout        | 240px expanded, sticky, `overflow: hidden` | Matches: `w-60` (240px), sticky, `overflow-y-auto` | — | — |
| IA            | Home + Inbox → Pinned (hidden if empty) → Recruit → Resume Intelligence → Vendors → Reports (dimmed if OFF) → Work | Matches source-side; Pinned reserved for Phase 7, Reports gated by feature flag | — | — |
| Density       | 7px 12px item padding, 14px group gaps | Matches | — | — |
| Spacing       | 12px nav padding, 6px item margin | Matches | — | — |
| Typography    | 13.5px item label, 11px eyebrow | Matches | — | — |
| Color         | brand-50 active bg + 3px brand-500 rail; brand-700 text | Matches | — | — |
| Interaction   | Row-item hover surface-2/70; tooltip in collapsed mode | Matches (TooltipProvider) | — | — |
| Empty states  | Pinned hidden until it has content | Matches (gated block) | — | — |
| Dark mode     | brand-500/18 bg, brand-200 text on active | Matches | — | — |
| **Predicted** | | Exact match | | ✅ |

### 2. Sidebar — collapsed

| Ref | Path |
|---|---|
| Mockup | [apps/web/public/mockups/sidebar-collapsed.html](apps/web/public/mockups/sidebar-collapsed.html) |
| Impl   | Same as expanded; `collapsed` prop swaps sizing |
| Spec   | [shell.spec.ts › collapsed (light)](apps/web/tests/vr/shell.spec.ts) |

| Dimension | Mockup | Static assessment | Actual | Class |
|---|---|---|---|---|
| Layout | 56px width | Impl uses `w-[60px]` (60px, +4px) | — | 🟡 tiny width delta |
| IA | Groups collapse to icon-only; group headers hidden | Matches | — | — |
| Active state | `brand-500` solid fill + white icon (no rail) | Impl still shows brand-50 bg pattern — collapsed variant not styled distinctly | — | ❌ needs correction |
| Interaction | Tooltip on hover reveals label | Matches (TooltipProvider@300ms) | — | — |
| **Predicted** | | Requires correction (collapsed-active style) | | ❌ |

**Correction needed:** collapsed sidebar's active item should be
`bg-brand-500 text-white` per mockup CSS lines 221–223, not the
expanded-mode `bg-brand-50 + rail` treatment. One-line CSS change.

### 3. Workspace switcher

| Ref | Path |
|---|---|
| Mockup | Inline in [dashboard.html](apps/web/public/mockups/dashboard.html) lines 76–86 (workspace section of sidebar) |
| Impl   | [apps/web/src/components/layout/workspace-switcher.tsx](apps/web/src/components/layout/workspace-switcher.tsx) |
| Spec   | [shell.spec.ts › workspace switcher open](apps/web/tests/vr/shell.spec.ts) |

| Dimension | Mockup | Static assessment | Actual | Class |
|---|---|---|---|---|
| Layout | 56px header row, monogram + name + role subline + chevron | Matches | — | — |
| Popover | Approved mockup has no popover state — Slice 3 introduced one | Impl adds a popover that's not in the mockup; still an acceptable UX extension | — | 🟡 deliberate deviation |
| Color | brand accent on monogram bg | Depends on `WorkspaceBranding` provider (brand HSL) | — | — |
| **Predicted** | | Acceptable deviation | | 🟡 |

### 4. Command palette

| Ref | Path |
|---|---|
| Mockup | *No mockup file* — designed in Slice 3 |
| Impl   | [apps/web/src/components/layout/command-palette.tsx](apps/web/src/components/layout/command-palette.tsx) |
| Spec   | [shell.spec.ts › Command Palette (3 states)](apps/web/tests/vr/shell.spec.ts) |

No approved mockup exists — the palette is a Slice-3 addition sanctioned
by product but not in the original mockup set. **Verification here is
against the Slice-3 approved design rather than a mockup pixel target.**

| Dimension | Slice-3 approved | Static assessment | Actual | Class |
|---|---|---|---|---|
| Layout | Modal, ~640px wide, top-anchored | Matches | — | — |
| IA | Search field + Recent + Prefix hints (c:/j:/s:/v:/r:) + Groups | Matches (see `command-palette.tsx` groups) | — | — |
| Typography | 13.5px item label, mono for kbd | Matches | — | — |
| Interaction | ⌘K / Ctrl+K bind; arrow-nav; ⌘↵ opens in new tab (deferred) | Matches (⌘K), new-tab is Phase 7 | — | 🟡 deferred feature |
| Empty state | Tips group visible when query empty | Matches | — | — |
| Dark mode | Overlay + card use `overlay` token | Matches | — | — |
| **Predicted** | | Exact match (against Slice-3 spec) | | ✅ |

### 5. Inbox shell

| Ref | Path |
|---|---|
| Mockup | [apps/web/public/mockups/inbox.html](apps/web/public/mockups/inbox.html) |
| Impl   | [apps/web/src/components/inbox/](apps/web/src/components/inbox/) |
| Spec   | [shell.spec.ts › Inbox (empty, list, detail)](apps/web/tests/vr/shell.spec.ts) |

| Dimension | Mockup | Static assessment | Actual | Class |
|---|---|---|---|---|
| Layout | Two-pane: list left (~360px) / detail right (fills) | Matches (per Slice-3 inbox shell) | — | — |
| IA | Segmented tabs (All / Mentions / Assigned), unread dot on rows | Matches | — | — |
| Density | Rows have 2-line text, 44px height | Matches | — | — |
| Empty | Illustration + copy for zero-state and filtered-empty | Matches (inbox-empty-state.tsx) | — | — |
| Dark mode | Row hover uses surface-2 | Matches | — | — |
| **Predicted** | | Exact match | | ✅ |

### 6. Candidate list

| Ref | Path |
|---|---|
| Mockup | [apps/web/public/mockups/candidate-list.html](apps/web/public/mockups/candidate-list.html) |
| Impl   | [apps/web/src/app/(dashboard)/candidates/page.tsx](apps/web/src/app/(dashboard)/candidates/page.tsx), [columns.tsx](apps/web/src/app/(dashboard)/candidates/columns.tsx) |
| Primitive | [apps/web/src/components/data-table/](apps/web/src/components/data-table/) |
| Spec | [candidate-list.spec.ts](apps/web/tests/vr/candidate-list.spec.ts) |

This is the surface with the most visible drift from the mockup and is
the primary reason for this verification pass.

| Dimension | Mockup | Static assessment | Actual | Class |
|---|---|---|---|---|
| Layout — table wrap | `border`, `rounded-lg`, header sticky, `overflow: hidden` on container | Matches | — | — |
| Saved-views row | "Views" eyebrow + pill list + dashed "Save view" affordance | Matches | — | ✅ |
| Filter chips | `**Status** Active [×]` structure with muted label + strong value | Impl renders `Search: sarah [×]` — different chip anatomy, only one active filter surfaces | — | 🟡 stylistic delta |
| Toolbar right slot | `Density ▾  Columns ▾  Refresh` | **Missing** — no Density or Columns pickers in the toolbar | — | ❌ |
| **AI Match column** | 44px progress bar w/ brand gradient, threshold-tinted (brand ≥85, warn 60–85, danger <60) | **Placeholder only** — sparkles + em-dash; no score, no bar | — | ❌ |
| Stage column | Free-text stage ("Phone screen", "Onsite · R2") beside status pill | **Missing** — impl has status only | — | ❌ |
| Row hover actions | 3 icons: Open, Edit, More (`···`) | 1 icon: Open only | — | ❌ |
| Selected row | Subtle brand-tinted background | Matches (`bg-brand-50/50`) | — | ✅ |
| Pagination | Inline in table footer band: "247 of 12,489 · 50 per page ▾ · Page 5/250" with pill pager | External Prev/Next buttons below the table | — | 🟡 acceptable but drifts from mockup pattern |
| Empty state | Illustration + copy | Matches (DataTableZeroState) | — | ✅ |
| Dark mode | Row hover uses muted/40, brand-500/10 selected | Matches | — | — |
| **Predicted** | | Requires correction: AI Match, Stage column, hover actions, toolbar pickers | | ❌ |

**Corrections needed before Phase 3:**
1. **AI Match column** — either wire real score (Phase 2.5) or hide the column entirely. A placeholder in the flagship column undermines credibility.
2. **Stage column** — add derived stage from `latestSubmission.status` (server side needs to include it in the list payload) or restore the pattern from the pre-refactor UI.
3. **Row hover actions** — add Edit + More (overflow) beside Open. `···` opens a dropdown with Note / Move stage / Delete.
4. **Density + Columns pickers** — top-right of toolbar. Density has the hook already ([use-density.ts](apps/web/src/hooks/use-density.ts)); Columns is a new picker.

### 7. Dashboard

| Ref | Path |
|---|---|
| Mockup | [apps/web/public/mockups/dashboard.html](apps/web/public/mockups/dashboard.html) |
| Impl   | [apps/web/src/app/(dashboard)/dashboard/page.tsx](apps/web/src/app/(dashboard)/dashboard/page.tsx) |
| Components | [apps/web/src/components/dashboard/](apps/web/src/components/dashboard/) |
| Spec | [dashboard.spec.ts](apps/web/tests/vr/dashboard.spec.ts) |

| Dimension | Mockup | Static assessment | Actual | Class |
|---|---|---|---|---|
| Greeting | "Good afternoon, Alice. *4 things* need you today." + date + workspace + AI insight button | Matches (DashboardGreeting) | — | ✅ |
| KPI strip | 4 tiles + dashed "Pin a custom KPI" affordance | Impl has 6 tiles, no "Pin custom KPI" | — | 🟡 more data, no pin-affordance |
| KPI delta | "+3" / "−2" green/red chips | Impl exposes `delta` prop; only wired for `next24h` today | — | 🟡 delta plumbing exists, mostly unused |
| **AI Command Center** | 5 rows: waiting-24h / high-fit / duplicates / feedback-bottleneck / ready-for-next-stage | Impl renders 4 rows keyed off available data (urgent reminders, feedback pending, stalled, next-24h). Doesn't have the "high-fit AI matches" or "duplicates" backend signals yet. | — | 🟡 partial — depends on backend AI signals |
| **My Pipeline** kanban | 4-column horizontal kanban (Submitted / Phone screen / Onsite / Offer) with candidate cards | **Missing** entirely | — | ❌ |
| **This Week** calendar | 7-day strip with interview dots + counts, today highlighted | **Missing** entirely | — | ❌ |
| Two-column detail lists | *Not in mockup* — replaced by pipeline+week | Impl keeps 4 Card-based detail lists (Urgent reminders / Feedback / Upcoming interviews / Stalled) | — | 🟡 kept because pipeline+week aren't built |
| Recruiter workload | *Not in mockup* — mockup has a "Team metrics · Last 30d" drawer collapsed | Impl renders a workload bar chart | — | 🟡 different affordance, same intent |
| Team metrics drawer | Collapsed drawer at bottom | Missing | — | 🟡 acceptable defer |
| Empty state | Greeting swaps to "All clear today" | Matches | — | ✅ |
| Dark mode | Brand-50/30 command center header, brand-500/5 in dark | Matches | — | ✅ |
| **Predicted** | | Partial — kanban + week strip are missing but the greeting/KPI/CommandCenter structure is faithful | | 🟡 |

**Corrections needed before Phase 3:**
- **My Pipeline kanban** (4 stages × candidate cards) — high-value UX signal; blocks the "at-a-glance where's my day" reading of the dashboard. Needs `GET /dashboard/pipeline` (server groups active submissions by stage) plus a new `<PipelineKanban>` component. Estimate: 1 slice.
- **This Week strip** (7-day interview calendar) — needs `GET /dashboard/week` (interviews grouped by day). One row on the dashboard; small component.

Neither block Phase 3 in principle — the Workspace doesn't consume
either — but they're the two most visible missing pieces vs. the
mockup. Recommend landing them as **Phase 2.7** alongside the AI Match
column fix, before Workspace kicks off. See summary below.

---

## Summary — required corrections before Phase 3

Grouped by the least surprising path forward.

**Must fix (blocks convergence, low effort):**
1. Collapsed sidebar active-item style (~5 min) — pure CSS
2. AI Match column: hide or wire real score (Phase 2.5 scoring integration, ~1 day if scoring service exists)
3. Candidate row hover actions (Edit + Overflow menu, ~2 hours)

**Should fix (visible gaps, medium effort):**
4. Candidate list: Density + Columns picker in toolbar (~half day; picks up existing `useDensity` hook)
5. Candidate list: Stage column (~half day; server needs latest-submission projection)
6. Dashboard: `<PipelineKanban>` + backend endpoint (~1 slice)
7. Dashboard: `<WeekStrip>` + backend endpoint (~half slice)

**Deliberate deferrals (acceptable for MVP):**
- Workspace switcher popover — sanctioned extension, not in mockup
- Pinned sidebar section — Phase 7 backend
- Reports sidebar item — feature-flag gated
- Team metrics drawer — deferred
- KPI "Pin custom KPI" affordance — deferred
- Two-column detail lists on dashboard — kept as fallback until kanban lands

**Sequencing recommendation:**

```
Slice 6 (must-fix)    → items 1, 2, 3
Slice 7 (should-fix)  → items 4, 5, 6, 7
Slice 8 (Phase 2.5)   → address DataTable abstraction gaps (see data-table-consumers.md)
Slice 9 (Phase 3)     → Candidate Workspace begins on stable primitives
```

If the AI Match score can't ship in Slice 6, **hide the column** rather
than ship a placeholder — a `—` in the flagship differentiator column
reads as unfinished product.

---

## Follow-up during first capture run

The seed script currently seeds org + user + skills + candidates only.
That's enough for **sidebar / workspace switcher / command palette /
inbox / candidate list** baselines. The **dashboard** baselines need
additional entities that the trimmed seed doesn't yet create; the
"action-required" dashboard state depends on them.

Extend `packages/database/prisma/seed-vr.ts` in the first capture PR
with the following, keeping all timestamps anchored to `ANCHOR_ISO`:

| Entity | Count | Purpose |
|---|---|---|
| Vendor          | 2  | 1 healthy ACTIVE, 1 stalled (last activity 45d) |
| JobDescription  | 5  | 2 OPEN (1 URGENT), 1 ON_HOLD, 1 FILLED, 1 DRAFT |
| Submission      | 8  | mix of active + terminal statuses, incl. 1 stalled (updatedAt 14d) |
| Reminder        | 3  | 1 CRITICAL overdue, 1 HIGH pending, 1 MEDIUM |
| Interview       | 2  | 1 CONFIRMED next-24h, 1 FEEDBACK_PENDING |

Use the field names from `apps/web/src/types/*` and the shape from
`packages/database/prisma/seed.ts` (the demo seed) — verify against
Prisma's generated types before running.

## Checklist for the person running the capture

Copy this into the PR that lands the actual baselines.

- [ ] Ran `pnpm --filter @repo/database db:seed:vr` on a clean DB
- [ ] Ran full VR suite: `pnpm --filter @repo/web vr` — 24 tests × 2 viewports = 48 screenshots
- [ ] Reviewed each screenshot alongside `apps/web/public/mockups/<matching>.html`
- [ ] Filled the **Actual** column in each drift table above
- [ ] Filed a follow-up ticket per ❌ row
- [ ] Committed baselines to `apps/web/tests/vr/__screenshots__/` and marked them approved in the PR description
- [ ] Confirmed Slice 6/7/8 sequencing is on the plan before Phase 3 starts
