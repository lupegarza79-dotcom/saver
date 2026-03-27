# ============================================
# SAVER OS — Pilot E2E Test Script (PowerShell)
# ============================================
# Reads from env vars:
#   $env:BASE_URL    — backend base URL (e.g. https://your-app.rork.app)
#   $env:ADMIN_TOKEN — admin token for adminProcedure calls
# ============================================

$ErrorActionPreference = "Stop"

$PassCount = 0
$FailCount = 0
$LeadId = ""
$QuoteRequestId = ""

if (-not $env:BASE_URL) {
    Write-Host "ERROR: BASE_URL not set. Set it first: `$env:BASE_URL = 'https://your-backend-url'" -ForegroundColor Red
    exit 1
}
if (-not $env:ADMIN_TOKEN) {
    Write-Host "ERROR: ADMIN_TOKEN not set. Set it first: `$env:ADMIN_TOKEN = 'your-token'" -ForegroundColor Red
    exit 1
}

$BaseUrl = $env:BASE_URL.TrimEnd('/')
$Trpc = "$BaseUrl/api/trpc"
$Tomorrow = (Get-Date).AddDays(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

function Log-Pass($msg) {
    $script:PassCount++
    Write-Host "  PASS: $msg" -ForegroundColor Green
}

function Log-Fail($msg, $endpoint, $payload, $response, $fix) {
    $script:FailCount++
    Write-Host "  FAIL: $msg" -ForegroundColor Red
    Write-Host "    Endpoint: $endpoint" -ForegroundColor Yellow
    Write-Host "    Payload:  $payload" -ForegroundColor Yellow
    Write-Host "    Response: $response" -ForegroundColor Yellow
    Write-Host "    Fix:      $fix" -ForegroundColor Yellow
}

function Trpc-Mutate($proc, $payload, [bool]$useAdmin = $false) {
    $headers = @{ "Content-Type" = "application/json" }
    if ($useAdmin) { $headers["Authorization"] = "Bearer $($env:ADMIN_TOKEN)" }
    try {
        $resp = Invoke-RestMethod -Uri "$Trpc/$proc" -Method POST -Headers $headers -Body $payload -ErrorAction Stop
        return $resp
    } catch {
        return $_.Exception.Message
    }
}

function Trpc-Query($proc, $input, [bool]$useAdmin = $false) {
    $encoded = [System.Uri]::EscapeDataString($input)
    $headers = @{ "Content-Type" = "application/json" }
    if ($useAdmin) { $headers["Authorization"] = "Bearer $($env:ADMIN_TOKEN)" }
    try {
        $resp = Invoke-RestMethod -Uri "$Trpc/${proc}?input=$encoded" -Method GET -Headers $headers -ErrorAction Stop
        return $resp
    } catch {
        return $_.Exception.Message
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host " SAVER OS — Pilot E2E Test"
Write-Host " BASE_URL: $BaseUrl"
Write-Host " Time:     $((Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ'))"
Write-Host "============================================"
Write-Host ""

# --------------------------------------------------
# Step 1: GET /health
# --------------------------------------------------
Write-Host "Step 1: Health Check"
try {
    $resp = Invoke-RestMethod -Uri "$BaseUrl/health" -Method GET -ErrorAction Stop
    if ($resp.status -eq "healthy") {
        Log-Pass "Health check returned 'healthy'"
    } else {
        Log-Fail "Health check failed (status=$($resp.status))" "GET $BaseUrl/health" "N/A" ($resp | ConvertTo-Json -Compress) "Check SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_TOKEN env vars."
    }
} catch {
    Log-Fail "Health check request failed: $_" "GET $BaseUrl/health" "N/A" $_.Exception.Message "Check BASE_URL is correct and backend is running."
}

# --------------------------------------------------
# Step 2: intake.submit
# --------------------------------------------------
Write-Host ""
Write-Host "Step 2: Submit Lead (intake.submit)"
$intakePayload = '{"userId":"pilot_test_user","intake":{"insuredFullName":"Carlos Pilot","phone":"5125550101","garagingAddress":{"zip":"78701","state":"TX"},"contactPreference":"whatsapp","language":"en","drivers":[{"fullName":"Carlos Pilot","dob":"1990-01-15"}],"vehicles":[{"vin":"1HGCM82633A004352","year":2020,"make":"Honda","model":"Civic"}],"coverageType":"full","liabilityLimits":"30/60/25","consentContactAllowed":true,"priceGate":{"notifyOnlyIfCheaper":true,"targetSavings":10}}}'

$resp = Trpc-Mutate "intake.submit" $intakePayload
try {
    $LeadId = $resp.result.data.leadId
    $ready = $resp.result.data.ready
    if ($LeadId) {
        Log-Pass "Lead created: $LeadId (ready=$ready)"
    } else {
        Log-Fail "intake.submit returned no leadId" "POST $Trpc/intake.submit" "(see script)" ($resp | ConvertTo-Json -Compress -Depth 5) "Check backend/trpc/routes/intake.ts and Supabase connectivity."
    }
} catch {
    Log-Fail "intake.submit failed: $resp" "POST $Trpc/intake.submit" "(see script)" "$resp" "Check backend/trpc/routes/intake.ts, backend/trpc/store/leadStore.ts."
}

# --------------------------------------------------
# Step 3: quotesReal.requestQuote
# --------------------------------------------------
Write-Host ""
Write-Host "Step 3: Request Quote (quotesReal.requestQuote)"
if ($LeadId) {
    $qrPayload = "{`"leadId`":`"$LeadId`",`"requestedBy`":`"pilot_test`"}"
    $resp = Trpc-Mutate "quotesReal.requestQuote" $qrPayload
    try {
        $QuoteRequestId = $resp.result.data.quoteRequestId
        if ($QuoteRequestId) {
            Log-Pass "QuoteRequest created: $QuoteRequestId"
        } else {
            Log-Fail "quotesReal.requestQuote returned no quoteRequestId" "POST $Trpc/quotesReal.requestQuote" $qrPayload ($resp | ConvertTo-Json -Compress -Depth 5) "Ensure lead status is READY_TO_QUOTE. Check backend/trpc/routes/quotesReal.ts."
        }
    } catch {
        Log-Fail "quotesReal.requestQuote failed" "POST $Trpc/quotesReal.requestQuote" $qrPayload "$resp" "Check backend/trpc/routes/quotesReal.ts."
    }
} else {
    Log-Fail "Skipped (no LEAD_ID from step 2)" "N/A" "N/A" "N/A" "Fix step 2 first."
}

# --------------------------------------------------
# Step 4: quotesReal.ingest
# --------------------------------------------------
Write-Host ""
Write-Host "Step 4: Ingest Quote (quotesReal.ingest)"
if ($QuoteRequestId) {
    $ingestPayload = "{`"quoteRequestId`":`"$QuoteRequestId`",`"quotes`":[{`"provider`":`"TestCarrier`",`"premiumCents`":15000,`"source`":`"AGENT`",`"productName`":`"Auto Full`",`"termMonths`":6}]}"
    $resp = Trpc-Mutate "quotesReal.ingest" $ingestPayload
    try {
        if ($resp.result.data.ok -eq $true) {
            Log-Pass "Quote ingested successfully"
        } else {
            Log-Fail "quotesReal.ingest failed" "POST $Trpc/quotesReal.ingest" $ingestPayload ($resp | ConvertTo-Json -Compress -Depth 5) "Check backend/trpc/routes/quotesReal.ts, backend/trpc/store/quoteStore.ts."
        }
    } catch {
        Log-Fail "quotesReal.ingest failed" "POST $Trpc/quotesReal.ingest" $ingestPayload "$resp" "Check backend/trpc/routes/quotesReal.ts."
    }
} else {
    Log-Fail "Skipped (no QUOTE_REQUEST_ID from step 3)" "N/A" "N/A" "N/A" "Fix step 3 first."
}

# --------------------------------------------------
# Step 5: followups.create (admin)
# --------------------------------------------------
Write-Host ""
Write-Host "Step 5: Create Follow-up (followups.create)"
if ($LeadId) {
    $fuPayload = "{`"leadId`":`"$LeadId`",`"type`":`"scheduled`",`"dueAt`":`"$Tomorrow`",`"assignedToRole`":`"IAT_1`",`"priority`":`"normal`",`"reason`":`"Pilot test follow-up`"}"
    $resp = Trpc-Mutate "followups.create" $fuPayload $true
    try {
        if ($resp.result.data.ok -eq $true) {
            Log-Pass "Follow-up created"
        } else {
            Log-Fail "followups.create failed" "POST $Trpc/followups.create" $fuPayload ($resp | ConvertTo-Json -Compress -Depth 5) "Check admin auth. Check schema-v2 + v3. See backend/trpc/routes/followups.ts."
        }
    } catch {
        Log-Fail "followups.create failed" "POST $Trpc/followups.create" $fuPayload "$resp" "Check admin auth header. Check schema-v2 + v3."
    }
} else {
    Log-Fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
}

# --------------------------------------------------
# Step 6: commitments.create (admin)
# --------------------------------------------------
Write-Host ""
Write-Host "Step 6: Create Commitment (commitments.create)"
if ($LeadId) {
    $cmtPayload = "{`"leadId`":`"$LeadId`",`"type`":`"callback`",`"promisedAt`":`"$Tomorrow`",`"channel`":`"whatsapp`",`"description`":`"Pilot callback test`",`"createdByRole`":`"IAT_1`"}"
    $resp = Trpc-Mutate "commitments.create" $cmtPayload $true
    try {
        if ($resp.result.data.ok -eq $true) {
            Log-Pass "Commitment created"
        } else {
            Log-Fail "commitments.create failed" "POST $Trpc/commitments.create" $cmtPayload ($resp | ConvertTo-Json -Compress -Depth 5) "Check admin auth. Check schema-v2 + v3."
        }
    } catch {
        Log-Fail "commitments.create failed" "POST $Trpc/commitments.create" $cmtPayload "$resp" "Check admin auth. Check schema-v2 + v3."
    }
} else {
    Log-Fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
}

# --------------------------------------------------
# Step 7: communications.log (admin)
# --------------------------------------------------
Write-Host ""
Write-Host "Step 7: Log Communication (communications.log)"
if ($LeadId) {
    $commPayload = "{`"leadId`":`"$LeadId`",`"channel`":`"whatsapp`",`"direction`":`"outbound`",`"messageType`":`"initial_contact`",`"content`":`"Pilot test message`",`"sentByRole`":`"IAT_1`"}"
    $resp = Trpc-Mutate "communications.log" $commPayload $true
    try {
        if ($resp.result.data.ok -eq $true) {
            Log-Pass "Communication logged"
        } else {
            Log-Fail "communications.log failed" "POST $Trpc/communications.log" $commPayload ($resp | ConvertTo-Json -Compress -Depth 5) "Check admin auth. Check schema-v2 + v3."
        }
    } catch {
        Log-Fail "communications.log failed" "POST $Trpc/communications.log" $commPayload "$resp" "Check admin auth. Check schema-v2 + v3."
    }
} else {
    Log-Fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
}

# --------------------------------------------------
# Step 8: referralsEngine.create (public)
# --------------------------------------------------
Write-Host ""
Write-Host "Step 8: Create Referral (referralsEngine.create)"
$refPayload = '{"referrerPhone":"5125550101","referredName":"Maria Pilot","referredPhone":"5125550102","source":"direct_form","language":"es"}'
$resp = Trpc-Mutate "referralsEngine.create" $refPayload
try {
    if ($resp.result.data.ok -eq $true) {
        Log-Pass "Referral created"
    } else {
        Log-Fail "referralsEngine.create failed" "POST $Trpc/referralsEngine.create" $refPayload ($resp | ConvertTo-Json -Compress -Depth 5) "Check schema-v2 for referrals table."
    }
} catch {
    Log-Fail "referralsEngine.create failed" "POST $Trpc/referralsEngine.create" $refPayload "$resp" "Check schema-v2 for referrals table."
}

# --------------------------------------------------
# Step 9: funnel.getMetrics (public)
# --------------------------------------------------
Write-Host ""
Write-Host "Step 9: Pull Funnel Metrics (funnel.getMetrics)"
$resp = Trpc-Query "funnel.getMetrics" '{}'
try {
    $total = $resp.result.data.funnel.totalLeads
    if ($total -gt 0) {
        Log-Pass "Funnel metrics returned (totalLeads=$total)"
    } else {
        Log-Fail "funnel.getMetrics returned 0 leads" "GET $Trpc/funnel.getMetrics" '{}' ($resp | ConvertTo-Json -Compress -Depth 5) "Check Supabase connectivity and schema-v2 tables."
    }
} catch {
    Log-Fail "funnel.getMetrics failed" "GET $Trpc/funnel.getMetrics" '{}' "$resp" "Check Supabase connectivity."
}

# --------------------------------------------------
# Step 10: events.list (admin)
# --------------------------------------------------
Write-Host ""
Write-Host "Step 10: Pull Lead Events (events.list)"
if ($LeadId) {
    $eventsInput = "{`"leadId`":`"$LeadId`"}"
    $resp = Trpc-Query "events.list" $eventsInput $true
    try {
        $totalEvents = $resp.result.data.total
        if ($totalEvents -gt 0) {
            Log-Pass "Events timeline returned ($totalEvents events)"
        } else {
            Log-Fail "events.list returned 0 events" "GET $Trpc/events.list" $eventsInput ($resp | ConvertTo-Json -Compress -Depth 5) "Check schema-v2 + v3. Check backend/trpc/utils/logEvent.ts."
        }
    } catch {
        Log-Fail "events.list failed" "GET $Trpc/events.list" $eventsInput "$resp" "Check admin auth. Check schema-v2 + v3."
    }
} else {
    Log-Fail "Skipped (no LEAD_ID)" "N/A" "N/A" "N/A" "Fix step 2 first."
}

# --------------------------------------------------
# SUMMARY
# --------------------------------------------------
Write-Host ""
Write-Host "============================================"
Write-Host " RESULTS"
Write-Host "============================================"
Write-Host " PASS: $PassCount" -ForegroundColor Green
Write-Host " FAIL: $FailCount" -ForegroundColor Red
Write-Host ""

if ($FailCount -eq 0) {
    Write-Host "ALL STEPS PASSED — Pilot E2E complete." -ForegroundColor Green
    exit 0
} else {
    Write-Host "$FailCount step(s) failed. Review output above." -ForegroundColor Red
    exit 1
}
