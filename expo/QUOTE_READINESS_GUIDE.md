# Quote Readiness Gate - Quick Reference

## Purpose
Prevent quotes from being generated with incomplete or fake data. Ensure all required information is collected before allowing the system to proceed.

---

## Required Fields (Priority 1 - BLOCKING)

### ✅ Consent & Contact
- `consentContactAllowed` - User must agree to be contacted
- `phone` - Valid 10-digit US phone number

### ✅ Driver Information
For EACH driver:
- `fullName` - Driver's full name
- `dob` - Date of birth (MM/DD/YYYY, age 15-100)

### ✅ Vehicle Information
For EACH vehicle:
- `vin` - Valid 17-character VIN (no I, O, Q)

### ✅ Coverage Details
- `coverageType` - "minimum" or "full"
- `liabilityLimits` - Format: "30/60/25" (Texas minimum)

### ✅ Deductibles (if Full Coverage)
- `collisionDeductible` - $250, $500, $1000, or $2500
- `compDeductible` - $250, $500, $1000, or $2500

### ✅ Special Rules
- If `financedOrLienholder === true` → MUST have `coverageType === 'full'`

---

## Recommended Fields (Priority 2-3 - NOT BLOCKING)

### Priority 2 (Important)
- `insuredFullName` - Primary insured's name
- `garagingAddress.zip` - ZIP code for rating
- `vehicles[].year` - Vehicle year (can be decoded from VIN)
- `vehicles[].make` - Vehicle make
- `vehicles[].model` - Vehicle model

### Priority 3 (Optional)
- `drivers[].idType` - TXDL, TX ID, Matricula, Other
- `drivers[].idPhoto` - Photo of ID
- `contactPreference` - whatsapp, call, or text
- `currentPolicyDoc` - Current policy document
- `drivingHistory` - Tickets/accidents in last 3 years

---

## Status Levels

### `WAITING_DOCS`
- **Condition**: No data collected yet
- **Action**: Prompt user to upload policy or enter VIN
- **Next Step**: Upload document or start manual entry

### `NEEDS_INFO`
- **Condition**: Some data exists, but required fields missing
- **Action**: AI Assistant asks for missing fields (one at a time)
- **Next Step**: Collect missing required fields

### `READY_TO_QUOTE`
- **Condition**: All required (priority 1) fields present and valid
- **Action**: Submit to backend, emit webhook, allow quote generation
- **Next Step**: Display real quotes or wait for backend

---

## Validation Rules

### VIN Validation
```typescript
- Length: exactly 17 characters
- Characters: A-H, J-N, P-R, Z, 0-9 (no I, O, Q)
- Case: uppercase
```

### DOB Validation
```typescript
- Formats accepted: 
  - YYYY-MM-DD
  - MM/DD/YYYY
  - MM-DD-YYYY
- Age range: 15-100 years
- Must be valid calendar date
```

### Liability Limits
```typescript
- Format: "BI/BI_PER_ACCIDENT/PD"
- Texas minimum: 30/60/25
- Common options:
  - 30/60/25 (minimum)
  - 50/100/50 (recommended)
  - 100/300/100 (high)
  - 250/500/100
  - 250/500/250
  - 500/500/100
```

### Deductibles
```typescript
- Valid amounts: $250, $500, $1000, $2500
- Required only if coverageType === 'full'
```

### Phone
```typescript
- Format: 10 digits (with optional +1)
- Accepts: (555) 123-4567, 555-123-4567, 5551234567
```

---

## Function Reference

### Check if Ready to Quote
```typescript
import { canQuote } from '@/utils/quoteReadiness';

const ready = canQuote(intake);
// Returns: true if all required fields present
```

### Get Missing Fields
```typescript
import { missingFields, getRequiredMissing } from '@/utils/quoteReadiness';

const all = missingFields(intake);
// Returns: MissingField[] sorted by priority

const required = getRequiredMissing(intake);
// Returns: only required fields
```

### Get Status
```typescript
import { getIntakeStatus } from '@/utils/quoteReadiness';

const status = getIntakeStatus(intake);
// Returns: 'WAITING_DOCS' | 'NEEDS_INFO' | 'READY_TO_QUOTE'
```

### Get Next Question
```typescript
import { getAssistantPrompt } from '@/utils/quoteReadiness';

const question = getAssistantPrompt(intake, 'en');
// Returns: Next question to ask user (or null if ready)
```

### Calculate Completeness
```typescript
import { completenessScore, missingFields } from '@/utils/quoteReadiness';

const missing = missingFields(intake);
const score = completenessScore(intake, missing);
// Returns: 0-100 (80% required + 20% recommended)
```

---

## Webhook Payloads

### When Missing Fields Updated
```json
{
  "event": "lead.missing_fields_updated",
  "leadId": "lead_123",
  "userId": "user_456",
  "phone": "+15551234567",
  "language": "en",
  "canQuote": false,
  "missingRequired": [
    {
      "key": "vehicles[0].vin",
      "priority": 1,
      "severity": "required",
      "label_en": "VIN for 2020 Toyota Camry",
      "label_es": "VIN para 2020 Toyota Camry"
    }
  ],
  "missingRecommended": [...],
  "message": "✅ Received. To quote today I need:\n1) VIN for 2020 Toyota Camry\n\nReply here or send a photo."
}
```

### When Ready to Quote
```json
{
  "event": "lead.ready_to_quote",
  "leadId": "lead_123",
  "userId": "user_456",
  "phone": "+15551234567",
  "language": "en",
  "canQuote": true,
  "completenessScore": 95,
  "intake": { /* full QuoteInput object */ }
}
```

---

## Assistant Flow Example

### User Journey
1. **Upload Policy** → AI extracts data
2. **Gate Check** → Missing: phone, DOB
3. **Assistant Asks**: "What's your phone number?"
4. **User Responds**: "555-123-4567"
5. **Gate Check** → Missing: DOB
6. **Assistant Asks**: "What's your date of birth? (MM/DD/YYYY)"
7. **User Responds**: "01/15/1985"
8. **Gate Check** → ✅ READY_TO_QUOTE
9. **Webhook Emitted** → n8n processes
10. **Quotes Generated** → User notified via WhatsApp

---

## Common Scenarios

### Scenario 1: User uploads clear dec page
```
Upload → AI extracts 90% → Missing: phone, consent
→ Assistant asks for phone → User provides
→ Assistant asks for consent → User agrees
→ READY_TO_QUOTE ✅
```

### Scenario 2: User uploads blurry photo
```
Upload → AI extracts 30% → Missing: VIN, DOB, coverage
→ Assistant asks for VIN → User sends door sticker photo
→ AI extracts VIN → Missing: DOB, coverage
→ Assistant asks for DOB → User provides
→ Assistant asks coverage type → User selects "Full"
→ Assistant asks deductibles → User selects $500/$500
→ READY_TO_QUOTE ✅
```

### Scenario 3: User enters VIN manually
```
No upload → User types VIN → Missing: everything else
→ Assistant asks phone → User provides
→ Assistant asks email → User provides
→ Assistant asks DOB → User provides
→ Assistant asks ZIP → User provides
→ Assistant asks coverage → User selects "Minimum"
→ Assistant asks consent → User agrees
→ READY_TO_QUOTE ✅
```

---

## Error Handling

### Invalid VIN
```
User enters: "123456789"
→ Validation fails (too short)
→ Assistant: "That doesn't look like a valid VIN. Please enter your 17-character VIN."
```

### Invalid DOB
```
User enters: "13/45/1990"
→ Validation fails (invalid month/day)
→ Assistant: "Please enter a valid date (MM/DD/YYYY)."
```

### Age Out of Range
```
User enters: "01/01/2020" (too young)
→ Validation fails (age < 15)
→ Assistant: "Driver must be at least 15 years old"
```

### Financed Vehicle Without Full Coverage
```
User: financedOrLienholder = true, coverageType = "minimum"
→ Gate blocks
→ Missing field: "Full coverage required (financed vehicle)"
→ Assistant: "Financed vehicles require Full coverage with Collision + Comprehensive."
```

---

## Best Practices

### ✅ DO
- Ask ONE question at a time
- Validate immediately after user responds
- Show progress (Step X of 11)
- Provide examples for complex fields
- Accept multiple formats (phone, date)
- Give helpful error messages

### ❌ DON'T
- Ask multiple questions at once
- Invent data to fill gaps
- Allow quotes with missing required fields
- Show mock quotes
- Skip validation
- Use technical jargon

---

## Testing Checklist

- [ ] Upload valid dec page → extracts correctly
- [ ] Upload invalid doc → asks for missing fields
- [ ] Enter VIN manually → validates format
- [ ] Enter invalid VIN → shows error
- [ ] Enter DOB → validates age range
- [ ] Select minimum coverage → skips deductibles
- [ ] Select full coverage → asks for deductibles
- [ ] Financed vehicle → requires full coverage
- [ ] Complete all fields → reaches READY_TO_QUOTE
- [ ] Webhook emitted with correct payload
- [ ] Multi-language (EN/ES) works correctly

---

*Quick Reference v1.0*
*Last Updated: 2026-01-24*
