import * as z from "zod";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../create-context";
import { getSupabase, isSupabaseConfigured } from "@/backend/supabase/client";
import { logLeadEvent } from "../utils/logEvent";

export const followupsRouter = createTRPCRouter({
  list: adminProcedure
    .input(z.object({
      leadId: z.string().optional(),
      status: z.enum(['pending', 'completed', 'skipped', 'escalated', 'overdue']).optional(),
      assignedToRole: z.enum(['IAT_1', 'IAT_2', 'IAT_3', 'IAM']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { followups: [], total: 0 };

      let query = getSupabase()
        .from('lead_followups')
        .select('*')
        .order('due_at', { ascending: true });

      if (input.leadId) query = query.eq('lead_id', input.leadId);
      if (input.status) query = query.eq('status', input.status);
      if (input.assignedToRole) query = query.eq('assigned_to_role', input.assignedToRole);
      query = query.limit(input.limit);

      const { data, error } = await query;
      if (error) {
        console.error('[FOLLOWUPS] list error:', error);
        return { followups: [], total: 0 };
      }

      return { followups: data ?? [], total: data?.length ?? 0 };
    }),

  create: adminProcedure
    .input(z.object({
      leadId: z.string(),
      type: z.enum(['scheduled', 'sla_warning', 'escalation', 'commitment_check', 'recheck_savings', 'renewal_prompt']),
      dueAt: z.string(),
      assignedToRole: z.enum(['IAT_1', 'IAT_2', 'IAT_3', 'IAM']).optional(),
      assignedToId: z.string().optional(),
      priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
      reason: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `fu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await getSupabase()
        .from('lead_followups')
        .insert({
          id,
          lead_id: input.leadId,
          type: input.type,
          status: 'pending',
          due_at: input.dueAt,
          assigned_to_role: input.assignedToRole ?? null,
          assigned_to_id: input.assignedToId ?? null,
          priority: input.priority,
          reason: input.reason ?? null,
          notes: input.notes ?? null,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) {
        console.error('[FOLLOWUPS] create error:', error);
        throw new Error(error.message);
      }

      await logEvent(input.leadId, 'followup.created', 'system', undefined, { followupId: id, type: input.type });

      return { id: data.id, ok: true };
    }),

  complete: adminProcedure
    .input(z.object({
      id: z.string(),
      outcome: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const { data, error } = await getSupabase()
        .from('lead_followups')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          outcome: input.outcome ?? null,
        } as Record<string, unknown>)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        console.error('[FOLLOWUPS] complete error:', error);
        throw new Error(error.message);
      }

      await logEvent(data.lead_id as string, 'followup.completed', 'system', undefined, { followupId: input.id });

      return { ok: true };
    }),

  escalate: adminProcedure
    .input(z.object({
      id: z.string(),
      escalationTargetRole: z.enum(['IAT_1', 'IAT_2', 'IAT_3', 'IAM']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const { data, error } = await getSupabase()
        .from('lead_followups')
        .update({
          status: 'escalated',
          escalation_target_role: input.escalationTargetRole,
          notes: input.notes ?? null,
        } as Record<string, unknown>)
        .eq('id', input.id)
        .select()
        .single();

      if (error) {
        console.error('[FOLLOWUPS] escalate error:', error);
        throw new Error(error.message);
      }

      await logEvent(data.lead_id as string, 'followup.escalated', 'system', undefined, {
        followupId: input.id,
        escalatedTo: input.escalationTargetRole,
      });

      return { ok: true };
    }),

  overdue: adminProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { followups: [], total: 0 };

      const { data, error } = await getSupabase()
        .from('lead_followups')
        .select('*, leads!inner(phone, full_name, status, assigned_to)')
        .eq('status', 'pending')
        .lt('due_at', new Date().toISOString())
        .order('due_at', { ascending: true })
        .limit(input.limit);

      if (error) {
        console.error('[FOLLOWUPS] overdue error:', error);
        return { followups: [], total: 0 };
      }

      return { followups: data ?? [], total: data?.length ?? 0 };
    }),
});

export const commitmentsRouter = createTRPCRouter({
  list: adminProcedure
    .input(z.object({
      leadId: z.string().optional(),
      status: z.enum(['pending', 'honored', 'missed', 'rescheduled', 'cancelled']).optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { commitments: [], total: 0 };

      let query = getSupabase()
        .from('lead_commitments')
        .select('*')
        .order('promised_at', { ascending: true });

      if (input.leadId) query = query.eq('lead_id', input.leadId);
      if (input.status) query = query.eq('status', input.status);
      query = query.limit(input.limit);

      const { data, error } = await query;
      if (error) {
        console.error('[COMMITMENTS] list error:', error);
        return { commitments: [], total: 0 };
      }

      return { commitments: data ?? [], total: data?.length ?? 0 };
    }),

  create: adminProcedure
    .input(z.object({
      leadId: z.string(),
      type: z.enum(['callback', 'reminder', 'recheck', 'document_upload', 'custom']),
      promisedAt: z.string(),
      channel: z.enum(['whatsapp', 'sms', 'email', 'call']).optional(),
      description: z.string().optional(),
      createdByRole: z.enum(['IAT_1', 'IAT_2', 'IAT_3', 'IAM', 'system', 'customer']).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { data, error } = await getSupabase()
        .from('lead_commitments')
        .insert({
          id,
          lead_id: input.leadId,
          type: input.type,
          promised_at: input.promisedAt,
          channel: input.channel ?? null,
          description: input.description ?? null,
          status: 'pending',
          created_by_role: input.createdByRole ?? null,
        } as Record<string, unknown>)
        .select()
        .single();

      if (error) {
        console.error('[COMMITMENTS] create error:', error);
        throw new Error(error.message);
      }

      await logEvent(input.leadId, 'commitment.created', input.createdByRole ?? 'system', undefined, {
        commitmentId: id,
        type: input.type,
        promisedAt: input.promisedAt,
      });

      return { id: data.id, ok: true };
    }),

  honor: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const { data, error } = await getSupabase()
        .from('lead_commitments')
        .update({
          status: 'honored',
          honored_at: new Date().toISOString(),
        } as Record<string, unknown>)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      await logEvent(data.lead_id as string, 'commitment.honored', 'system', undefined, { commitmentId: input.id });
      return { ok: true };
    }),
});

export const communicationsRouter = createTRPCRouter({
  list: adminProcedure
    .input(z.object({
      leadId: z.string(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { communications: [], total: 0 };

      const { data, error } = await getSupabase()
        .from('lead_communications')
        .select('*')
        .eq('lead_id', input.leadId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        console.error('[COMMUNICATIONS] list error:', error);
        return { communications: [], total: 0 };
      }

      return { communications: data ?? [], total: data?.length ?? 0 };
    }),

  log: adminProcedure
    .input(z.object({
      leadId: z.string(),
      channel: z.enum(['whatsapp', 'sms', 'email', 'call', 'in_app']),
      direction: z.enum(['inbound', 'outbound']),
      messageType: z.enum(['initial_contact', 'follow_up', 'quote_delivery', 'reminder', 'escalation', 'info_request', 'commitment', 'general']),
      content: z.string().optional(),
      sentByRole: z.enum(['IAT_1', 'IAT_2', 'IAT_3', 'IAM', 'system', 'customer']).optional(),
    }))
    .mutation(async ({ input }) => {
      if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

      const id = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const { error } = await getSupabase()
        .from('lead_communications')
        .insert({
          id,
          lead_id: input.leadId,
          channel: input.channel,
          direction: input.direction,
          message_type: input.messageType,
          content: input.content ?? null,
          sent_by_role: input.sentByRole ?? null,
          status: 'sent',
        } as Record<string, unknown>);

      if (error) throw new Error(error.message);

      const eventType = input.direction === 'outbound' ? 'communication.sent' : 'communication.received';
      await logEvent(input.leadId, eventType, input.sentByRole ?? 'system', undefined, {
        channel: input.channel,
        messageType: input.messageType,
      });

      return { id, ok: true };
    }),
});

export const eventsRouter = createTRPCRouter({
  list: adminProcedure
    .input(z.object({
      leadId: z.string(),
      limit: z.number().int().min(1).max(200).default(100),
    }))
    .query(async ({ input }) => {
      if (!isSupabaseConfigured()) return { events: [], total: 0 };

      const { data, error } = await getSupabase()
        .from('lead_events')
        .select('*')
        .eq('lead_id', input.leadId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        console.error('[EVENTS] list error:', error);
        return { events: [], total: 0 };
      }

      return { events: data ?? [], total: data?.length ?? 0 };
    }),
});

const logEvent = logLeadEvent;

console.log('[FOLLOWUPS_ROUTER] Module loaded');
