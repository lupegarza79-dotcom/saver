import type { QuoteInput } from '@/types/intake';
import type { QuoteFormPayload, UploadIntakePayload } from './IntakeService';

export function quoteFormToIntakeJson(payload: QuoteFormPayload): QuoteInput {
  const liabilityLimits = payload.coverage === 'minimum' ? '30/60/25' : undefined;

  return {
    insuredFullName: payload.fullName.trim(),
    phone: payload.phone.replace(/\D/g, ''),
    garagingAddress: {
      zip: payload.zip.replace(/\D/g, ''),
      state: 'TX',
    },
    contactPreference: payload.contactPreference,
    language: payload.language,
    consentToContact: payload.consentGiven,
    drivers: payload.drivers.map((d) => ({
      fullName: d.name.trim(),
      dob: d.dob,
    })),
    vehicles: payload.vins
      .filter((v) => v.trim().length > 0)
      .map((v) => ({ vin: v.trim().toUpperCase() })),
    coverageType: payload.coverage,
    liabilityLimits,
    currentCarrier: payload.currentlyInsured ? undefined : undefined,
    drivingHistory: undefined,
    extras: undefined,
  };
}

export function uploadIntakeToIntakeJson(payload: UploadIntakePayload): QuoteInput {
  return {
    insuredFullName: payload.insuredFullName?.trim(),
    phone: payload.phone?.replace(/\D/g, ''),
    garagingAddress: payload.zip
      ? { zip: payload.zip.replace(/\D/g, ''), state: 'TX' }
      : undefined,
    contactPreference: payload.contactPreference,
    language: payload.language,
    consentToContact: payload.consentGiven,
    drivers: payload.drivers
      .filter((d) => d.fullName)
      .map((d) => ({
        fullName: d.fullName,
        dob: d.dob,
        idLast4: d.idLast4,
      })),
    vehicles: payload.vehicles
      .filter((v) => v.vin || v.make)
      .map((v) => ({
        vin: v.vin,
        year: v.year,
        make: v.make,
        model: v.model,
      })),
    coverageType: payload.coverageType,
    liabilityLimits: payload.liabilityLimits,
    collisionDeductible: payload.collisionDeductible,
    comprehensiveDeductible: payload.compDeductible,
    currentCarrier: payload.currentCarrier,
    currentPremium: payload.currentPremium,
    policyExpiryDate: payload.policyExpiryDate,
    currentPolicyDoc: payload.currentPolicyDoc,
  };
}
