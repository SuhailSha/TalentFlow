# DataTable Consumer Validation — TF-2-2 / TF-2-3 / TF-2-4

Slice 5 converted three additional list surfaces to the `<DataTable<T>>` primitive
built in TF-2-1. This document captures the abstraction gaps discovered so that
Phase 3 (Candidate Workspace) can rely on a proven primitive rather than driving
changes into it mid-build.

## Consumers landed

| Slice   | Page                 | Columns    | Notes                                                 |
|---------|----------------------|------------|-------------------------------------------------------|
| TF-2-1  | `candidates`         | 8          | Row hover actions, bulk actions, saved views          |
| TF-2-2  | `jobs`               | 9          | Multi-value status filter, saved views + status state |
| TF-2-3  | `vendors`            | 8          | Derived signals column (active/stalled counters)      |
| TF-2-4  | `submissions`        | 7          | External stats bar, pipeline filter, bulk-actions dlg |

All four surfaces share identical toolbar + saved-view + bulk-bar plumbing.
No page-specific code lives inside the primitive.

## Zero-change validations

The primitive absorbed all of the following without a single new prop:

- **Multi-status quick filter chips** — Jobs + Vendors expose 4 status quick-toggles
  above the table. Handled by consumer-owned `filterMenu` slot; DataTable just
  echoes each selection as a `FilterChipValue` chip. `onRemove(columnId)` keyed
  by `status:OPEN` etc. lets one handler cover N status entries.
- **Derived / operational fields** — Vendor's `Pipeline` column composes
  `activeSubmissionCount`, `stalledSubmissionCount`, and a computed
  "Stalled relationship" flag. The primitive treats it as any other cell.
- **Multi-line cells** — Candidate name + subtitle, Job title + department line,
  Vendor company + type/location. Standard `<div>` in the cell renderer with the
  primitive's density-aware row height accommodating both.
- **Preserved external dialog flow** — Submissions' existing `SubmissionBulkActions`
  modal stack still works: primitive's `bulkActions` fires with the row array,
  page state records selected IDs, existing dialog reads from that.
- **Sortable + non-sortable columns** — `enableSorting: true` opts columns in;
  server pagination via `manualPagination: true` in `useReactTable` keeps sort
  server-driven.
- **Router vs. drawer row-click** — All four use `navigate` mode. `drawer` mode
  is available for Candidate Workspace's drawer-open row pattern in Phase 3.

## Abstraction gaps discovered

These are documented as follow-up work; none are blockers for the Dashboard or
Candidate Workspace.

### Gap 1: Above-toolbar stats bar has no primitive slot
**Symptom:** Submissions renders a 3-tile stats bar (Total / Active / Placed)
that both displays counts *and* drives filter state (`pipeline: 'all' | 'active'
| 'terminal'`). Currently rendered directly in the page above `<SavedViewsRow>`.

**Impact:** Duplication if multiple lists want the pattern (Interviews will need
Today / This Week / Overdue). Each consumer re-implements the layout + press
semantics.

**Recommendation for Phase 2.5:** Add a `<DataTableStatsBar>` primitive
(pill-tile buttons, `aria-pressed`, count formatting). Keep it *outside* the
`DataTableConfig` — it belongs above the table, not inside it.

### Gap 2: Filter menu is a raw `ReactNode` slot
**Symptom:** The `filters.filterMenu` prop takes arbitrary JSX. Each consumer
re-implemented "search input + status chips" — three copies with minor styling
drift.

**Impact:** Slice-wide styling changes require touching each page. Also blocks
saved-view state from *automatically* driving filter reads (each consumer has
to manually reconstruct filter state from `SavedView.state`).

**Recommendation for Phase 2.5:** Introduce a `FilterDescriptor` type that
declaratively describes filters (`{ id, type: 'search' | 'chips' | 'select',
options?, label }`) and let the primitive render the menu + own the state.
Consumers register their filter set; primitive handles serialization to
`FilterChipValue` and to `SavedView.state`.

### Gap 3: Row selection ID leaks between DataTable and consumer
**Symptom:** Bulk-action wiring on Candidates + Submissions currently uses two
separate selection stores: the primitive's internal `RowSelectionState`
(consumed by the sticky bulk bar) and the consumer's `selectedIds: string[]`
state (consumed by the legacy `<*BulkActions>` dialog).

**Impact:** Duplicate state, drift risk. The `onExecute` callback fires with
the current selection, but the consumer has to sync it into its own state.

**Recommendation for Phase 2.5:** Expose selection via a callback prop
(`onSelectionChange(rows: T[])`) so consumers can flow selection to legacy
dialogs without re-implementing the store. Alternative — retire the legacy
`*BulkActions` dialogs and move all bulk mutations behind the primitive's
`onExecute`. Latter is preferred but larger scope.

### Gap 4: URL state helper exists but isn't wired
**Symptom:** `useUrlState` is exported from the barrel but every consumer
currently persists state in-memory + `SavedView` localStorage. Deep links
(`/candidates?status=ACTIVE&q=react`) don't survive refresh.

**Impact:** Cannot share filtered lists via URL. Cross-tab workflows broken.

**Recommendation for Phase 2.5:** Wire `useUrlState('list')` into each
consumer's search + filter state via `useEffect` sync, or move the pattern into
the (still hypothetical) `FilterDescriptor` layer from Gap 2.

### Gap 5: Row hover actions are icon-only; no overflow menu
**Symptom:** Candidates has a single row action (Open). Real workflows need
2–4 quick actions (Edit / Note / Move to stage / Delete). The primitive
renders them all inline in a hover strip; five icons crowds row density on
`compact` mode.

**Impact:** Once Interviews + Resume Intelligence land with 4+ actions each,
row width pressure will force truncation.

**Recommendation for Phase 2.5:** Auto-collapse row actions past N=2 into a
`···` overflow menu on `compact`/`comfortable`; keep inline on `cozy`.

## Not gaps — deliberate boundaries

These came up during consumer conversion; recording them so future PRs don't
"fix" them:

- **Prisma types don't leak.** Column defs receive plain TS view types
  (`CandidateListItem`, `JobListItem`, `VendorListItem`, `SubmissionListItem`).
  Primitive stays boundary-clean per Slice 4 constraint.
- **Column packs live with consumers.** Each `columns.tsx` sits next to the
  page that owns it. Cross-page sharing is anti-pattern — the primitive is the
  contract, not the columns.
- **Pagination is server-driven.** Consumers pass `pagination.pageIndex` +
  `total`; DataTable turns on `manualPagination`. Client-side pagination is
  available (omit `pagination`) but no current list uses it.
- **Storybook coverage deferred.** DataTable stories will land alongside the
  Storybook install work — currently `*.stories.tsx` are excluded from
  typecheck (Slice 4 tsconfig change).

## Phase 3 readiness

The Candidate Workspace flagship screen (Phase 3) can now:

1. Consume the primitive for its embedded lists (submissions on job, interviews
   on candidate, notes timeline) without driving primitive changes.
2. Use `rowClick: 'drawer'` mode with `onRowOpen` for detail drawers — verified
   as a code path in TF-2-1 but not yet exercised by a real consumer.
3. Layer workspace-specific overlays (activity timeline, kanban, split-pane)
   *around* the primitive without modifying it.

The five gaps above are Phase 2.5 work — scheduled to land between Dashboard
(TF-2-5) and Candidate Workspace kick-off. None of them block the Dashboard
build itself.
