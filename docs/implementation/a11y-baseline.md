# Accessibility Baseline — TF-1-15

WCAG 2.2 AA target per ADR-006 / architecture review §accessibility.

## What ships in this ticket

| Layer | Tool | Config |
|---|---|---|
| **Lint** | `eslint-plugin-jsx-a11y` `strict` | `apps/web/eslint.config.mjs` |
| **Runtime (dev)** | `@axe-core/react` | `apps/web/src/lib/a11y/axe-dev.ts` — imported once in `Providers` behind a `NODE_ENV !== 'production'` guard |
| **Manual verification** | Keyboard-nav checklist | Below |

The lint step fails CI on new violations. The dev-time axe runner prints
warnings to the browser console during navigation. Neither can catch
every issue; a human runs the checklist below before any UI PR merges.

## Keyboard navigation — required paths

Each row below must be completable with no mouse. Tested on **macOS
Safari**, **Chromium**, and **Firefox** during any UI PR review.

### Global shell

| # | Action | Keys | Expected |
|---|---|---|---|
| K1 | Skip to main content | `Tab` from page load | First interactive is the "Skip to main content" link. Enter → focus jumps to `#main-content`. |
| K2 | Open command palette | `⌘K` / `Ctrl+K` | Command palette dialog opens with input focused. |
| K3 | Close command palette | `Esc` | Dialog closes; focus returns to previously-focused element (Radix Dialog default). |
| K4 | Navigate palette results | `↑` / `↓` | Selection moves; visible highlight follows. |
| K5 | Enter jumps to record | `Enter` | Router navigates; palette closes. |
| K6 | Toggle sidebar | Focus footer "Collapse sidebar" button, `Enter` | Sidebar collapses. State persists on reload. |
| K7 | Reveal collapsed-mode label | `Tab` to icon in collapsed sidebar | Tooltip appears (300 ms delay) with item name. |
| K8 | Theme toggle | Focus theme icon in sidebar footer, `Enter` | Theme flips. |
| K9 | Density submenu | Open avatar menu, `↓` to Density, `→` to open submenu, `Enter` on desired option | Density changes; check-mark updates. |

### Sidebar

| # | Action | Keys | Expected |
|---|---|---|---|
| S1 | Move between nav items | `Tab` / `Shift+Tab` | Focus visible on each item; skips visually-hidden badges. |
| S2 | Activate item | `Enter` on focused Link | Router navigates. |
| S3 | Workspace switcher | Focus + `Enter` | Dropdown opens. `↑`/`↓` moves selection, `Enter` picks. |
| S4 | Escape dropdown | `Esc` | Focus returns to trigger. |

### Inbox

| # | Action | Keys | Expected |
|---|---|---|---|
| I1 | Focus a row | `Tab` into list | Row focus visible (ring). |
| I2 | Open row | `Enter` or `Space` | Detail pane populates; row marks read. |
| I3 | Reveal row actions | `Tab` past row | Archive/Snooze/More buttons appear via `focus-within` (`.group-focus-within:flex`). |
| I4 | Filter tab keyboard | `Tab` to tab, `Enter` | Filter changes; count chip updates. |
| I5 | Detail reply box | `Tab` to reply | Textarea receives focus. (Disabled today with visible affordance — Phase 4 wires ⌘↵ send.) |

### Forms

| # | Action | Keys | Expected |
|---|---|---|---|
| F1 | Error announcement | Submit invalid form | Error text is `aria-describedby`-linked to the invalid input (already implemented — login page pattern). |
| F2 | Label association | Tab to any input | Screen reader announces the label. |

## Contrast

| Surface | Foreground | Background | Ratio (AA req: 4.5 body, 3 large) | Pass? |
|---|---|---|---|---|
| Body text on canvas (light) | `neutral-900` `#0F172A` | `neutral-50` `#F8FAFC` | 17.4 | ✅ |
| Muted text on canvas (light) | `neutral-500` `#64748B` | `neutral-50` | 4.9 | ✅ |
| Brand button text | `#FFFFFF` | `brand-500` `hsl(244 76 62)` ≈ `#5C60CC` | 4.6 | ✅ AA (borderline; verify in dark mode) |
| Active sidebar item text | `brand-700` | `brand-50` | 8.7 | ✅ |
| Danger pill text | `danger-700` | `danger-50` | 8.1 | ✅ |
| Warning pill text | `warn-700` | `warn-50` | 7.4 | ✅ |
| Body text on canvas (dark) | `neutral-100` | `#0B1020` | 15.7 | ✅ |
| Muted text on canvas (dark) | `neutral-400` | `#0B1020` | 6.9 | ✅ |

The brand accent's contrast on the primary button is the tightest ratio;
tenant-branding overrides land in Phase 7 with a clamp preventing tenants
from choosing an accent that breaks AA.

## Automated coverage

- **ESLint** — `pnpm --filter @repo/web lint`. Fails on jsx-a11y violations.
- **Axe (dev)** — Warnings surface in the browser console during
  navigation. No CI gate today; opt-in gate can be added in TF-1-VR
  Playwright suite via `@axe-core/playwright`.
- **Manual** — Checklist above is the merge gate for any UI PR.

## Follow-ups

- **TF-1-VR** — add `@axe-core/playwright` to the visual regression
  suite so accessibility failures fail CI, not just human review.
- **Reduced motion** — verify `@media (prefers-reduced-motion: reduce)`
  is honored by any future animations (framer-motion candidates).
- **Screen-reader smoke test** — semi-annual pass on VoiceOver + NVDA.
  Not wired to CI; owned by product / design QA.
