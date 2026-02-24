# Frontend → Backend Field Map

## Quote Form (app/quote-form.tsx) → Supabase `leads` table

| UI Field | Form Key | DB Column | Notes |
|----------|----------|-----------|-------|
| Phone | `phone` | `phone` (via payload) | 10-digit, stripped |
| Full Name | `fullName` | `full_name` | As on license |
| ZIP Code | `zip` | `zip` | 5-digit |
| Drivers | `drivers[]` | `drivers` (JSONB) | `{ name, dob }` per driver |
| Vehicles (VIN) | `vins[]` | `vehicles` (JSONB) | `{ vin }` per vehicle |
| Coverage | `coverage` | `coverage_type` | `"liability"` or `"full"` |
| Currently Insured | `currentlyInsured` | `currently_insured` | Boolean |
| Insured Months | `insuredMonths` | `insured_months` | `"3"`, `"6"`, `"12+"` |
| Homeowner | `homeowner` | `homeowner` | Boolean |
| Source | (auto) | `source` | `"quote-form"` |
| Status | (auto) | `status` | `"new"` |

## Upload Policy (app/upload-document.tsx) → tRPC `intake.submit` + local context

| UI Field | Source | Backend Destination | Notes |
|----------|--------|---------------------|-------|
| Policy Doc | AI scan | `currentPolicyDoc` | `"uploaded"` flag |
| Carrier | AI scan | `currentCarrier` | Extracted from dec page |
| Premium | AI scan | `currentPremium` | Monthly amount |
| VIN(s) | AI scan | `vehicles[].vin` | From scanned doc |
| Drivers | AI scan | `drivers[].fullName`, `.dob` | From scanned doc |
| Liability BI/PD | AI scan | `liabilityLimits` | Combined string |
| Deductibles | AI scan | `collisionDeductible`, `compDeductible` | Numeric |
| Expiry Date | AI scan | `policyExpiryDate` | ISO string |
| Consent | User checkbox | `consentContactAllowed` | Boolean |
| Phone | User profile | `phone` | From AppContext |
| Language | User pref | `language` | `"en"` or `"es"` |

Note: Upload flow falls back to local leadId if tRPC backend is unavailable.

## Agent Application (app/agents.tsx) → Supabase `agent_applications` table

| UI Field | Form Key | DB Column | Notes |
|----------|----------|-----------|-------|
| Full Name | `fullName` | `full_name` | Required |
| Phone | `phone` | `phone` | Required, 10+ digits |
| Email | `email` | `email` | Required, must contain @ |
| Licensed | `licensed` | `licensed` | Boolean toggle |
| States | `states` | `states` | Comma-separated |
| Years Exp | `yearsOfExperience` | `years_experience` | Numeric |
| Notes | `notes` | `notes` | Optional |

## SaverContext (contexts/SaverContext.tsx) → Supabase `leads` table

| Context Method | Supabase Table | Operation |
|----------------|---------------|-----------|
| `submitQuote` | `leads` | INSERT |
| `submitAgentApplication` | `agent_applications` | INSERT |
| `submitIntake` | `leads` | INSERT (with readiness evaluation) |
| `leads` query | `leads` | SELECT by phone |

## Readiness Evaluation (utils/quoteReadiness.ts)

Evaluated on intake submit. Fields checked:

### Required (Critical/High)
- `phone` — Contact number
- `insuredFullName` — Primary insured
- `garagingAddress.zip` — Garaging ZIP
- `vehicles[0].vin` — At least 1 VIN
- `drivers[0].fullName` — At least 1 driver name
- `drivers[0].dob` — At least 1 driver DOB
- `coverageType` — Minimum or Full
- `consentToContact` — Must be true

### Recommended (Medium/Low)
- `liabilityLimits` — Specific limits
- `collisionDeductible` — If full coverage
- `compDeductible` — If full coverage
- `currentCarrier` — For comparison
- `currentPremium` — For savings calculation
- `contactPreference` — WhatsApp/text/call
- `drivingHistory` — Tickets/accidents

## Temporary/Local Fields (Not Yet in Backend)
| Field | Location | Status |
|-------|----------|--------|
| Referral name/phone | `app/referral.tsx` | Local only — no backend table yet |
| Pending intake | `AppContext` → AsyncStorage | Persisted locally, synced on submit |
| Video evidence | `AppContext` → AsyncStorage | Local only |
| Accident reports | `AppContext` → AsyncStorage | Local only |
