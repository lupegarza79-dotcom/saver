import { Policy } from '@/types';

export type MissingSeverity = 'required' | 'recommended';

export interface MissingField {
  key: string;
  labelKey: string;
  severity: MissingSeverity;
  context?: string;
  priority?: 1 | 2 | 3;
}

export interface IntakeCase {
  insuredFullName?: string;
  phone?: string;
  garagingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  contactPreference?: 'whatsapp' | 'call' | 'text';
  language?: 'en' | 'es';
  drivers?: IntakeDriver[];
  vehicles?: IntakeVehicle[];
  coverageType?: 'minimum' | 'full';
  liabilityLimits?: string;
  collisionDeductible?: number;
  compDeductible?: number;
  financedOrLienholder?: boolean;
  currentPolicyDoc?: string;
  currentCarrier?: string;
  currentPremium?: number;
  policyExpiryDate?: string;
  drivingHistory?: {
    hasTicketsOrAccidents?: boolean;
    details?: string;
  };
  extras?: {
    roadside?: boolean;
    rentalReimbursement?: boolean;
    umUim?: boolean;
    pip?: boolean;
    medPay?: boolean;
  };
  consentContactAllowed?: boolean;
}

export interface IntakeDriver {
  fullName?: string;
  dob?: string;
  idType?: 'TXDL' | 'TX_ID' | 'Matricula' | 'Other';
  idLast4?: string;
  idPhoto?: string;
}

export interface IntakeVehicle {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
}

export type LeadIntakeStatus = 
  | 'NEW'
  | 'WAITING_DOCS'
  | 'NEEDS_INFO'
  | 'READY_TO_QUOTE'
  | 'ROUTED_TO_AGENTS'
  | 'QUOTED'
  | 'WON'
  | 'LOST';

function validateVin(vin?: string): boolean {
  if (!vin) return false;
  const cleaned = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  if (cleaned.length !== 17) return false;
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(cleaned);
}

function validateDob(dob?: string): boolean {
  if (!dob) return false;

  let year: number, month: number, day: number;

  const isoMatch = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    year = Number(isoMatch[1]);
    month = Number(isoMatch[2]);
    day = Number(isoMatch[3]);
  } else {
    const usMatch = dob.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      month = Number(usMatch[1]);
      day = Number(usMatch[2]);
      year = Number(usMatch[3]);
    } else {
      return false;
    }
  }

  if (year < 1900 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return false;
  }

  const now = new Date();
  const nowY = now.getUTCFullYear();
  const nowM = now.getUTCMonth() + 1;
  const nowD = now.getUTCDate();

  let age = nowY - year;
  if (nowM < month || (nowM === month && nowD < day)) age--;

  return age >= 15 && age <= 100;
}

function validatePhone(phone?: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^(\+1)?\d{10}$/;
  return phoneRegex.test(cleaned);
}

function validateLiabilityLimits(limits?: string): boolean {
  if (!limits) return false;
  const validLimits = ['30/60/25', '50/100/50', '100/300/100', '250/500/100', '250/500/250', '500/500/100'];
  if (validLimits.includes(limits)) return true;
  
  const pattern = /^(\d+)\/(\d+)\/(\d+)$/;
  const match = limits.match(pattern);
  if (!match) return false;
  
  const bi = Number(match[1]);
  const biPerAccident = Number(match[2]);
  const pd = Number(match[3]);
  
  return bi >= 30 && biPerAccident >= 60 && pd >= 25;
}

function validateDeductible(deductible?: number): boolean {
  if (deductible == null) return false;
  const validDeductibles = [250, 500, 1000, 2500];
  return validDeductibles.includes(deductible);
}

export function missingFields(intake: IntakeCase): MissingField[] {
  const missing: MissingField[] = [];

  if (!intake.consentContactAllowed) {
    missing.push({
      key: 'consentContactAllowed',
      labelKey: 'intake.consent',
      severity: 'required',
      priority: 1,
      context: 'Consent to be contacted is required.',
    });
  }

  if (!validatePhone(intake.phone)) {
    missing.push({
      key: 'phone',
      labelKey: 'intake.phone',
      severity: 'required',
      priority: 1,
      context: 'We need your phone number to send quotes.',
    });
  }

  if (!intake.insuredFullName?.trim()) {
    missing.push({
      key: 'insuredFullName',
      labelKey: 'intake.insuredFullName',
      severity: 'required',
      priority: 2,
    });
  }

  if (!intake.garagingAddress?.zip) {
    missing.push({
      key: 'garagingAddress.zip',
      labelKey: 'intake.addressZip',
      severity: 'required',
      priority: 2,
      context: 'We need your ZIP code to find agents in your area.',
    });
  }

  if (!intake.vehicles || intake.vehicles.length === 0) {
    missing.push({
      key: 'vehicles',
      labelKey: 'intake.vehicleRequired',
      severity: 'required',
      priority: 1,
      context: 'At least one vehicle is required.',
    });
  } else {
    intake.vehicles.forEach((v, idx) => {
      const vinValid = validateVin(v.vin);
      
      if (!vinValid) {
        const vehicleDesc = v.make ? `${v.year || ''} ${v.make} ${v.model || ''}`.trim() : `Vehicle ${idx + 1}`;
        missing.push({
          key: `vehicles[${idx}].vin`,
          labelKey: 'intake.vin',
          severity: 'required',
          priority: 1,
          context: `VIN for ${vehicleDesc}`,
        });
      } else {
        if (!v.year) {
          missing.push({
            key: `vehicles[${idx}].year`,
            labelKey: 'intake.vehicleYear',
            severity: 'recommended',
            priority: 2,
            context: 'Vehicle year helps with accurate quotes.',
          });
        }
        if (!v.make || !v.model) {
          missing.push({
            key: `vehicles[${idx}].makeModel`,
            labelKey: 'intake.vehicleMakeModel',
            severity: 'recommended',
            priority: 2,
            context: 'Vehicle make and model help with accurate quotes.',
          });
        }
      }
    });
  }

  if (!intake.drivers || intake.drivers.length === 0) {
    missing.push({
      key: 'drivers',
      labelKey: 'intake.driverRequired',
      severity: 'required',
      priority: 1,
      context: 'At least one driver is required.',
    });
  } else {
    intake.drivers.forEach((d, idx) => {
      if (!d.fullName?.trim()) {
        missing.push({
          key: `drivers[${idx}].fullName`,
          labelKey: 'intake.driverName',
          severity: 'required',
          priority: 1,
        });
      }
      if (!validateDob(d.dob)) {
        const driverName = d.fullName || `Driver ${idx + 1}`;
        missing.push({
          key: `drivers[${idx}].dob`,
          labelKey: 'intake.driverDob',
          severity: 'required',
          priority: 1,
          context: `DOB for ${driverName} (must be 15-100 years old)`,
        });
      }
      if (!d.idType && !d.idPhoto) {
        const driverName = d.fullName || `Driver ${idx + 1}`;
        missing.push({
          key: `drivers[${idx}].idType`,
          labelKey: 'intake.driverId',
          severity: 'recommended',
          priority: 3,
          context: `ID for ${driverName}`,
        });
      }
    });
  }

  if (!intake.coverageType) {
    missing.push({
      key: 'coverageType',
      labelKey: 'intake.coverageType',
      severity: 'required',
      priority: 1,
      context: 'Minimum (30/60/25) or Full coverage?',
    });
  }

  if (!validateLiabilityLimits(intake.liabilityLimits)) {
    missing.push({
      key: 'liabilityLimits',
      labelKey: 'intake.liabilityLimits',
      severity: 'required',
      priority: 1,
      context: 'TX minimum is 30/60/25.',
    });
  }

  if (intake.coverageType === 'full') {
    if (!validateDeductible(intake.collisionDeductible)) {
      missing.push({
        key: 'collisionDeductible',
        labelKey: 'intake.collisionDeductible',
        severity: 'required',
        priority: 1,
        context: 'Choose $250, $500, $1000, or $2500 for Collision.',
      });
    }
    if (!validateDeductible(intake.compDeductible)) {
      missing.push({
        key: 'compDeductible',
        labelKey: 'intake.compDeductible',
        severity: 'required',
        priority: 2,
        context: 'Choose $250, $500, $1000, or $2500 for Comprehensive.',
      });
    }
  }

  if (intake.financedOrLienholder === true && intake.coverageType !== 'full') {
    missing.push({
      key: 'coverageType.lienholderRequiresFull',
      labelKey: 'intake.lienholderRequiresFull',
      severity: 'required',
      priority: 1,
      context: 'Financed vehicles typically require Full coverage.',
    });
  }

  if (!intake.contactPreference) {
    missing.push({
      key: 'contactPreference',
      labelKey: 'intake.contactPreference',
      severity: 'recommended',
      priority: 3,
    });
  }

  if (!intake.currentPolicyDoc) {
    missing.push({
      key: 'currentPolicyDoc',
      labelKey: 'intake.currentPolicyDoc',
      severity: 'recommended',
      priority: 3,
      context: 'Upload your current declarations page for better quotes.',
    });
  }

  if (intake.drivingHistory?.hasTicketsOrAccidents === undefined) {
    missing.push({
      key: 'drivingHistory',
      labelKey: 'intake.drivingHistory',
      severity: 'recommended',
      priority: 3,
      context: 'Any tickets or accidents in the last 3 years?',
    });
  }

  return missing.sort((a, b) => (a.priority || 3) - (b.priority || 3));
}

export function getRequiredMissing(intake: IntakeCase): MissingField[] {
  return missingFields(intake).filter(f => f.severity === 'required');
}

export function getRecommendedMissing(intake: IntakeCase): MissingField[] {
  return missingFields(intake).filter(f => f.severity === 'recommended');
}

export function canQuote(intake: IntakeCase): boolean {
  const required = missingFields(intake).filter(f => f.priority === 1 && f.severity === 'required');
  return required.length === 0;
}

export function getIntakeStatus(intake: IntakeCase): LeadIntakeStatus {
  const hasAnyData =
    Boolean(intake.phone) ||
    Boolean(intake.consentContactAllowed) ||
    Boolean(intake.insuredFullName) ||
    Boolean(intake.currentCarrier) ||
    Boolean(intake.currentPremium) ||
    Boolean(intake.policyExpiryDate) ||
    Boolean(intake.coverageType) ||
    Boolean(intake.garagingAddress?.zip) ||
    (intake.drivers?.length ?? 0) > 0 ||
    (intake.vehicles?.length ?? 0) > 0;

  if (!hasAnyData) return 'WAITING_DOCS';
  if (canQuote(intake)) return 'READY_TO_QUOTE';
  return 'NEEDS_INFO';
}

export function completenessScore(intake: IntakeCase, missing: MissingField[]): number {
  const expectedDrivers = Math.max(1, intake.drivers?.length ?? 0);
  const expectedVehicles = Math.max(1, intake.vehicles?.length ?? 0);
  const validVinCount = (intake.vehicles ?? []).filter(v => validateVin(v.vin)).length;

  let requiredTotal =
    1 + // consent
    1 + // phone
    1 + // drivers exists
    expectedDrivers * 2 + // each driver: name + dob
    1 + // vehicles exists
    expectedVehicles * 1 + // each vehicle: vin
    1 + // coverageType
    1 + // liabilityLimits
    (intake.coverageType === 'full' ? 2 : 0);

  const recommendedTotal =
    1 + // insuredFullName
    1 + // zip
    expectedDrivers * 1 +
    validVinCount * 2 +
    1 + // contactPreference
    1 + // currentPolicyDoc
    1; // drivingHistory

  let missingRequired = missing.filter(f => f.priority === 1 && f.severity === 'required').length;

  if (!intake.drivers || intake.drivers.length === 0) {
    missingRequired += 2;
  }

  if (!intake.vehicles || intake.vehicles.length === 0) {
    missingRequired += 1;
  }

  missingRequired = Math.min(missingRequired, requiredTotal);

  const missingRecommended = missing.filter(f => f.severity === 'recommended').length;
  const missingRecommendedClamped = Math.min(missingRecommended, recommendedTotal);

  const requiredScore =
    requiredTotal === 0 ? 100 : Math.round(((requiredTotal - missingRequired) / requiredTotal) * 100);

  const recommendedScore =
    recommendedTotal === 0
      ? 100
      : Math.round(((recommendedTotal - missingRecommendedClamped) / recommendedTotal) * 100);

  const overall = Math.round(requiredScore * 0.8 + recommendedScore * 0.2);
  return Math.max(0, Math.min(100, overall));
}

export function getNextAssistantPromptKey(intake: IntakeCase): string | null {
  const status = getIntakeStatus(intake);
  
  if (status === 'WAITING_DOCS') {
    return 'upload_docs';
  }
  
  const required = getRequiredMissing(intake);
  
  if (required.length === 0) return null;
  
  const priorityOrder = [
    'consentContactAllowed',
    'phone',
    'vehicles',
    'vin',
    'drivers',
    'fullName',
    'dob',
    'coverageType',
    'liabilityLimits',
    'collisionDeductible',
    'compDeductible',
    'garagingAddress.zip',
    'insuredFullName',
  ];
  
  for (const priority of priorityOrder) {
    const found = required.find(f => f.key.includes(priority));
    if (found) return found.key;
  }
  
  return required[0]?.key || null;
}

export function buildMissingFieldsMessage(
  intake: IntakeCase, 
  language: 'en' | 'es'
): { required: string[]; recommended: string[] } {
  const requiredMissing = getRequiredMissing(intake);
  const recommendedMissing = getRecommendedMissing(intake);
  
  const labels: Record<string, { en: string; es: string }> = {
    'consentContactAllowed': { en: 'Consent to contact', es: 'Consentimiento para contacto' },
    'insuredFullName': { en: 'Full name', es: 'Nombre completo' },
    'phone': { en: 'Phone number', es: 'Número de teléfono' },
    'garagingAddress.zip': { en: 'ZIP code', es: 'Código postal' },
    'contactPreference': { en: 'Contact preference', es: 'Preferencia de contacto' },
    'vehicles': { en: 'Vehicle info', es: 'Info del vehículo' },
    'vin': { en: 'VIN number', es: 'Número VIN' },
    'year': { en: 'Vehicle year', es: 'Año del vehículo' },
    'makeModel': { en: 'Make/Model', es: 'Marca/Modelo' },
    'drivers': { en: 'Driver info', es: 'Info del conductor' },
    'fullName': { en: 'Driver name', es: 'Nombre del conductor' },
    'dob': { en: 'Date of birth', es: 'Fecha de nacimiento' },
    'coverageType': { en: 'Coverage type', es: 'Tipo de cobertura' },
    'liabilityLimits': { en: 'Liability limits', es: 'Límites de responsabilidad' },
    'collisionDeductible': { en: 'Collision deductible', es: 'Deducible de colisión' },
    'compDeductible': { en: 'Comprehensive deductible', es: 'Deducible comprehensivo' },
    'currentPolicyDoc': { en: 'Current policy document', es: 'Documento de póliza actual' },
    'drivingHistory': { en: 'Driving history', es: 'Historial de manejo' },
    'idType': { en: 'Driver ID', es: 'Identificación del conductor' },
    'lienholderRequiresFull': { en: 'Full coverage (lienholder)', es: 'Cobertura full (financiado)' },
  };
  
  const getLabel = (key: string): string => {
    for (const [labelKey, label] of Object.entries(labels)) {
      if (key.includes(labelKey)) {
        return label[language];
      }
    }
    return key;
  };
  
  return {
    required: requiredMissing.map(f => getLabel(f.key)),
    recommended: recommendedMissing.map(f => getLabel(f.key)),
  };
}

export function convertPolicyToIntake(policy: Policy, user?: { name?: string; phone?: string; zip?: string }): IntakeCase {
  return {
    insuredFullName: policy.drivers?.[0]?.name || user?.name,
    phone: user?.phone,
    garagingAddress: user?.zip ? { zip: user.zip, state: 'TX' } : undefined,
    drivers: policy.drivers?.map(d => ({
      fullName: d.name,
      dob: d.dob,
      idLast4: d.licenseNumber?.slice(-4),
    })),
    vehicles: policy.vehicles?.map(v => ({
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
    })),
    currentCarrier: policy.carrier,
    currentPremium: policy.premium,
    policyExpiryDate: policy.expirationDate,
    liabilityLimits: policy.liabilityBI && policy.liabilityPD ? `${policy.liabilityBI}/${policy.liabilityPD}` : undefined,
    collisionDeductible: policy.deductibleColl,
    compDeductible: policy.deductibleComp,
    coverageType: (policy.deductibleComp && policy.deductibleColl) ? 'full' : 'minimum',
    currentPolicyDoc: 'uploaded',
  };
}
