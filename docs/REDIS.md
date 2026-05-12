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

## Multi-instance considerations

The scheduled jobs in `apps/api/src/scheduled/` use `@nestjs/schedule` and
will fire on **every** API instance simultaneously. The UPDATE-based jobs
(invitation expirer, reminder escalator) are idempotent; the email-dispatching
jobs dedupe via `EmailDelivery` queries. For tighter multi-instance semantics,
move scheduled jobs to BullMQ repeatable jobs (single Redis-backed scheduler).
