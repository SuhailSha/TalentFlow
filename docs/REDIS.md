# Redis Activation Guide

The platform's async infrastructure (BullMQ workers, email queue, retry handling)
is gated behind `REDIS_ENABLED=false` by default. To activate it for local dev
or production, you need a running Redis 7+ instance reachable at `REDIS_URL`.

## Option 1 — Docker Compose (recommended)

Requires Docker Desktop on Windows/Mac or `docker` + `docker compose` on Linux.

```bash
# Start Redis (and Postgres, if you don't already have it running)
docker compose up -d redis

# Verify it's healthy
docker compose ps redis
# Expected: STATUS = healthy

# Optional: start the Redis Commander UI for queue inspection at http://localhost:8081
docker compose --profile tools up -d redis-commander
```

Stop with `docker compose down` (data persists in the `redis_data` volume).

## Option 2 — Memurai (Windows-native, no Docker)

Memurai is a Redis-compatible service that runs as a native Windows service.
The Developer edition is free for non-commercial use.

1. Download from <https://www.memurai.com/get-memurai>
2. Run the installer — by default it installs as a Windows service on port 6379
3. Verify with `memurai-cli ping` → expected `PONG`

No code changes needed; the platform talks to Memurai exactly like Redis.

## Option 3 — WSL2 Redis (Windows users with WSL2 enabled)

```bash
# Inside WSL2 (Ubuntu/Debian):
sudo apt-get update
sudo apt-get install -y redis-server
sudo service redis-server start

# Verify
redis-cli ping     # expected: PONG
```

WSL2 forwards localhost:6379 to the host, so `REDIS_URL=redis://localhost:6379`
works from Windows-side processes too.

## Activating in the platform

Once Redis is running, update `apps/api/.env`:

```
REDIS_ENABLED=true
REDIS_URL=redis://localhost:6379
```

Then restart the API. The boot log should include:

```
[QueueModule] Connecting to Redis: redis://localhost:6379
[QueueModule] Redis connection ready (queues active)
[EmailModule] EMAIL_DRIVER=console
```

If Redis is unreachable while `REDIS_ENABLED=true`, the API still boots but
logs a warning and continues with degraded async behavior (the sync fallback
in `EmailService` keeps mail working).

## Verifying the queue is active

After activating, send an invitation from the platform:

1. Sign in at <http://localhost:3000>
2. Settings → Team → Invite Member
3. Open Settings → Communication log
4. The new delivery should briefly appear as `QUEUED` (visible if you reload
   quickly) before transitioning to `SENT`. With Redis disabled, deliveries
   skip `QUEUED` and go directly to `SENT` via the synchronous fallback.

Check raw queue state from `redis-cli`:

```
redis-cli
> KEYS bull:notification-email:*
> LLEN bull:notification-email:wait
> LLEN bull:notification-email:completed
```

Or use the Redis Commander UI at <http://localhost:8081> (if started).

## Recovery behavior

This section documents what the platform does under each failure mode.
None of these scenarios require operator intervention — they're all
recovered automatically — but knowing what to expect makes incident
response calmer.

### Redis goes down while the API is up

- `RedisConnectionMonitor` flips state to `reconnecting` and counts attempts
- ioredis retries the connection on a backoff schedule (200ms → 400ms → ...
  capped at 2s) until it succeeds
- BullMQ commands fail fast (`maxRetriesPerRequest: 3`); API request paths
  that try to enqueue (e.g. `POST /users/invite`) **do not hang** — they
  return after ~3 attempts, the row is created, and the `EmailDelivery` row
  stays in `PENDING`
- `DeliveryRetryRecoveryCron` later re-enqueues rows stuck in `QUEUED`
  for >30 min, but `PENDING` rows from this scenario won't auto-recover
  because no BullMQ job was ever created. Use the
  `POST /communications/deliveries/:id/retry` endpoint to manually retry
  (R6 adds this UI button) or rely on the user resending (invitation case)
- When Redis comes back, the monitor logs `Redis client ready (recovered)`
  with the reconnect count. The queue card UI shows the green "Connected"
  pill again

### Worker process crashes mid-job

- The job goes to BullMQ's "stalled" set after `stalledInterval` elapses
  (default 30s)
- The next worker that picks up the job runs `processDelivery` again.
  Because `EmailDelivery.status` is checked at the top of the worker,
  a row already in `SENT` short-circuits (no double send). A row in
  `QUEUED` or `RETRYING` proceeds normally
- Idempotency: BullMQ uses `jobId === deliveryId` so even if the same
  delivery is enqueued twice, only one job runs

### API restart during in-flight job

- `app.enableShutdownHooks()` is on in `main.ts`. On SIGTERM/SIGINT,
  NestJS calls `onApplicationShutdown` on every provider in reverse
  order of initialization
- BullMQ's `@nestjs/bullmq` integration drains in-flight jobs as part
  of that lifecycle: the worker pauses, waits for active jobs to
  complete, then closes the Redis connection
- Worst case (jobs run longer than the shutdown grace period): they
  end up in the stalled set and are picked up by the next worker as
  described above

### Redis data is wiped (e.g. container recreated without volume)

- All queued + delayed + failed BullMQ state is lost
- `EmailDelivery` rows with status `QUEUED` or `RETRYING` become
  orphaned (no BullMQ job exists, but the DB still shows them queued)
- `DeliveryRetryRecoveryCron` re-enqueues them when their createdAt
  is >30 min old
- The named Docker volume (`redis_data` in `docker-compose.yml`) is
  meant to prevent this in production

### Multiple API instances (horizontal scaling)

The scheduled jobs in `apps/api/src/scheduled/` use `@nestjs/schedule` and
will fire on **every** API instance simultaneously. The UPDATE-based jobs
(invitation expirer, reminder escalator) are idempotent; the email-dispatching
jobs dedupe via `EmailDelivery` queries plus the per-call `idempotencyKey`.
For tighter multi-instance semantics, move scheduled jobs to BullMQ
repeatable jobs (single Redis-backed scheduler).

## Observability

Once Redis is up, the operator-facing visibility is:

- **`GET /api/v1/queue/health`** — JSON: per-queue counts, paused state,
  connection state, reconnect counter, last error message, process info
- **`GET /api/v1/queue/failed-jobs?queueName=notification-email`** —
  failed-job list with stack traces (truncated)
- **`POST /api/v1/queue/failed-jobs/:queueName/:jobId/retry`** — manual
  re-queue
- **Settings → Communication log** (web UI) — Queue health card +
  failed-jobs card. The Redis connection pill in the card header turns
  amber on `reconnecting`, red on `disconnected`, green on `ready`
- **`docker compose --profile tools up -d redis-commander`** — third-party
  UI at <http://localhost:8081> to inspect raw BullMQ Redis keys

## Idempotency reference

Email sends are protected by `EmailDelivery.idempotency_key`. Within
`EMAIL_DEDUP_WINDOW_SECONDS` (default 300s) a send with the same key
returns the existing row instead of creating a new one. Keys used by
the platform:

| Source                         | Key shape                                  |
| ------------------------------ | ------------------------------------------ |
| Reminder due-soon              | `reminder-due-soon:{reminderId}`           |
| Interview feedback pending     | `interview-feedback-pending:{interviewId}` |
| Interview upcoming (inline+cron) | `interview-upcoming:{interviewId}`        |
| Invitation send / resend       | `invitation:{id}:{tokenHash[0:12]}`        |

The invitation key embeds a token fragment so manual "Resend" (which
rotates the token) produces a new send, while accidental double-fires of
the same dispatch do not.
