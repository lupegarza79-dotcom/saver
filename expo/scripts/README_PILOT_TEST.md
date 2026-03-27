# Pilot E2E Test — How to Run

## Prerequisites

1. Supabase SQL migrations run (all 3 files — see `docs/PRODUCTION_CLOSE_EXECUTION.md`)
2. Backend deployed and reachable
3. Environment variables set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_TOKEN`

## Setup

Set two env vars before running:

### Bash (macOS/Linux)

```bash
export BASE_URL="https://your-backend-url"
export ADMIN_TOKEN="your-admin-token"
```

### PowerShell (Windows)

```powershell
$env:BASE_URL = "https://your-backend-url"
$env:ADMIN_TOKEN = "your-admin-token"
```

## Run

### Bash

```bash
chmod +x scripts/pilot_e2e.sh
./scripts/pilot_e2e.sh
```

### PowerShell

```powershell
.\scripts\pilot_e2e.ps1
```

## What It Does (10 steps, ~2 minutes)

| Step | Procedure | Auth | What It Tests |
|------|-----------|------|---------------|
| 1 | `GET /health` | None | Supabase connected, admin token set |
| 2 | `intake.submit` | None | Lead creation, intake gate scoring |
| 3 | `quotesReal.requestQuote` | None | Quote request lifecycle |
| 4 | `quotesReal.ingest` | None | Quote ingestion |
| 5 | `followups.create` | Admin | Follow-up creation with IAT_1 role |
| 6 | `commitments.create` | Admin | Commitment creation |
| 7 | `communications.log` | Admin | Communication logging |
| 8 | `referralsEngine.create` | None | Referral creation |
| 9 | `funnel.getMetrics` | None | Funnel metrics aggregation |
| 10 | `events.list` | Admin | Event timeline for audit trail |

## Expected Output

```
============================================
 SAVER OS — Pilot E2E Test
 BASE_URL: https://your-backend-url
 Time:     2026-02-25T12:00:00Z
============================================

Step 1: Health Check
  PASS: Health check returned 'healthy'

Step 2: Submit Lead (intake.submit)
  PASS: Lead created: lead_1740... (ready=True)

...

============================================
 RESULTS
============================================
 PASS: 10
 FAIL: 0

ALL STEPS PASSED — Pilot E2E complete.
```

## If a Step Fails

Each failure prints:
- **Endpoint** called
- **Payload** sent
- **Response** received
- **Fix pointer** (file/path to inspect)

### Common Failures

| Failure | Cause | Fix |
|---------|-------|-----|
| Step 1 fails (health degraded) | Missing env vars or schema not run | Check `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_TOKEN`. Run schema SQL files. |
| Step 2 returns no leadId | Supabase unreachable or schema.sql not run | Verify `/health` passes first. Run `schema.sql`. |
| Step 3 says "not READY_TO_QUOTE" | Intake data incomplete | Script sends full data — if failing, check `backend/trpc/utils/intakeGate.ts` scoring logic. |
| Step 5/6/7 returns 401 | Admin token mismatch | Ensure `ADMIN_TOKEN` env var matches what's set on backend. Header must be `Authorization: Bearer <token>`. |
| Step 5 constraint error on IAT_1 | `schema-v3-role-rename.sql` not run | Run the v3 migration. |
| Step 9 returns 0 leads | Steps 1-2 failed silently | Fix earlier steps first. |

### Dependencies

- `curl` (bash) or `Invoke-RestMethod` (PowerShell) — built-in
- `python3` (bash only) — for JSON parsing and URL encoding

## Cleanup

The script creates test data. To clean up after testing:

```sql
DELETE FROM leads WHERE phone = '5125550101';
DELETE FROM referrals WHERE referrer_phone = '5125550101';
```
