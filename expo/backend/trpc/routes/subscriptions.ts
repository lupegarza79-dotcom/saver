import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../create-context';
import { AgentAnalytics, SUBSCRIPTION_PLANS } from '@/types';
import * as subscriptionStore from '../store/subscriptionStore';

const analytics: Map<string, AgentAnalytics> = new Map();

const subscriptionTierSchema = z.enum(['free', 'starter', 'pro', 'agency']);

export const subscriptionsRouter = createTRPCRouter({
  getPlans: publicProcedure.query(() => {
    console.log('[SUBSCRIPTIONS] Fetching all plans');
    return SUBSCRIPTION_PLANS;
  }),

  getByAgentId: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(({ input }) => {
      const subscription = subscriptionStore.ensurePending(input.agentId);
      const plan = SUBSCRIPTION_PLANS.find(p => p.tier === subscription.tier);
      return { subscription, plan };
    }),

  upgrade: publicProcedure
    .input(z.object({
      agentId: z.string(),
      tier: subscriptionTierSchema,
      billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
    }))
    .mutation(async ({ input }) => {
      const subscription = subscriptionStore.upgradeTier(input.agentId, input.tier);
      const plan = SUBSCRIPTION_PLANS.find(p => p.tier === subscription.tier);
      return { subscription, plan };
    }),

  cancel: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(({ input }) => {
      return subscriptionStore.cancel(input.agentId);
    }),

  checkLeadLimit: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .query(({ input }) => {
      const subscription = subscriptionStore.getByAgentId(input.agentId);
      
      if (!subscription) {
        return { canReceiveLead: true, leadsUsed: 0, leadsLimit: 3, tier: 'free' as const };
      }

      const plan = SUBSCRIPTION_PLANS.find(p => p.tier === subscription.tier);
      if (!plan) {
        return { canReceiveLead: false, leadsUsed: 0, leadsLimit: 0, tier: subscription.tier };
      }

      const maxLeads = plan.features.maxLeadsPerMonth;
      const canReceive = maxLeads === 'unlimited' || subscription.leadsUsedThisMonth < maxLeads;

      return {
        canReceiveLead: canReceive,
        leadsUsed: subscription.leadsUsedThisMonth,
        leadsLimit: maxLeads,
        tier: subscription.tier,
      };
    }),

  incrementLeadCount: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(({ input }) => {
      return subscriptionStore.incrementLeadCount(input.agentId);
    }),

  getAnalytics: publicProcedure
    .input(z.object({
      agentId: z.string(),
      period: z.enum(['day', 'week', 'month', 'year']).default('month'),
    }))
    .query(({ input }) => {
      const key = `${input.agentId}_${input.period}`;
      let agentAnalytics = analytics.get(key);

      if (!agentAnalytics) {
        const leadsReceived = Math.floor(Math.random() * 20) + 5;
        const leadsContacted = Math.floor(Math.random() * 15) + 3;
        const leadsWon = Math.floor(Math.random() * 5) + 1;
        agentAnalytics = {
          agentId: input.agentId,
          period: input.period,
          leadsReceived,
          leadsContacted,
          leadsQuoted: Math.floor(Math.random() * 10) + 2,
          leadsWon,
          leadsLost: Math.floor(Math.random() * 3),
          conversionRate: Math.random() * 0.3 + 0.1,
          avgResponseTimeMinutes: Math.floor(Math.random() * 120) + 15,
          avgFirstResponseMinutes: Math.floor(Math.random() * 60) + 5,
          contactRate: leadsReceived > 0 ? leadsContacted / leadsReceived : 0,
          winRate: leadsContacted > 0 ? leadsWon / leadsContacted : 0,
          totalPremiumWritten: Math.floor(Math.random() * 50000) + 5000,
          rank: Math.floor(Math.random() * 100) + 1,
          updatedAt: new Date().toISOString(),
        };
        analytics.set(key, agentAnalytics);
      }

      return agentAnalytics;
    }),

  getLeaderboard: publicProcedure
    .input(z.object({
      state: z.string().optional(),
      lineOfBusiness: z.string().optional(),
      limit: z.number().default(10),
    }))
    .query(({ input }) => {
      const allAnalytics = Array.from(analytics.values())
        .filter(a => a.period === 'month')
        .sort((a, b) => b.leadsWon - a.leadsWon)
        .slice(0, input.limit);

      return allAnalytics;
    }),

  startTrialOnFirstLead: publicProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(({ input }) => {
      const result = subscriptionStore.startTrial(input.agentId);
      return result;
    }),
});
