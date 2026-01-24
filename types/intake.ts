export type Language = 'en' | 'es';

export type IntakeStatus = 
  | 'WAITING_DOCS'
  | 'NEEDS_INFO'
  | 'READY_TO_QUOTE';

export type CoverageType = 'minimum' | 'full';

export type LiabilityLimits = 
  | '30/60/25'
  | '50/100/50'
  | '100/300/100'
  | '250/500/100'
  | '250/500/250'
  | '500/500/100';

export type Deductible = 250 | 500 | 1000 | 2500;

export type ContactPreference = 'whatsapp' | 'call' | 'text';

export type DriverIdType = 'TXDL' | 'TX_ID' | 'Matricula' | 'Other';

export interface IntakeAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface IntakeDriver {
  fullName?: string;
  dob?: string;
  idType?: DriverIdType;
  idLast4?: string;
  idPhoto?: string;
  licenseNumber?: string;
}

export interface IntakeVehicle {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
}

export interface PriceGate {
  notifyOnlyIfCheaper?: boolean;
  currentPremiumApprox?: number;
  targetMonthly?: number;
  targetSavings?: number;
}

export interface QuoteInput {
  phone?: string;
  language: Language;
  consentToContact?: boolean;
  insuredFullName?: string;
  garagingAddress?: IntakeAddress;
  contactPreference?: ContactPreference;
  drivers?: IntakeDriver[];
  vehicles?: IntakeVehicle[];
  coverageType?: CoverageType;
  liabilityLimits?: string;
  collisionDeductible?: number;
  comprehensiveDeductible?: number;
  financedOrLienholder?: boolean;
  currentPolicyDoc?: string;
  currentCarrier?: string;
  currentPremium?: number;
  effectiveDate?: string;
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
  priceGate?: PriceGate;
}

export type MissingSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface MissingField {
  fieldKey: string;
  priority: 1 | 2 | 3;
  severity: MissingSeverity;
  message: { en: string; es: string };
  currentValue?: unknown;
  validationRule?: string;
}

export interface QuoteReadinessResult {
  canQuote: boolean;
  status: IntakeStatus;
  missingFields: MissingField[];
  completenessScore: number;
  nextQuestion?: { en: string; es: string };
  expectedFieldKey?: string;
}

export interface LeadRecord {
  id: string;
  phone?: string;
  language: Language;
  consent: boolean;
  intakeJson: QuoteInput;
  status: IntakeStatus;
  canQuote: boolean;
  score: number;
  missingRequired: { fieldKey: string; message: string }[];
  missingRecommended: { fieldKey: string; message: string }[];
  nextQuestionEn?: string;
  nextQuestionEs?: string;
  assignedTo?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type QuoteRequestStatus = 
  | 'REQUESTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export interface QuoteRequest {
  id: string;
  leadId: string;
  intakeJson: QuoteInput;
  status: QuoteRequestStatus;
  requestedBy?: string;
  assignedTo?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface StoredQuote {
  id: string;
  quoteRequestId: string;
  provider: string;
  productName?: string;
  termMonths?: number;
  paymentPlan?: string;
  premiumCents: number;
  downPaymentCents?: number;
  liabilityLimits?: string;
  coverageType?: string;
  collisionDeductible?: number;
  comprehensiveDeductible?: number;
  source: 'AGENT' | 'API' | 'COMPARATIVE_RATER';
  externalRef?: string;
  rawJson?: unknown;
  createdAt: string;
}

export interface AssistantTurn {
  leadId: string;
  status: IntakeStatus;
  canQuote: boolean;
  completenessScore: number;
  missingRequired: { fieldKey: string; message: string }[];
  missingRecommended: { fieldKey: string; message: string }[];
  nextQuestion: { en: string; es: string };
  expectedField?: {
    fieldKey: string;
    fieldType: 'dob' | 'vin' | 'yesno' | 'coverageType' | 'liabilityLimits' | 'deductible' | 'phone' | 'text' | 'name' | 'zip';
    hints?: string[];
    choices?: { value: string; label: { en: string; es: string } }[];
  };
  followUpMessage: { en: string; es: string };
}

export type WebhookEventType =
  | 'lead.missing_fields_updated'
  | 'lead.ready_to_quote'
  | 'quote.requested'
  | 'quote.completed'
  | 'quote.failed';

export interface WebhookPayload {
  event: WebhookEventType;
  occurredAt: string;
  leadId: string;
  quoteRequestId?: string;
  userId?: string;
  phone?: string;
  language: Language;
  status: string;
  canQuote: boolean;
  completenessScore: number;
  missingRequired?: { fieldKey: string; message: string }[];
  missingRecommended?: { fieldKey: string; message: string }[];
  nextQuestion?: { en: string; es: string };
  followUpMessage?: { en: string; es: string };
  expectedFieldKey?: string;
  quoteCount?: number;
  bestPremiumCents?: number;
}
