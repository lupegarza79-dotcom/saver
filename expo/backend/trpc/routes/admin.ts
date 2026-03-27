import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { db, WebhookEvent } from "@/backend/db";

const webhookEventSchema = z.enum([
  'user_created',
  'policy_uploaded',
  'snapshot_created',
  'video_evidence_added',
  'accident_reported',
  'lead_created',
  'lead_status_changed',
  'lead_needs_followup_24h',
  'lead_stale_48h',
  'agent_signup_pending',
  'agent_verified',
  'agent_rejected',
  'lead_assigned_to_agent',
  'renewal_30d',
  'daily_summary',
]);

export const adminRouter = createTRPCRouter({
  stats: publicProcedure.query(() => {
    console.log('[ADMIN] Fetching stats');
    return db.getStats();
  }),

  activityLogs: publicProcedure
    .input(z.object({
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(({ input }) => {
      console.log(`[ADMIN] Fetching activity logs (limit: ${input.limit}, offset: ${input.offset})`);
      return db.getActivityLogs(input.limit, input.offset);
    }),

  userActivity: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ input }) => {
      console.log(`[ADMIN] Fetching activity for user ${input.userId}`);
      return db.getActivityLogsByUser(input.userId);
    }),

  webhooks: createTRPCRouter({
    list: publicProcedure.query(() => {
      return db.getWebhooks();
    }),

    logs: publicProcedure
      .input(z.object({ limit: z.number().default(20) }).optional())
      .query(({ input }) => {
        return db.getWebhookLogs(input?.limit || 20);
      }),

    create: publicProcedure
      .input(z.object({
        event: webhookEventSchema,
        url: z.string().url(),
        secret: z.string().optional(),
      }))
      .mutation(({ input }) => {
        console.log(`[ADMIN] Creating webhook for ${input.event} -> ${input.url}`);
        return db.createWebhook({
          event: input.event as WebhookEvent,
          url: input.url,
          secret: input.secret,
          enabled: true,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.string(),
        url: z.string().url().optional(),
        enabled: z.boolean().optional(),
        secret: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...updates } = input;
        console.log(`[ADMIN] Updating webhook ${id}`);
        return db.updateWebhook(id, updates);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        console.log(`[ADMIN] Deleting webhook ${input.id}`);
        return db.deleteWebhook(input.id);
      }),

    test: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const webhooks = db.getWebhooks();
        const webhook = webhooks.find(w => w.id === input.id);
        if (!webhook) throw new Error('Webhook not found');
        
        console.log(`[ADMIN] Testing webhook ${input.id}`);
        await db.triggerWebhook(webhook.event, { test: true, message: 'Test webhook from Saver admin' });
        return { success: true };
      }),
  }),

  dailySummary: publicProcedure.query(() => {
    console.log('[ADMIN] Fetching daily summary');
    return db.getDailySummary();
  }),

  triggerDailySummary: publicProcedure.mutation(async () => {
    console.log('[ADMIN] Triggering daily summary webhook');
    return db.triggerDailySummaryWebhook();
  }),

  checkFollowUps: publicProcedure.mutation(async () => {
    console.log('[ADMIN] Checking for leads needing follow-up');
    await db.checkAndTriggerFollowUpWebhooks();
    return { success: true };
  }),
});
