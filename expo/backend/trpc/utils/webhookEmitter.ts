import { MissingField } from './intakeGate';

export type WebhookEventType = 
  | 'lead.created'
  | 'lead.updated'
  | 'lead.missing_fields_updated'
  | 'lead.ready_to_quote'
  | 'lead.assigned_to_agent'
  | 'lead.status_changed'
  | 'agent.trial_started'
  | 'agent.verified'
  | 'agent.lead_status_changed'
  | 'policy.created'
  | 'policy.updated'
  | 'snapshot.created'
  | 'user.created'
  | 'user.accepted_terms'
  | 'document.uploaded'
  | 'accident_report.created'
  | 'evidence.captured';

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface LeadMissingFieldsPayload {
  leadId: string;
  userId: string;
  phone: string;
  language: 'en' | 'es';
  status: string;
  missingRequired: MissingField[];
  missingRecommended: MissingField[];
  canQuote: boolean;
  missingFieldsMessageEn?: string;
  missingFieldsMessageEs?: string;
  updatedAt: string;
}

export interface AgentTrialStartedPayload {
  agentId: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  trialStartedAt: string;
  trialEndsAt: string;
  firstLeadId: string;
}

export interface LeadAssignedPayload {
  leadId: string;
  agentId: string;
  agentName: string;
  userId: string;
  userName?: string;
  userPhone: string;
  userLanguage: 'en' | 'es';
  snapshotGrade?: string;
  potentialSavings?: number;
  assignedAt: string;
}

const webhookEndpoints: string[] = [];

export function registerWebhookEndpoint(url: string): void {
  if (!webhookEndpoints.includes(url)) {
    webhookEndpoints.push(url);
    console.log(`[WEBHOOK] Registered endpoint: ${url}`);
  }
}

export function removeWebhookEndpoint(url: string): void {
  const index = webhookEndpoints.indexOf(url);
  if (index > -1) {
    webhookEndpoints.splice(index, 1);
    console.log(`[WEBHOOK] Removed endpoint: ${url}`);
  }
}

export function getWebhookEndpoints(): string[] {
  return [...webhookEndpoints];
}

export async function emitWebhook(
  event: WebhookEventType, 
  data: Record<string, unknown>
): Promise<void> {
  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  console.log(`[WEBHOOK] Emitting event: ${event}`, JSON.stringify(payload, null, 2));

  for (const endpoint of webhookEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`[WEBHOOK] Failed to send to ${endpoint}: ${response.status}`);
      } else {
        console.log(`[WEBHOOK] Successfully sent to ${endpoint}`);
      }
    } catch (error) {
      console.error(`[WEBHOOK] Error sending to ${endpoint}:`, error);
    }
  }
}

export async function emitLeadMissingFieldsUpdated(
  payload: LeadMissingFieldsPayload
): Promise<void> {
  await emitWebhook('lead.missing_fields_updated', payload as unknown as Record<string, unknown>);
}

export async function emitAgentTrialStarted(
  payload: AgentTrialStartedPayload
): Promise<void> {
  await emitWebhook('agent.trial_started', payload as unknown as Record<string, unknown>);
}

export async function emitLeadAssigned(
  payload: LeadAssignedPayload
): Promise<void> {
  await emitWebhook('lead.assigned_to_agent', payload as unknown as Record<string, unknown>);
}

export async function emitLeadReadyToQuote(data: {
  leadId: string;
  userId: string;
  phone: string;
  language: 'en' | 'es';
}): Promise<void> {
  await emitWebhook('lead.ready_to_quote', data);
}

export async function emitLeadStatusChanged(data: {
  leadId: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  timestamp: string;
}): Promise<void> {
  await emitWebhook('lead.status_changed', data);
}

export function buildMissingFieldsWhatsAppMessage(
  missingRequired: string[],
  language: 'en' | 'es'
): string {
  if (missingRequired.length === 0) {
    return language === 'es' 
      ? '✅ ¡Todo listo! Ya podemos cotizarte.'
      : '✅ All set! We can get you quotes now.';
  }

  const intro = language === 'es'
    ? '✅ Recibido. Para cotizar hoy me falta:'
    : '✅ Got it. To quote you today I need:';

  const items = missingRequired.map((field, i) => `${i + 1}) ${field}`).join('\n');

  const outro = language === 'es'
    ? 'Responde aquí o manda foto.'
    : 'Reply here or send a photo.';

  return `${intro}\n${items}\n${outro}`;
}

console.log('[WEBHOOK_EMITTER] Module loaded');
