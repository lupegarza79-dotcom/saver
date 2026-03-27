# PRODUCTION CLOSE EXECUTION KIT

> Zero-friction checklist to go from empty Supabase project to passing E2E in 15 minutes.

---

## A) SQL Run Order (3 files)

### 1. `backend/supabase/schema.sql`

**What it creates:** Core tables (`leads`, `quote_requests`, `quotes`, `agent_applications`), admin schema, admin views (`admin.lead_summary`, `admin.intake_stats`), RLS policies, `update_updated_at_column()` trigger function.

**What breaks if skipped:** Everything. No tables exist. All backend operations fail.

**Run in:** Supabase SQL Editor → New Query → Paste entire file → Run.

**Verify (copy/paste):**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('leads', 'quote_requests', 'quotes', 'agent_applications')
ORDER BY table_name;
-- EXPECT: 4 rows (agent_applications, leads, quote_requests, quotes)

SELECT COUNT(*) as constraint_count FROM information_schema.check_constraints
WHERE constraint_schema = 'public';
-- EXPECT: > 0

SELECT schemaname, viewname FROM pg_views WHERE schemaname = 'admin';
-- EXPECT: 2 rows (intake_stats, lead_summary)
```

---

### 2. `backend/supabase/schema-v2.sql`

**What it creates:** `lead_events`, `lead_followups`, `lead_commitments`, `lead_communications`, `policies`, `payment_reminders`, `renewal_reminders`, `referrals`, `evidence_packages`. Extends `leads` with `email`, `full_name`, `preferred_channel`, `source`, `referral_id`. Extends `quote_requests` and `quotes`. Updates admin views. Adds `admin.ops_dashboard`, `admin.funnel_metrics`. Adds anon/authenticated RLS policies.

**What breaks if skipped:** All Saver OS operations (followups, commitments, communications, events, referrals, evidence, funnel metrics, retention) fail with "relation does not exist".

**Run in:** Supabase SQL Editor → New Query → Paste entire file → Run.

**Verify (copy/paste):**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'lead_events', 'lead_followups', 'lead_commitments',
    'lead_communications', 'policies', 'payment_reminders',
    'renewal_reminders', 'referrals', 'evidence_packages'
  )
ORDER BY table_name;
-- EXPECT: 9 rows

SELECT column_name FROM information_schema.columns
WHERE table_name = 'leads' AND column_name IN ('email', 'full_name', 'preferred_channel', 'source', 'referral_id')
ORDER BY column_name;
-- EXPECT: 5 rows

SELECT schemaname, viewname FROM pg_views WHERE schemaname = 'admin' ORDER BY viewname;
-- EXPECT: 4 rows (funnel_metrics, intake_stats, lead_summary, ops_dashboard)
```

---

### 3. `backend/supabase/schema-v3-role-rename.sql`

**What it creates:** Renames role constraints from legacy `IAT1/IAT2/IAT3` to canonical `IAT_1/IAT_2/IAT_3` across `lead_events`, `lead_communications`, `lead_followups`, `lead_commitments`.

**What breaks if skipped:** Any insert with `actor_role: 'IAT_1'` (or `sent_by_role`, `assigned_to_role`, `created_by_role`) fails with CHECK constraint violation.

**Run in:** Supabase SQL Editor → New Query → Paste entire file → Run.

**Verify (copy/paste):**

```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname IN (
  'lead_events_actor_role_check',
  'lead_communications_sent_by_role_check',
  'lead_followups_assigned_to_role_check',
  'lead_followups_escalation_target_role_check',
  'lead_commitments_created_by_role_check'
)
ORDER BY conname;
-- EXPECT: 5 rows, each containing 'IAT_1', 'IAT_2', 'IAT_3' (NOT 'IAT1', 'IAT2', 'IAT3')
```

---

## B) Storage Buckets Checklist

### Create buckets (Supabase Dashboard → Storage → New Bucket):

| Bucket Name | Public | Purpose |
|---|---|---|
| `policy-docs` | **No** (private) | Uploaded policy documents |
| `evidence-media` | **No** (private) | Evidence photos/videos |
| `id-verification` | **No** (private) | Driver license / ID images |

### Storage RLS policy (run in SQL Editor after creating buckets):

```sql
CREATE POLICY "Service role storage access" ON storage.objects
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);
```

### Verify buckets exist (SQL Editor):

```sql
SELECT id, name, public FROM storage.buckets
WHERE id IN ('policy-docs', 'evidence-media', 'id-verification')
ORDER BY id;
-- EXPECT: 3 rows, all with public = false
```

---

## C) Environment Variables Checklist

| Variable | Where Set | Where to Find | Sanity Check |
|---|---|---|---|
| `SUPABASE_URL` | Backend (server env) | Supabase → Settings → API → Project URL | Backend log: `[SUPABASE] Client initialized with URL: https://...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (server env) | Supabase → Settings → API → `service_role` key (secret) | `/health` returns `supabaseConfigured: true` |
| `ADMIN_TOKEN` | Backend (server env) | You set this (any strong secret string) | `/health` returns `adminTokenSet: true` |
| `EXPO_PUBLIC_SUPABASE_URL` | Frontend (client env) | Same as SUPABASE_URL | Frontend Supabase client initializes without error |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Frontend (client env) | Supabase → Settings → API → `anon` `public` key | Frontend can insert leads |
| `EXPO_PUBLIC_RORK_API_BASE_URL` | Frontend (client env, auto-set by system) | System-provided | tRPC calls resolve to correct backend |

### Quick health check after setting env vars:

```bash
curl -s $BASE_URL/health | python3 -m json.tool
```

**Expected:**
```json
{
  "status": "healthy",
  "checks": {
    "supabaseConfigured": true,
    "supabaseReachable": true,
    "adminTokenSet": true
  }
}
```

If `status: "degraded"`:
- `supabaseConfigured: false` → `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` missing
- `supabaseReachable: false` → URL wrong, key wrong, or schema not created yet
- `adminTokenSet: false` → `ADMIN_TOKEN` not set

---

## D) 15-Minute Manual E2E Checklist

### Step 1: Health Check

- **Endpoint:** `GET /health`
- **Expected:** `{ "status": "healthy", "checks": { "supabaseConfigured": true, "supabaseReachable": true, "adminTokenSet": true } }`
- **DB verify:** N/A

### Step 2: Submit Lead (Intake)

- **Endpoint:** `POST /api/trpc/intake.submit` (tRPC mutation)
- **Expected:** Returns `leadId`, `status` (READY_TO_QUOTE if full data), `ready: true`
- **DB verify:**
```sql
SELECT id, phone, status, can_quote, score, language FROM leads ORDER BY created_at DESC LIMIT 1;
-- EXPECT: 1 row with status = 'READY_TO_QUOTE', can_quote = true
```

### Step 3: Request Quote

- **Endpoint:** `POST /api/trpc/quotesReal.requestQuote` (tRPC mutation)
- **Input:** `{ leadId: "<from step 2>" }`
- **Expected:** Returns `quoteRequestId`
- **DB verify:**
```sql
SELECT id, lead_id, status FROM quote_requests ORDER BY created_at DESC LIMIT 1;
-- EXPECT: 1 row with status = 'REQUESTED'
```

### Step 4: Ingest Quote

- **Endpoint:** `POST /api/trpc/quotesReal.ingest` (tRPC mutation)
- **Input:** `{ quoteRequestId: "<from step 3>", quotes: [{ provider: "TestCarrier", premiumCents: 15000, source: "AGENT" }] }`
- **Expected:** Returns `{ ok: true, quoteCount: 1 }`
- **DB verify:**
```sql
SELECT id, quote_request_id, provider, premium_cents FROM quotes ORDER BY created_at DESC LIMIT 1;
-- EXPECT: 1 row with provider = 'TestCarrier', premium_cents = 15000
```

### Step 5: Create Follow-up

- **Endpoint:** `POST /api/trpc/followups.create` (admin tRPC mutation, needs `Authorization: Bearer <ADMIN_TOKEN>`)
- **Input:** `{ leadId: "<from step 2>", type: "scheduled", dueAt: "<tomorrow ISO>", assignedToRole: "IAT_1" }`
- **Expected:** Returns `{ id: "fu_...", ok: true }`
- **DB verify:**
```sql
SELECT id, lead_id, type, status, assigned_to_role FROM lead_followups ORDER BY created_at DESC LIMIT 1;
-- EXPECT: 1 row with type = 'scheduled', status = 'pending', assigned_to_role = 'IAT_1'
```

### Step 6: Create Commitment

- **Endpoint:** `POST /api/trpc/commitments.create` (admin tRPC mutation)
- **Input:** `{ leadId: "<from step 2>", type: "callback", promisedAt: "<tomorrow ISO>", channel: "whatsapp", createdByRole: "IAT_1" }`
- **Expected:** Returns `{ id: "cmt_...", ok: true }`
- **DB verify:**
```sql
SELECT id, lead_id, type, status, channel, created_by_role FROM lead_commitments ORDER BY created_at DESC LIMIT 1;
-- EXPECT: 1 row with type = 'callback', created_by_role = 'IAT_1'
```

### Step 7: Log Communication

- **Endpoint:** `POST /api/trpc/communications.log` (admin tRPC mutation)
- **Input:** `{ leadId: "<from step 2>", channel: "whatsapp", direction: "outbound", messageType: "initial_contact", content: "Pilot test message", sentByRole: "IAT_1" }`
- **Expected:** Returns `{ id: "comm_...", ok: true }`
- **DB verify:**
```sql
SELECT id, lead_id, channel, direction, message_type, sent_by_role FROM lead_communications ORDER BY created_at DESC LIMIT 1;
-- EXPECT: 1 row with channel = 'whatsapp', sent_by_role = 'IAT_1'
```

### Step 8: Create Referral

- **Endpoint:** `POST /api/trpc/referralsEngine.create` (public tRPC mutation)
- **Input:** `{ referredName: "Maria Test", referredPhone: "5125550102", referrerPhone: "5125550101", language: "es" }`
- **Expected:** Returns `{ id: "ref_...", ok: true }`
- **DB verify:**
```sql
SELECT id, referrer_phone, referred_name, referred_phone, status, language FROM referrals ORDER BY created_at DESC LIMIT 1;
-- EXPECT: 1 row with status = 'invited', language = 'es'
```

### Step 9: Pull Funnel Metrics

- **Endpoint:** `POST /api/trpc/funnel.getMetrics` (public tRPC query)
- **Expected:** Returns object with `funnel.totalLeads >= 1`
- **DB verify:**
```sql
SELECT * FROM admin.funnel_metrics;
-- EXPECT: total_leads >= 1, ready_to_quote >= 1
```

### Step 10: Pull Lead Events Timeline

- **Endpoint:** `POST /api/trpc/events.list` (admin tRPC query)
- **Input:** `{ leadId: "<from step 2>" }`
- **Expected:** Returns events array with `lead.created`, `quote.requested`, `quote.completed` events
- **DB verify:**
```sql
SELECT id, lead_id, event_type, actor_role, created_at FROM lead_events
WHERE lead_id = '<LEAD_ID>'
ORDER BY created_at;
-- EXPECT: multiple rows including lead.created, quote.requested, quote.completed, followup.created, commitment.created, communication.sent
```

---

## E) Phone-Identity UX Confirmation (No Sign-in)

The active customer flow:

| Requirement | Status | Where |
|---|---|---|
| No account creation required | YES | `app/index.tsx` → direct to `/upload-document` or `/quote-form`, no login gate |
| Phone as user identity | YES | `quote-form.tsx` step 1 = phone, stored as `leads.phone` |
| Bilingual EN/ES | YES | `LanguageSwitcher` on home, `language` field on all payloads, `i18n.ts` translations |
| Minimal info first | YES | Wizard: phone → name → zip → drivers → vehicles → coverage → discounts → communication → reminders → summary |
| Reverse-quoting promise | YES | Copy: "We only contact you if real savings exist" / "Solo te contactamos si hay ahorro real" |
| Communication preference | YES | `contactPreference` field: whatsapp/text/call → stored in `leads.intake_json.contactPreference` and `leads.preferred_channel` |
| Savings threshold % | YES | `savingsThreshold` in quote-form (default 10%) → stored in `leads.intake_json.priceGate.targetSavings` |
| Reminder opt-in (consent_reminders) | YES | `wantsReminders` + `reminderConsent` in quote-form → stored in `leads.intake_json` |
| Consent to contact | YES | `consentGiven` checkbox → `leads.consent` column |

### DB Field Mapping

| UX Field | DB Column | Table |
|---|---|---|
| Phone number | `phone` | `leads` |
| Full name | `full_name` (v2 col) + `intake_json.insuredFullName` | `leads` |
| Language | `language` | `leads` |
| Contact preference | `preferred_channel` (v2 col) + `intake_json.contactPreference` | `leads` |
| Savings threshold | `intake_json.priceGate.targetSavings` | `leads` |
| Reminder opt-in | `intake_json.wantsReminders` + `intake_json.reminderConsent` | `leads` |
| Consent | `consent` | `leads` |
| ZIP | `intake_json.garagingAddress.zip` | `leads` |

---

## F) BLOCKER TRIAGE — If X Fails, Do Y

### 1. Health returns `status: "degraded"`, `supabaseReachable: false`

- **Probable cause:** `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` wrong/missing, or schema not created.
- **File:** `backend/supabase/client.ts` (lines 54-70)
- **Fix:** Check env vars in deployment settings. Verify URL ends without trailing slash. Verify service role key (not anon key). Run schema.sql if not done.
- **Re-test:** `curl $BASE_URL/health`

### 2. Health returns `adminTokenSet: false`

- **Probable cause:** `ADMIN_TOKEN` env var not set.
- **File:** `backend/hono.ts` (line 63)
- **Fix:** Set `ADMIN_TOKEN` in backend environment variables.
- **Re-test:** `curl $BASE_URL/health`

### 3. Schema missing table (e.g., `relation "lead_events" does not exist`)

- **Probable cause:** `schema-v2.sql` not run.
- **File:** `backend/supabase/schema-v2.sql`
- **Fix:** Run schema-v2.sql in Supabase SQL Editor.
- **Re-test:** Run verification queries from section A.

### 4. Role constraint failure (e.g., `violates check constraint "lead_events_actor_role_check"`)

- **Probable cause:** `schema-v3-role-rename.sql` not run. DB still expects `IAT1` not `IAT_1`.
- **File:** `backend/supabase/schema-v3-role-rename.sql`
- **Fix:** Run schema-v3-role-rename.sql in Supabase SQL Editor.
- **Re-test:** Run verification query from section A step 3.

### 5. `lead_events` insert fails with constraint error on `actor_role`

- **Probable cause:** Code sends a role value not in the CHECK constraint list.
- **File:** `backend/trpc/utils/logEvent.ts` — check what `actorRole` value is passed.
- **Fix:** Ensure only `'IAT_1' | 'IAT_2' | 'IAT_3' | 'IAM' | 'system' | 'customer'` are used.
- **Re-test:** Retry the failing tRPC call.

### 6. Admin procedure returns 401 / `Unauthorized: Invalid admin token`

- **Probable cause:** Request missing `Authorization: Bearer <token>` header, or token doesn't match `ADMIN_TOKEN`.
- **File:** `backend/trpc/create-context.ts` (lines 37-54)
- **Fix:** Ensure header `Authorization: Bearer <ADMIN_TOKEN>` is sent. The token value must exactly match what's set in env.
- **Re-test:** `curl -H "Authorization: Bearer $ADMIN_TOKEN" $BASE_URL/api/trpc/followups.list?input=...`

### 7. Frontend tRPC calls fail / wrong base URL

- **Probable cause:** `EXPO_PUBLIC_RORK_API_BASE_URL` not set or pointing to wrong URL.
- **File:** `lib/trpc.ts` (lines 8-17)
- **Fix:** Verify env var matches actual backend deployment URL. No trailing slash.
- **Re-test:** Open app, check network tab / console for tRPC request URLs.

### 8. `intake.submit` succeeds but lead not in Supabase

- **Probable cause:** Supabase not configured on backend side, lead was stored in memory fallback.
- **File:** `backend/trpc/store/leadStore.ts` — check if it falls back to in-memory.
- **Fix:** Ensure `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` are set on backend. Check `/health` first.
- **Re-test:** Submit intake again, then query `SELECT * FROM leads ORDER BY created_at DESC LIMIT 1;`

### 9. `quotesReal.requestQuote` returns "Lead is not READY_TO_QUOTE"

- **Probable cause:** The test lead was submitted with insufficient data (missing required fields).
- **File:** `backend/trpc/routes/quotesReal.ts` (line 35-37)
- **Fix:** Ensure intake submission includes: `insuredFullName`, `phone`, `garagingAddress.zip`, at least 1 driver with `fullName` + `dob`, at least 1 vehicle with `vin`, `coverageType`.
- **Re-test:** Submit a complete intake first, verify `status: READY_TO_QUOTE` in response.

### 10. Storage bucket operations fail

- **Probable cause:** Buckets not created, or storage RLS policy not applied.
- **Fix:** Create buckets in Supabase Dashboard → Storage. Run storage RLS policy SQL from section B.
- **Re-test:** Run bucket verification query from section B.
