# Recruitment Platform

Multi-tenant SaaS recruitment management platform. Manages candidates, job descriptions, vendor relationships, and placement pipelines across isolated tenant organizations.

## Tech stack

| Layer | Technology |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Backend | NestJS 11 (Node.js 20) |
| Frontend | Next.js 15 / React 19 |
| Database | PostgreSQL 16 via Prisma ORM |
| Cache / Queue | Redis 7 |
| Auth | JWT (httpOnly cookies) + refresh token rotation |
| UI | Tailwind CSS + Radix UI |

---

## Prerequisites

- **Node.js** >= 20.0.0 (`node -v`)
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **Docker Desktop** (for PostgreSQL + Redis)

---

## Quick start

### 1 — Clone and install

```bash
git clone <repo-url>
cd recruitment-platform
pnpm install
```

### 2 — Start infrastructure

```bash
docker compose up -d
# Wait for healthy state:
docker compose ps
```

Expected: both `postgres` and `redis` show `healthy`.

### 3 — Configure environment

```bash
# Backend
cp apps/api/.env.example apps/api/.env

# Frontend
cp apps/web/.env.local.example apps/web/.env.local
```

The default `.env` values work with the Docker Compose setup — no changes needed for local dev.

### 4 — Database setup

```bash
# Generate Prisma client (stop API server first on Windows — DLL lock)
pnpm db:generate

# Apply all migrations
pnpm db:migrate

# Seed demo data (system roles + demo org + demo candidates)
pnpm db:seed
```

### 5 — Start the apps

```bash
# Both apps in one terminal (via Turborepo)
pnpm dev

# Or individually
pnpm --filter @repo/api dev      # http://localhost:3001
pnpm --filter @repo/web dev      # http://localhost:3000
```

---

## Demo credentials

After seeding, log in at **http://localhost:3000/login**:

| Email | Password | Role | Access |
|---|---|---|---|
| `admin@acme-demo.com` | `Demo1234!` | org_admin | Full access |
| `recruiter@acme-demo.com` | `Demo1234!` | recruiter | Candidates + jobs |
| `viewer@acme-demo.com` | `Demo1234!` | viewer | Read-only |

**Organization slug:** `acme`

---

## Key URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:3001 |
| API Health | http://localhost:3001/api/v1/health |
| Prisma Studio | `pnpm db:studio` → http://localhost:5555 |

---

## Validate health

```bash
# API health check
curl http://localhost:3001/api/v1/health

# Expected response:
# { "status": "ok", "info": { "database": { "status": "up" } } }
```

---

## Login flow (manual test)

```bash
# Login (returns httpOnly cookies)
curl -c cookies.txt -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"organizationSlug":"acme","email":"admin@acme-demo.com","password":"Demo1234!"}'

# Get current user (uses cookie)
curl -b cookies.txt http://localhost:3001/api/v1/auth/me

# List candidates
curl -b cookies.txt http://localhost:3001/api/v1/candidates

# Create candidate
curl -b cookies.txt -X POST http://localhost:3001/api/v1/candidates \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","firstName":"Test","lastName":"Candidate"}'

# Logout
curl -b cookies.txt -X POST http://localhost:3001/api/v1/auth/logout
```

---

## Project structure

```
recruitment-platform/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # Next.js frontend (port 3000)
├── packages/
│   ├── database/     # Prisma schema, migrations, seed
│   └── tsconfig/     # Shared TypeScript configs
├── docker-compose.yml
└── turbo.json
```

### Backend modules (`apps/api/src/`)

```
auth/           JWT auth, refresh tokens, RBAC guards + decorators
common/         Filters, interceptors, pagination, response helpers
config/         Environment validation (zod)
database/       PrismaService (singleton)
health/         /health endpoint
modules/
  candidates/   Candidates, Skills, CandidateSkills, CandidateNotes
```

### Frontend structure (`apps/web/src/`)

```
app/
  (auth)/login       Login page
  (dashboard)/
    dashboard/       Overview (stub — Step 6)
    candidates/      List, detail, create form
components/          Layout + shadcn UI primitives
hooks/               useAuth, useCandidates, useDebounce
lib/api/             Axios client + endpoint wrappers
providers/           Query, Auth, Theme providers
types/               TypeScript interfaces mirroring API shapes
```

---

## Database migrations

```bash
# Create a new migration (dev mode — generates SQL from schema diff)
pnpm --filter @repo/database db:migrate

# Apply migrations in production (no interactive prompt)
pnpm --filter @repo/database db:migrate:deploy

# Reset database (WARNING: destroys all data)
pnpm --filter @repo/database db:reset

# Preview SQL diff without applying
pnpm --filter @repo/database db:diff
```

---

## Environment variables

### `apps/api/.env`

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/recruitment_dev` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Access token signing secret (min 32 chars) | — |
| `JWT_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | — |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `30d` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `PORT` | API port | `3001` |

### `apps/web/.env.local`

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL | `http://localhost:3001/api/v1` |
| `JWT_SECRET` | Must match API `JWT_SECRET` (used by Edge middleware) | — |

---

## Common scripts

```bash
# Monorepo
pnpm dev          # start all apps
pnpm build        # build all apps
pnpm type-check   # TypeScript check all packages
pnpm lint         # ESLint all packages

# Database
pnpm db:generate  # regenerate Prisma client
pnpm db:migrate   # create + apply migration
pnpm db:seed      # seed demo data
pnpm db:studio    # open Prisma Studio GUI

# Per-app
pnpm --filter @repo/api dev
pnpm --filter @repo/web dev
```

---

## Implemented modules (Step 4B.1)

- [x] Multi-tenant foundation (Organization, User, Role, UserRole, AuditLog)
- [x] JWT authentication with refresh token rotation + family invalidation
- [x] RBAC: 6 system roles, permission decorators, global guards
- [x] Candidates CRUD with soft delete
- [x] Skills catalogue (global, get-or-create)
- [x] Skill assignment with proficiency + experience metadata
- [x] Candidate notes (append-only)
- [x] Candidate search (ILIKE) + filtering + pagination
- [x] Duplicate detection (L1: email unique, L2: fuzzy name+phone)

## Coming next

- [ ] Job descriptions + pipeline stages
- [ ] Submission workflow
- [ ] Vendor management
- [ ] Interview scheduling
- [ ] Resume upload (S3)
- [ ] Full-text search (tsvector GIN index)
- [ ] Real-time notifications
