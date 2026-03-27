export const LEAD_STATUSES = {
  WAITING_DOCS: 'WAITING_DOCS',
  NEEDS_INFO: 'NEEDS_INFO',
  READY_TO_QUOTE: 'READY_TO_QUOTE',
} as const;

export type LeadIntakeStatus = typeof LEAD_STATUSES[keyof typeof LEAD_STATUSES];

export const LEAD_STATUS_META: Record<LeadIntakeStatus, {
  label: { en: string; es: string };
  description: { en: string; es: string };
  color: string;
  allowedTransitions: LeadIntakeStatus[];
}> = {
  WAITING_DOCS: {
    label: { en: 'Waiting for Documents', es: 'Esperando Documentos' },
    description: {
      en: 'Lead submitted but missing required documents (policy, ID, etc.)',
      es: 'Lead enviado pero faltan documentos requeridos (póliza, ID, etc.)',
    },
    color: '#FF9500',
    allowedTransitions: ['NEEDS_INFO', 'READY_TO_QUOTE'],
  },
  NEEDS_INFO: {
    label: { en: 'Needs More Info', es: 'Necesita Más Info' },
    description: {
      en: 'Documents received but missing key data fields (VIN, DOB, coverage, etc.)',
      es: 'Documentos recibidos pero faltan datos clave (VIN, fecha de nacimiento, cobertura, etc.)',
    },
    color: '#0066FF',
    allowedTransitions: ['WAITING_DOCS', 'READY_TO_QUOTE'],
  },
  READY_TO_QUOTE: {
    label: { en: 'Ready to Quote', es: 'Listo para Cotizar' },
    description: {
      en: 'All required information collected. Can be sent to carriers for quoting.',
      es: 'Toda la información requerida recopilada. Se puede enviar a aseguradoras para cotizar.',
    },
    color: '#00C96F',
    allowedTransitions: ['NEEDS_INFO'],
  },
};

export function isValidStatusTransition(from: LeadIntakeStatus, to: LeadIntakeStatus): boolean {
  if (from === to) return true;
  return LEAD_STATUS_META[from].allowedTransitions.includes(to);
}

export const QUOTE_REQUEST_STATUSES = {
  REQUESTED: 'REQUESTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
} as const;

export type QuoteRequestStatusType = typeof QUOTE_REQUEST_STATUSES[keyof typeof QUOTE_REQUEST_STATUSES];

export const NO_CLOSE_REASONS = [
  { value: 'price_too_high', label: { en: 'Price too high', es: 'Precio muy alto' } },
  { value: 'coverage_mismatch', label: { en: 'Coverage mismatch', es: 'Cobertura no coincide' } },
  { value: 'customer_unresponsive', label: { en: 'Customer unresponsive', es: 'Cliente no responde' } },
  { value: 'already_renewed', label: { en: 'Already renewed elsewhere', es: 'Ya renovó con otra aseguradora' } },
  { value: 'not_interested', label: { en: 'Not interested', es: 'No interesado' } },
  { value: 'incomplete_info', label: { en: 'Incomplete information', es: 'Información incompleta' } },
  { value: 'carrier_declined', label: { en: 'Carrier declined', es: 'Aseguradora rechazó' } },
  { value: 'timing', label: { en: 'Bad timing / follow up later', es: 'Mal momento / seguimiento después' } },
  { value: 'other', label: { en: 'Other', es: 'Otro' } },
] as const;

export const ACTOR_ROLES = {
  IAT_1: 'IAT_1',
  IAT_2: 'IAT_2',
  IAT_3: 'IAT_3',
  IAM: 'IAM',
  SYSTEM: 'system',
  CUSTOMER: 'customer',
} as const;

export type ActorRole = typeof ACTOR_ROLES[keyof typeof ACTOR_ROLES];

export const ACTOR_ROLE_LABELS: Record<ActorRole, { en: string; es: string }> = {
  IAT_1: { en: 'Agent Team 1', es: 'Equipo Agente 1' },
  IAT_2: { en: 'Agent Team 2', es: 'Equipo Agente 2' },
  IAT_3: { en: 'Agent Team 3', es: 'Equipo Agente 3' },
  IAM: { en: 'Agent Manager', es: 'Gerente de Agentes' },
  system: { en: 'System', es: 'Sistema' },
  customer: { en: 'Customer', es: 'Cliente' },
};

export const FOLLOWUP_TYPES = {
  SCHEDULED: 'scheduled',
  SLA_WARNING: 'sla_warning',
  ESCALATION: 'escalation',
  COMMITMENT_CHECK: 'commitment_check',
  RECHECK_SAVINGS: 'recheck_savings',
  RENEWAL_PROMPT: 'renewal_prompt',
} as const;

export const EVIDENCE_PACKAGE_TYPES = {
  IDENTITY: 'identity',
  VEHICLE_INSPECTION: 'vehicle_inspection',
  COLLISION: 'collision',
  OTHER_THAN_COLLISION: 'other_than_collision',
  UNINSURED_MOTORIST: 'uninsured_motorist',
  GENERAL: 'general',
} as const;

export const REFERRAL_STATUSES = {
  INVITED: 'invited',
  STARTED: 'started',
  QUOTED: 'quoted',
  CLOSED: 'closed',
  EXPIRED: 'expired',
} as const;

export const CHANNELS = {
  WHATSAPP: 'whatsapp',
  SMS: 'sms',
  EMAIL: 'email',
  CALL: 'call',
  IN_APP: 'in_app',
} as const;

export type ChannelType = typeof CHANNELS[keyof typeof CHANNELS];

export const EVENT_TYPES = {
  LEAD_CREATED: 'lead.created',
  LEAD_STATUS_CHANGED: 'lead.status_changed',
  LEAD_ASSIGNED: 'lead.assigned',
  LEAD_FIELD_UPDATED: 'lead.field_updated',
  LEAD_NOTE_ADDED: 'lead.note_added',
  COMMUNICATION_SENT: 'communication.sent',
  COMMUNICATION_RECEIVED: 'communication.received',
  FOLLOWUP_CREATED: 'followup.created',
  FOLLOWUP_COMPLETED: 'followup.completed',
  FOLLOWUP_ESCALATED: 'followup.escalated',
  COMMITMENT_CREATED: 'commitment.created',
  COMMITMENT_HONORED: 'commitment.honored',
  COMMITMENT_MISSED: 'commitment.missed',
  QUOTE_REQUESTED: 'quote.requested',
  QUOTE_COMPLETED: 'quote.completed',
  QUOTE_FAILED: 'quote.failed',
  SAVINGS_FOUND: 'quote.savings_found',
  NO_SAVINGS: 'quote.no_savings',
  POLICY_BOUND: 'policy.bound',
  POLICY_RENEWED: 'policy.renewed',
  POLICY_LAPSED: 'policy.lapsed',
  PAYMENT_REMINDER_SENT: 'payment.reminder_sent',
  PAYMENT_RECOVERED: 'payment.recovered',
  PAYMENT_MISSED: 'payment.missed',
  RENEWAL_REMINDER_SENT: 'renewal.reminder_sent',
  REFERRAL_CREATED: 'referral.created',
  REFERRAL_STARTED: 'referral.started',
  REFERRAL_CLOSED: 'referral.closed',
  EVIDENCE_SUBMITTED: 'evidence.submitted',
  EVIDENCE_COMPLETE: 'evidence.complete',
  ESCALATION_TRIGGERED: 'escalation.triggered',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];
