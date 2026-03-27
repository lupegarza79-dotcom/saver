export type CaseStatus = 
  | 'NEW_INBOUND'
  | 'DOCS_RECEIVED'
  | 'NEEDS_INFO'
  | 'READY_FOR_QUOTE'
  | 'QUOTING_IN_PROGRESS'
  | 'QUOTES_READY'
  | 'SENT_TO_CUSTOMER'
  | 'CUSTOMER_DECISION_PENDING'
  | 'BOUND_WON'
  | 'LOST'
  | 'FOLLOW_UP_LATER'
  | 'VAULT_UPDATED'
  | 'GUARDIAN_ACTIVE';

export type GuardianStatus = 
  | 'PAYMENT_UPCOMING'
  | 'PAYMENT_OVERDUE_RISK'
  | 'RENEWAL_30D'
  | 'RENEWAL_7D'
  | 'LAPSE_RISK';

export type DocumentType = 
  | 'DEC_PAGE'
  | 'ID_CARD'
  | 'DRIVER_LICENSE'
  | 'REGISTRATION'
  | 'OTHER';

export type NotificationChannel = 'whatsapp' | 'sms' | 'email';

export interface User {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  zip?: string;
  preferredChannel: NotificationChannel;
  language: 'en' | 'es';
  savingsThreshold?: number;
  notifyOnlyIfSavings: boolean;
  notifyCoverageRisk: boolean;
  acceptedTermsAt?: string;
  hasSeenEvidenceDisclaimer?: boolean;
  createdAt: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  normalizedAddress?: string;
}

export interface Driver {
  id: string;
  name: string;
  dob: string;
  licenseNumber?: string;
  licenseState?: string;
  isPrimary: boolean;
}

export interface Vehicle {
  id: string;
  vin?: string;
  year: number;
  make: string;
  model: string;
  color?: string;
}

export interface Policy {
  id: string;
  caseId?: string;
  carrier: string;
  policyNumber: string;
  effectiveDate: string;
  expirationDate: string;
  premium: number;
  paymentFrequency: 'monthly' | 'quarterly' | 'semi-annual' | 'annual';
  nextPaymentDue?: string;
  deductibleComp?: number;
  deductibleColl?: number;
  liabilityBI?: string;
  liabilityPD?: string;
  coveragesSummary?: string;
  vehicles: Vehicle[];
  drivers: Driver[];
  isActive: boolean;
}

export interface Document {
  id: string;
  caseId?: string;
  policyId?: string;
  type: DocumentType;
  name: string;
  url: string;
  uploadedAt: string;
  uploadedBy: 'user' | 'staff';
  source: 'whatsapp' | 'upload_link' | 'camera';
  confidence?: number;
}

export interface Quote {
  id: string;
  caseId: string;
  carrier: string;
  carrierLogo?: string;
  monthlyPremium: number;
  downPayment?: number;
  term: number;
  coveragesSummary: string;
  deductibleComp?: number;
  deductibleColl?: number;
  liabilityBI?: string;
  liabilityPD?: string;
  savingsVsCurrent?: number;
  isRecommended?: boolean;
  notes?: string;
  createdAt: string;
}

export interface Case {
  id: string;
  userId: string;
  type: 'INS_SAVER_REVIEW';
  status: CaseStatus;
  assignedTo?: string;
  documents: Document[];
  missingItems: string[];
  completenessScore: number;
  currentPremium?: number;
  quotes: Quote[];
  timeline: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
}

export interface Reminder {
  id: string;
  policyId: string;
  type: 'payment' | 'renewal';
  dueAt: string;
  amount?: number;
  carrierName?: string;
  channel: NotificationChannel;
  status: 'pending' | 'snoozed' | 'completed' | 'skipped';
  snoozeUntil?: string;
  paidAt?: string;
}

export interface AccidentReport {
  id: string;
  policyId: string;
  createdAt: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  photos: string[];
  otherDriverInfo?: {
    name?: string;
    phone?: string;
    insurance?: string;
    policyNumber?: string;
    licensePlate?: string;
  };
  policeReportNumber?: string;
  notes?: string;
  submittedToInsurance: boolean;
  checklistCompleted: {
    safety: boolean;
    emergency: boolean;
    exchangeInfo: boolean;
    photos: boolean;
    policeReport: boolean;
  };
  evidenceVideoId?: string;
}

export type VideoEvidenceType = 'pre_inspection' | 'incident';

export interface VideoEvidence {
  id: string;
  userId: string;
  policyId?: string;
  caseId?: string;
  type: VideoEvidenceType;
  videoUrl: string;
  thumbnailUrl?: string;
  gpsLat?: number;
  gpsLng?: number;
  capturedAt: string;
  durationSeconds: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type SnapshotGrade = 'A' | 'B' | 'C' | 'D';

export interface PolicySnapshot {
  id: string;
  policyId: string;
  grade: SnapshotGrade;
  monthlySavings: number;
  findings: string[];
  recommendations: string[];
  coverageScore: number;
  priceScore: number;
  overallScore: number;
  createdAt: string;
}

export type LeadStatus = 
  | 'new'
  | 'contacted'
  | 'snapshot_sent'
  | 'interested'
  | 'quoted'
  | 'won'
  | 'lost'
  | 'follow_up'
  | 'unresponded';

export type UserRole = 'consumer' | 'agent' | 'admin';

export type AgentStatus = 'pending' | 'verified' | 'rejected' | 'suspended_license' | 'disabled';

export type AgentLeadStatus = 'invited' | 'accepted' | 'declined' | 'contacted' | 'quoted' | 'won' | 'lost';

export type LineOfBusiness = 'auto' | 'home' | 'commercial' | 'life' | 'health' | 'other';

export interface LeadNote {
  id: string;
  content: string;
  createdBy: 'agent' | 'admin' | 'system';
  createdByUserId?: string;
  createdAt: string;
}

export interface LeadStatusHistoryEntry {
  id: string;
  leadId: string;
  agentId?: string;
  oldStatus: LeadStatus;
  newStatus: LeadStatus;
  changedBy: 'agent' | 'admin' | 'system';
  changedByUserId?: string;
  notes?: string;
  changedAt: string;
}

export interface Lead {
  id: string;
  userId: string;
  userName?: string;
  userPhone: string;
  userEmail?: string;
  userState?: string;
  userZip?: string;
  lineOfBusiness?: LineOfBusiness;
  status: LeadStatus;
  source: 'app' | 'whatsapp' | 'referral';
  policyId?: string;
  snapshotId?: string;
  snapshotGrade?: SnapshotGrade;
  potentialSavings?: number;
  savingsEstimate?: number;
  notes?: string;
  noteHistory?: LeadNote[];
  statusHistory?: LeadStatusHistoryEntry[];
  assignedAgentId?: string;
  assignedAt?: string;
  firstContactAt?: string;
  quoteSentAt?: string;
  closedAt?: string;
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  needsFollowUp?: boolean;
  chosenOfferId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  userId: string;
  fullName: string;
  agencyName?: string;
  phone: string;
  email: string;
  whatsappNumber?: string;
  stateLicenses: string[];
  licenseNumber: string;
  licenseState?: string;
  licenseExpiry?: string;
  licenseScreenshotUrl?: string;
  linesOfBusiness: LineOfBusiness[];
  languages: ('en' | 'es')[];
  serviceAreaZipPrefix?: string;
  zipCoverage?: string[];
  acceptsUrgentLeads?: boolean;
  bio?: string;
  avatarUrl?: string;
  status: AgentStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadStatusChange {
  id: string;
  status: AgentLeadStatus;
  changedBy: 'agent' | 'admin' | 'system';
  changedByUserId?: string;
  notes?: string;
  timestamp: string;
}

export interface AgentLeadAssignment {
  id: string;
  leadId: string;
  agentId: string;
  status: AgentLeadStatus;
  notes?: string;
  contactedAt?: string;
  quotedAt?: string;
  closedAt?: string;
  statusHistory?: LeadStatusChange[];
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MONETIZATION - Agent Subscription System
// Texas-compliant: NO per-lead fees, only subscriptions
// ============================================

export type SubscriptionTier = 'free' | 'starter' | 'pro' | 'agency';

export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trial' | 'trial_pending_first_lead';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  features: SubscriptionFeatures;
}

export interface SubscriptionFeatures {
  maxLeadsPerMonth: number | 'unlimited';
  priorityMatching: boolean;
  responseTimeHours: number;
  profileBadge: 'none' | 'verified' | 'premium' | 'elite';
  aiAssistant: boolean;
  analyticsAccess: 'none' | 'basic' | 'advanced' | 'full';
  customBranding: boolean;
  apiAccess: boolean;
  teamMembers: number;
  featuredPlacement: boolean;
  instantNotifications: boolean;
  dedicatedSupport: boolean;
}

export type TrialStatus = 'not_started' | 'active' | 'expired' | 'used';

export interface AgentSubscription {
  id: string;
  agentId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialStatus: TrialStatus;
  trialStartedAt?: string;
  trialEndsAt?: string;
  leadsUsedThisMonth: number;
  leadsResetAt: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAnalytics {
  agentId: string;
  period: 'day' | 'week' | 'month' | 'year';
  leadsReceived: number;
  leadsContacted: number;
  leadsQuoted: number;
  leadsWon: number;
  leadsLost: number;
  conversionRate: number;
  avgResponseTimeMinutes: number;
  avgFirstResponseMinutes: number;
  contactRate: number;
  winRate: number;
  totalPremiumWritten: number;
  rank: number;
  updatedAt: string;
}

export interface LeadOffer {
  id: string;
  leadId: string;
  agentId: string;
  monthlyPremium: number;
  carrierName: string;
  coverageSummary?: string;
  canBindNow: boolean;
  expiresAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// INTAKE GATE - Ready-to-Quote System
// ============================================

export type IntakeStatus = 
  | 'NEW'
  | 'WAITING_DOCS'
  | 'NEEDS_INFO'
  | 'READY_TO_QUOTE'
  | 'ROUTED_TO_AGENTS'
  | 'QUOTED'
  | 'WON'
  | 'LOST';

export type CoverageType = 'minimum' | 'full';

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
}

export interface IntakeVehicle {
  vin?: string;
  year?: number;
  make?: string;
  model?: string;
}

export interface IntakeDrivingHistory {
  hasTicketsOrAccidents?: boolean;
  details?: string;
}

export interface IntakeExtras {
  roadside?: boolean;
  rentalReimbursement?: boolean;
  umUim?: boolean;
  pip?: boolean;
  medPay?: boolean;
}

export interface IntakeCase {
  id: string;
  userId: string;
  insuredFullName?: string;
  phone?: string;
  garagingAddress?: IntakeAddress;
  contactPreference?: ContactPreference;
  drivers?: IntakeDriver[];
  vehicles?: IntakeVehicle[];
  coverageType?: CoverageType;
  liabilityLimits?: string;
  collisionDeductible?: number;
  compDeductible?: number;
  financedOrLienholder?: boolean;
  currentPolicyDoc?: string;
  currentCarrier?: string;
  currentPremium?: number;
  policyExpiryDate?: string;
  drivingHistory?: IntakeDrivingHistory;
  extras?: IntakeExtras;
  status: IntakeStatus;
  canQuote: boolean;
  missingRequiredCount: number;
  missingRecommendedCount: number;
  consentGivenAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    features: {
      maxLeadsPerMonth: 3,
      priorityMatching: false,
      responseTimeHours: 48,
      profileBadge: 'verified',
      aiAssistant: false,
      analyticsAccess: 'none',
      customBranding: false,
      apiAccess: false,
      teamMembers: 1,
      featuredPlacement: false,
      instantNotifications: false,
      dedicatedSupport: false,
    },
  },
  {
    tier: 'starter',
    name: 'Starter',
    priceMonthly: 49,
    priceYearly: 470,
    features: {
      maxLeadsPerMonth: 15,
      priorityMatching: false,
      responseTimeHours: 24,
      profileBadge: 'verified',
      aiAssistant: false,
      analyticsAccess: 'basic',
      customBranding: false,
      apiAccess: false,
      teamMembers: 1,
      featuredPlacement: false,
      instantNotifications: true,
      dedicatedSupport: false,
    },
  },
  {
    tier: 'pro',
    name: 'Pro',
    priceMonthly: 149,
    priceYearly: 1430,
    features: {
      maxLeadsPerMonth: 50,
      priorityMatching: true,
      responseTimeHours: 4,
      profileBadge: 'premium',
      aiAssistant: true,
      analyticsAccess: 'advanced',
      customBranding: true,
      apiAccess: false,
      teamMembers: 3,
      featuredPlacement: true,
      instantNotifications: true,
      dedicatedSupport: false,
    },
  },
  {
    tier: 'agency',
    name: 'Agency',
    priceMonthly: 399,
    priceYearly: 3830,
    features: {
      maxLeadsPerMonth: 'unlimited',
      priorityMatching: true,
      responseTimeHours: 1,
      profileBadge: 'elite',
      aiAssistant: true,
      analyticsAccess: 'full',
      customBranding: true,
      apiAccess: true,
      teamMembers: 10,
      featuredPlacement: true,
      instantNotifications: true,
      dedicatedSupport: true,
    },
  },
];
