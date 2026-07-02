# Visual Regression — TF-1-VR

Playwright-driven baseline screenshots for the TalentFlow shell.

## Running locally

```bash
# 1. Terminal A: start PG + API + web (needs the pgrunner-owned embedded PG).
pnpm dev

# 2. Terminal B: install browsers once (skipped in CI, which provides them).
pnpm --filter @repo/web exec playwright install chromium

# 3. Terminal B: seed the deterministic VR fixture tenant.
pnpm --filter @repo/database db:seed:vr

# 4. Run the tests.
pnpm --filter @repo/web vr

# 5. To accept a design change, update the baseline set:
pnpm --filter @repo/web vr:update
```

## What's captured

| Spec | Screenshot | Surface |
|---|---|---|
| `shell.spec.ts › Sidebar › expanded (light)` | `sidebar-expanded-light.png` | TF-1-10 |
| `shell.spec.ts › Sidebar › collapsed (light)` | `sidebar-collapsed-light.png` | TF-1-10 |
| `shell.spec.ts › Sidebar › expanded (dark)` | `sidebar-expanded-dark.png` | TF-1-10 |
| `shell.spec.ts › Sidebar › workspace switcher open` | `workspace-switcher-open.png` | TF-1-10 |
| `shell.spec.ts › Command Palette › empty state` | `cmdpal-empty.png` | TF-1-11 |
| `shell.spec.ts › Command Palette › search results` | `cmdpal-search-results.png` | TF-1-11 |
| `shell.spec.ts › Command Palette › keyboard shortcut hints` | `cmdpal-hints.png` | TF-1-11 |
| `shell.spec.ts › Inbox › empty state (inbox zero)` | `inbox-empty.png` | TF-1-12 |
| `shell.spec.ts › Inbox › list state` | `inbox-list.png` | TF-1-12 |
| `shell.spec.ts › Inbox › detail state` | `inbox-detail.png` | TF-1-12 |

Slice 6 adds:

| Spec | Screenshot | Surface |
|---|---|---|
| `candidate-list.spec.ts › default (light)` | `candidates-list-light.png` | TF-2-1 |
| `candidate-list.spec.ts › no-results` | `candidates-no-results.png` | TF-2-1 |
| `candidate-list.spec.ts › filter chip` | `candidates-filter-chip.png` | TF-2-1 |
| `candidate-list.spec.ts › dark mode` | `candidates-list-dark.png` | TF-2-1 |
| `dashboard.spec.ts › action-required` | `dashboard-action-required-light.png` | TF-2-5 |
| `dashboard.spec.ts › kpi strip crop` | `dashboard-kpi-strip.png` | TF-2-5 |
| `dashboard.spec.ts › command center crop` | `dashboard-command-center.png` | TF-2-5 |
| `dashboard.spec.ts › dark mode` | `dashboard-action-required-dark.png` | TF-2-5 |

Two projects (`desktop-1440`, `desktop-1920`) capture each state at both
viewports.

## CI wiring (follow-up)

Baselines commit into `apps/web/tests/vr/__screenshots__/`. The GHA job:

```yaml
- run: pnpm install
- run: pnpm --filter @repo/web exec playwright install --with-deps chromium
- run: node packages/database/scripts/seed-vr.cjs
- run: pnpm --filter @repo/web dev &  # background
- run: pnpm --filter @repo/web vr
- if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: apps/web/playwright-report/
```

The seed script is not yet checked in; it's the last remaining
dependency for a fully self-serve VR run. Until then, use a manually
seeded tenant.

## Why we don't run this in Slice 4's shell

The embedded Postgres in this workspace is owned by the `pgrunner`
Windows user and cannot be started from the current shell without
escalation. Baseline capture must run either:

- in staging where PG is a managed service, or
- in GitHub Actions with a `postgres` service container.

The infrastructure (config, fixtures, specs) is complete; the actual
capture is a one-command operation once one of those environments
exists.
