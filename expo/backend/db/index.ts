import { User, Policy, Document, Case, Reminder, VideoEvidence, AccidentReport, PolicySnapshot, Lead, LeadStatus, LeadStatusHistoryEntry, LeadOffer, Agent } from '@/types';

export interface ActivityLog {
  id: string;
  userId: string;
  userName?: string;
  userPhone?: string;
  action: 'user_created' | 'policy_uploaded' | 'document_uploaded' | 'reminder_created' | 'video_evidence_added' | 'accident_report_created' | 'user_logged_in';
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type WebhookEvent = 
  | 'user_created'
  | 'policy_uploaded'
  | 'snapshot_created'
  | 'video_evidence_added'
  | 'accident_reported'
  | 'lead_created'
  | 'lead_status_changed'
  | 'lead_needs_followup_24h'
  | 'lead_stale_48h'
  | 'lead_needs_followup_15min'
  | 'lead_escalate_2h'
  | 'agent_signup_pending'
  | 'agent_verified'
  | 'agent_rejected'
  | 'agent_license_updated'
  | 'agent_license_expiring'
  | 'agent_subscription_changed'
  | 'lead_assigned_to_agent'
  | 'lead_offer_created'
  | 'renewal_30d'
  | 'daily_summary';

export interface WebhookConfig {
  id: string;
  event: WebhookEvent;
  url: string;
  enabled: boolean;
  secret?: string;
  lastTriggeredAt?: string;
  lastStatus?: 'ok' | 'error';
  lastError?: string;
  createdAt: string;
}

export interface WebhookLog {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  status: 'ok' | 'error';
  responseCode?: number;
  error?: string;
  payload: Record<string, unknown>;
  triggeredAt: string;
}

class Database {
  private users: Map<string, User> = new Map();
  private policies: Map<string, Policy> = new Map();
  private documents: Map<string, Document> = new Map();
  private cases: Map<string, Case> = new Map();
  private reminders: Map<string, Reminder> = new Map();
  private videoEvidence: Map<string, VideoEvidence> = new Map();
  private accidentReports: Map<string, AccidentReport> = new Map();
  private snapshots: Map<string, PolicySnapshot> = new Map();
  private leads: Map<string, Lead> = new Map();
  private leadStatusHistory: LeadStatusHistoryEntry[] = [];
  private leadOffers: Map<string, LeadOffer> = new Map();
  private agents: Map<string, Agent> = new Map();
  private activityLogs: ActivityLog[] = [];
  private webhooks: Map<string, WebhookConfig> = new Map();
  private webhookLogs: WebhookLog[] = [];

  // Users
  createUser(user: User): User {
    this.users.set(user.id, user);
    this.logActivity({
      userId: user.id,
      userName: user.name,
      userPhone: user.phone,
      action: 'user_created',
      details: `New user registered: ${user.phone}`,
      metadata: { language: user.language },
    });
    this.triggerWebhook('user_created', user);
    return user;
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  getUserByPhone(phone: string): User | undefined {
    return Array.from(this.users.values()).find(u => u.phone === phone);
  }

  updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.users.get(id);
    if (user) {
      const updated = { ...user, ...updates };
      this.users.set(id, updated);
      return updated;
    }
    return undefined;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  // Policies
  createPolicy(policy: Policy, userId: string): Policy {
    this.policies.set(policy.id, policy);
    const user = this.users.get(userId);
    this.logActivity({
      userId,
      userName: user?.name,
      userPhone: user?.phone,
      action: 'policy_uploaded',
      details: `Policy uploaded: ${policy.carrier} - ${policy.policyNumber}`,
      metadata: { 
        carrier: policy.carrier, 
        premium: policy.premium,
        expirationDate: policy.expirationDate,
      },
    });
    this.triggerWebhook('policy_uploaded', { policy, userId });
    return policy;
  }

  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  getPoliciesByUser(userId: string, caseId?: string): Policy[] {
    return Array.from(this.policies.values()).filter(p => p.caseId === caseId);
  }

  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  updatePolicy(id: string, updates: Partial<Policy>): Policy | undefined {
    const policy = this.policies.get(id);
    if (policy) {
      const updated = { ...policy, ...updates };
      this.policies.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Documents
  createDocument(doc: Document, userId: string): Document {
    this.documents.set(doc.id, doc);
    const user = this.users.get(userId);
    this.logActivity({
      userId,
      userName: user?.name,
      userPhone: user?.phone,
      action: 'document_uploaded',
      details: `Document uploaded: ${doc.type} - ${doc.name}`,
      metadata: { type: doc.type, source: doc.source },
    });
    return doc;
  }

  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getAllDocuments(): Document[] {
    return Array.from(this.documents.values());
  }

  // Reminders
  createReminder(reminder: Reminder, userId: string): Reminder {
    this.reminders.set(reminder.id, reminder);
    const user = this.users.get(userId);
    this.logActivity({
      userId,
      userName: user?.name,
      userPhone: user?.phone,
      action: 'reminder_created',
      details: `Reminder created: ${reminder.type} due ${reminder.dueAt}`,
      metadata: { type: reminder.type, amount: reminder.amount },
    });
    return reminder;
  }

  getReminder(id: string): Reminder | undefined {
    return this.reminders.get(id);
  }

  updateReminder(id: string, updates: Partial<Reminder>): Reminder | undefined {
    const reminder = this.reminders.get(id);
    if (reminder) {
      const updated = { ...reminder, ...updates };
      this.reminders.set(id, updated);
      return updated;
    }
    return undefined;
  }

  getAllReminders(): Reminder[] {
    return Array.from(this.reminders.values());
  }

  getUpcomingReminders(days: number = 7): Reminder[] {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    
    return Array.from(this.reminders.values()).filter(r => {
      const dueDate = new Date(r.dueAt);
      return r.status === 'pending' && dueDate >= now && dueDate <= future;
    });
  }

  // Video Evidence
  createVideoEvidence(evidence: VideoEvidence): VideoEvidence {
    this.videoEvidence.set(evidence.id, evidence);
    const user = this.users.get(evidence.userId);
    this.logActivity({
      userId: evidence.userId,
      userName: user?.name,
      userPhone: user?.phone,
      action: 'video_evidence_added',
      details: `Video evidence recorded: ${evidence.type} (${evidence.durationSeconds}s)`,
      metadata: { 
        type: evidence.type, 
        duration: evidence.durationSeconds,
        hasGps: !!(evidence.gpsLat && evidence.gpsLng),
      },
    });
    this.triggerWebhook('video_evidence_added', evidence);
    return evidence;
  }

  getVideoEvidence(id: string): VideoEvidence | undefined {
    return this.videoEvidence.get(id);
  }

  getAllVideoEvidence(): VideoEvidence[] {
    return Array.from(this.videoEvidence.values());
  }

  // Accident Reports
  createAccidentReport(report: AccidentReport, userId: string): AccidentReport {
    this.accidentReports.set(report.id, report);
    const user = this.users.get(userId);
    this.logActivity({
      userId,
      userName: user?.name,
      userPhone: user?.phone,
      action: 'accident_report_created',
      details: `Accident report created with ${report.photos.length} photos`,
      metadata: { 
        photosCount: report.photos.length,
        hasLocation: !!report.location,
        hasVideo: !!report.evidenceVideoId,
      },
    });
    this.triggerWebhook('accident_reported', { report, userId });
    return report;
  }

  getAccidentReport(id: string): AccidentReport | undefined {
    return this.accidentReports.get(id);
  }

  getAllAccidentReports(): AccidentReport[] {
    return Array.from(this.accidentReports.values());
  }

  // Activity Logs
  private logActivity(params: Omit<ActivityLog, 'id' | 'createdAt'>) {
    const log: ActivityLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...params,
      createdAt: new Date().toISOString(),
    };
    this.activityLogs.unshift(log);
    console.log(`[ACTIVITY] ${log.action}: ${log.details}`);
  }

  getActivityLogs(limit: number = 50, offset: number = 0): ActivityLog[] {
    return this.activityLogs.slice(offset, offset + limit);
  }

  getActivityLogsByUser(userId: string): ActivityLog[] {
    return this.activityLogs.filter(log => log.userId === userId);
  }

  // Webhooks
  createWebhook(config: Omit<WebhookConfig, 'id' | 'createdAt'>): WebhookConfig {
    const webhook: WebhookConfig = {
      id: `wh_${Date.now()}`,
      ...config,
      createdAt: new Date().toISOString(),
    };
    this.webhooks.set(webhook.id, webhook);
    return webhook;
  }

  getWebhooks(): WebhookConfig[] {
    return Array.from(this.webhooks.values());
  }

  updateWebhook(id: string, updates: Partial<WebhookConfig>): WebhookConfig | undefined {
    const webhook = this.webhooks.get(id);
    if (webhook) {
      const updated = { ...webhook, ...updates };
      this.webhooks.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteWebhook(id: string): boolean {
    return this.webhooks.delete(id);
  }

  async triggerWebhook(event: WebhookEvent, data: unknown) {
    const enabledWebhooks = Array.from(this.webhooks.values()).filter(
      w => w.event === event && w.enabled
    );

    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const webhook of enabledWebhooks) {
      const log: WebhookLog = {
        id: `wlog_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        webhookId: webhook.id,
        event,
        status: 'ok',
        payload: payload as Record<string, unknown>,
        triggeredAt: new Date().toISOString(),
      };

      try {
        console.log(`[WEBHOOK] Triggering ${event} to ${webhook.url}`);
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}),
          },
          body: JSON.stringify(payload),
        });
        
        log.responseCode = response.status;
        if (!response.ok) {
          log.status = 'error';
          log.error = `HTTP ${response.status}`;
        }
        
        webhook.lastTriggeredAt = log.triggeredAt;
        webhook.lastStatus = log.status;
        webhook.lastError = log.error;
        this.webhooks.set(webhook.id, webhook);
        
        console.log(`[WEBHOOK] ${log.status === 'ok' ? 'Successfully sent' : 'Failed'} ${event} to ${webhook.url}`);
      } catch (error) {
        log.status = 'error';
        log.error = error instanceof Error ? error.message : 'Unknown error';
        webhook.lastTriggeredAt = log.triggeredAt;
        webhook.lastStatus = 'error';
        webhook.lastError = log.error;
        this.webhooks.set(webhook.id, webhook);
        console.error(`[WEBHOOK] Failed to send ${event} to ${webhook.url}:`, error);
      }

      this.webhookLogs.unshift(log);
      if (this.webhookLogs.length > 100) {
        this.webhookLogs = this.webhookLogs.slice(0, 100);
      }
    }
  }

  getWebhookLogs(limit: number = 20): WebhookLog[] {
    return this.webhookLogs.slice(0, limit);
  }

  // Snapshots
  createSnapshot(snapshot: PolicySnapshot): PolicySnapshot {
    this.snapshots.set(snapshot.id, snapshot);
    this.logActivity({
      userId: 'system',
      action: 'policy_uploaded',
      details: `Snapshot generated for policy: Grade ${snapshot.grade}, potential savings ${snapshot.monthlySavings}/mo`,
      metadata: { grade: snapshot.grade, savings: snapshot.monthlySavings },
    });
    this.triggerWebhook('snapshot_created', {
      snapshotId: snapshot.id,
      policyId: snapshot.policyId,
      grade: snapshot.grade,
      monthlySavings: snapshot.monthlySavings,
      coverageScore: snapshot.coverageScore,
      priceScore: snapshot.priceScore,
    });
    return snapshot;
  }

  getSnapshot(id: string): PolicySnapshot | undefined {
    return this.snapshots.get(id);
  }

  getSnapshotByPolicy(policyId: string): PolicySnapshot | undefined {
    return Array.from(this.snapshots.values()).find(s => s.policyId === policyId);
  }

  getAllSnapshots(): PolicySnapshot[] {
    return Array.from(this.snapshots.values());
  }

  // Leads
  createLead(lead: Lead): Lead {
    this.leads.set(lead.id, lead);
    this.logActivity({
      userId: lead.userId,
      userName: lead.userName,
      userPhone: lead.userPhone,
      action: 'user_created',
      details: `New lead created: ${lead.userPhone} (${lead.source})`,
      metadata: { status: lead.status, source: lead.source },
    });
    this.triggerWebhook('lead_created', {
      leadId: lead.id,
      userId: lead.userId,
      userName: lead.userName,
      userPhone: lead.userPhone,
      userState: lead.userState,
      userZip: lead.userZip,
      lineOfBusiness: lead.lineOfBusiness,
      source: lead.source,
      potentialSavings: lead.potentialSavings,
    });
    return lead;
  }

  getLead(id: string): Lead | undefined {
    return this.leads.get(id);
  }

  getLeadByUser(userId: string): Lead | undefined {
    return Array.from(this.leads.values()).find(l => l.userId === userId);
  }

  updateLead(id: string, updates: Partial<Lead>, changedBy: 'agent' | 'admin' | 'system' = 'system', changedByUserId?: string): Lead | undefined {
    const lead = this.leads.get(id);
    if (lead) {
      const oldStatus = lead.status;
      const now = new Date().toISOString();
      
      const lifecycleUpdates: Partial<Lead> = {};
      if (updates.status) {
        if (updates.status === 'contacted' && !lead.firstContactAt) {
          lifecycleUpdates.firstContactAt = now;
        }
        if (updates.status === 'quoted' && !lead.quoteSentAt) {
          lifecycleUpdates.quoteSentAt = now;
        }
        if ((updates.status === 'won' || updates.status === 'lost') && !lead.closedAt) {
          lifecycleUpdates.closedAt = now;
        }
      }
      
      const updated = { ...lead, ...updates, ...lifecycleUpdates, updatedAt: now };
      this.leads.set(id, updated);
      
      if (updates.status && updates.status !== oldStatus) {
        const historyEntry: LeadStatusHistoryEntry = {
          id: `lsh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          leadId: id,
          agentId: lead.assignedAgentId,
          oldStatus,
          newStatus: updates.status,
          changedBy,
          changedByUserId,
          changedAt: now,
        };
        this.leadStatusHistory.unshift(historyEntry);
        
        if (!updated.statusHistory) {
          updated.statusHistory = [];
        }
        updated.statusHistory.unshift(historyEntry);
        this.leads.set(id, updated);
        
        this.triggerWebhook('lead_status_changed', {
          leadId: id,
          userId: lead.userId,
          userName: lead.userName,
          userPhone: lead.userPhone,
          userState: lead.userState,
          userZip: lead.userZip,
          agentId: lead.assignedAgentId,
          oldStatus,
          newStatus: updates.status,
          potentialSavings: lead.potentialSavings,
          snapshotGrade: lead.snapshotGrade,
          firstContactAt: updated.firstContactAt,
          quoteSentAt: updated.quoteSentAt,
          closedAt: updated.closedAt,
        });
      }
      return updated;
    }
    return undefined;
  }

  getLeadStatusHistory(leadId: string): LeadStatusHistoryEntry[] {
    return this.leadStatusHistory.filter(h => h.leadId === leadId);
  }

  getAllLeadStatusHistory(limit: number = 100): LeadStatusHistoryEntry[] {
    return this.leadStatusHistory.slice(0, limit);
  }

  getAllLeads(): Lead[] {
    return Array.from(this.leads.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getLeadsByStatus(status: LeadStatus): Lead[] {
    return this.getAllLeads().filter(l => l.status === status);
  }

  getLeadsNeedingFollowUp(): Lead[] {
    const now = new Date();
    return this.getAllLeads().filter(l => {
      if (l.status === 'won' || l.status === 'lost') return false;
      if (l.nextFollowUpAt && new Date(l.nextFollowUpAt) <= now) return true;
      if (!l.lastContactedAt) {
        const hoursSinceCreated = (now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60);
        return hoursSinceCreated > 24;
      }
      const hoursSinceContact = (now.getTime() - new Date(l.lastContactedAt).getTime()) / (1000 * 60 * 60);
      return hoursSinceContact > 48;
    });
  }

  // Stats for admin dashboard
  getStats() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const todayLogs = this.activityLogs.filter(l => new Date(l.createdAt) >= today);
    const weekLogs = this.activityLogs.filter(l => new Date(l.createdAt) >= thisWeek);

    const leads = this.getAllLeads();
    const leadsNeedingFollowUp = this.getLeadsNeedingFollowUp();

    return {
      totalUsers: this.users.size,
      totalPolicies: this.policies.size,
      totalDocuments: this.documents.size,
      totalReminders: this.reminders.size,
      totalVideoEvidence: this.videoEvidence.size,
      totalAccidentReports: this.accidentReports.size,
      totalSnapshots: this.snapshots.size,
      totalLeads: this.leads.size,
      pendingReminders: Array.from(this.reminders.values()).filter(r => r.status === 'pending').length,
      activityToday: todayLogs.length,
      activityThisWeek: weekLogs.length,
      recentActivity: this.activityLogs.slice(0, 10),
      leadsByStatus: {
        new: leads.filter(l => l.status === 'new').length,
        contacted: leads.filter(l => l.status === 'contacted').length,
        interested: leads.filter(l => l.status === 'interested').length,
        quoted: leads.filter(l => l.status === 'quoted').length,
        won: leads.filter(l => l.status === 'won').length,
        lost: leads.filter(l => l.status === 'lost').length,
      },
      leadsNeedingFollowUp: leadsNeedingFollowUp.length,
      potentialRevenue: leads.reduce((sum, l) => sum + (l.potentialSavings || 0), 0),
    };
  }

  // Daily Summary for automation
  getDailySummary() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayLogs = this.activityLogs.filter(l => new Date(l.createdAt) >= today);
    const leads = this.getAllLeads();
    const leadsNeedingFollowUp = this.getLeadsNeedingFollowUp();

    const newUsersToday = todayLogs.filter(l => l.action === 'user_created').length;
    const policiesUploadedToday = todayLogs.filter(l => l.action === 'policy_uploaded').length;
    const videoEvidenceToday = todayLogs.filter(l => l.action === 'video_evidence_added').length;
    const accidentReportsToday = todayLogs.filter(l => l.action === 'accident_report_created').length;

    return {
      date: today.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      metrics: {
        totalLeads: leads.length,
        leadsNeedingFollowUp: leadsNeedingFollowUp.length,
        newUsersToday,
        policiesUploadedToday,
        videoEvidenceToday,
        accidentReportsToday,
        leadsByStatus: {
          new: leads.filter(l => l.status === 'new').length,
          contacted: leads.filter(l => l.status === 'contacted').length,
          interested: leads.filter(l => l.status === 'interested').length,
          quoted: leads.filter(l => l.status === 'quoted').length,
          won: leads.filter(l => l.status === 'won').length,
          lost: leads.filter(l => l.status === 'lost').length,
        },
        potentialRevenue: leads.reduce((sum, l) => sum + (l.potentialSavings || 0), 0),
      },
      followUpList: leadsNeedingFollowUp.slice(0, 10).map(l => ({
        leadId: l.id,
        userName: l.userName,
        userPhone: l.userPhone,
        status: l.status,
        daysSinceCreated: Math.floor((now.getTime() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
        potentialSavings: l.potentialSavings,
      })),
    };
  }

  // Lead Offers
  createLeadOffer(offer: LeadOffer): LeadOffer {
    this.leadOffers.set(offer.id, offer);
    console.log(`[DB] Lead offer created: ${offer.id} for lead ${offer.leadId}`);
    this.triggerWebhook('lead_offer_created', {
      offerId: offer.id,
      leadId: offer.leadId,
      agentId: offer.agentId,
      monthlyPremium: offer.monthlyPremium,
      carrierName: offer.carrierName,
      canBindNow: offer.canBindNow,
    });
    return offer;
  }

  getLeadOffer(id: string): LeadOffer | undefined {
    return this.leadOffers.get(id);
  }

  getLeadOffersByLead(leadId: string): LeadOffer[] {
    return Array.from(this.leadOffers.values())
      .filter(o => o.leadId === leadId)
      .sort((a, b) => a.monthlyPremium - b.monthlyPremium);
  }

  getLeadOffersByAgent(agentId: string): LeadOffer[] {
    return Array.from(this.leadOffers.values())
      .filter(o => o.agentId === agentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateLeadOffer(id: string, updates: Partial<LeadOffer>): LeadOffer | undefined {
    const offer = this.leadOffers.get(id);
    if (offer) {
      const updated = { ...offer, ...updates, updatedAt: new Date().toISOString() };
      this.leadOffers.set(id, updated);
      return updated;
    }
    return undefined;
  }

  // Agents (for license tracking)
  setAgent(agent: Agent): void {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  getAgentsWithExpiringLicenses(daysThreshold: number = 30): Agent[] {
    const now = new Date();
    const threshold = new Date(now);
    threshold.setDate(threshold.getDate() + daysThreshold);
    
    return Array.from(this.agents.values()).filter(agent => {
      if (!agent.licenseExpiry) return false;
      const expiry = new Date(agent.licenseExpiry);
      return expiry <= threshold && expiry >= now && agent.status === 'verified';
    });
  }

  // Check for leads needing follow-up and trigger webhooks
  async checkAndTriggerFollowUpWebhooks() {
    const now = new Date();
    const leads = this.getAllLeads();

    for (const lead of leads) {
      if (lead.status === 'won' || lead.status === 'lost') continue;

      const minutesSinceAssigned = lead.assignedAt 
        ? (now.getTime() - new Date(lead.assignedAt).getTime()) / (1000 * 60)
        : null;
      const hoursSinceCreated = (now.getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60);
      const hoursSinceContact = lead.lastContactedAt 
        ? (now.getTime() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60)
        : null;

      if (lead.status === 'new' && minutesSinceAssigned && minutesSinceAssigned >= 15 && minutesSinceAssigned < 16) {
        await this.triggerWebhook('lead_needs_followup_15min', {
          leadId: lead.id,
          userId: lead.userId,
          userName: lead.userName,
          userPhone: lead.userPhone,
          agentId: lead.assignedAgentId,
          status: lead.status,
          minutesSinceAssigned: Math.round(minutesSinceAssigned),
          potentialSavings: lead.potentialSavings,
        });
      }

      if (lead.status === 'new' && minutesSinceAssigned && minutesSinceAssigned >= 120 && minutesSinceAssigned < 121) {
        this.updateLead(lead.id, { status: 'unresponded' }, 'system');
        await this.triggerWebhook('lead_escalate_2h', {
          leadId: lead.id,
          userId: lead.userId,
          userName: lead.userName,
          userPhone: lead.userPhone,
          agentId: lead.assignedAgentId,
          status: 'unresponded',
          hoursSinceAssigned: 2,
          potentialSavings: lead.potentialSavings,
          requiresReassignment: true,
        });
      }

      if (!lead.lastContactedAt && hoursSinceCreated >= 24 && hoursSinceCreated < 25) {
        await this.triggerWebhook('lead_needs_followup_24h', {
          leadId: lead.id,
          userId: lead.userId,
          userName: lead.userName,
          userPhone: lead.userPhone,
          agentId: lead.assignedAgentId,
          status: lead.status,
          hoursSinceCreated: Math.round(hoursSinceCreated),
          potentialSavings: lead.potentialSavings,
        });
      }

      if (hoursSinceContact && hoursSinceContact >= 48 && hoursSinceContact < 49) {
        await this.triggerWebhook('lead_stale_48h', {
          leadId: lead.id,
          userId: lead.userId,
          userName: lead.userName,
          userPhone: lead.userPhone,
          agentId: lead.assignedAgentId,
          status: lead.status,
          hoursSinceLastContact: Math.round(hoursSinceContact),
          potentialSavings: lead.potentialSavings,
        });
      }
    }
  }

  async checkAndTriggerLicenseExpiryWebhooks() {
    const expiringAgents = this.getAgentsWithExpiringLicenses(60);
    const now = new Date();
    
    for (const agent of expiringAgents) {
      if (!agent.licenseExpiry) continue;
      const expiry = new Date(agent.licenseExpiry);
      const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if ([60, 30, 7, 1, 0].includes(daysUntilExpiry)) {
        await this.triggerWebhook('agent_license_expiring', {
          agentId: agent.id,
          fullName: agent.fullName,
          email: agent.email,
          licenseNumber: agent.licenseNumber,
          licenseExpiry: agent.licenseExpiry,
          daysUntilExpiry,
        });
      }
    }
  }

  // Trigger daily summary webhook
  async triggerDailySummaryWebhook() {
    const summary = this.getDailySummary();
    await this.triggerWebhook('daily_summary', summary);
    return summary;
  }
}

export const db = new Database();
