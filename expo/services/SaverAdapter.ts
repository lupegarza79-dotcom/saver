import { supabase } from '@/lib/supabase';
import type {
  LeadEvent,
  LeadCommunication,
  LeadFollowup,
  LeadCommitment,
  SaverPolicy,
  PaymentReminder,
  RenewalReminder,
  Referral,
  EvidencePackage,
  OpsLeadView,
  FunnelMetrics,
} from '@/types/saverOs';
import type { ActorRole, EventType } from '@/constants/statuses';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const SaverAdapter = {
  async logEvent(params: {
    leadId: string;
    eventType: EventType | string;
    actorRole: ActorRole;
    actorId?: string;
    oldValue?: unknown;
    newValue?: unknown;
    notes?: string;
    metadata?: Record<string, unknown>;
  }): Promise<LeadEvent | null> {
    console.log('[SaverAdapter] logEvent:', params.eventType, 'lead:', params.leadId);
    const { data, error } = await supabase
      .from('lead_events')
      .insert({
        id: generateId('evt'),
        lead_id: params.leadId,
        event_type: params.eventType,
        actor_role: params.actorRole,
        actor_id: params.actorId ?? null,
        old_value: params.oldValue ?? null,
        new_value: params.newValue ?? null,
        notes: params.notes ?? null,
        metadata: params.metadata ?? {},
      })
      .select()
      .single();

    if (error) {
      console.error('[SaverAdapter] logEvent error:', error);
      return null;
    }
    return mapEvent(data);
  },

  async getEvents(leadId: string, limit = 50): Promise<LeadEvent[]> {
    console.log('[SaverAdapter] getEvents for lead:', leadId);
    const { data, error } = await supabase
      .from('lead_events')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[SaverAdapter] getEvents error:', error);
      return [];
    }
    return (data ?? []).map(mapEvent);
  },

  async createFollowup(params: {
    leadId: string;
    type: string;
    dueAt: string;
    assignedToRole?: string;
    assignedToId?: string;
    priority?: string;
    reason?: string;
    notes?: string;
  }): Promise<LeadFollowup | null> {
    console.log('[SaverAdapter] createFollowup for lead:', params.leadId);
    const { data, error } = await supabase
      .from('lead_followups')
      .insert({
        id: generateId('fu'),
        lead_id: params.leadId,
        type: params.type,
        status: 'pending',
        due_at: params.dueAt,
        assigned_to_role: params.assignedToRole ?? null,
        assigned_to_id: params.assignedToId ?? null,
        priority: params.priority ?? 'normal',
        reason: params.reason ?? null,
        notes: params.notes ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[SaverAdapter] createFollowup error:', error);
      return null;
    }
    return mapFollowup(data);
  },

  async getFollowups(leadId: string): Promise<LeadFollowup[]> {
    const { data, error } = await supabase
      .from('lead_followups')
      .select('*')
      .eq('lead_id', leadId)
      .order('due_at', { ascending: true });

    if (error) {
      console.error('[SaverAdapter] getFollowups error:', error);
      return [];
    }
    return (data ?? []).map(mapFollowup);
  },

  async completeFollowup(id: string, outcome?: string): Promise<boolean> {
    const { error } = await supabase
      .from('lead_followups')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        outcome: outcome ?? null,
      })
      .eq('id', id);

    if (error) {
      console.error('[SaverAdapter] completeFollowup error:', error);
      return false;
    }
    return true;
  },

  async createCommitment(params: {
    leadId: string;
    type: string;
    promisedAt: string;
    channel?: string;
    description?: string;
    createdByRole?: string;
    createdById?: string;
  }): Promise<LeadCommitment | null> {
    console.log('[SaverAdapter] createCommitment for lead:', params.leadId);
    const { data, error } = await supabase
      .from('lead_commitments')
      .insert({
        id: generateId('cmt'),
        lead_id: params.leadId,
        type: params.type,
        promised_at: params.promisedAt,
        channel: params.channel ?? null,
        description: params.description ?? null,
        status: 'pending',
        created_by_role: params.createdByRole ?? null,
        created_by_id: params.createdById ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[SaverAdapter] createCommitment error:', error);
      return null;
    }
    return mapCommitment(data);
  },

  async getCommitments(leadId: string): Promise<LeadCommitment[]> {
    const { data, error } = await supabase
      .from('lead_commitments')
      .select('*')
      .eq('lead_id', leadId)
      .order('promised_at', { ascending: true });

    if (error) {
      console.error('[SaverAdapter] getCommitments error:', error);
      return [];
    }
    return (data ?? []).map(mapCommitment);
  },

  async createReferral(params: {
    referrerPhone?: string;
    referrerLeadId?: string;
    referredName: string;
    referredPhone: string;
    source: string;
    language: 'en' | 'es';
  }): Promise<Referral | null> {
    console.log('[SaverAdapter] createReferral:', params.referredName);
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        id: generateId('ref'),
        referrer_phone: params.referrerPhone ?? null,
        referrer_lead_id: params.referrerLeadId ?? null,
        referred_name: params.referredName,
        referred_phone: params.referredPhone,
        source: params.source,
        status: 'invited',
        language: params.language,
      })
      .select()
      .single();

    if (error) {
      console.error('[SaverAdapter] createReferral error:', error);
      return null;
    }
    return mapReferral(data);
  },

  async getReferrals(phone: string): Promise<Referral[]> {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SaverAdapter] getReferrals error:', error);
      return [];
    }
    return (data ?? []).map(mapReferral);
  },

  async createPolicy(params: {
    leadId?: string;
    phone?: string;
    carrier: string;
    policyNumber?: string;
    productType?: string;
    effectiveDate?: string;
    expirationDate?: string;
    premiumCents?: number;
    paymentFrequency?: string;
  }): Promise<SaverPolicy | null> {
    console.log('[SaverAdapter] createPolicy:', params.carrier);
    const { data, error } = await supabase
      .from('policies')
      .insert({
        id: generateId('pol'),
        lead_id: params.leadId ?? null,
        phone: params.phone ?? null,
        carrier: params.carrier,
        policy_number: params.policyNumber ?? null,
        product_type: params.productType ?? 'auto',
        effective_date: params.effectiveDate ?? null,
        expiration_date: params.expirationDate ?? null,
        premium_cents: params.premiumCents ?? null,
        payment_frequency: params.paymentFrequency ?? 'monthly',
        is_active: true,
        bound_via_saver: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[SaverAdapter] createPolicy error:', error);
      return null;
    }
    return mapPolicy(data);
  },

  async getPolicies(phone: string): Promise<SaverPolicy[]> {
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SaverAdapter] getPolicies error:', error);
      return [];
    }
    return (data ?? []).map(mapPolicy);
  },

  async createPaymentReminder(params: {
    policyId?: string;
    leadId?: string;
    phone?: string;
    carrier?: string;
    amountCents?: number;
    dueDate: string;
    channel?: string;
    recurrence?: string;
  }): Promise<PaymentReminder | null> {
    console.log('[SaverAdapter] createPaymentReminder for policy:', params.policyId);
    const { data, error } = await supabase
      .from('payment_reminders')
      .insert({
        id: generateId('pmr'),
        policy_id: params.policyId ?? null,
        lead_id: params.leadId ?? null,
        phone: params.phone ?? null,
        carrier: params.carrier ?? null,
        amount_cents: params.amountCents ?? null,
        due_date: params.dueDate,
        channel: params.channel ?? 'whatsapp',
        status: 'pending',
        recurrence: params.recurrence ?? 'monthly',
      })
      .select()
      .single();

    if (error) {
      console.error('[SaverAdapter] createPaymentReminder error:', error);
      return null;
    }
    return mapPaymentReminder(data);
  },

  async getPaymentReminders(phone: string): Promise<PaymentReminder[]> {
    const { data, error } = await supabase
      .from('payment_reminders')
      .select('*')
      .eq('phone', phone)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('[SaverAdapter] getPaymentReminders error:', error);
      return [];
    }
    return (data ?? []).map(mapPaymentReminder);
  },

  async createEvidencePackage(params: {
    leadId?: string;
    policyId?: string;
    phone?: string;
    packageType: string;
  }): Promise<EvidencePackage | null> {
    console.log('[SaverAdapter] createEvidencePackage:', params.packageType);
    const { data, error } = await supabase
      .from('evidence_packages')
      .insert({
        id: generateId('evp'),
        lead_id: params.leadId ?? null,
        policy_id: params.policyId ?? null,
        phone: params.phone ?? null,
        package_type: params.packageType,
        status: 'pending',
        checklist: {},
        items: [],
        consent_given: false,
      })
      .select()
      .single();

    if (error) {
      console.error('[SaverAdapter] createEvidencePackage error:', error);
      return null;
    }
    return mapEvidencePackage(data);
  },

  async getEvidencePackages(leadId: string): Promise<EvidencePackage[]> {
    const { data, error } = await supabase
      .from('evidence_packages')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[SaverAdapter] getEvidencePackages error:', error);
      return [];
    }
    return (data ?? []).map(mapEvidencePackage);
  },
};

function mapEvent(row: Record<string, unknown>): LeadEvent {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    eventType: row.event_type as string,
    actorRole: row.actor_role as ActorRole,
    actorId: row.actor_id as string | undefined,
    oldValue: row.old_value,
    newValue: row.new_value,
    metadata: row.metadata as Record<string, unknown> | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  };
}

function mapFollowup(row: Record<string, unknown>): LeadFollowup {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    type: row.type as LeadFollowup['type'],
    status: row.status as LeadFollowup['status'],
    dueAt: row.due_at as string,
    completedAt: row.completed_at as string | undefined,
    assignedToRole: row.assigned_to_role as ActorRole | undefined,
    assignedToId: row.assigned_to_id as string | undefined,
    escalationTargetRole: row.escalation_target_role as ActorRole | undefined,
    priority: row.priority as LeadFollowup['priority'],
    reason: row.reason as string | undefined,
    outcome: row.outcome as string | undefined,
    notes: row.notes as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapCommitment(row: Record<string, unknown>): LeadCommitment {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    type: row.type as LeadCommitment['type'],
    promisedAt: row.promised_at as string,
    channel: row.channel as LeadCommitment['channel'],
    description: row.description as string | undefined,
    status: row.status as LeadCommitment['status'],
    honoredAt: row.honored_at as string | undefined,
    followupId: row.followup_id as string | undefined,
    createdByRole: row.created_by_role as ActorRole | undefined,
    createdById: row.created_by_id as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapReferral(row: Record<string, unknown>): Referral {
  return {
    id: row.id as string,
    referrerPhone: row.referrer_phone as string | undefined,
    referrerLeadId: row.referrer_lead_id as string | undefined,
    referredName: row.referred_name as string,
    referredPhone: row.referred_phone as string,
    referredLeadId: row.referred_lead_id as string | undefined,
    source: row.source as Referral['source'],
    status: row.status as Referral['status'],
    language: (row.language as 'en' | 'es') ?? 'en',
    rewardEligible: (row.reward_eligible as boolean) ?? false,
    rewardType: row.reward_type as string | undefined,
    rewardStatus: row.reward_status as Referral['rewardStatus'],
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPolicy(row: Record<string, unknown>): SaverPolicy {
  return {
    id: row.id as string,
    leadId: row.lead_id as string | undefined,
    phone: row.phone as string | undefined,
    carrier: row.carrier as string,
    policyNumber: row.policy_number as string | undefined,
    productType: (row.product_type as SaverPolicy['productType']) ?? 'auto',
    effectiveDate: row.effective_date as string | undefined,
    expirationDate: row.expiration_date as string | undefined,
    premiumCents: row.premium_cents as number | undefined,
    paymentFrequency: (row.payment_frequency as SaverPolicy['paymentFrequency']) ?? 'monthly',
    nextPaymentDue: row.next_payment_due as string | undefined,
    nextPaymentAmountCents: row.next_payment_amount_cents as number | undefined,
    deductibleCollision: row.deductible_collision as number | undefined,
    deductibleComprehensive: row.deductible_comprehensive as number | undefined,
    liabilityBi: row.liability_bi as string | undefined,
    liabilityPd: row.liability_pd as string | undefined,
    coveragesSummary: row.coverages_summary as string | undefined,
    vehiclesJson: row.vehicles_json as unknown[] | undefined,
    driversJson: row.drivers_json as unknown[] | undefined,
    documentsJson: row.documents_json as unknown[] | undefined,
    isActive: (row.is_active as boolean) ?? true,
    boundViaSaver: (row.bound_via_saver as boolean) ?? false,
    originalQuoteId: row.original_quote_id as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapPaymentReminder(row: Record<string, unknown>): PaymentReminder {
  return {
    id: row.id as string,
    policyId: row.policy_id as string | undefined,
    leadId: row.lead_id as string | undefined,
    phone: row.phone as string | undefined,
    carrier: row.carrier as string | undefined,
    amountCents: row.amount_cents as number | undefined,
    dueDate: row.due_date as string,
    channel: (row.channel as PaymentReminder['channel']) ?? 'whatsapp',
    status: row.status as PaymentReminder['status'],
    sentAt: row.sent_at as string | undefined,
    paidAt: row.paid_at as string | undefined,
    snoozedUntil: row.snoozed_until as string | undefined,
    recurrence: (row.recurrence as PaymentReminder['recurrence']) ?? 'monthly',
    rescueAttempted: (row.rescue_attempted as boolean) ?? false,
    rescueOutcome: row.rescue_outcome as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapEvidencePackage(row: Record<string, unknown>): EvidencePackage {
  return {
    id: row.id as string,
    leadId: row.lead_id as string | undefined,
    policyId: row.policy_id as string | undefined,
    phone: row.phone as string | undefined,
    packageType: row.package_type as EvidencePackage['packageType'],
    status: row.status as EvidencePackage['status'],
    checklist: (row.checklist as Record<string, boolean>) ?? {},
    items: (row.items as EvidencePackage['items']) ?? [],
    geolocation: row.geolocation as EvidencePackage['geolocation'],
    capturedAt: row.captured_at as string | undefined,
    signatureUrl: row.signature_url as string | undefined,
    consentGiven: (row.consent_given as boolean) ?? false,
    consentGivenAt: row.consent_given_at as string | undefined,
    notes: row.notes as string | undefined,
    metadata: row.metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export default SaverAdapter;
