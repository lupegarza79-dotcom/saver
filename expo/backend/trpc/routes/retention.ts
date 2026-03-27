import * as z from "zod";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../create-context";
import { getSupabase, isSupabaseConfigured } from "@/backend/supabase/client";

export const retentionRouter = createTRPCRouter({
  listPolicies: adminProcedure
    .input(z.object({
      phone: z.string().optional(),
      leadId: z.string().optional(),
      isActive: z.boolean().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { policies: [], total: 0 };

      let query = getSupabase()
        .from('policies')
        .select('*')
        .order('created_at', { ascending: false });

      if (input.phone) query = query.eq('phone', input.phone);
      if (input.leadId) query = query.eq('lead_id', input.leadId);
      if (input.isActive !== undefined) query = query.eq('is_active', input.isActive);
      query = query.limit(input.limit);

      const { data, error } = await query;
      if (error) {
        console.error('[RETENTION] listPolicies error:', error);
        return { policies: [], total: 0 };
      }
      return { policies: data ?? [], total: data?.length ?? 0 };
    }),

  createPolicy: adminProcedure
    .input(z.object({
      leadId: z.string().optional(),
      phone: z.string().optional(),
      carrier: z.string(),
      policyNumber: z.string().optional(),
      productType: z.enum(['auto', 'home', 'commercial', 'life', 'health', 'other']).default('auto'),
      effectiveDate: z.string().optional(),
      expirationDate: z.string().optional(),
      premiumCents: z.number().int().optional(),
      paymentFrequency: z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('monthly'),
      boundViaSaver: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `pol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await getSupabase()
        .from('policies')
        .insert({
          id,
          lead_id: input.leadId ?? null,
          phone: input.phone ?? null,
          carrier: input.carrier,
          policy_number: input.policyNumber ?? null,
          product_type: input.productType,
          effective_date: input.effectiveDate ?? null,
          expiration_date: input.expirationDate ?? null,
          premium_cents: input.premiumCents ?? null,
          payment_frequency: input.paymentFrequency,
          is_active: true,
          bound_via_saver: input.boundViaSaver,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (input.leadId) {
        await logRetentionEvent(input.leadId, 'policy.bound', { policyId: id, carrier: input.carrier });
      }

      return { id: data.id, ok: true };
    }),

  listPaymentReminders: adminProcedure
    .input(z.object({
      phone: z.string().optional(),
      policyId: z.string().optional(),
      status: z.enum(['pending', 'sent', 'snoozed', 'paid', 'overdue', 'cancelled']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { reminders: [], total: 0 };

      let query = getSupabase()
        .from('payment_reminders')
        .select('*')
        .order('due_date', { ascending: true });

      if (input.phone) query = query.eq('phone', input.phone);
      if (input.policyId) query = query.eq('policy_id', input.policyId);
      if (input.status) query = query.eq('status', input.status);
      query = query.limit(input.limit);

      const { data, error } = await query;
      if (error) {
        console.error('[RETENTION] listPaymentReminders error:', error);
        return { reminders: [], total: 0 };
      }
      return { reminders: data ?? [], total: data?.length ?? 0 };
    }),

  createPaymentReminder: adminProcedure
    .input(z.object({
      policyId: z.string().optional(),
      leadId: z.string().optional(),
      phone: z.string().optional(),
      carrier: z.string().optional(),
      amountCents: z.number().int().optional(),
      dueDate: z.string(),
      channel: z.enum(['whatsapp', 'sms', 'email']).default('whatsapp'),
      recurrence: z.enum(['once', 'monthly', 'quarterly', 'semi_annual', 'annual']).default('monthly'),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `pmr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await getSupabase()
        .from('payment_reminders')
        .insert({
          id,
          policy_id: input.policyId ?? null,
          lead_id: input.leadId ?? null,
          phone: input.phone ?? null,
          carrier: input.carrier ?? null,
          amount_cents: input.amountCents ?? null,
          due_date: input.dueDate,
          channel: input.channel,
          status: 'pending',
          recurrence: input.recurrence,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (input.leadId) {
        await logRetentionEvent(input.leadId, 'payment_reminder.created', {
          reminderId: id,
          carrier: input.carrier,
          amountCents: input.amountCents,
          dueDate: input.dueDate,
          channel: input.channel,
        });
      }

      return { id: data.id, ok: true };
    }),

  markPaymentPaid: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const { data, error } = await getSupabase()
        .from('payment_reminders')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (data.lead_id) {
        await logRetentionEvent(data.lead_id as string, 'payment.recovered', { reminderId: input.id });
      }

      return { ok: true };
    }),

  snoozePayment: adminProcedure
    .input(z.object({
      id: z.string(),
      snoozeDays: z.number().int().min(1).max(30).default(3),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + input.snoozeDays);

      const { error } = await getSupabase()
        .from('payment_reminders')
        .update({
          status: 'snoozed',
          snoozed_until: snoozeUntil.toISOString().split('T')[0],
        } as Record<string, unknown>)
        .eq('id', input.id);

      if (error) throw new Error(error.message);
      return { ok: true, snoozedUntil: snoozeUntil.toISOString().split('T')[0] };
    }),

  listRenewalReminders: adminProcedure
    .input(z.object({
      status: z.enum(['pending', 'sent_30d', 'sent_7d', 'sent_1d', 'renewed', 'lapsed', 'requoted', 'cancelled']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { reminders: [], total: 0 };

      let query = getSupabase()
        .from('renewal_reminders')
        .select('*')
        .order('renewal_date', { ascending: true });

      if (input.status) query = query.eq('status', input.status);
      query = query.limit(input.limit);

      const { data, error } = await query;
      if (error) {
        console.error('[RETENTION] listRenewalReminders error:', error);
        return { reminders: [], total: 0 };
      }
      return { reminders: data ?? [], total: data?.length ?? 0 };
    }),

  createRenewalReminder: adminProcedure
    .input(z.object({
      policyId: z.string().optional(),
      leadId: z.string().optional(),
      phone: z.string().optional(),
      carrier: z.string().optional(),
      renewalDate: z.string(),
      channel: z.enum(['whatsapp', 'sms', 'email']).default('whatsapp'),
      recheckSavings: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `rnw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await getSupabase()
        .from('renewal_reminders')
        .insert({
          id,
          policy_id: input.policyId ?? null,
          lead_id: input.leadId ?? null,
          phone: input.phone ?? null,
          carrier: input.carrier ?? null,
          renewal_date: input.renewalDate,
          channel: input.channel,
          status: 'pending',
          recheck_savings: input.recheckSavings,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) throw new Error(error.message);

      if (input.leadId) {
        await logRetentionEvent(input.leadId, 'renewal_reminder.created', {
          reminderId: id,
          carrier: input.carrier,
          renewalDate: input.renewalDate,
          channel: input.channel,
          recheckSavings: input.recheckSavings,
        });
      }

      return { id: data.id, ok: true };
    }),

  getRetentionStats: adminProcedure
    .input(z.object({}))
    .query(async () => {
      if (!isSupabaseConfigured()) return {
        activePolicies: 0,
        paymentsPending: 0,
        paymentsRecovered: 0,
        renewalsPending: 0,
        renewalsRetained: 0,
        lapsedPolicies: 0,
      };

      const [policies, payments, renewals] = await Promise.all([
        getSupabase().from('policies').select('is_active').then(r => r.data ?? []),
        getSupabase().from('payment_reminders').select('status').then(r => r.data ?? []),
        getSupabase().from('renewal_reminders').select('status').then(r => r.data ?? []),
      ]);

      return {
        activePolicies: policies.filter(p => p.is_active).length,
        paymentsPending: payments.filter(p => p.status === 'pending' || p.status === 'overdue').length,
        paymentsRecovered: payments.filter(p => p.status === 'paid').length,
        renewalsPending: renewals.filter(r => ['pending', 'sent_30d', 'sent_7d', 'sent_1d'].includes(r.status as string)).length,
        renewalsRetained: renewals.filter(r => r.status === 'renewed').length,
        lapsedPolicies: renewals.filter(r => r.status === 'lapsed').length,
      };
    }),
});

async function logRetentionEvent(leadId: string, eventType: string, metadata: Record<string, unknown>) {
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
    console.error('[RETENTION] Failed to log event:', err);
  }
}

console.log('[RETENTION_ROUTER] Module loaded');
