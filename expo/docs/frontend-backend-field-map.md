# Frontend → Backend Field Map

## Intake / Quote Form → `leads` table

| UI Field | Backend Column | Type | Notes |
|---|---|---|---|
| phone | `phone` | text | Digits only, stripped formatting |
| fullName | `intake_json.insuredFullName` | text | Trimmed |
| zip | `intake_json.garagingAddress.zip` | text | 5-digit |
| drivers[].name | `intake_json.drivers[].fullName` | text | |
| drivers[].dob | `intake_json.drivers[].dob` | text | MM/DD/YYYY |
| vins[] | `intake_json.vehicles[].vin` | text | Uppercased, 17-char |
| coverage | `intake_json.coverageType` | enum | `minimum` or `full` |
| currentlyInsured | (derived) | boolean | Not stored directly |
| insuredMonths | (derived) | string | Not stored directly |
| homeowner | (derived) | boolean | Not stored directly |
| contactPreference | `intake_json.contactPreference` | enum | `whatsapp`, `text`, `call` |
| languagePref | `language` | enum | `en` or `es` |
| savingsThreshold | (future) | number | Percentage, stored in user prefs |
| consentGiven | `consent` | boolean | |
| wantsReminders | (future) | boolean | Stored in user prefs |
| reminderChannel | (future) | enum | `whatsapp`, `text`, `call` |

## Computed Fields (backend calculates)

| Backend Column | Source | Notes |
|---|---|---|
| `status` | `checkQuoteReadiness()` | `WAITING_DOCS`, `NEEDS_INFO`, `READY_TO_QUOTE` |
| `can_quote` | `canQuote()` | boolean |
| `score` | `completenessScore` | 0-100 |
| `missing_required` | `getRequiredMissing()` | Array of `{ fieldKey, message }` |
| `missing_recommended` | `getRecommendedMissing()` | Array of `{ fieldKey, message }` |
| `next_question_en` | First missing field | English prompt |
| `next_question_es` | First missing field | Spanish prompt |

## Canonical Intake Statuses (frontend must use only these)

| Status | Meaning |
|---|---|
| `WAITING_DOCS` | Documents expected but not received |
| `NEEDS_INFO` | Some required fields are missing |
| `READY_TO_QUOTE` | All required fields present, can quote |

## Referral → `leads` table (fallback)

| UI Field | Backend Column | Notes |
|---|---|---|
| referredName | `intake_json.insuredFullName` | |
| referredPhone | `phone` | Digits only |
| referrerPhone | (not stored yet) | Future: referrals table |
| language | `language` | |

## Upload Intake → `leads` table

Same as Quote Form, plus:

| UI Field | Backend Column | Notes |
|---|---|---|
| currentCarrier | `intake_json.currentCarrier` | Extracted from doc |
| currentPremium | `intake_json.currentPremium` | Extracted from doc |
| policyExpiryDate | `intake_json.policyExpiryDate` | Extracted from doc |
| currentPolicyDoc | `intake_json.currentPolicyDoc` | URL reference |
