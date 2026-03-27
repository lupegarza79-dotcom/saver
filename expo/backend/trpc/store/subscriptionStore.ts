import { AgentSubscription, SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types';

const subscriptions: Map<string, AgentSubscription> = new Map();

function getNextMonthDate(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString();
}

function getEndOfMonth(): string {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date.toISOString();
}

export function getByAgentId(agentId: string): AgentSubscription | null {
  return Array.from(subscriptions.values()).find(s => s.agentId === agentId) || null;
}

export function getById(id: string): AgentSubscription | null {
  return subscriptions.get(id) || null;
}

export function getAll(): AgentSubscription[] {
  return Array.from(subscriptions.values());
}

export function set(subscription: AgentSubscription): void {
  subscriptions.set(subscription.id, subscription);
}

export function ensurePending(agentId: string): AgentSubscription {
  let subscription = getByAgentId(agentId);
  
  if (!subscription) {
    const now = new Date().toISOString();
    subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      tier: 'free',
      status: 'trial_pending_first_lead',
      trialStatus: 'not_started',
      currentPeriodStart: now,
      currentPeriodEnd: getNextMonthDate(),
      cancelAtPeriodEnd: false,
      leadsUsedThisMonth: 0,
      leadsResetAt: getEndOfMonth(),
      createdAt: now,
      updatedAt: now,
    };
    subscriptions.set(subscription.id, subscription);
    console.log(`[SUBSCRIPTION_STORE] Created pending subscription for agent ${agentId}`);
  }
  
  return subscription;
}

export function startTrial(agentId: string): { started: boolean; subscription: AgentSubscription | null } {
  const subscription = getByAgentId(agentId);
  
  if (!subscription) {
    console.log(`[SUBSCRIPTION_STORE] No subscription found for agent ${agentId}`);
    return { started: false, subscription: null };
  }
  
  if (subscription.trialStatus !== 'not_started') {
    console.log(`[SUBSCRIPTION_STORE] Agent ${agentId} trial already started or used (status: ${subscription.trialStatus})`);
    return { started: false, subscription };
  }
  
  const now = new Date();
  const trialEnd = new Date(now);
  trialEnd.setDate(trialEnd.getDate() + 30);
  
  const updated: AgentSubscription = {
    ...subscription,
    trialStatus: 'active',
    status: 'trial',
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEnd.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  subscriptions.set(subscription.id, updated);
  console.log(`[SUBSCRIPTION_STORE] Trial started for agent ${agentId}, ends ${trialEnd.toISOString()}`);
  
  return { started: true, subscription: updated };
}

export function upgradeTier(agentId: string, tier: SubscriptionTier): AgentSubscription {
  const now = new Date().toISOString();
  let subscription = getByAgentId(agentId);
  
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === tier);
  if (!plan) throw new Error('Invalid subscription tier');
  
  if (subscription) {
    subscription = {
      ...subscription,
      tier,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: getNextMonthDate(),
      updatedAt: now,
    };
  } else {
    subscription = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      tier,
      status: 'active',
      trialStatus: 'used',
      currentPeriodStart: now,
      currentPeriodEnd: getNextMonthDate(),
      cancelAtPeriodEnd: false,
      leadsUsedThisMonth: 0,
      leadsResetAt: getEndOfMonth(),
      createdAt: now,
      updatedAt: now,
    };
  }
  
  subscriptions.set(subscription.id, subscription);
  console.log(`[SUBSCRIPTION_STORE] Agent ${agentId} upgraded to ${tier}`);
  
  return subscription;
}

export function cancel(agentId: string): AgentSubscription {
  const subscription = getByAgentId(agentId);
  if (!subscription) throw new Error('No subscription found');
  
  const updated: AgentSubscription = {
    ...subscription,
    cancelAtPeriodEnd: true,
    status: 'canceled',
    updatedAt: new Date().toISOString(),
  };
  
  subscriptions.set(subscription.id, updated);
  console.log(`[SUBSCRIPTION_STORE] Agent ${agentId} subscription canceled`);
  
  return updated;
}

export function incrementLeadCount(agentId: string): AgentSubscription | null {
  const subscription = getByAgentId(agentId);
  if (!subscription) return null;
  
  const updated: AgentSubscription = {
    ...subscription,
    leadsUsedThisMonth: subscription.leadsUsedThisMonth + 1,
    updatedAt: new Date().toISOString(),
  };
  
  subscriptions.set(subscription.id, updated);
  console.log(`[SUBSCRIPTION_STORE] Agent ${agentId} lead count: ${updated.leadsUsedThisMonth}`);
  
  return updated;
}

export function canReceiveLead(agentId: string): boolean {
  const subscription = getByAgentId(agentId);
  if (!subscription) return true;
  
  if (subscription.status === 'canceled') return false;
  
  const plan = SUBSCRIPTION_PLANS.find(p => p.tier === subscription.tier);
  if (!plan) return false;
  
  const maxLeads = plan.features.maxLeadsPerMonth;
  if (maxLeads === 'unlimited') return true;
  
  return subscription.leadsUsedThisMonth < maxLeads;
}

export function getSubscriptionTierPriority(tier: SubscriptionTier): number {
  const priorities: Record<SubscriptionTier, number> = {
    'agency': 4,
    'pro': 3,
    'starter': 2,
    'free': 1,
  };
  return priorities[tier] || 0;
}
