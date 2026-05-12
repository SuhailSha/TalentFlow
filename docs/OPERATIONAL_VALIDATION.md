# Operational Validation Playbook

A runnable checklist for the async infrastructure once Redis is up. Each
scenario has explicit pre-conditions, steps, and expected outcomes plus
where to look for evidence. Work through them top-to-bottom — later
scenarios assume the earlier ones passed.

The scenarios collectively prove:

- async send is happening (not the sync fallback)
- idempotency prevents duplicates
- retries actually retry (with back-off)
- failed jobs are visible and recoverable
- the system recovers from Redis / worker / API restarts
- crons don't double-fire emails

## Phase 0 — Activate Redis

```powershell
# Pick ONE of the three paths from docs/REDIS.md.
# Verify Redis is reachable:
redis-cli -h localhost -p 6379 ping
# Expected: PONG
```

In `apps/api/.env`:
```
REDIS_ENABLED=true
```

Restart the API. The boot log MUST contain:

```
[QueueModule] Connecting to Redis: redis://localhost:6379
[RedisConnectionMonitor] Redis client ready
[EmailModule] EMAIL_DRIVER=console
[BullModule] Worker EmailWorker started for queue notification-email
```

If you see `Redis client connecting` followed by `Redis client error`, Redis
isn't reachable — fix that before proceeding.

### Sanity check the new visibility

| Check | Command | Expected |
| --- | --- | --- |
| Queue health endpoint | `GET /api/v1/queue/health` | `enabled: true`, `connection.state: "ready"`, all 5 queues with zero counts |
| Connection pill | Settings → Communication log | Green "Redis: Connected" pill in the Queue health card header |
| Worker registered | API log | Line containing `EmailWorker started` (or similar from `@nestjs/bullmq`) |

If any of those fail, stop and debug before continuing.

---

## Scenario 1 — Async happy path

**Goal:** verify the send path actually queues a job and the worker
processes it (no longer the synchronous fallback).

**Pre:** Phase 0 passed. No deliveries in flight (`/api/v1/communications/stats`
shows `pending=0`).

**Steps:**

1. Sign in as the admin.
2. Settings → Team → Invite member. Email: `r5-async-happy@example.com`.
   First/Last: `R5 Test`.
3. Within 1 second, refresh Settings → Communication log.

**Expected outcomes:**

- The new delivery row appears with status pill `QUEUED` (briefly) then
  `SENT`. If you only ever see `SENT` (no `QUEUED` ever shown), Redis is
  not actually being used — go back to Phase 0.
- Queue health card: `notification-email` row shows `completed: +1`. If
  the worker is paused or backed up, you'll also see `waiting: 1`
  briefly.
- API log:
  ```
  [EmailService] Email queued                 (deliveryId=...)
  [EmailWorker] Job started                   (jobName=EMAIL_SEND)
  [ConsoleEmailProvider] [ConsoleProvider] Would have sent: ...
  [EmailWorker] Job completed                 (ms=...)
  ```
- DB:
  ```sql
  SELECT status, attempts, provider, sent_at - created_at AS latency
    FROM email_deliveries
   WHERE recipient_email = 'r5-async-happy@example.com';
  -- Expect: SENT, 1, console, < 5 seconds
  ```

---

## Scenario 2 — Retry on transient failure

**Goal:** prove BullMQ retries with exponential back-off when the
provider throws transiently.

**Pre:** Phase 0 passed. Set `EMAIL_DRIVER=smtp` with `SMTP_HOST` pointing
at a non-existent host — e.g. `SMTP_HOST=smtp.invalid.localhost`. This
forces the SMTP send to fail. Restart the API.

**Steps:**

1. Invite `r5-retry@example.com`.
2. Watch the queue health card every few seconds.
3. Watch the deliveries row for that recipient.

**Expected outcomes:**

- Row transitions: `QUEUED` → `RETRYING` (after 1st failure, ~1s back-off)
  → `RETRYING` → ... → `FAILED` (after 5 attempts, total ~31s elapsed
  per `DEFAULT_JOB_OPTIONS` exponential schedule).
- `attempts` in DB grows from 0 → 1 → 2 → ... → 5.
- The final row shows `failure_reason` with the SMTP DNS lookup error.
- Queue health card: `notification-email` row shows `failed: 1` after the
  final attempt. Failed jobs card lists the entry with the truncated
  stacktrace.

**Cleanup:** restore `EMAIL_DRIVER=console`, restart the API.

---

## Scenario 3 — Permanent failure visible + retry-recoverable

**Goal:** from a `FAILED` state, the admin retry button gets the job
unstuck.

**Pre:** Scenario 2's row is still in `FAILED`. Provider is now back to
`console` (a working provider).

**Steps:**

1. Settings → Communication log → find the failed row from Scenario 2.
2. Click the **Retry** button on the row.

**Expected outcomes:**

- Row transitions: `FAILED` → `QUEUED` → `SENT`.
- `attempts` counter persists — it does NOT reset (BullMQ retains the
  history; we deliberately don't lie to operators about how many tries
  it took).
- A new line appears in the API log: `[EmailService] Delivery manually
  requeued (deliveryId=...)`.

---

## Scenario 4 — Duplicate dispatch (idempotency)

**Goal:** prove that double-fired domain events collapse to one delivery.

**Pre:** Phase 0 passed.

**Steps:** (run via `redis-cli` or psql to simulate the race without
needing a real duplicate event)

1. Pick an existing interview with `scheduled_at` in the next 24 hours
   and `status = 'CONFIRMED'`. Note its `id`.
2. Fire the same event twice via psql:
   ```sql
   -- Simulates the dispatcher firing twice for the same interview.
   -- Easier: use the EmailService directly via a short Node script, or
   -- create an admin debug endpoint. The path under test is
   -- NotificationsService.onInterviewScheduled.
   ```
3. As a simpler substitute: use the **Send button on the team invite
   form** to invite the same email twice in <5 minutes without changing
   anything in between (two separate POST /users/invite calls).

**Expected outcomes (simpler substitute):**

- Two `UserInvitation` rows are created (correct — they're separate
  invitations).
- Two `EmailDelivery` rows are created. Each has a UNIQUE `idempotency_key`
  (`invitation:{id}:{tokenFragment}`) so dedup correctly does NOT
  collapse them.

**Real dedup test:** the most reliable way is to verify via the schema
that the dedup query works. Run:

```sql
SELECT idempotency_key, COUNT(*)
  FROM email_deliveries
 WHERE idempotency_key IS NOT NULL
   AND status IN ('SENT', 'QUEUED', 'PENDING', 'RETRYING')
 GROUP BY idempotency_key
HAVING COUNT(*) > 1;
-- Expect: zero rows. If any row appears, the dedup is broken.
```

This invariant should always hold during normal operation.

---

## Scenario 5 — Stuck-job recovery (PENDING and QUEUED paths)

**Goal:** prove `DeliveryRetryRecoveryCron` rescues rows whose BullMQ
job was lost (Redis flushed, worker crashed mid-enqueue, etc.).

**Pre:** Phase 0 passed.

**Steps:**

1. Insert a fake stuck row directly:
   ```sql
   INSERT INTO email_deliveries (
     id, organization_id, template, provider, recipient_email,
     subject, status, attempts, idempotency_key, created_at, updated_at,
     metadata
   ) VALUES (
     gen_random_uuid(),
     (SELECT id FROM organizations WHERE slug = 'acme'),
     'reminder_due_soon',
     'console',
     'r5-stuck@example.com',
     'R5 Stuck recovery test',
     'PENDING',
     0,
     'r5-stuck-test-' || extract(epoch from now())::text,
     NOW() - INTERVAL '35 minutes',  -- past the 30-min cutoff
     NOW(),
     '{"renderedHtml": "<p>recovery test</p>", "renderedText": "recovery test"}'::jsonb
   );
   ```
2. Wait up to 5 minutes (the cron runs every 5 minutes), or restart the
   API to trigger an immediate sweep on next tick.
3. Watch the row in the communications log table.

**Expected outcomes:**

- Cron log: `[DeliveryRetryRecoveryCron] Re-enqueued stuck email
  deliveries (recoveredCount=1)`.
- Row transitions: `PENDING` → `QUEUED` → `SENT`.
- `attempts` increments from 0 to 1.

---

## Scenario 6 — Cron rerun safety (no double-fires)

**Goal:** prove `UpcomingInterviewNotifierCron` dedupes against existing
deliveries.

**Pre:** at least one interview with `scheduled_at` between now and 26h
from now, status in (`SCHEDULED`, `CONFIRMED`, `RESCHEDULED`),
`interviewer_id` set to a real user.

**Steps:**

1. Wait for or trigger one cron run. Note the row produced in
   `email_deliveries` (`template = 'interview_upcoming'`).
2. Without changing anything, trigger the cron again (e.g. restart the
   API, or wait an hour).

**Expected outcomes:**

- Only ONE `email_deliveries` row exists for that interview with
  `template = 'interview_upcoming'`. Confirm:
  ```sql
  SELECT resource_id, COUNT(*)
    FROM email_deliveries
   WHERE template = 'interview_upcoming'
   GROUP BY resource_id
  HAVING COUNT(*) > 1;
  -- Expect: zero rows.
  ```
- API log on the second run does NOT show new
  `[ConsoleEmailProvider] Would have sent: ...` for that interview.

---

## Scenario 7 — Worker graceful shutdown

**Goal:** prove in-flight jobs aren't lost on API restart.

**Pre:** Phase 0 passed.

**Steps:**

1. Temporarily set `EMAIL_DRIVER=smtp` pointing at a host with a slow
   response (or set Node breakpoint in the worker — whichever is
   convenient). The point: ensure the worker takes long enough that you
   can interrupt it.
2. Invite a user.
3. As soon as the row hits `QUEUED`, send SIGINT to the API
   (Ctrl-C in the terminal running `node dist/main.js`).
4. Observe the graceful shutdown sequence in the log.
5. Restart the API immediately.

**Expected outcomes:**

- Shutdown log:
  ```
  [RedisConnectionMonitor] API shutting down — BullMQ worker drain handled by NestJS shutdown hooks
  ```
- Either:
  - **Best case:** the in-flight job finishes before shutdown completes.
    Row ends in `SENT`. No reprocessing on restart.
  - **Worse case:** shutdown happens before the job finishes. The job is
    re-picked-up after restart (BullMQ "stalled" mechanism, ~30s after
    restart). Row eventually ends in `SENT`.
- Either way: NO duplicate send (the worker's processDelivery checks
  status and short-circuits on SENT).

**Cleanup:** restore `EMAIL_DRIVER=console`.

---

## Scenario 8 — Redis restart while API is up

**Goal:** prove ioredis auto-reconnects and the system continues.

**Pre:** Phase 0 passed. API is up.

**Steps:**

1. Watch the Settings → Communication log Queue Health card. Pill should
   be green "Connected".
2. Stop Redis:
   ```bash
   docker compose stop redis
   # OR: memurai stop / wsl: sudo service redis-server stop
   ```
3. Within ~10 seconds, the pill should turn amber "Reconnecting · N
   reconnects" with N rising over time.
4. Try to invite a user during the outage. The invite endpoint should
   return 201 (no 500). The delivery row should be created in `PENDING`
   with `failure_reason="Failed to enqueue: Redis unreachable"`.
5. Restart Redis:
   ```bash
   docker compose start redis
   ```
6. Within ~5 seconds, the pill should turn green "Connected" again. API
   log shows: `[RedisConnectionMonitor] Redis client ready (recovered)`
   with the reconnect count.
7. Wait up to 5 minutes (or check the cron interval). The
   `DeliveryRetryRecoveryCron` should detect the `PENDING` row and
   re-enqueue it.
8. The row transitions: `PENDING` → `QUEUED` → `SENT`.

**Expected outcomes:**

- API stays up throughout. No 500 errors on any endpoint.
- Connection monitor's `reconnectCount` increments during the outage.
- The orphan row is recovered without manual intervention.
- DB invariant after recovery:
  ```sql
  -- No rows should still be PENDING with createdAt > 30 min ago.
  SELECT COUNT(*) FROM email_deliveries
   WHERE status = 'PENDING'
     AND created_at < NOW() - INTERVAL '35 minutes';
  -- Expect: 0
  ```

---

## Cleanup after validation

```sql
-- Remove the test fixtures (adjust patterns to match what you created).
DELETE FROM email_deliveries
 WHERE recipient_email IN (
   'r5-async-happy@example.com',
   'r5-retry@example.com',
   'r5-stuck@example.com'
 );

DELETE FROM user_invitations
 WHERE email IN (
   'r5-async-happy@example.com',
   'r5-retry@example.com'
 );
```

In `apps/api/.env`, restore production defaults:

```
EMAIL_DRIVER=console      # or smtp/sendgrid/postmark for prod
REDIS_ENABLED=true        # or false to deactivate
```

## Pass / fail criteria summary

| # | Scenario | Pass when |
| --- | --- | --- |
| 1 | Async happy path | Row goes QUEUED → SENT (not straight to SENT) |
| 2 | Retry with back-off | 5 attempts, ~31s total, ends FAILED with reason |
| 3 | Manual retry | FAILED → SENT, attempts counter preserved |
| 4 | Dedup invariant | Zero rows in the duplicate-key query |
| 5 | Stuck-job recovery | PENDING → QUEUED → SENT after cron run |
| 6 | Cron dedup | Only 1 `interview_upcoming` row per interview |
| 7 | Graceful shutdown | No duplicate sends post-restart |
| 8 | Redis restart | API stays up, rows recover after Redis returns |

When all 8 pass, the async infrastructure is operationally validated.
Re-run after each significant infra change (Redis upgrade, queue config
change, new template, etc.).
