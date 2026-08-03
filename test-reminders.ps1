param()
$BASE = "http://localhost:3001/api/v1"
$cookieJar = New-Object System.Net.CookieContainer

function Invoke-API {
    param($Method, $Path, $Body = $null)
    $req = [System.Net.HttpWebRequest]::Create("$BASE$Path")
    $req.Method = $Method
    $req.CookieContainer = $cookieJar
    if ($Body) {
        $req.ContentType = "application/json"
        $bytes = [System.Text.Encoding]::UTF8.GetBytes($Body)
        $req.ContentLength = $bytes.Length
        $stream = $req.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
    }
    try {
        $resp = $req.GetResponse()
        $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
        $content = $reader.ReadToEnd()
        # Update cookies
        $resp.Cookies | ForEach-Object { $cookieJar.Add($_) }
        return $content | ConvertFrom-Json
    } catch [System.Net.WebException] {
        $errStream = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errStream)
        $errBody = $reader.ReadToEnd()
        Write-Host "ERROR [$Method $Path] $($_.Exception.Response.StatusCode): $errBody" -ForegroundColor Red
        return $null
    }
}

# Login (use WebClient to get cookies into the jar)
Write-Host "`n=== LOGIN ===" -ForegroundColor Cyan
$loginBody = '{"email":"admin@acme-demo.com","password":"Demo1234!","organizationSlug":"acme"}'
$loginReq = [System.Net.HttpWebRequest]::Create("$BASE/auth/login")
$loginReq.Method = "POST"
$loginReq.ContentType = "application/json"
$loginReq.CookieContainer = $cookieJar
$loginBytes = [System.Text.Encoding]::UTF8.GetBytes($loginBody)
$loginReq.ContentLength = $loginBytes.Length
$loginStream = $loginReq.GetRequestStream()
$loginStream.Write($loginBytes, 0, $loginBytes.Length)
$loginStream.Close()
$loginResp = $loginReq.GetResponse()
$loginReader = New-Object System.IO.StreamReader($loginResp.GetResponseStream())
$loginContent = $loginReader.ReadToEnd() | ConvertFrom-Json
# Cookies are auto-managed by the container
Write-Host "Logged in as: $($loginContent.user.email)"

# 1. Action center
Write-Host "`n=== ACTION CENTER ===" -ForegroundColor Cyan
$ac = Invoke-API -Method GET -Path "/reminders/action-center"
if ($ac) { Write-Host "Stats: $($ac.stats | ConvertTo-Json -Compress)" }

# 2. Stats
Write-Host "`n=== STATS ===" -ForegroundColor Cyan
$stats = Invoke-API -Method GET -Path "/reminders/stats"
if ($stats) { Write-Host "Stats: $($stats | ConvertTo-Json -Compress)" }

# 3. Create overdue reminder
Write-Host "`n=== CREATE CUSTOM (overdue) ===" -ForegroundColor Cyan
$r1 = Invoke-API -Method POST -Path "/reminders" -Body '{"type":"CUSTOM","title":"Overdue test reminder","dueAt":"2026-05-09T10:00:00Z"}'
if ($r1) { Write-Host "Created: $($r1.id) | priority=$($r1.priority) | status=$($r1.status)" }

# 4. Create feedback pending
Write-Host "`n=== CREATE FEEDBACK_PENDING ===" -ForegroundColor Cyan
$r2 = Invoke-API -Method POST -Path "/reminders" -Body '{"type":"INTERVIEW_FEEDBACK_PENDING","title":"Submit feedback for John Doe","dueAt":"2026-05-11T18:00:00Z","priority":"HIGH"}'
if ($r2) { Write-Host "Created: $($r2.id) | priority=$($r2.priority) | status=$($r2.status)" }

# 5. List
Write-Host "`n=== LIST ===" -ForegroundColor Cyan
$list = Invoke-API -Method GET -Path "/reminders"
if ($list) { Write-Host "Total: $($list.meta.total), Items: $($list.data.Count)" }

# 6. Get by ID
Write-Host "`n=== GET BY ID ===" -ForegroundColor Cyan
if ($r1) {
    $detail = Invoke-API -Method GET -Path "/reminders/$($r1.id)"
    if ($detail) { Write-Host "Title: $($detail.title) | Activities: $($detail.activities.Count)" }
}

# 7. Acknowledge r1
Write-Host "`n=== ACKNOWLEDGE ===" -ForegroundColor Cyan
if ($r1) {
    $acked = Invoke-API -Method POST -Path "/reminders/$($r1.id)/acknowledge" -Body '{}'
    if ($acked) { Write-Host "Status: $($acked.status) | acknowledgedAt=$($acked.acknowledgedAt)" }
}

# 8. Snooze r2
Write-Host "`n=== SNOOZE ===" -ForegroundColor Cyan
if ($r2) {
    $snoozed = Invoke-API -Method POST -Path "/reminders/$($r2.id)/snooze" -Body '{"minutes":60,"note":"Need more time"}'
    if ($snoozed) { Write-Host "Status: $($snoozed.status) | snoozedUntil=$($snoozed.snoozedUntil)" }
}

# 9. Complete r1 (ACKNOWLEDGED → COMPLETED)
Write-Host "`n=== COMPLETE ===" -ForegroundColor Cyan
if ($r1) {
    $completed = Invoke-API -Method POST -Path "/reminders/$($r1.id)/complete" -Body '{"note":"Done!"}'
    if ($completed) { Write-Host "Status: $($completed.status) | completedAt=$($completed.completedAt)" }
}

# 10. Reopen r1
Write-Host "`n=== REOPEN ===" -ForegroundColor Cyan
if ($r1) {
    $reopened = Invoke-API -Method POST -Path "/reminders/$($r1.id)/reopen" -Body '{}'
    if ($reopened) { Write-Host "Status: $($reopened.status)" }
}

# 11. Dismiss r2 (SNOOZED → DISMISSED)
Write-Host "`n=== DISMISS ===" -ForegroundColor Cyan
if ($r2) {
    $dismissed = Invoke-API -Method POST -Path "/reminders/$($r2.id)/dismiss" -Body '{"reason":"No longer needed"}'
    if ($dismissed) { Write-Host "Status: $($dismissed.status) | dismissedAt=$($dismissed.dismissedAt)" }
}

# 12. Update r1
Write-Host "`n=== UPDATE ===" -ForegroundColor Cyan
if ($r1) {
    $updated = Invoke-API -Method PATCH -Path "/reminders/$($r1.id)" -Body '{"priority":"HIGH","title":"Updated reminder title"}'
    if ($updated) { Write-Host "Updated: title=$($updated.title) | priority=$($updated.priority)" }
}

# 13. Action center after changes
Write-Host "`n=== ACTION CENTER (after) ===" -ForegroundColor Cyan
$ac2 = Invoke-API -Method GET -Path "/reminders/action-center"
if ($ac2) { Write-Host "Stats: $($ac2.stats | ConvertTo-Json -Compress)" }

# 14. Notifications
Write-Host "`n=== NOTIFICATIONS ===" -ForegroundColor Cyan
$notifs = Invoke-API -Method GET -Path "/notifications"
if ($notifs) { Write-Host "Total: $($notifs.meta.total)" }
$unread = Invoke-API -Method GET -Path "/notifications/unread-count"
if ($unread) { Write-Host "Unread: $($unread.count)" }

# 15. Filter by status
Write-Host "`n=== FILTER BY STATUS=PENDING ===" -ForegroundColor Cyan
$pending = Invoke-API -Method GET -Path "/reminders?status=PENDING"
if ($pending) { Write-Host "Pending: $($pending.meta.total)" }

Write-Host "`n=== ALL TESTS COMPLETE ===" -ForegroundColor Green
