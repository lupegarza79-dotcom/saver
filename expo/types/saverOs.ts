import type { ActorRole, ChannelType, EventType, LeadIntakeStatus } from '@/constants/statuses';

export interface LeadEvent {
  id: string;
  leadId: string;
  eventType: EventType | string;
  actorRole: ActorRole;
  actorId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
}

export interface LeadCommunication {
  id: string;
  leadId: string;
  channel: ChannelType;
  direction: 'inbound' | 'outbound';
  messageType: 'initial_contact' | 'follow_up' | 'quote_delivery' | 'reminder' | 'escalation' | 'info_request' | 'commitment' | 'general';
  content?: string;
  sentByRole?: ActorRole;
  sentById?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  externalRef?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type FollowupType = 'scheduled' | 'sla_warning' | 'escalation' | 'commitment_check' | 'recheck_savings' | 'renewal_prompt';
export type FollowupStatus = 'pending' | 'completed' | 'skipped' | 'escalated' | 'overdue';
export type FollowupPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface LeadFollowup {
  id: string;
  leadId: string;
  type: FollowupType;
  status: FollowupStatus;
  dueAt: string;
  completedAt?: string;
  assignedToRole?: ActorRole;
  assignedToId?: string;
  escalationTargetRole?: ActorRole;
  priority: FollowupPriority;
  reason?: string;
  outcome?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type CommitmentType = 'callback' | 'reminder' | 'recheck' | 'document_upload' | 'custom';
export type CommitmentStatus = 'pending' | 'honored' | 'missed' | 'rescheduled' | 'cancelled';

export interface LeadCommitment {
  id: string;
  leadId: string;
  type: CommitmentType;
  promisedAt: string;
  channel?: ChannelType;
  description?: string;
  status: CommitmentStatus;
  honoredAt?: string;
  followupId?: string;
  createdByRole?: ActorRole;
  createdById?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type PolicyProductType = 'auto' | 'home' | 'commercial' | 'life' | 'health' | 'other';

export interface SaverPolicy {
  id: string;
  leadId?: string;
  phone?: string;
  carrier: string;
  policyNumber?: string;
  productType: PolicyProductType;
  effectiveDate?: string;
  expirationDate?: string;
  premiumCents?: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  nextPaymentDue?: string;
  nextPaymentAmountCents?: number;
  deductibleCollision?: number;
  deductibleComprehensive?: number;
  liabilityBi?: string;
  liabilityPd?: string;
  coveragesSummary?: string;
  vehiclesJson?: unknown[];
  driversJson?: unknown[];
  documentsJson?: unknown[];
  isActive: boolean;
  boundViaSaver: boolean;
  originalQuoteId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type PaymentReminderStatus = 'pending' | 'sent' | 'snoozed' | 'paid' | 'overdue' | 'cancelled';

export interface PaymentReminder {
  id: string;
  policyId?: string;
  leadId?: string;
  phone?: string;
  carrier?: string;
  amountCents?: number;
  dueDate: string;
  channel: ChannelType;
  status: PaymentReminderStatus;
  sentAt?: string;
  paidAt?: string;
  snoozedUntil?: string;
  recurrence: 'once' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
  rescueAttempted: boolean;
  rescueOutcome?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type RenewalReminderStatus = 'pending' | 'sent_30d' | 'sent_7d' | 'sent_1d' | 'renewed' | 'lapsed' | 'requoted' | 'cancelled';

export interface RenewalReminder {
  id: string;
  policyId?: string;
  leadId?: string;
  phone?: string;
  carrier?: string;
  renewalDate: string;
  channel: ChannelType;
  status: RenewalReminderStatus;
  recheckSavings: boolean;
  recheckResult?: 'savings_found' | 'no_savings' | 'pending' | 'not_checked';
  savingsAmountCents?: number;
  newQuoteRequestId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ReferralSource = 'share_link' | 'direct_form' | 'whatsapp' | 'post_success';
export type ReferralStatus = 'invited' | 'started' | 'quoted' | 'closed' | 'expired';

export interface Referral {
  id: string;
  referrerPhone?: string;
  referrerLeadId?: string;
  referredName: string;
  referredPhone: string;
  referredLeadId?: string;
  source: ReferralSource;
  status: ReferralStatus;
  language: 'en' | 'es';
  rewardEligible: boolean;
  rewardType?: string;
  rewardStatus?: 'pending' | 'approved' | 'paid' | 'denied';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type EvidencePackageType = 'identity' | 'vehicle_inspection' | 'collision' | 'other_than_collision' | 'uninsured_motorist' | 'general';
export type EvidencePackageStatus = 'pending' | 'in_progress' | 'complete' | 'expired' | 'rejected';

export interface EvidenceItem {
  type: 'photo' | 'video' | 'document' | 'selfie' | 'signature';
  label: string;
  url?: string;
  capturedAt?: string;
  geolocation?: { lat: number; lng: number };
  verified: boolean;
}

export interface EvidencePackage {
  id: string;
  leadId?: string;
  policyId?: string;
  phone?: string;
  packageType: EvidencePackageType;
  status: EvidencePackageStatus;
  checklist: Record<string, boolean>;
  items: EvidenceItem[];
  geolocation?: { lat: number; lng: number; accuracy?: number };
  capturedAt?: string;
  signatureUrl?: string;
  consentGiven: boolean;
  consentGivenAt?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface OpsLeadView {
  leadId: string;
  phone?: string;
  fullName?: string;
  status: LeadIntakeStatus;
  assignedTo?: string;
  score: number;
  canQuote: boolean;
  source?: string;
  createdAt: string;
  updatedAt: string;
  hoursSinceMovement: number;
  lastAction?: string;
  lastActionBy?: string;
  lastActionAt?: string;
  nextActionDue?: string;
  pendingFollowups: number;
  overdueFollowups: number;
  latestQrId?: string;
  latestQrStatus?: string;
  latestQrProgress?: number;
  noCloseReason?: string;
}

export interface FunnelMetrics {
  totalLeads: number;
  waitingDocs: number;
  needsInfo: number;
  readyToQuote: number;
  quotingInProgress: number;
  quoted: number;
  savingsFound: number;
  boundClosed: number;
  noClose: number;
  totalReferrals: number;
  referralsClosed: number;
  paymentsRecovered: number;
  renewalsRetained: number;
}

export interface WebhookEventPayload {
  event: string;
  occurredAt: string;
  leadId?: string;
  data: Record<string, unknown>;
}
