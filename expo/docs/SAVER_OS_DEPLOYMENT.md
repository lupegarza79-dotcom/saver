# SAVER OS - Deployment & Integration Guide

## 1. What is Complete

### Backend Schema / Routes / Contract
| Table | Status | Description |
|-------|--------|-------------|
| `leads` | MVP-live | Extended with email, full_name, preferred_channel, source, referral_id |
| `lead_events` | MVP-live | Event ledger / audit trail for all lead activity |
| `lead_communications` | MVP-live | Communication log (WhatsApp, SMS, email, call, in-app) |
| `lead_followups` | MVP-live | Follow-up tasks with SLA, escalation, priority |
| `lead_commitments` | MVP-live | Customer commitment tracking (callback, reminder, recheck) |
| `policies` | MVP-live | Policy vault for retention engine |
| `payment_reminders` | MVP-live | Payment reminder tracking with rescue flow |
| `renewal_reminders` | MVP-live | Renewal tracking with recheck-savings hook |
| `referrals` | MVP-live | Referral tracking with reward eligibility |
| `evidence_packages` | Backend-ready | Remote evidence collection packages |
| `quote_requests` | MVP-live | Extended with carrier, progress, no-close reasons, savings |
| `quotes` | MVP-live | Extended with is_best, savings_vs_current, agent_notes |
| `agent_applications` | MVP-live | Already existed |

### tRPC Routes
| Router | Status | Endpoints |
|--------|--------|-----------|
| `followups` | MVP-live | list, create, complete, escalate, overdue |
| `commitments` | MVP-live | list, create, honor |
| `communications` | MVP-live | list, log |
| `events` | MVP-live | list (event timeline) |
| `retention` | MVP-live | listPolicies, createPolicy, listPaymentReminders, createPaymentReminder, markPaymentPaid, snoozePayment, listRenewalReminders, createRenewalReminder, getRetentionStats |
| `referralsEngine` | MVP-live | create, listByReferrer, updateStatus, getStats |
| `evidence` | Backend-ready | create, get, updateChecklist, listByLead |
| `funnel` | MVP-live | getMetrics, getNoCloseReasons |
| `intake` | MVP-live | Already existed |
| `adminOps` | MVP-live | Already existed |

### Frontend / UI
| Screen | Status | Description |
|--------|--------|-------------|
| Home (`/`) | MVP-live | Updated with My Vault + Operations quick actions |
| Upload Document | MVP-live | Already existed |
| Quote Form | MVP-live | Already existed |
| Quote Submitted | MVP-live | Already existed |
| Referral | MVP-live | Already existed, now backed by referrals table |
| Agents | MVP-live | Already existed |
| Operations Center (`/ops`) | MVP-live | Funnel, leads, retention tabs with metric cards |
| My Vault (`/retention`) | MVP-live | Policy vault, payments, renewals tabs |
| Admin Dashboard | MVP-live | Already existed |
| Admin Inbox | MVP-live | Already existed |
| Admin Search | MVP-live | Already existed |

---

## 2. Supabase SQL Migrations (exact order)

Run in Supabase SQL Editor in this order:

1. **`backend/supabase/schema.sql`** - Base tables (leads, quote_requests, quotes, agent_applications)
2. **`backend/supabase/schema-v2.sql`** - SAVER OS extensions (all new tables + views)

---

## 3. RLS Setup

All tables have RLS enabled with service_role full access.

### Customer-facing policies (in schema-v2.sql):
- `leads`: anon/authenticated can INSERT (submit leads), SELECT own by phone JWT claim
- `referrals`: anon/authenticated can INSERT, SELECT own by referrer_phone JWT claim
- `evidence_packages`: anon/authenticated can INSERT
- `policies`: authenticated can SELECT own by phone JWT claim
- `payment_reminders`: authenticated can SELECT own by phone JWT claim

### Admin/Agent access:
- All admin operations go through tRPC `adminProcedure` which validates `ADMIN_TOKEN`
- Service role bypasses RLS for all backend operations

---

## 4. Storage Bucket Setup

Create these buckets in Supabase Dashboard > Storage:

| Bucket | Public | Purpose |
|--------|--------|---------|
| `policy-docs` | No | Uploaded policy documents, dec pages, ID cards |
| `evidence-media` | No | Photos, videos, signatures from evidence packages |
| `id-verification` | No | License/ID photos, selfies for identity verification |

### Storage RLS:
```sql
-- Service role has full access (for signed URL generation)
CREATE POLICY "Service role storage" ON storage.objects
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

Use signed URLs for all client access (upload and download).

---

## 5. Environment Variables Checklist

### Backend (Hono/tRPC server):
| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server-only, never expose) |
| `ADMIN_TOKEN` | Yes | Token for admin API access |

### Frontend (Expo):
| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (public) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Anon key for client-side Supabase |

### System (auto-set):
- `EXPO_PUBLIC_RORK_DB_ENDPOINT`
- `EXPO_PUBLIC_RORK_DB_NAMESPACE`
- `EXPO_PUBLIC_RORK_DB_TOKEN`
- `EXPO_PUBLIC_RORK_API_BASE_URL`

---

## 6. n8n-Ready Event/Webhook Spec

### Event Types (from `constants/statuses.ts`):
All events are logged to `lead_events` table with structured payloads.

### Webhook Integration Points:

#### Lead Lifecycle:
```json
{
  "event": "lead.created",
  "occurredAt": "2026-02-24T12:00:00Z",
  "leadId": "lead_xxx",
  "data": {
    "phone": "9561234567",
    "language": "es",
    "source": "app",
    "status": "WAITING_DOCS"
  }
}
```

#### Follow-up Escalation:
```json
{
  "event": "followup.escalated",
  "occurredAt": "2026-02-24T12:00:00Z",
  "leadId": "lead_xxx",
  "data": {
    "followupId": "fu_xxx",
    "escalatedTo": "IAM",
    "reason": "No response after 48h"
  }
}
```

#### Quote Completed:
```json
{
  "event": "quote.completed",
  "occurredAt": "2026-02-24T12:00:00Z",
  "leadId": "lead_xxx",
  "data": {
    "quoteRequestId": "qr_xxx",
    "savingsFound": true,
    "savingsAmountCents": 4500,
    "bestProvider": "Progressive",
    "bestPremiumCents": 12500
  }
}
```

#### Payment Reminder:
```json
{
  "event": "payment.reminder_sent",
  "occurredAt": "2026-02-24T12:00:00Z",
  "data": {
    "reminderId": "pmr_xxx",
    "phone": "9561234567",
    "carrier": "State Farm",
    "amountCents": 15000,
    "dueDate": "2026-03-01",
    "channel": "whatsapp"
  }
}
```

#### Referral:
```json
{
  "event": "referral.created",
  "occurredAt": "2026-02-24T12:00:00Z",
  "leadId": "lead_xxx",
  "data": {
    "referralId": "ref_xxx",
    "referredName": "Juan Garcia",
    "referredPhone": "9567654321",
    "source": "direct_form"
  }
}
```

### n8n Integration Pattern:
1. Poll `lead_events` table via Supabase webhook or scheduled query
2. Filter by `event_type` to trigger specific workflows
3. Use `metadata` JSONB for workflow-specific data
4. Alternatively, add webhook URLs to Hono endpoints for real-time push

---

## 7. Auth Model

### Current State:
- **Customer**: Phone-based pseudo-auth via AsyncStorage (no server sessions yet)
- **Admin**: Token-based via `ADMIN_TOKEN` header
- **Agent**: Application flow, verified by admin

### Recommended Next Steps:
1. **Supabase Auth** for phone/magic link login
2. **JWT claims** with phone number for RLS policies
3. **Agent auth** via Supabase Auth with role metadata

### Session Assumptions:
- Frontend stores user state in AsyncStorage
- Backend validates admin token on protected routes
- Customer data is keyed by phone number
- No server-side sessions required for MVP

---

## 8. Deploy Steps

### Backend:
The backend is a Hono app at `backend/hono.ts`. It deploys automatically via the Rork platform.

### Frontend:
Expo app deploys via Rork platform. QR code available for mobile testing.

### Manual Steps After Deploy:
1. Run `backend/supabase/schema.sql` in Supabase SQL Editor
2. Run `backend/supabase/schema-v2.sql` in Supabase SQL Editor
3. Run `backend/supabase/schema-v3-role-rename.sql` in Supabase SQL Editor
4. Create storage buckets in Supabase Dashboard > Storage:
   - `policy-docs` (private)
   - `evidence-media` (private)
   - `id-verification` (private)
5. Set environment variables:
   - `SUPABASE_URL` (backend)
   - `SUPABASE_SERVICE_ROLE_KEY` (backend)
   - `ADMIN_TOKEN` (backend)
   - `EXPO_PUBLIC_SUPABASE_URL` (frontend)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` (frontend)
6. Verify backend health: `GET /health` (returns Supabase connectivity check)
7. Verify admin CSV export: `GET /api/admin/stats` with basic auth

---

## 9. Canonical Status Definitions

### Lead Intake Statuses (ONLY these three):

| Status | Meaning | Transitions To |
|--------|---------|----------------|
| `WAITING_DOCS` | Lead submitted but missing required documents | NEEDS_INFO, READY_TO_QUOTE |
| `NEEDS_INFO` | Documents received but missing key data fields | WAITING_DOCS, READY_TO_QUOTE |
| `READY_TO_QUOTE` | All required info collected, can send to carriers | NEEDS_INFO |

### Transition Validation:
- Enforced in `constants/statuses.ts` via `isValidStatusTransition()`
- All transitions logged to `lead_events` table

### Quote Request Statuses:
| Status | Meaning |
|--------|---------|
| `REQUESTED` | Quote request created, not yet started |
| `IN_PROGRESS` | Agent actively quoting with carriers |
| `COMPLETED` | Quotes received and ready for customer |
| `FAILED` | Unable to obtain quotes |
| `EXPIRED` | Quote request expired without completion |

---

## 10. Role Naming

| Role | Label | Description |
|------|-------|-------------|
| `IAT_1` | Insurance Agent Team 1 | First-line agent |
| `IAT_2` | Insurance Agent Team 2 | Second-line agent |
| `IAT_3` | Insurance Agent Team 3 | Third-line agent |
| `IAM` | Insurance Agent Manager | Escalation target |
| `system` | System | Automated actions |
| `customer` | Customer | Customer-initiated actions |

**Migration note**: If upgrading from pre-v3, run `schema-v3-role-rename.sql` to update existing data from IAT1/IAT2/IAT3 to IAT_1/IAT_2/IAT_3.

---

## 11. SAVER Communication Rules

The system enforces:
1. **Reverse quoting** - customer initiates, not agents
2. **No cold calling** - contact only when value exists
3. **No spam** - preferred channel respected
4. **Contact only when**:
   - Real savings found
   - User requested reminder/follow-up
   - Payment/renewal action needed
5. **Commitment-style prompts** - "When should we remind you?"
6. **Preferred channel respected** - stored per lead

---

## 12. Blockers / Known Limitations

| Item | File/Path | Issue | Resolution |
|------|-----------|-------|------------|
| Supabase Auth | N/A | No phone/magic link auth yet | Implement Supabase Auth for production |
| Storage uploads | N/A | No signed URL generation in frontend | Add upload flow via tRPC + Supabase Storage |
| n8n webhooks | N/A | Events logged to DB only, no push webhooks | Add webhook push to Hono endpoints or use Supabase webhooks |
| Evidence camera | app/evidence | Camera/photo capture not wired to storage | Wire expo-camera + Supabase Storage |
| Payment automation | N/A | Reminders are manual, no auto-send | Wire n8n to poll payment_reminders and send WhatsApp |
| Renewal recheck | N/A | Recheck savings is a flag only | Wire n8n to trigger re-quote workflow on renewal approach |

---

## 13. 10-Minute End-to-End Test

1. **Health check**: `GET /health` — expect `{"status":"healthy","checks":{"supabaseConfigured":true,"supabaseReachable":true,"adminTokenSet":true}}`
2. **Submit intake**: Call `intake.submit` with phone, language, consent, partial intake data — expect lead created in Supabase `leads` table with status `WAITING_DOCS` or `NEEDS_INFO`
3. **Assistant flow**: Call `assistant.submitIntake` with more fields — expect status progresses toward `READY_TO_QUOTE`
4. **Complete intake**: Call `assistant.answer` with remaining required fields — expect `canQuote: true`, status `READY_TO_QUOTE`
5. **Request quote**: Call `quotesReal.requestQuote` with the leadId — expect `quote_requests` row with status `REQUESTED`
6. **Ingest quotes**: Call `quotesReal.ingest` with provider/premium data — expect `quotes` rows, request status `COMPLETED`
7. **Create follow-up**: Call `followups.create` with leadId, type, dueAt — expect `lead_followups` row
8. **Create referral**: Call `referralsEngine.create` with referrer info — expect `referrals` row
9. **Verify ops screen**: Open `/ops` — expect funnel numbers match Supabase data
10. **Verify admin screen**: Open `/admin` — expect stats match Supabase data

---

## 14. Legacy Routes (Disabled)

The following legacy in-memory routes were removed from the active router in the production readiness pass:
- `users`, `policies`, `documents`, `reminders`, `videoEvidence`, `accidentReports`
- `snapshots`, `leads` (old system), `admin` (old webhook system)
- `agents`, `agentLeads`, `leadOffers`, `subscriptions`

Source files remain in `backend/trpc/routes/` and `backend/db/index.ts` for reference but are NOT registered in `app-router.ts`.
The canonical data path is Supabase-only via `leadStore`, `quoteStore`, and direct Supabase queries.
