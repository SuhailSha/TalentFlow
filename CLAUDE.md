# Recruitment Platform (TalentFlow) — Project Memory

## Stack
- pnpm monorepo + Turborepo. Node >=20, pnpm >=9.
- Backend: NestJS 11, `apps/api` (port 3001). Prisma ORM, PostgreSQL 16.
- Frontend: Next.js 15 / React 19, `apps/web` (port 3000). Tailwind + Radix.
- Redis 7 for BullMQ + rate limiting + Streams.
- Local Postgres runs as Windows user `pgrunner` (non-admin). NEVER kill
  all `node.exe` — only kill processes owned by the current user, or
  you'll kill pgrunner's postgres process too.

## ACTUAL current status (verified from code — do not trust README.md
## or docs/implementation/*.md, they are STALE)

`README.md` still says "Coming next: Job descriptions, Submission
workflow, Vendor management, Interview scheduling, Resume upload" —
**all of these already exist and are implemented.** Do not rebuild
them. Always check the actual code under apps/api/src/modules and
apps/web/src/app before assuming something doesn't exist.

**Backend modules with full controller/service/repository** (verified
present): candidates, jobs, submissions, vendors, interviews, resumes,
notifications, dashboard, roles, subscription, organization, duplicates,
communications, extraction-config, reminders, search, users.

**Frontend pages with real API wiring** (verified via
`apps/web/src/lib/api/*.ts` — real HTTP clients, not mock data):
candidates, jobs, submissions, vendors, interviews, resumes,
resume-reviews, duplicate-reviews, action-center, inbox, settings
(team/roles/organization/subscription/communications/extraction-config),
dashboard.

**In-progress work found in this latest snapshot:**
- Resume AV-scan migration exists
  (`packages/database/prisma/migrations/20240604000000_resume_av_scan`)
  — ticket TF-1-16. Confirm it has actually been applied to the dev DB
  (check via a query against `resume_versions` for `scan_*` columns)
  before assuming it's done.
- Playwright visual-regression tests added: `apps/web/playwright.config.ts`,
  3 spec files under `apps/web/tests/vr/` (shell, dashboard,
  candidate-list). Run with `pnpm --filter @repo/web vr`. This answers
  the old "screenshot capture deferred" note in phase-1-execution.md —
  it's being worked on now, may not be finished/passing yet.

**Loose scratch files at repo root — clean these up, don't treat as
real project files:**
- `.mig-status.cjs`, `.tmp-apply-avscan.cjs`, `query-users.js`,
  `test-reminders.ps1` — one-off debug scripts with hardcoded local DB
  credentials (`postgres`/`postgres`, local dev only — not a real
  secret, but shouldn't sit at repo root). Either delete them or move
  into a `scripts/debug/` folder and gitignore it.

**Known gap:** almost no automated backend/unit tests exist (only the
3 Playwright VR spec files above). Nobody has confirmed end-to-end that
a fresh clone runs cleanly.

## What NOT to do
- Do NOT re-explore the whole codebase "to understand the project" —
  it's already documented here. Go straight to the task.
- Do NOT rebuild modules that already exist (see list above) — check
  first, they're very likely already real, not mock.
- Do NOT trust README.md's "Implemented modules" / "Coming next"
  sections — update them once real work resumes, but don't plan work
  off them.
- Do NOT attempt Phase 3–7 roadmap items (AI features, SSO, compliance,
  multi-region) — out of scope for now.

## Current priority (in order)
1. `pnpm type-check && pnpm build` — fix whatever breaks. Cheapest way
   to find real problems.
2. Clean up the loose root scratch files (see above), commit.
3. Run the app locally, walk: Login → Dashboard → Candidates → Jobs →
   Submissions → Interviews. Fix only things that are actually broken.
4. Confirm the AV-scan migration is applied and check whether the
   Playwright VR tests pass (`pnpm --filter @repo/web vr`).
5. Deploy: Vercel (web) + Render (api) + Neon (Postgres) + Upstash
   (Redis). All free tier, all GitHub auto-deploy on push.

## Workflow rules (user-directed)
- Push to GitHub (`git push`) after every completed slice — don't wait
  to be asked.
- Keep sessions scoped to ONE goal. Don't let a session sprawl.

## Known bugs already fixed (don't reintroduce)
- Never use `z.coerce.boolean()` for env vars read via
  `process.env['KEY'] === 'true'` — `Boolean('false')` is `true`. Use
  `.transform(s => s === 'true' || s === '1')` instead.
