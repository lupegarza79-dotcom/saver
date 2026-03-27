import type { QuoteInput, CoverageType, Deductible } from '@/types/intake';
import { validateVin, validateDob, validateLiabilityLimits, validateDeductible, validatePhone } from './quoteReadiness';

export type ParseResult =
  | { ok: true; updated: QuoteInput; normalizedValue: unknown }
  | { ok: false; error: { en: string; es: string } };

function ensureDriver(input: QuoteInput, idx: number): QuoteInput {
  const drivers = [...(input.drivers ?? [])];
  while (drivers.length <= idx) drivers.push({});
  return { ...input, drivers };
}

function ensureVehicle(input: QuoteInput, idx: number): QuoteInput {
  const vehicles = [...(input.vehicles ?? [])];
  while (vehicles.length <= idx) vehicles.push({});
  return { ...input, vehicles };
}

export function parseYesNo(raw: string): boolean | null {
  const s = raw.trim().toLowerCase();
  if (['yes', 'y', 'si', 'sí', 's', 'ok', 'okay', 'true', '1'].includes(s)) return true;
  if (['no', 'n', 'nel', 'false', '0'].includes(s)) return false;
  return null;
}

export function parseCoverageType(raw: string): CoverageType | null {
  const s = raw.trim().toLowerCase();
  if (['minimum', 'liability', 'min', 'mínima', 'minima', 'responsabilidad', 'basica', 'básica', '30/60/25'].includes(s)) return 'minimum';
  if (['full', 'full coverage', 'cobertura completa', 'completa', 'collision', 'comprehensive', 'todo'].includes(s)) return 'full';
  return null;
}

export function parseLiabilityLimits(raw: string): string | null {
  const s = raw.trim().replace(/\s/g, '');
  const norm = s.replace(/-/g, '/');
  if (validateLiabilityLimits(norm).valid) return norm;
  return null;
}

export function parseDeductible(raw: string): Deductible | null {
  const digits = raw.replace(/[^\d]/g, '');
  const n = Number(digits);
  if (validateDeductible(n).valid) return n as Deductible;
  return null;
}

export function parseDob(raw: string): string | null {
  const s = raw.trim();
  const result = validateDob(s);
  if (result.valid && result.parsed) return result.parsed;
  return null;
}

export function parseVin(raw: string): string | null {
  const s = raw.trim().toUpperCase().replace(/\s/g, '');
  if (validateVin(s).valid) return s;
  return null;
}

export function parsePhoneNumber(raw: string): string | null {
  const s = raw.trim();
  if (validatePhone(s)) return s;
  return null;
}

export function parseZip(raw: string): string | null {
  const s = raw.trim().replace(/[^\d]/g, '');
  if (s.length === 5) return s;
  return null;
}

export function applyAssistantAnswer(
  input: QuoteInput,
  expectedFieldKey: string,
  rawAnswer: string
): ParseResult {
  const trimmed = rawAnswer.trim();
  
  if (expectedFieldKey === 'consentToContact' || expectedFieldKey === 'consent') {
    const yn = parseYesNo(trimmed);
    if (yn === null) {
      return { ok: false, error: { en: 'Please reply YES or NO.', es: 'Por favor responde SÍ o NO.' } };
    }
    return { ok: true, updated: { ...input, consentToContact: yn }, normalizedValue: yn };
  }

  if (expectedFieldKey === 'phone') {
    const phone = parsePhoneNumber(trimmed);
    if (!phone) {
      return { ok: false, error: { en: 'Please enter a valid US phone (10 digits).', es: 'Escribe un teléfono válido (10 dígitos).' } };
    }
    return { ok: true, updated: { ...input, phone }, normalizedValue: phone };
  }

  if (expectedFieldKey === 'insuredFullName') {
    if (trimmed.length < 2) {
      return { ok: false, error: { en: 'Please enter your full name.', es: 'Escribe tu nombre completo.' } };
    }
    return { ok: true, updated: { ...input, insuredFullName: trimmed }, normalizedValue: trimmed };
  }

  if (expectedFieldKey === 'garagingAddress.zip') {
    const zip = parseZip(trimmed);
    if (!zip) {
      return { ok: false, error: { en: 'Please enter a 5-digit ZIP code.', es: 'Escribe un código postal de 5 dígitos.' } };
    }
    return { 
      ok: true, 
      updated: { ...input, garagingAddress: { ...input.garagingAddress, zip, state: 'TX' } }, 
      normalizedValue: zip 
    };
  }

  if (expectedFieldKey === 'coverageType') {
    const cov = parseCoverageType(trimmed);
    if (!cov) {
      return { ok: false, error: { en: 'Type: minimum or full coverage.', es: 'Escribe: mínima o completa.' } };
    }
    if (cov === 'minimum') {
      const cleared: QuoteInput = { ...input, coverageType: cov };
      delete (cleared as unknown as Record<string, unknown>).collisionDeductible;
      delete (cleared as unknown as Record<string, unknown>).comprehensiveDeductible;
      return { ok: true, updated: cleared, normalizedValue: cov };
    }
    return { ok: true, updated: { ...input, coverageType: cov }, normalizedValue: cov };
  }

  if (expectedFieldKey === 'liabilityLimits') {
    const lim = parseLiabilityLimits(trimmed);
    if (!lim) {
      return { ok: false, error: { en: 'Example: 30/60/25 or 100/300/100.', es: 'Ejemplo: 30/60/25 o 100/300/100.' } };
    }
    return { ok: true, updated: { ...input, liabilityLimits: lim }, normalizedValue: lim };
  }

  if (expectedFieldKey === 'collisionDeductible') {
    const d = parseDeductible(trimmed);
    if (!d) return { ok: false, error: { en: 'Choose: 250, 500, 1000, or 2500.', es: 'Elige: 250, 500, 1000, o 2500.' } };
    return { ok: true, updated: { ...input, collisionDeductible: d }, normalizedValue: d };
  }

  if (expectedFieldKey === 'comprehensiveDeductible' || expectedFieldKey === 'compDeductible') {
    const d = parseDeductible(trimmed);
    if (!d) return { ok: false, error: { en: 'Choose: 250, 500, 1000, or 2500.', es: 'Elige: 250, 500, 1000, o 2500.' } };
    return { ok: true, updated: { ...input, comprehensiveDeductible: d }, normalizedValue: d };
  }

  const driverNameMatch = expectedFieldKey.match(/^drivers\[(\d+)\]\.fullName$/);
  if (driverNameMatch) {
    const idx = Number(driverNameMatch[1]);
    const name = trimmed;
    if (name.length < 2) return { ok: false, error: { en: 'Please enter full name.', es: 'Escribe el nombre completo.' } };
    const withDriver = ensureDriver(input, idx);
    const drivers = [...(withDriver.drivers ?? [])];
    drivers[idx] = { ...drivers[idx], fullName: name };
    return { ok: true, updated: { ...withDriver, drivers }, normalizedValue: name };
  }

  const driverDobMatch = expectedFieldKey.match(/^drivers\[(\d+)\]\.dob$/);
  if (driverDobMatch) {
    const idx = Number(driverDobMatch[1]);
    const dob = parseDob(trimmed);
    if (!dob) return { ok: false, error: { en: 'Use YYYY-MM-DD or MM/DD/YYYY.', es: 'Usa YYYY-MM-DD o MM/DD/YYYY.' } };
    const withDriver = ensureDriver(input, idx);
    const drivers = [...(withDriver.drivers ?? [])];
    drivers[idx] = { ...drivers[idx], dob };
    return { ok: true, updated: { ...withDriver, drivers }, normalizedValue: dob };
  }

  const driverLicMatch = expectedFieldKey.match(/^drivers\[(\d+)\]\.licenseNumber$/);
  if (driverLicMatch) {
    const idx = Number(driverLicMatch[1]);
    const lic = trimmed;
    if (lic.length < 3) return { ok: false, error: { en: 'Please enter license number.', es: 'Escribe el número de licencia.' } };
    const withDriver = ensureDriver(input, idx);
    const drivers = [...(withDriver.drivers ?? [])];
    drivers[idx] = { ...drivers[idx], licenseNumber: lic };
    return { ok: true, updated: { ...withDriver, drivers }, normalizedValue: lic };
  }

  const vehicleVinMatch = expectedFieldKey.match(/^vehicles\[(\d+)\]\.vin$/);
  if (vehicleVinMatch) {
    const idx = Number(vehicleVinMatch[1]);
    const vin = parseVin(trimmed);
    if (!vin) return { ok: false, error: { en: 'Enter a valid 17-char VIN (no I/O/Q).', es: 'Escribe un VIN válido de 17 caracteres (sin I/O/Q).' } };
    const withVehicle = ensureVehicle(input, idx);
    const vehicles = [...(withVehicle.vehicles ?? [])];
    vehicles[idx] = { ...vehicles[idx], vin };
    return { ok: true, updated: { ...withVehicle, vehicles }, normalizedValue: vin };
  }

  if (expectedFieldKey === 'vehicles') {
    const vin = parseVin(trimmed);
    if (!vin) return { ok: false, error: { en: 'Enter a valid 17-char VIN (no I/O/Q).', es: 'Escribe un VIN válido de 17 caracteres (sin I/O/Q).' } };
    const withVehicle = ensureVehicle(input, 0);
    const vehicles = [...(withVehicle.vehicles ?? [])];
    vehicles[0] = { ...vehicles[0], vin };
    return { ok: true, updated: { ...withVehicle, vehicles }, normalizedValue: vin };
  }

  if (expectedFieldKey === 'drivers') {
    if (trimmed.length < 2) return { ok: false, error: { en: 'Please enter driver name.', es: 'Escribe el nombre del conductor.' } };
    const withDriver = ensureDriver(input, 0);
    const drivers = [...(withDriver.drivers ?? [])];
    drivers[0] = { ...drivers[0], fullName: trimmed };
    return { ok: true, updated: { ...withDriver, drivers }, normalizedValue: trimmed };
  }

  return { ok: false, error: { en: 'Sorry, I did not understand. Please try again.', es: 'No entendí. Inténtalo de nuevo.' } };
}

export function getFieldMeta(fieldKey: string): {
  fieldType: 'dob' | 'vin' | 'yesno' | 'coverageType' | 'liabilityLimits' | 'deductible' | 'phone' | 'text' | 'name' | 'zip';
  hints?: string[];
  choices?: { value: string; label: { en: string; es: string } }[];
} {
  if (fieldKey === 'consentToContact' || fieldKey === 'consent') {
    return {
      fieldType: 'yesno',
      choices: [
        { value: 'yes', label: { en: 'Yes', es: 'Sí' } },
        { value: 'no', label: { en: 'No', es: 'No' } },
      ],
    };
  }
  
  if (fieldKey === 'phone') return { fieldType: 'phone', hints: ['10-digit phone'] };
  if (fieldKey === 'insuredFullName') return { fieldType: 'name' };
  if (fieldKey === 'garagingAddress.zip') return { fieldType: 'zip', hints: ['5-digit ZIP'] };
  
  if (fieldKey === 'coverageType') {
    return {
      fieldType: 'coverageType',
      choices: [
        { value: 'minimum', label: { en: 'Minimum liability', es: 'Mínima (Responsabilidad)' } },
        { value: 'full', label: { en: 'Full coverage', es: 'Completa (Full coverage)' } },
      ],
    };
  }
  
  if (fieldKey === 'liabilityLimits') {
    return {
      fieldType: 'liabilityLimits',
      choices: [
        { value: '30/60/25', label: { en: '30/60/25 (TX minimum)', es: '30/60/25 (mínimo TX)' } },
        { value: '50/100/50', label: { en: '50/100/50', es: '50/100/50' } },
        { value: '100/300/100', label: { en: '100/300/100', es: '100/300/100' } },
      ],
    };
  }
  
  if (fieldKey === 'collisionDeductible' || fieldKey === 'comprehensiveDeductible' || fieldKey === 'compDeductible') {
    return {
      fieldType: 'deductible',
      choices: [
        { value: '250', label: { en: '$250', es: '$250' } },
        { value: '500', label: { en: '$500', es: '$500' } },
        { value: '1000', label: { en: '$1000', es: '$1000' } },
        { value: '2500', label: { en: '$2500', es: '$2500' } },
      ],
    };
  }
  
  if (/^drivers\[\d+\]\.dob$/.test(fieldKey)) return { fieldType: 'dob', hints: ['YYYY-MM-DD', 'MM/DD/YYYY'] };
  if (/^drivers\[\d+\]\.fullName$/.test(fieldKey)) return { fieldType: 'name' };
  if (/^vehicles\[\d+\]\.vin$/.test(fieldKey)) return { fieldType: 'vin', hints: ['17 characters'] };
  if (fieldKey === 'vehicles') return { fieldType: 'vin', hints: ['17-char VIN'] };
  if (fieldKey === 'drivers') return { fieldType: 'name' };
  
  return { fieldType: 'text' };
}
