# capture-vr.ps1 — one-shot Playwright visual regression capture.
#
# Runs on a dev/staging machine where you (or the pgrunner service)
# can start Postgres. Applies migrations, seeds the deterministic VR
# fixture tenant, starts API + web in the background, waits for both
# to be reachable, runs the VR suite, then tears the background
# processes down.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File scripts\capture-vr.ps1
#
# Env overrides (defaults match seed-vr.ts):
#   $env:E2E_VR_TENANT   = 'vr-tenant'
#   $env:E2E_VR_EMAIL    = 'vr@vr-tenant.demo'
#   $env:E2E_VR_PASSWORD = 'Demo1234!'
#
# On failure the script leaves the background processes and open
# Playwright report alive so you can inspect. Re-run to try again.

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "== VR capture pipeline ==" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host ""

# ── Precondition: PG must be reachable ─────────────────────────────
Write-Host "[1/6] Checking Postgres reachability on localhost:5432..." -ForegroundColor Yellow
$pgUp = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $pgUp) {
  Write-Host "  Postgres is NOT reachable on 5432." -ForegroundColor Red
  Write-Host "  Start it before re-running:" -ForegroundColor Red
  Write-Host "    - Embedded PG: launch as pgrunner user via node scripts\start-db.cjs" -ForegroundColor Red
  Write-Host "    - Or set DATABASE_URL to a managed service" -ForegroundColor Red
  exit 1
}
Write-Host "  Postgres reachable." -ForegroundColor Green

# ── 2. Apply migrations ────────────────────────────────────────────
Write-Host "`n[2/6] Applying migrations..." -ForegroundColor Yellow
pnpm --filter '@repo/database' exec prisma migrate deploy
if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed" }

# ── 3. Seed the deterministic VR fixture ───────────────────────────
Write-Host "`n[3/6] Seeding VR fixture tenant..." -ForegroundColor Yellow
pnpm --filter '@repo/database' db:seed:vr
if ($LASTEXITCODE -ne 0) { throw "seed-vr failed" }

# ── 4. Install Playwright browsers (idempotent) ────────────────────
Write-Host "`n[4/6] Installing Chromium (skip if already present)..." -ForegroundColor Yellow
pnpm --filter '@repo/web' exec playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "playwright install failed" }

# ── 5. Start API + Web in the background ───────────────────────────
Write-Host "`n[5/6] Starting API + web in background..." -ForegroundColor Yellow
$apiLog = Join-Path $repoRoot 'apps\api\vr-api.log'
$webLog = Join-Path $repoRoot 'apps\web\vr-web.log'
Remove-Item $apiLog, $webLog -ErrorAction SilentlyContinue

$apiProc = Start-Process pnpm -ArgumentList '--filter','@repo/api','dev' `
  -RedirectStandardOutput $apiLog -RedirectStandardError $apiLog `
  -PassThru -WindowStyle Hidden -WorkingDirectory $repoRoot
$webProc = Start-Process pnpm -ArgumentList '--filter','@repo/web','dev' `
  -RedirectStandardOutput $webLog -RedirectStandardError $webLog `
  -PassThru -WindowStyle Hidden -WorkingDirectory $repoRoot

Write-Host "  API pid: $($apiProc.Id) (log: $apiLog)"
Write-Host "  Web pid: $($webProc.Id) (log: $webLog)"

# Wait for both to be reachable — API on 3000, Web on 3001.
$deadline = (Get-Date).AddMinutes(3)
$apiUp = $false
$webUp = $false
while ((Get-Date) -lt $deadline -and -not ($apiUp -and $webUp)) {
  Start-Sleep -Seconds 2
  $apiUp = Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet -WarningAction SilentlyContinue
  $webUp = Test-NetConnection -ComputerName localhost -Port 3001 -InformationLevel Quiet -WarningAction SilentlyContinue
}
if (-not $apiUp) { Write-Host "  API did not start within 3 min. See $apiLog" -ForegroundColor Red; exit 1 }
if (-not $webUp) { Write-Host "  Web did not start within 3 min. See $webLog" -ForegroundColor Red; exit 1 }
Write-Host "  Both up." -ForegroundColor Green

# ── 6. Run the VR suite ────────────────────────────────────────────
Write-Host "`n[6/6] Running Playwright VR suite..." -ForegroundColor Yellow
if (-not $env:E2E_VR_TENANT)   { $env:E2E_VR_TENANT   = 'vr-tenant' }
if (-not $env:E2E_VR_EMAIL)    { $env:E2E_VR_EMAIL    = 'vr@vr-tenant.demo' }
if (-not $env:E2E_VR_PASSWORD) { $env:E2E_VR_PASSWORD = 'Demo1234!' }
Write-Host "  Tenant: $env:E2E_VR_TENANT  Email: $env:E2E_VR_EMAIL"

pnpm --filter '@repo/web' vr
$vrExit = $LASTEXITCODE

# ── Cleanup ────────────────────────────────────────────────────────
Write-Host "`nStopping background processes..." -ForegroundColor Yellow
Stop-Process -Id $apiProc.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $webProc.Id -Force -ErrorAction SilentlyContinue

if ($vrExit -ne 0) {
  Write-Host "`nVR suite failed. Report:" -ForegroundColor Red
  Write-Host "  apps\web\playwright-report\index.html" -ForegroundColor Red
  Write-Host "  Open with: pnpm --filter '@repo/web' exec playwright show-report" -ForegroundColor Red
  exit $vrExit
}

Write-Host "`nVR suite passed." -ForegroundColor Green
Write-Host "Baselines are at apps\web\tests\vr\__screenshots__\." -ForegroundColor Green
Write-Host "To accept a design change and update baselines:"
Write-Host "  pnpm --filter '@repo/web' vr:update"
