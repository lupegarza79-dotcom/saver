import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';
import { Agent, AgentLeadAssignment, LeadOffer } from '@/types';
import { db } from '@/backend/db';
import * as subscriptionStore from '../store/subscriptionStore';
import { getSupabase } from '@/backend/supabase/client';

const agents: Map<string, Agent> = new Map();
const agentLeadAssignments: Map<string, AgentLeadAssignment> = new Map();
const leadDataCache: Map<string, { userName?: string; userPhone: string; userState?: string; userZip?: string; lineOfBusiness?: string; potentialSavings?: number; snapshotGrade?: string }> = new Map();

const lineOfBusinessSchema = z.enum(['auto', 'home', 'commercial', 'life', 'health', 'other']);
const agentStatusSchema = z.enum(['pending', 'verified', 'rejected', 'suspended_license', 'disabled']);
const agentLeadStatusSchema = z.enum(['invited', 'accepted', 'declined', 'contacted', 'quoted', 'won', 'lost']);

async function triggerWebhook(event: string, data: unknown) {
  const webhookUrls: Record<string, string | undefined> = {
    'agent.signup_pending': process.env.WEBHOOK_AGENT_SIGNUP,
    'agent.verified': process.env.WEBHOOK_AGENT_VERIFIED,
    'agent.trial_started': process.env.WEBHOOK_AGENT_TRIAL_STARTED,
    'lead.assigned_to_agent': process.env.WEBHOOK_LEAD_ASSIGNED,
    'agent_lead.status_changed': process.env.WEBHOOK_AGENT_LEAD_STATUS,
  };

  const url = webhookUrls[event];
  if (!url) return;

  try {
    console.log(`[WEBHOOK] Triggering ${event} to ${url}`);
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, timestamp: new Date().toISOString(), data }),
    });
    console.log(`[WEBHOOK] Successfully sent ${event}`);
  } catch (error) {
    console.error(`[WEBHOOK] Failed to send ${event}:`, error);
  }
}

export const agentsRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      userId: z.string(),
      fullName: z.string().min(2),
      agencyName: z.string().optional(),
      phone: z.string(),
      email: z.string().email(),
      whatsappNumber: z.string().optional(),
      stateLicenses: z.array(z.string()).min(1),
      licenseNumber: z.string(),
      licenseState: z.string().optional(),
      licenseExpiry: z.string().optional(),
      licenseScreenshotUrl: z.string().optional(),
      linesOfBusiness: z.array(lineOfBusinessSchema).min(1),
      languages: z.array(z.enum(['en', 'es'])).min(1),
      serviceAreaZipPrefix: z.string().optional(),
      zipCoverage: z.array(z.string()).optional(),
      acceptsUrgentLeads: z.boolean().optional(),
      bio: z.string().optional(),
      avatarUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const now = new Date().toISOString();
      const agent: Agent = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...input,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      };
      agents.set(agent.id, agent);
      db.setAgent(agent);
      console.log(`[AGENTS] New agent created: ${agent.fullName} (${agent.id})`);
      
      await triggerWebhook('agent.signup_pending', {
        agentId: agent.id,
        fullName: agent.fullName,
        email: agent.email,
        phone: agent.phone,
        stateLicenses: agent.stateLicenses,
        licenseExpiry: agent.licenseExpiry,
      });
      
      return agent;
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return agents.get(input.id);
    }),

  getByUserId: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      return Array.from(agents.values()).find(a => a.userId === input.userId);
    }),

  getAll: publicProcedure
    .input(z.object({
      status: agentStatusSchema.optional(),
      state: z.string().optional(),
    }).optional())
    .query(({ input }) => {
      let result = Array.from(agents.values());
      if (input?.status) {
        result = result.filter(a => a.status === input.status);
      }
      if (input?.state) {
        result = result.filter(a => a.stateLicenses.includes(input.state!));
      }
      return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      fullName: z.string().optional(),
      agencyName: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email().optional(),
      whatsappNumber: z.string().optional(),
      stateLicenses: z.array(z.string()).optional(),
      licenseNumber: z.string().optional(),
      licenseState: z.string().optional(),
      licenseExpiry: z.string().optional(),
      licenseScreenshotUrl: z.string().optional(),
      linesOfBusiness: z.array(lineOfBusinessSchema).optional(),
      languages: z.array(z.enum(['en', 'es'])).optional(),
      serviceAreaZipPrefix: z.string().optional(),
      zipCoverage: z.array(z.string()).optional(),
      acceptsUrgentLeads: z.boolean().optional(),
      bio: z.string().optional(),
      avatarUrl: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const agent = agents.get(input.id);
      if (!agent) throw new Error('Agent not found');
      
      const { id, ...updates } = input;
      const oldLicenseExpiry = agent.licenseExpiry;
      const updated: Agent = {
        ...agent,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      agents.set(id, updated);
      db.setAgent(updated);
      console.log(`[AGENTS] Agent updated: ${updated.fullName} (${id})`);
      
      if (updates.licenseExpiry && updates.licenseExpiry !== oldLicenseExpiry) {
        await triggerWebhook('agent.license_updated', {
          agentId: updated.id,
          fullName: updated.fullName,
          email: updated.email,
          oldLicenseExpiry,
          newLicenseExpiry: updates.licenseExpiry,
        });
      }
      
      return updated;
    }),

  verify: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const agent = agents.get(input.id);
      if (!agent) throw new Error('Agent not found');
      
      const updated: Agent = {
        ...agent,
        status: 'verified',
        updatedAt: new Date().toISOString(),
      };
      agents.set(input.id, updated);
      db.setAgent(updated);
      console.log(`[AGENTS] Agent verified: ${updated.fullName} (${input.id})`);
      
      await triggerWebhook('agent.verified', {
        agentId: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        licenseExpiry: updated.licenseExpiry,
      });
      
      return updated;
    }),

  reject: publicProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const agent = agents.get(input.id);
      if (!agent) throw new Error('Agent not found');
      
      const updated: Agent = {
        ...agent,
        status: 'rejected',
        rejectionReason: input.reason,
        updatedAt: new Date().toISOString(),
      };
      agents.set(input.id, updated);
      console.log(`[AGENTS] Agent rejected: ${updated.fullName} (${input.id})`);
      return updated;
    }),

  matchForLead: publicProcedure
    .input(z.object({
      leadState: z.string(),
      zipPrefix: z.string().optional(),
      lineOfBusiness: lineOfBusinessSchema.optional(),
      language: z.enum(['en', 'es']).optional(),
      limit: z.number().default(3),
    }))
    .query(({ input }) => {
      const verifiedAgents = Array.from(agents.values()).filter(a => a.status === 'verified');
      
      let matched = verifiedAgents.filter(a => a.stateLicenses.includes(input.leadState));
      
      matched = matched.filter(a => subscriptionStore.canReceiveLead(a.id));
      
      if (input.zipPrefix) {
        const zipMatched = matched.filter(a => 
          a.serviceAreaZipPrefix && input.zipPrefix!.startsWith(a.serviceAreaZipPrefix)
        );
        if (zipMatched.length > 0) {
          matched = zipMatched;
        }
      }
      
      if (input.lineOfBusiness) {
        const lobMatched = matched.filter(a => a.linesOfBusiness.includes(input.lineOfBusiness!));
        if (lobMatched.length > 0) {
          matched = lobMatched;
        }
      }
      
      if (input.language) {
        const langMatched = matched.filter(a => a.languages.includes(input.language!));
        if (langMatched.length > 0) {
          matched = langMatched;
        }
      }
      
      const sortedByTier = matched.sort((a, b) => {
        const subA = subscriptionStore.getByAgentId(a.id);
        const subB = subscriptionStore.getByAgentId(b.id);
        const tierA = subA?.tier || 'free';
        const tierB = subB?.tier || 'free';
        const priorityDiff = subscriptionStore.getSubscriptionTierPriority(tierB) - subscriptionStore.getSubscriptionTierPriority(tierA);
        if (priorityDiff !== 0) return priorityDiff;
        return Math.random() - 0.5;
      });
      
      console.log(`[AGENTS] Matched ${sortedByTier.length} agents for lead, prioritized by subscription tier`);
      return sortedByTier.slice(0, input.limit);
    }),

  getStats: publicProcedure.query(() => {
    const allAgents = Array.from(agents.values());
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringLicenses = allAgents.filter(a => {
      if (!a.licenseExpiry || a.status !== 'verified') return false;
      const expiry = new Date(a.licenseExpiry);
      return expiry <= thirtyDaysFromNow && expiry >= now;
    });
    
    return {
      total: allAgents.length,
      pending: allAgents.filter(a => a.status === 'pending').length,
      verified: allAgents.filter(a => a.status === 'verified').length,
      rejected: allAgents.filter(a => a.status === 'rejected').length,
      suspendedLicense: allAgents.filter(a => a.status === 'suspended_license').length,
      disabled: allAgents.filter(a => a.status === 'disabled').length,
      expiringLicensesCount: expiringLicenses.length,
    };
  }),

  getWithExpiringLicenses: publicProcedure
    .input(z.object({ daysThreshold: z.number().default(30) }))
    .query(({ input }) => {
      const now = new Date();
      const threshold = new Date(now);
      threshold.setDate(threshold.getDate() + input.daysThreshold);
      
      return Array.from(agents.values())
        .filter(agent => {
          if (!agent.licenseExpiry || agent.status !== 'verified') return false;
          const expiry = new Date(agent.licenseExpiry);
          return expiry <= threshold && expiry >= now;
        })
        .map(agent => {
          const expiry = new Date(agent.licenseExpiry!);
          const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...agent, daysUntilExpiry };
        })
        .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    }),

  suspendForExpiredLicense: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const agent = agents.get(input.id);
      if (!agent) throw new Error('Agent not found');
      
      const updated: Agent = {
        ...agent,
        status: 'suspended_license',
        updatedAt: new Date().toISOString(),
      };
      agents.set(input.id, updated);
      db.setAgent(updated);
      console.log(`[AGENTS] Agent suspended for expired license: ${updated.fullName} (${input.id})`);
      
      return updated;
    }),
});

export const agentLeadsRouter = createTRPCRouter({
  assign: publicProcedure
    .input(z.object({
      leadId: z.string(),
      agentIds: z.array(z.string()).min(1).max(3),
      leadData: z.object({
        userName: z.string().optional(),
        userPhone: z.string(),
        userState: z.string().optional(),
        userZip: z.string().optional(),
        lineOfBusiness: z.string().optional(),
        potentialSavings: z.number().optional(),
        snapshotGrade: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const now = new Date().toISOString();
      const assignments: AgentLeadAssignment[] = [];
      
      if (input.leadData) {
        leadDataCache.set(input.leadId, {
          userName: input.leadData.userName,
          userPhone: input.leadData.userPhone,
          userState: input.leadData.userState,
          userZip: input.leadData.userZip,
          lineOfBusiness: input.leadData.lineOfBusiness,
          potentialSavings: input.leadData.potentialSavings,
          snapshotGrade: input.leadData.snapshotGrade,
        });
      }
      
      for (const agentId of input.agentIds) {
        const agent = agents.get(agentId);
        if (!agent || agent.status !== 'verified') continue;
        
        subscriptionStore.ensurePending(agentId);
        const trialResult = subscriptionStore.startTrial(agentId);
        
        if (trialResult.started && trialResult.subscription) {
          await triggerWebhook('agent.trial_started', {
            agentId,
            agentName: agent.fullName,
            agentEmail: agent.email,
            trialStartedAt: trialResult.subscription.trialStartedAt,
            trialEndsAt: trialResult.subscription.trialEndsAt,
          });
        }
        
        const assignment: AgentLeadAssignment = {
          id: `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          leadId: input.leadId,
          agentId,
          status: 'invited',
          createdAt: now,
          updatedAt: now,
        };
        agentLeadAssignments.set(assignment.id, assignment);
        assignments.push(assignment);
        console.log(`[AGENT_LEADS] Lead ${input.leadId} assigned to agent ${agentId}`);
      }
      
      await triggerWebhook('lead.assigned_to_agent', {
        leadId: input.leadId,
        agentIds: input.agentIds,
        ...input.leadData,
      });
      
      return assignments;
    }),

  getByLead: publicProcedure
    .input(z.object({ leadId: z.string() }))
    .query(({ input }) => {
      const assignments = Array.from(agentLeadAssignments.values())
        .filter(a => a.leadId === input.leadId);
      
      return assignments.map(a => ({
        ...a,
        agent: agents.get(a.agentId),
      }));
    }),

  getByAgent: publicProcedure
    .input(z.object({
      agentId: z.string(),
      status: agentLeadStatusSchema.optional(),
    }))
    .query(({ input }) => {
      let result = Array.from(agentLeadAssignments.values())
        .filter(a => a.agentId === input.agentId);
      
      if (input.status) {
        result = result.filter(a => a.status === input.status);
      }
      
      const sortedResult = result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return sortedResult.map(assignment => {
        const leadData = leadDataCache.get(assignment.leadId);
        const dbLead = db.getLead(assignment.leadId);
        return {
          ...assignment,
          leadData: leadData || (dbLead ? {
            userName: dbLead.userName,
            userPhone: dbLead.userPhone,
            userState: dbLead.userState,
            userZip: dbLead.userZip,
            lineOfBusiness: dbLead.lineOfBusiness,
            potentialSavings: dbLead.potentialSavings,
            snapshotGrade: dbLead.snapshotGrade,
          } : undefined),
        };
      });
    }),

  updateStatus: publicProcedure
    .input(z.object({
      id: z.string(),
      status: agentLeadStatusSchema,
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const assignment = agentLeadAssignments.get(input.id);
      if (!assignment) throw new Error('Assignment not found');
      
      const now = new Date().toISOString();
      const updated: AgentLeadAssignment = {
        ...assignment,
        status: input.status,
        notes: input.notes ?? assignment.notes,
        updatedAt: now,
        contactedAt: input.status === 'contacted' ? now : assignment.contactedAt,
        quotedAt: input.status === 'quoted' ? now : assignment.quotedAt,
        closedAt: ['won', 'lost'].includes(input.status) ? now : assignment.closedAt,
      };
      agentLeadAssignments.set(input.id, updated);
      console.log(`[AGENT_LEADS] Assignment ${input.id} status changed to ${input.status}`);
      
      await triggerWebhook('agent_lead.status_changed', {
        assignmentId: updated.id,
        leadId: updated.leadId,
        agentId: updated.agentId,
        newStatus: updated.status,
      });
      
      return updated;
    }),

  getStats: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(({ input }) => {
      const assignments = Array.from(agentLeadAssignments.values())
        .filter(a => a.agentId === input.agentId);
      
      const contacted = assignments.filter(a => a.contactedAt);
      const totalResponseTime = contacted.reduce((sum, a) => {
        if (a.contactedAt) {
          const responseTime = new Date(a.contactedAt).getTime() - new Date(a.createdAt).getTime();
          return sum + responseTime;
        }
        return sum;
      }, 0);
      const avgFirstResponseMinutes = contacted.length > 0 
        ? Math.round(totalResponseTime / contacted.length / (1000 * 60)) 
        : 0;
      
      const total = assignments.length;
      const won = assignments.filter(a => a.status === 'won').length;
      const contactedCount = contacted.length;
      
      return {
        total,
        invited: assignments.filter(a => a.status === 'invited').length,
        accepted: assignments.filter(a => a.status === 'accepted').length,
        contacted: contactedCount,
        quoted: assignments.filter(a => a.status === 'quoted').length,
        won,
        lost: assignments.filter(a => a.status === 'lost').length,
        avgFirstResponseMinutes,
        contactRate: total > 0 ? contactedCount / total : 0,
        winRate: contactedCount > 0 ? won / contactedCount : 0,
      };
    }),
});

export const leadOffersRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      leadId: z.string(),
      agentId: z.string(),
      monthlyPremium: z.number(),
      carrierName: z.string(),
      coverageSummary: z.string().optional(),
      canBindNow: z.boolean(),
      expiresAt: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const now = new Date().toISOString();
      const offer: LeadOffer = {
        id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...input,
        createdAt: now,
        updatedAt: now,
      };
      db.createLeadOffer(offer);
      console.log(`[OFFERS] Created offer ${offer.id} for lead ${input.leadId}`);
      return offer;
    }),

  getByLead: publicProcedure
    .input(z.object({ leadId: z.string() }))
    .query(({ input }) => {
      return db.getLeadOffersByLead(input.leadId);
    }),

  getByAgent: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(({ input }) => {
      return db.getLeadOffersByAgent(input.agentId);
    }),

  update: publicProcedure
    .input(z.object({
      id: z.string(),
      monthlyPremium: z.number().optional(),
      coverageSummary: z.string().optional(),
      canBindNow: z.boolean().optional(),
      expiresAt: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      const offer = db.updateLeadOffer(id, updates);
      if (!offer) throw new Error('Offer not found');
      return offer;
    }),

  chooseOffer: publicProcedure
    .input(z.object({ leadId: z.string(), offerId: z.string() }))
    .mutation(({ input }) => {
      const lead = db.getLead(input.leadId);
      if (!lead) throw new Error('Lead not found');
      
      const offer = db.getLeadOffer(input.offerId);
      if (!offer) throw new Error('Offer not found');
      
      db.updateLead(input.leadId, { chosenOfferId: input.offerId }, 'system');
      console.log(`[OFFERS] Lead ${input.leadId} chose offer ${input.offerId}`);
      
      return { lead: db.getLead(input.leadId), offer };
    }),
});

export const agentApplicationsRouter = createTRPCRouter({
  submit: publicProcedure
    .input(z.object({
      fullName: z.string().min(2),
      phone: z.string().min(10),
      email: z.string().email(),
      licensed: z.boolean(),
      states: z.string().min(1),
      yearsOfExperience: z.string().min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const supabase = getSupabase();
      const now = new Date().toISOString();
      const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('agent_applications')
        .insert({
          id,
          full_name: input.fullName,
          phone: input.phone,
          email: input.email,
          licensed: input.licensed,
          states: input.states,
          years_of_experience: input.yearsOfExperience,
          notes: input.notes || null,
          created_at: now,
        });
      
      if (error) {
        console.error('[AGENT_APPLICATIONS] Error saving application:', error);
        throw new Error('Failed to submit application');
      }
      
      console.log(`[AGENT_APPLICATIONS] New application submitted: ${input.fullName} (${id})`);
      
      return { id, success: true };
    }),
});
