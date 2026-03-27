import { Policy, IntakeDriver, IntakeVehicle, IntakeStatus } from '@/types';

export type MissingSeverity = 'required' | 'recommended';
export type Language = 'en' | 'es';

export interface MissingField {
  key: string;
  priority: 1 | 2 | 3;
  severity: MissingSeverity;
  label_en: string;
  label_es: string;
  help_en?: string;
  help_es?: string;
  example?: string;
}

export interface QuoteInput {
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

export interface QuoteReadinessResult {
  canQuote: boolean;
  status: IntakeStatus;
  missingFields: MissingField[];
  completenessScore: number;
  nextQuestion?: { en: string; es: string };
}

export function validateVin(vin?: string): { valid: boolean; error?: string } {
  if (!vin) return { valid: false, error: 'VIN is required' };
  const cleaned = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  if (cleaned.length !== 17) {
    return { valid: false, error: `VIN must be 17 characters (got ${cleaned.length})` };
  }
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  if (!vinRegex.test(cleaned)) {
    return { valid: false, error: 'VIN contains invalid characters (I, O, Q not allowed)' };
  }
  return { valid: true };
}

export function validateDob(dob?: string): { valid: boolean; error?: string; parsed?: string } {
  if (!dob) return { valid: false, error: 'Date of birth is required' };

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
      const dashMatch = dob.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (dashMatch) {
        month = Number(dashMatch[1]);
        day = Number(dashMatch[2]);
        year = Number(dashMatch[3]);
      } else {
        return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD or MM/DD/YYYY' };
      }
    }
  }

  if (year < 1900 || year > 2100) return { valid: false, error: 'Invalid year' };
  if (month < 1 || month > 12) return { valid: false, error: 'Invalid month' };
  if (day < 1 || day > 31) return { valid: false, error: 'Invalid day' };

  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() + 1 !== month ||
    dt.getUTCDate() !== day
  ) {
    return { valid: false, error: 'Invalid date (e.g. Feb 30 does not exist)' };
  }

  const now = new Date();
  const nowY = now.getUTCFullYear();
  const nowM = now.getUTCMonth() + 1;
  const nowD = now.getUTCDate();

  let age = nowY - year;
  if (nowM < month || (nowM === month && nowD < day)) age--;

  if (age < 15) return { valid: false, error: 'Driver must be at least 15 years old' };
  if (age > 100) return { valid: false, error: 'Please check the date of birth' };

  const parsed = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { valid: true, parsed };
}

export function validateLiabilityLimits(limits?: string): { valid: boolean; error?: string } {
  if (!limits) return { valid: false, error: 'Liability limits are required' };

  const validLimits = ['30/60/25', '50/100/50', '100/300/100', '250/500/100', '250/500/250', '500/500/100'];
  if (validLimits.includes(limits)) return { valid: true };

  const pattern = /^(\d+)\/(\d+)\/(\d+)$/;
  const match = limits.match(pattern);
  if (!match) {
    return { valid: false, error: 'Format should be like 30/60/25' };
  }

  const bi = Number(match[1]);
  const biPerAccident = Number(match[2]);
  const pd = Number(match[3]);

  if (bi < 30 || biPerAccident < 60 || pd < 25) {
    return { valid: false, error: 'Texas minimum is 30/60/25' };
  }

  return { valid: true };
}

export function validateDeductible(deductible?: number, type?: 'collision' | 'comprehensive'): { valid: boolean; error?: string } {
  if (deductible == null) return { valid: false, error: 'Deductible is required' };
  
  const validDeductibles = [250, 500, 1000, 2500];
  
  if (!validDeductibles.includes(deductible)) {
    return { 
      valid: false, 
      error: `Deductible must be one of: $${validDeductibles.join(', $')}` 
    };
  }
  
  return { valid: true };
}

export function validatePhone(phone?: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  const phoneRegex = /^(\+1)?\d{10}$/;
  return phoneRegex.test(cleaned);
}

function isVinValid(vin?: string): boolean {
  return validateVin(vin).valid;
}

function isDobValid(dob?: string): boolean {
  return validateDob(dob).valid;
}

export function missingFields(input: QuoteInput): MissingField[] {
  const missing: MissingField[] = [];

  if (!input.consentContactAllowed) {
    missing.push({
      key: 'consentContactAllowed',
      priority: 1,
      severity: 'required',
      label_en: 'Consent to be contacted',
      label_es: 'Consentimiento para contacto',
      help_en: 'You must agree to be contacted by agents.',
      help_es: 'Debes aceptar ser contactado por agentes.',
    });
  }

  if (!validatePhone(input.phone)) {
    missing.push({
      key: 'phone',
      priority: 1,
      severity: 'required',
      label_en: 'Phone number',
      label_es: 'Número de teléfono',
      help_en: 'We need your phone number to send quotes.',
      help_es: 'Necesitamos tu teléfono para enviar cotizaciones.',
      example: '+1 (555) 123-4567',
    });
  }

  if (!input.insuredFullName?.trim()) {
    missing.push({
      key: 'insuredFullName',
      priority: 2,
      severity: 'required',
      label_en: 'Full name',
      label_es: 'Nombre completo',
      example: 'Your name',
    });
  }

  if (!input.garagingAddress?.zip) {
    missing.push({
      key: 'garagingAddress.zip',
      priority: 2,
      severity: 'required',
      label_en: 'ZIP code',
      label_es: 'Código postal',
      help_en: 'We need your ZIP code to find agents in your area.',
      help_es: 'Necesitamos tu código postal para encontrar agentes cerca de ti.',
      example: '78501',
    });
  }

  if (!input.vehicles || input.vehicles.length === 0) {
    missing.push({
      key: 'vehicles',
      priority: 1,
      severity: 'required',
      label_en: 'Vehicle information',
      label_es: 'Información del vehículo',
      help_en: 'At least one vehicle is required.',
      help_es: 'Se requiere al menos un vehículo.',
    });
  } else {
    input.vehicles.forEach((v, idx) => {
      const vinValid = isVinValid(v.vin);
      
      if (!vinValid) {
        const vehicleDesc = v.make ? `${v.year || ''} ${v.make} ${v.model || ''}`.trim() : `Vehicle ${idx + 1}`;
        missing.push({
          key: `vehicles[${idx}].vin`,
          priority: 1,
          severity: 'required',
          label_en: `VIN for ${vehicleDesc}`,
          label_es: `VIN para ${vehicleDesc}`,
          help_en: 'Send a photo of the door sticker/dashboard or type the 17-character VIN.',
          help_es: 'Manda foto de la etiqueta de la puerta/tablero o escribe el VIN de 17 caracteres.',
          example: '1HGBH41JXMN109186',
        });
      } else {
        if (!v.year) {
          missing.push({
            key: `vehicles[${idx}].year`,
            priority: 2,
            severity: 'recommended',
            label_en: `Year for Vehicle ${idx + 1}`,
            label_es: `Año del Vehículo ${idx + 1}`,
            help_en: 'Vehicle year helps with accurate quotes (can be decoded from VIN).',
            help_es: 'El año del vehículo ayuda con cotizaciones precisas.',
          });
        }
        if (!v.make || !v.model) {
          missing.push({
            key: `vehicles[${idx}].makeModel`,
            priority: 2,
            severity: 'recommended',
            label_en: `Make/Model for Vehicle ${idx + 1}`,
            label_es: `Marca/Modelo del Vehículo ${idx + 1}`,
            help_en: 'Vehicle make and model help with accurate quotes.',
            help_es: 'La marca y modelo ayudan con cotizaciones precisas.',
          });
        }
      }
    });
  }

  if (!input.drivers || input.drivers.length === 0) {
    missing.push({
      key: 'drivers',
      priority: 1,
      severity: 'required',
      label_en: 'Driver information',
      label_es: 'Información del conductor',
      help_en: 'At least one driver is required.',
      help_es: 'Se requiere al menos un conductor.',
    });
  } else {
    input.drivers.forEach((d, idx) => {
      if (!d.fullName?.trim()) {
        missing.push({
          key: `drivers[${idx}].fullName`,
          priority: 1,
          severity: 'required',
          label_en: `Driver ${idx + 1} name`,
          label_es: `Nombre del conductor ${idx + 1}`,
        });
      }
      if (!isDobValid(d.dob)) {
        const driverName = d.fullName || `Driver ${idx + 1}`;
        missing.push({
          key: `drivers[${idx}].dob`,
          priority: 1,
          severity: 'required',
          label_en: `Date of birth for ${driverName}`,
          label_es: `Fecha de nacimiento de ${driverName}`,
          help_en: 'Format: MM/DD/YYYY (must be 15-100 years old)',
          help_es: 'Formato: MM/DD/YYYY (15-100 años)',
          example: '01/15/1985',
        });
      }
      if (!d.idType && !d.idPhoto) {
        const driverName = d.fullName || `Driver ${idx + 1}`;
        missing.push({
          key: `drivers[${idx}].idType`,
          priority: 3,
          severity: 'recommended',
          label_en: `ID type for ${driverName}`,
          label_es: `Tipo de ID de ${driverName}`,
          help_en: 'TXDL, TX ID, Matricula, or Other',
          help_es: 'TXDL, TX ID, Matrícula, u Otro',
        });
      }
    });
  }

  if (!input.coverageType) {
    missing.push({
      key: 'coverageType',
      priority: 1,
      severity: 'required',
      label_en: 'Coverage type',
      label_es: 'Tipo de cobertura',
      help_en: 'Minimum (30/60/25) or Full coverage (includes Collision + Comprehensive)?',
      help_es: '¿Cobertura mínima (30/60/25) o Full cover (incluye Colisión + Comprehensivo)?',
    });
  }

  if (!validateLiabilityLimits(input.liabilityLimits).valid) {
    missing.push({
      key: 'liabilityLimits',
      priority: 1,
      severity: 'required',
      label_en: 'Liability limits',
      label_es: 'Límites de responsabilidad',
      help_en: 'Texas minimum is 30/60/25. Recommended: 50/100/50 or 100/300/100.',
      help_es: 'El mínimo en Texas es 30/60/25. Recomendado: 50/100/50 o 100/300/100.',
      example: '30/60/25',
    });
  }

  if (input.coverageType === 'full') {
    if (!validateDeductible(input.collisionDeductible).valid) {
      missing.push({
        key: 'collisionDeductible',
        priority: 1,
        severity: 'required',
        label_en: 'Collision deductible',
        label_es: 'Deducible de colisión',
        help_en: 'Choose $250, $500, $1000, or $2500.',
        help_es: 'Elige $250, $500, $1000, o $2500.',
        example: '$500',
      });
    }
    if (!validateDeductible(input.compDeductible).valid) {
      missing.push({
        key: 'compDeductible',
        priority: 2,
        severity: 'required',
        label_en: 'Comprehensive deductible',
        label_es: 'Deducible comprehensivo',
        help_en: 'Choose $250, $500, $1000, or $2500.',
        help_es: 'Elige $250, $500, $1000, o $2500.',
        example: '$500',
      });
    }
  }

  if (input.financedOrLienholder === true && input.coverageType !== 'full') {
    missing.push({
      key: 'coverageType.lienholderRequiresFull',
      priority: 1,
      severity: 'required',
      label_en: 'Full coverage required (financed vehicle)',
      label_es: 'Cobertura full requerida (vehículo financiado)',
      help_en: 'Financed vehicles typically require Full coverage with Collision + Comprehensive.',
      help_es: 'Vehículos financiados típicamente requieren Full cover con Colisión + Comprehensivo.',
    });
  }

  if (!input.contactPreference) {
    missing.push({
      key: 'contactPreference',
      priority: 3,
      severity: 'recommended',
      label_en: 'Contact preference',
      label_es: 'Preferencia de contacto',
      help_en: 'WhatsApp, call, or text?',
      help_es: '¿WhatsApp, llamada, o texto?',
    });
  }

  if (!input.currentPolicyDoc) {
    missing.push({
      key: 'currentPolicyDoc',
      priority: 3,
      severity: 'recommended',
      label_en: 'Current policy document',
      label_es: 'Documento de póliza actual',
      help_en: 'Upload your current declarations page for better quotes.',
      help_es: 'Sube tu página de declaraciones actual para mejores cotizaciones.',
    });
  }

  if (input.drivingHistory?.hasTicketsOrAccidents === undefined) {
    missing.push({
      key: 'drivingHistory',
      priority: 3,
      severity: 'recommended',
      label_en: 'Driving history',
      label_es: 'Historial de manejo',
      help_en: 'Any tickets or accidents in the last 3 years?',
      help_es: '¿Alguna multa o accidente en los últimos 3 años?',
    });
  }

  return missing.sort((a, b) => a.priority - b.priority);
}

export function getRequiredMissing(input: QuoteInput): MissingField[] {
  return missingFields(input).filter(f => f.severity === 'required');
}

export function getRecommendedMissing(input: QuoteInput): MissingField[] {
  return missingFields(input).filter(f => f.severity === 'recommended');
}

export function canQuote(input: QuoteInput): boolean {
  const required = missingFields(input).filter(f => f.priority === 1 && f.severity === 'required');
  return required.length === 0;
}

export function completenessScore(input: QuoteInput, missing: MissingField[]): number {
  const expectedDrivers = Math.max(1, input.drivers?.length ?? 0);
  const expectedVehicles = Math.max(1, input.vehicles?.length ?? 0);

  const validVinCount = (input.vehicles ?? []).filter(v => isVinValid(v.vin)).length;

  let requiredTotal =
    1 + // consent
    1 + // phone
    1 + // drivers exists
    expectedDrivers * 2 + // each driver: name + dob
    1 + // vehicles exists
    expectedVehicles * 1 + // each vehicle: vin
    1 + // coverageType
    1 + // liabilityLimits
    (input.coverageType === 'full' ? 2 : 0); // deductibles

  const recommendedTotal =
    1 + // insuredFullName
    1 + // zip
    expectedDrivers * 1 + // license per driver
    validVinCount * 2 + // year + make/model for vehicles with valid VIN
    1 + // contactPreference
    1 + // currentPolicyDoc
    1; // drivingHistory

  let missingRequired = missing.filter(f => f.priority === 1 && f.severity === 'required').length;

  if (!input.drivers || input.drivers.length === 0) {
    missingRequired += 2;
  }

  if (!input.vehicles || input.vehicles.length === 0) {
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

export function getIntakeStatus(input: QuoteInput): IntakeStatus {
  const hasAnyData =
    Boolean(input.phone) ||
    Boolean(input.consentContactAllowed) ||
    Boolean(input.insuredFullName) ||
    Boolean(input.currentCarrier) ||
    Boolean(input.currentPremium) ||
    Boolean(input.policyExpiryDate) ||
    Boolean(input.coverageType) ||
    Boolean(input.garagingAddress?.zip) ||
    (input.drivers?.length ?? 0) > 0 ||
    (input.vehicles?.length ?? 0) > 0;

  if (!hasAnyData) return 'WAITING_DOCS';
  if (canQuote(input)) return 'READY_TO_QUOTE';
  return 'NEEDS_INFO';
}

function buildUploadDocsPrompt(): { en: string; es: string } {
  return {
    en: 'Please upload a photo/PDF of your current policy (declarations page) to begin.',
    es: 'Por favor sube una foto/PDF de tu póliza actual (declaración) para comenzar.',
  };
}

export function getNextQuestion(input: QuoteInput, language: 'en' | 'es'): string | null {
  const status = getIntakeStatus(input);
  
  if (status === 'WAITING_DOCS') {
    return buildUploadDocsPrompt()[language];
  }
  
  const required = getRequiredMissing(input);
  if (required.length === 0) return null;
  
  const field = required[0];
  const label = language === 'es' ? field.label_es : field.label_en;
  const help = language === 'es' ? field.help_es : field.help_en;
  
  if (help) {
    return `${label}: ${help}`;
  }
  return label;
}

export function getAssistantPrompt(input: QuoteInput, language: 'en' | 'es'): string | null {
  const status = getIntakeStatus(input);
  
  if (status === 'WAITING_DOCS') {
    return buildUploadDocsPrompt()[language];
  }
  
  const required = getRequiredMissing(input);
  if (required.length === 0) {
    return language === 'es' 
      ? '✅ ¡Todo listo! Ya podemos cotizarte.'
      : '✅ All set! We can get you quotes now.';
  }
  
  const field = required[0];
  
  const prompts: Record<string, { en: string; es: string }> = {
    'consentContactAllowed': {
      en: 'Do you agree to be contacted by agents with quotes? (Yes/No)',
      es: '¿Aceptas ser contactado por agentes con cotizaciones? (Sí/No)',
    },
    'phone': {
      en: 'What is your phone number?',
      es: '¿Cuál es tu número de teléfono?',
    },
    'vin': {
      en: 'Please send the VIN for your vehicle (photo of the door sticker/dashboard or type it).',
      es: 'Por favor mándame el VIN (foto en la puerta/tablero o escríbelo).',
    },
    'dob': {
      en: `What is the date of birth for ${field.label_en.replace('Date of birth for ', '')}? (MM/DD/YYYY)`,
      es: `¿Cuál es la fecha de nacimiento de ${field.label_es.replace('Fecha de nacimiento de ', '')}? (MM/DD/YYYY)`,
    },
    'fullName': {
      en: `What is the full name of ${field.label_en.includes('Driver') ? 'the driver' : 'the insured'}?`,
      es: `¿Cuál es el nombre completo ${field.label_es.includes('conductor') ? 'del conductor' : 'del asegurado'}?`,
    },
    'coverageType': {
      en: 'Do you want Minimum coverage (30/60/25) or Full coverage (includes Collision + Comprehensive)?',
      es: '¿Quieres cobertura mínima (30/60/25) o full cover (con Collision + Comprehensive)?',
    },
    'liabilityLimits': {
      en: 'Choose liability limits (Minimum 30/60/25 recommended, or higher like 50/100/50 or 100/300/100).',
      es: 'Elige límites de responsabilidad (mínimo 30/60/25 recomendado, o más alto como 50/100/50 o 100/300/100).',
    },
    'collisionDeductible': {
      en: 'For Full coverage, choose your Collision deductible: $250, $500, $1000, or $2500.',
      es: 'Para Full cover, elige tu deducible de Colisión: $250, $500, $1000, o $2500.',
    },
    'compDeductible': {
      en: 'Choose your Comprehensive deductible: $250, $500, $1000, or $2500.',
      es: 'Elige tu deducible Comprehensivo: $250, $500, $1000, o $2500.',
    },
    'garagingAddress.zip': {
      en: 'What is your ZIP code?',
      es: '¿Cuál es tu código postal?',
    },
    'insuredFullName': {
      en: 'What is your full name?',
      es: '¿Cuál es tu nombre completo?',
    },
  };
  
  for (const [key, prompt] of Object.entries(prompts)) {
    if (field.key.includes(key)) {
      return prompt[language];
    }
  }
  
  const help = language === 'es' ? field.help_es : field.help_en;
  return help || (language === 'es' ? field.label_es : field.label_en);
}

export function buildMissingFieldsSummary(
  input: QuoteInput,
  language: 'en' | 'es'
): { required: string[]; recommended: string[]; message: string } {
  const requiredMissing = getRequiredMissing(input);
  const recommendedMissing = getRecommendedMissing(input);
  
  const required = requiredMissing.map(f => language === 'es' ? f.label_es : f.label_en);
  const recommended = recommendedMissing.map(f => language === 'es' ? f.label_es : f.label_en);
  
  let message = '';
  if (required.length > 0) {
    const intro = language === 'es' 
      ? '✅ Recibido. Para cotizar hoy me falta:\n'
      : '✅ Received. To quote today I need:\n';
    message = intro + required.map((r, i) => `${i + 1}) ${r}`).join('\n');
    
    if (language === 'es') {
      message += '\n\nResponde aquí o manda foto.';
    } else {
      message += '\n\nReply here or send a photo.';
    }
  }
  
  return { required, recommended, message };
}

export function checkQuoteReadiness(input: QuoteInput): QuoteReadinessResult {
  const missing = missingFields(input);
  const status = getIntakeStatus(input);
  const ready = canQuote(input);
  const score = completenessScore(input, missing);

  let nextQuestion: { en: string; es: string } | undefined;

  if (status === 'WAITING_DOCS') {
    nextQuestion = buildUploadDocsPrompt();
  } else {
    const nextField = missing.find(f => f.priority === 1) ?? missing[0];
    nextQuestion = nextField ? { en: nextField.label_en, es: nextField.label_es } : undefined;
    if (!nextQuestion && status === 'READY_TO_QUOTE') {
      nextQuestion = {
        en: 'Great! We have everything we need. Let me prepare your quote.',
        es: '¡Perfecto! Tenemos todo lo necesario. Déjame preparar tu cotización.',
      };
    }
  }

  return {
    canQuote: ready,
    status,
    missingFields: missing,
    completenessScore: score,
    nextQuestion,
  };
}

export function convertPolicyToQuoteInput(
  policy: Policy, 
  user?: { name?: string; phone?: string; preferredChannel?: 'whatsapp' | 'call' | 'text'; zip?: string }
): QuoteInput {
  return {
    insuredFullName: policy.drivers?.[0]?.name || user?.name,
    phone: user?.phone,
    garagingAddress: user?.zip ? { zip: user.zip, state: 'TX' } : undefined,
    contactPreference: user?.preferredChannel,
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
