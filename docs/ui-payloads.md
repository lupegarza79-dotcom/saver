# UI Payloads per Step / Flow

This document describes the payload shapes the frontend produces at each step and on final submit. The service adapter layer (`services/IntakeService.ts` + `services/intakeAdapter.ts`) is the single place where UI payloads are mapped to Hub backend payloads. **No screen should insert directly into Supabase or call backend tables.**

---

## Hub Backend `leads` Schema

All UI flows write to the `leads` table using this shape:

| Column | Type | Description |
|--------|------|-------------|
| `id` | `TEXT PK` | Generated client-side (`lead_<timestamp>_<random>`) |
| `phone` | `TEXT` | Digits only |
| `language` | `TEXT` | `'en'` or `'es'` |
| `consent` | `BOOLEAN` | User consent to be contacted |
| `intake_json` | `JSONB` | Full `QuoteInput` object (canonical shape) |
| `status` | `TEXT` | `'WAITING_DOCS'`, `'NEEDS_INFO'`, or `'READY_TO_QUOTE'` |
| `can_quote` | `BOOLEAN` | Computed from readiness gate |
| `score` | `INTEGER` | Completeness score (0-100) |
| `missing_required` | `JSONB` | `{ fieldKey, message }[]` |
| `missing_recommended` | `JSONB` | `{ fieldKey, message }[]` |
| `next_question_en` | `TEXT` | Next question in English |
| `next_question_es` | `TEXT` | Next question in Spanish |

---

## Adapter Architecture

```
┌─────────────┐     ┌────────────────────┐     ┌─────────────────────┐     ┌─────────────┐
│  Quote Form  │────▶│  intakeAdapter.ts  │────▶│  IntakeService.ts    │────▶│  Supabase   │
│  Upload Doc  │────▶│  UI → QuoteInput    │     │  QuoteInput → Lead  │     │  leads table │
│  Referral    │────▶│  (field mapping)    │     │  + readiness gate   │     │             │
└─────────────┘     └────────────────────┘     └─────────────────────┘     └─────────────┘
```

1. **`intakeAdapter.ts`** maps UI payloads (`QuoteFormPayload`, `UploadIntakePayload`) → `QuoteInput` (the `intake_json` shape)
2. **`IntakeService.ts`** runs `checkQuoteReadiness()` on the `QuoteInput` to compute `status`, `can_quote`, `score`, `missing_required`, `missing_recommended`, `next_question_en/es`
3. Builds a `LeadInsert` and writes to `leads`

---

## 1. Quote Form Flow (`/quote-form`)

### Steps & Fields Collected

| Step | Field(s) | Type | Required |
|------|----------|------|----------|
| `phone` | `phone` | `string` (10 digits) | Yes |
| `name` | `fullName` | `string` | Yes |
| `zip` | `zip` | `string` (5 digits) | Yes |
| `driversCount` | `driversCount` | `number` (1-4) | Yes |
| `driverInfo` | `drivers[].name`, `drivers[].dob` | `string`, `MM/DD/YYYY` | Yes |
| `vehiclesCount` | `vehiclesCount` | `number` (1-4) | Yes |
| `vin` | `vins[]` | `string` (17 chars) | Yes |
| `coverage` | `coverage` | `'minimum' \| 'full'` | Yes |
| `discounts` | `currentlyInsured`, `insuredMonths`, `homeowner` | `boolean \| null`, `string \| null`, `boolean \| null` | Optional |
| `contactPref` | `contactPreference` | `'whatsapp' \| 'text' \| 'call'` | Yes |
| `consent` | `consentGiven` | `boolean` | Yes (must be true) |

### Final Submit Payload (`QuoteFormPayload`)

```typescript
{
  phone: string;
  fullName: string;
  zip: string;
  drivers: { name: string; dob: string }[];
  vehiclesCount: number;
  vins: string[];
  coverage: 'minimum' | 'full';
  currentlyInsured: boolean | null;
  insuredMonths: string | null;
  homeowner: boolean | null;
  contactPreference: 'whatsapp' | 'text' | 'call';
  language: 'en' | 'es';
  consentGiven: boolean;
}
```

### Backend Mapping

`intakeAdapter.quoteFormToIntakeJson()` maps to `QuoteInput`:

| UI Field | `intake_json` field |
|----------|--------------------|
| `phone` | `phone` (digits only) |
| `fullName` | `insuredFullName` |
| `zip` | `garagingAddress.zip` |
| `drivers[].name/dob` | `drivers[].fullName/dob` |
| `vins[]` | `vehicles[].vin` |
| `coverage` | `coverageType` |
| `contactPreference` | `contactPreference` |
| `language` | `language` |
| `consentGiven` | `consentToContact` |

Then `IntakeService` computes: `status`, `can_quote`, `score`, `missing_required`, `missing_recommended`, `next_question_en/es`

---

## 2. Upload Policy Flow (`/upload-document`)

### Fields Collected (from AI scan + user context)

```typescript
{
  insuredFullName?: string;
  phone?: string;
  zip?: string;
  contactPreference: 'whatsapp' | 'text' | 'call';
  language: 'en' | 'es';
  consentGiven: boolean;
  drivers: { fullName?: string; dob?: string; idLast4?: string }[];
  vehicles: { vin?: string; year?: number; make?: string; model?: string }[];
  coverageType?: 'minimum' | 'full';
  liabilityLimits?: string;
  collisionDeductible?: number;
  compDeductible?: number;
  currentCarrier?: string;
  currentPremium?: number;
  policyExpiryDate?: string;
  currentPolicyDoc?: string;
}
```

### Backend Mapping

`intakeAdapter.uploadIntakeToIntakeJson()` maps to `QuoteInput`:

| UI Field | `intake_json` field |
|----------|--------------------|
| `insuredFullName` | `insuredFullName` |
| `phone` | `phone` |
| `zip` | `garagingAddress.zip` |
| `drivers` | `drivers` |
| `vehicles` | `vehicles` |
| `coverageType` | `coverageType` |
| `liabilityLimits` | `liabilityLimits` |
| `collisionDeductible` | `collisionDeductible` |
| `compDeductible` | `comprehensiveDeductible` |
| `currentCarrier` | `currentCarrier` |
| `currentPremium` | `currentPremium` |
| `policyExpiryDate` | `policyExpiryDate` |
| `currentPolicyDoc` | `currentPolicyDoc` |
| `contactPreference` | `contactPreference` |
| `language` | `language` |
| `consentGiven` | `consentToContact` |

Then `IntakeService` computes: `status`, `can_quote`, `score`, `missing_required`, `missing_recommended`, `next_question_en/es`

---

## 3. Referral Flow (`/referral`)

### Payload (`ReferralPayload`)

```typescript
{
  referrerPhone?: string;
  referredName: string;
  referredPhone: string;
  language: 'en' | 'es';
  source: 'app_referral';
}
```

### Backend Mapping

Referrals are written to `leads` (no `referrals` table yet). The referred person becomes a lead with minimal `intake_json`:

| UI Field | Lead column / `intake_json` field |
|----------|----------------------------------|
| `referredName` | `intake_json.insuredFullName` |
| `referredPhone` | `phone` + `intake_json.phone` |
| `language` | `language` + `intake_json.language` |
| (auto) | `consent: false` |
| (auto) | `status`: computed (typically `WAITING_DOCS`) |

The UI handles backend failure gracefully and continues with local flow.

---

## Texas Coverage: 30/60/25

The coverage explainer modal uses the correct Texas minimum liability:
- **$30,000** bodily injury per person
- **$60,000** bodily injury per accident
- **$25,000** property damage

This is displayed in friendly language in both EN and ES in the quote form coverage step.
