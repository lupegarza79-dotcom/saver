# UI Payloads — Final Shape

## 1. Quote Form Submit Payload

Sent from `app/quote-form.tsx` → `IntakeService.submitQuoteForm()`

```json
{
  "phone": "(555) 123-4567",
  "fullName": "Juan Perez",
  "zip": "78501",
  "drivers": [
    { "name": "Juan Perez", "dob": "01/15/1985" },
    { "name": "Maria Perez", "dob": "03/22/1988" }
  ],
  "vehiclesCount": 1,
  "vins": ["1HGBH41JXMN109186"],
  "coverage": "minimum",
  "currentlyInsured": true,
  "insuredMonths": "12",
  "homeowner": false,
  "contactPreference": "whatsapp",
  "language": "es",
  "consentGiven": true
}
```

## 2. Upload Intake Payload

Sent from `app/upload-policy.tsx` → `IntakeService.submitUploadIntake()`

```json
{
  "insuredFullName": "Juan Perez",
  "phone": "(555) 123-4567",
  "zip": "78501",
  "contactPreference": "whatsapp",
  "language": "es",
  "consentGiven": true,
  "drivers": [
    { "fullName": "Juan Perez", "dob": "01/15/1985" }
  ],
  "vehicles": [
    { "vin": "1HGBH41JXMN109186", "year": 2020, "make": "Honda", "model": "Civic" }
  ],
  "coverageType": "full",
  "liabilityLimits": "30/60/25",
  "currentCarrier": "State Farm",
  "currentPremium": 180,
  "policyExpiryDate": "2025-06-15"
}
```

## 3. Referral Payload

Sent from `app/referral.tsx` → `IntakeService.submitReferral()`

```json
{
  "referrerPhone": "5551234567",
  "referredName": "Carlos Lopez",
  "referredPhone": "5559876543",
  "language": "es",
  "source": "app_referral"
}
```

## 4. Transformed `intake_json` (what gets stored in `leads.intake_json`)

```json
{
  "insuredFullName": "Juan Perez",
  "phone": "5551234567",
  "garagingAddress": { "zip": "78501", "state": "TX" },
  "contactPreference": "whatsapp",
  "language": "es",
  "consentToContact": true,
  "drivers": [
    { "fullName": "Juan Perez", "dob": "01/15/1985" }
  ],
  "vehicles": [
    { "vin": "1HGBH41JXMN109186" }
  ],
  "coverageType": "minimum",
  "liabilityLimits": "30/60/25"
}
```

## 5. Lead Record (what gets inserted into `leads` table)

```json
{
  "id": "lead_1706000000_abc123",
  "phone": "5551234567",
  "language": "es",
  "consent": true,
  "intake_json": { "...see above..." },
  "status": "READY_TO_QUOTE",
  "can_quote": true,
  "score": 85,
  "missing_required": [],
  "missing_recommended": [
    { "fieldKey": "drivingHistory", "message": "Driving history details" }
  ],
  "next_question_en": null,
  "next_question_es": null,
  "created_at": "2025-01-23T00:00:00.000Z",
  "updated_at": "2025-01-23T00:00:00.000Z"
}
```

## 6. Communication Preferences (collected in wizard, future storage)

```json
{
  "contactPreference": "whatsapp",
  "languagePref": "es",
  "savingsThreshold": 10,
  "wantsReminders": true,
  "reminderChannel": "whatsapp",
  "reminderConsent": true
}
```

These fields are collected in the intake wizard communication step.
`contactPreference` and `language` are stored in the lead.
`savingsThreshold`, `wantsReminders`, `reminderChannel` will be stored
in user preferences once the backend schema supports them.
