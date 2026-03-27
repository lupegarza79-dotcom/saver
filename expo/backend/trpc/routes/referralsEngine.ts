import * as z from "zod";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../create-context";
import { getSupabase, isSupabaseConfigured } from "@/backend/supabase/client";

export const referralsEngineRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      referrerPhone: z.string().optional(),
      referrerLeadId: z.string().optional(),
      referredName: z.string().min(1),
      referredPhone: z.string().min(10),
      source: z.enum(['share_link', 'direct_form', 'whatsapp', 'post_success']).default('direct_form'),
      language: z.enum(['en', 'es']).default('en'),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await getSupabase()
        .from('referrals')
        .insert({
          id,
          referrer_phone: input.referrerPhone ?? null,
          referrer_lead_id: input.referrerLeadId ?? null,
          referred_name: input.referredName,
          referred_phone: input.referredPhone.replace(/\D/g, ''),
          source: input.source,
          status: 'invited',
          language: input.language,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) {
        console.error('[REFERRALS] create error:', error);
        throw new Error(error.message);
      }

      if (input.referrerLeadId) {
        await logReferralEvent(input.referrerLeadId, 'referral.created', { referralId: id, referredName: input.referredName });
      }

      console.log(`[REFERRALS] Created referral ${id}: ${input.referredName}`);
      return { id: data.id, ok: true };
    }),

  listByReferrer: publicProcedure
    .input(z.object({
      phone: z.string(),
      limit: z.number().int().min(1).max(100).default(20),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { referrals: [], total: 0 };

      const { data, error } = await getSupabase()
        .from('referrals')
        .select('*')
        .eq('referrer_phone', input.phone.replace(/\D/g, ''))
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        console.error('[REFERRALS] listByReferrer error:', error);
        return { referrals: [], total: 0 };
      }

      return { referrals: data ?? [], total: data?.length ?? 0 };
    }),

  updateStatus: adminProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['invited', 'started', 'quoted', 'closed', 'expired']),
      referredLeadId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const update: Record<string, unknown> = { status: input.status };
      if (input.referredLeadId) update.referred_lead_id = input.referredLeadId;
      if (input.status === 'closed') update.reward_eligible = true;

      const { error } = await getSupabase()
        .from('referrals')
        .update(update)
        .eq('id', input.id);

      if (error) throw new Error(error.message);
      return { ok: true };
    }),

  getStats: adminProcedure
    .input(z.object({}))
    .query(async () => {
      if (!isSupabaseConfigured()) return {
        totalInvites: 0, started: 0, quoted: 0, closed: 0, expired: 0,
        conversionRate: 0,
      };

      const { data, error } = await getSupabase()
        .from('referrals')
        .select('status');

      if (error) return { totalInvites: 0, started: 0, quoted: 0, closed: 0, expired: 0, conversionRate: 0 };

      const rows = data ?? [];
      const total = rows.length;
      const closed = rows.filter(r => r.status === 'closed').length;

      return {
        totalInvites: total,
        started: rows.filter(r => r.status === 'started').length,
        quoted: rows.filter(r => r.status === 'quoted').length,
        closed,
        expired: rows.filter(r => r.status === 'expired').length,
        conversionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      };
    }),
});

export const evidenceRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({
      leadId: z.string().optional(),
      policyId: z.string().optional(),
      phone: z.string().optional(),
      packageType: z.enum(['identity', 'vehicle_inspection', 'collision', 'other_than_collision', 'uninsured_motorist', 'general']),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `evp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await getSupabase()
        .from('evidence_packages')
        .insert({
          id,
          lead_id: input.leadId ?? null,
          policy_id: input.policyId ?? null,
          phone: input.phone ?? null,
          package_type: input.packageType,
          status: 'pending',
          checklist: {},
          items: [],
          consent_given: false,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw new Error(error.message);

      console.log(`[EVIDENCE] Created package ${id}: ${input.packageType}`);
      return { id: data.id, ok: true };
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return null;

      const { data, error } = await getSupabase()
        .from('evidence_packages')
        .select('*')
        .eq('id', input.id)
        .single();

      if (error) return null;
      return data;
    }),

  updateChecklist: publicProcedure
    .input(z.object({
      id: z.string(),
      checklist: z.record(z.string(), z.boolean()),
      items: z.array(z.object({
        type: z.enum(['photo', 'video', 'document', 'selfie', 'signature']),
        label: z.string(),
        url: z.string().optional(),
        capturedAt: z.string().optional(),
        verified: z.boolean().default(false),
      })).optional(),
      geolocation: z.object({
        lat: z.number(),
        lng: z.number(),
        accuracy: z.number().optional(),
      }).optional(),
      consentGiven: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const update: Record<string, unknown> = {
        checklist: input.checklist,
      };
      if (input.items) update.items = input.items;
      if (input.geolocation) update.geolocation = input.geolocation;
      if (input.consentGiven !== undefined) {
        update.consent_given = input.consentGiven;
        if (input.consentGiven) update.consent_given_at = new Date().toISOString();
      }

      const allChecked = Object.values(input.checklist).every(v => v);
      if (allChecked && input.items && input.items.length > 0) {
        update.status = 'complete';
        update.captured_at = new Date().toISOString();
      } else if (input.items && input.items.length > 0) {
        update.status = 'in_progress';
      }

      const { error } = await getSupabase()
        .from('evidence_packages')
        .update(update)
        .eq('id', input.id);

      if (error) throw new Error(error.message);
      return { ok: true };
    }),

  listByLead: publicProcedure
    .input(z.object({
      leadId: z.string(),
      limit: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { packages: [], total: 0 };

      const { data, error } = await getSupabase()
        .from('evidence_packages')
        .select('*')
        .eq('lead_id', input.leadId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) return { packages: [], total: 0 };
      return { packages: data ?? [], total: data?.length ?? 0 };
    }),
});

export const funnelRouter = createTRPCRouter({
  getMetrics: publicProcedure
    .input(z.object({}))
    .query(async () => {
      if (!isSupabaseConfigured()) return getEmptyMetrics();

      try {
        const [leads, qrs, policies, referrals, payments, renewals] = await Promise.all([
          getSupabase().from('leads').select('status, source, created_at').then(r => r.data ?? []),
          getSupabase().from('quote_requests').select('status, savings_found, no_close_reason').then(r => r.data ?? []),
          getSupabase().from('policies').select('bound_via_saver, is_active').then(r => r.data ?? []),
          getSupabase().from('referrals').select('status').then(r => r.data ?? []),
          getSupabase().from('payment_reminders').select('status').then(r => r.data ?? []),
          getSupabase().from('renewal_reminders').select('status').then(r => r.data ?? []),
        ]);

        return {
          funnel: {
            totalLeads: leads.length,
            waitingDocs: leads.filter(l => l.status === 'WAITING_DOCS').length,
            needsInfo: leads.filter(l => l.status === 'NEEDS_INFO').length,
            readyToQuote: leads.filter(l => l.status === 'READY_TO_QUOTE').length,
            quotingInProgress: qrs.filter(q => q.status === 'IN_PROGRESS').length,
            quoted: qrs.filter(q => q.status === 'COMPLETED').length,
            savingsFound: qrs.filter(q => q.savings_found === true).length,
            boundClosed: policies.filter(p => p.bound_via_saver === true).length,
            noClose: qrs.filter(q => q.no_close_reason != null).length,
          },
          referrals: {
            totalInvites: referrals.length,
            started: referrals.filter(r => r.status === 'started').length,
            quoted: referrals.filter(r => r.status === 'quoted').length,
            closed: referrals.filter(r => r.status === 'closed').length,
          },
          retention: {
            activePolicies: policies.filter(p => p.is_active).length,
            paymentsPending: payments.filter(p => p.status === 'pending' || p.status === 'overdue').length,
            paymentsRecovered: payments.filter(p => p.status === 'paid').length,
            renewalsPending: renewals.filter(r => ['pending', 'sent_30d', 'sent_7d', 'sent_1d'].includes(r.status as string)).length,
            renewalsRetained: renewals.filter(r => r.status === 'renewed').length,
          },
          operations: {
            leadsToday: leads.filter(l => {
              const created = new Date(l.created_at as string);
              const today = new Date();
              return created.toDateString() === today.toDateString();
            }).length,
            leadsBySource: {
              app: leads.filter(l => l.source === 'app').length,
              upload: leads.filter(l => l.source === 'upload').length,
              referral: leads.filter(l => l.source === 'referral').length,
              whatsapp: leads.filter(l => l.source === 'whatsapp').length,
            },
          },
        };
      } catch (err) {
        console.error('[FUNNEL] getMetrics error:', err);
        return getEmptyMetrics();
      }
    }),

  getNoCloseReasons: adminProcedure
    .input(z.object({}))
    .query(async () => {
      if (!isSupabaseConfigured()) return { reasons: [] };

      const { data, error } = await getSupabase()
        .from('quote_requests')
        .select('no_close_reason')
        .not('no_close_reason', 'is', null);

      if (error) return { reasons: [] };

      const counts: Record<string, number> = {};
      for (const row of data ?? []) {
        const reason = row.no_close_reason as string;
        counts[reason] = (counts[reason] || 0) + 1;
      }

      return {
        reasons: Object.entries(counts)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count),
      };
    }),
});

function getEmptyMetrics() {
  return {
    funnel: { totalLeads: 0, waitingDocs: 0, needsInfo: 0, readyToQuote: 0, quotingInProgress: 0, quoted: 0, savingsFound: 0, boundClosed: 0, noClose: 0 },
    referrals: { totalInvites: 0, started: 0, quoted: 0, closed: 0 },
    retention: { activePolicies: 0, paymentsPending: 0, paymentsRecovered: 0, renewalsPending: 0, renewalsRetained: 0 },
    operations: { leadsToday: 0, leadsBySource: { app: 0, upload: 0, referral: 0, whatsapp: 0 } },
  };
}

async function logReferralEvent(leadId: string, eventType: string, metadata: Record<string, unknown>) {
  if (!isSupabaseConfigured()) return;
  try {
    await getSupabase()
      .from('lead_events')
      .insert({
        id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        lead_id: leadId,
        event_type: eventType,
        actor_role: 'system',
        metadata,
      } as Record<string, unknown>);
  } catch (err) {
    console.error('[REFERRALS] Failed to log event:', err);
  }
}

console.log('[REFERRALS_ENGINE_ROUTER] Module loaded');
