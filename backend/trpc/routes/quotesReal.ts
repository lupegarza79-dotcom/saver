import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { leadStore } from "../store/leadStore";
import { quoteStore } from "../store/quoteStore";
import { emitWebhook } from "../utils/webhookEmitter";
import { logLeadEvent } from "../utils/logEvent";

const ingestQuoteSchema = z.object({
  provider: z.string().min(2),
  productName: z.string().optional(),
  termMonths: z.number().int().optional(),
  paymentPlan: z.string().optional(),
  premiumCents: z.number().int().min(1),
  downPaymentCents: z.number().int().optional(),
  liabilityLimits: z.string().optional(),
  coverageType: z.string().optional(),
  collisionDeductible: z.number().int().optional(),
  comprehensiveDeductible: z.number().int().optional(),
  source: z.enum(['AGENT', 'API', 'COMPARATIVE_RATER']).optional(),
  externalRef: z.string().optional(),
  rawJson: z.any().optional(),
});

export const quotesRealRouter = createTRPCRouter({
  requestQuote: publicProcedure
    .input(z.object({
      leadId: z.string(),
      requestedBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const lead = await leadStore.get(input.leadId);
      if (!lead) throw new Error('Lead not found');

      if (!lead.canQuote || lead.status !== 'READY_TO_QUOTE') {
        throw new Error('Lead is not READY_TO_QUOTE. Complete missing info first.');
      }

      const hasOpen = await quoteStore.hasOpenQuoteRequest(lead.id);
      if (hasOpen) {
        const existing = await quoteStore.getLatestQuoteRequest(lead.id);
        if (existing && (existing.status === 'REQUESTED' || existing.status === 'IN_PROGRESS')) {
          return { quoteRequestId: existing.id, alreadyExists: true };
        }
      }

      const qr = await quoteStore.createQuoteRequest({
        leadId: lead.id,
        intakeJson: lead.intakeJson,
        requestedBy: input.requestedBy,
        notes: input.notes,
      });

      await emitWebhook('lead.ready_to_quote' as any, {
        event: 'quote.requested',
        occurredAt: new Date().toISOString(),
        leadId: lead.id,
        quoteRequestId: qr.id,
        phone: lead.phone,
        language: lead.language,
        status: 'REQUESTED',
        canQuote: true,
        completenessScore: lead.score,
      });

      await logLeadEvent(lead.id, 'quote.requested', 'system', input.requestedBy, {
        quoteRequestId: qr.id,
      });

      console.log(`[QUOTES] Created QuoteRequest ${qr.id} for lead ${lead.id}`);

      return { quoteRequestId: qr.id, alreadyExists: false };
    }),

  list: publicProcedure
    .input(z.object({
      leadId: z.string(),
      latestOnly: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const requests = await quoteStore.getQuoteRequestsByLead(input.leadId);
      
      if (requests.length === 0) {
        return {
          hasRequest: false,
          quoteRequest: null,
          quotes: [],
        };
      }

      const latest = input.latestOnly ? requests[0] : requests[0];
      if (!latest) {
        return {
          hasRequest: false,
          quoteRequest: null,
          quotes: [],
        };
      }

      const quotes = await quoteStore.getQuotesByRequest(latest.id);

      return {
        hasRequest: true,
        quoteRequest: {
          id: latest.id,
          status: latest.status,
          createdAt: latest.createdAt,
          completedAt: latest.completedAt,
          assignedTo: latest.assignedTo,
          notes: latest.notes,
        },
        quotes: quotes.map(q => ({
          id: q.id,
          provider: q.provider,
          productName: q.productName,
          termMonths: q.termMonths,
          paymentPlan: q.paymentPlan,
          premiumCents: q.premiumCents,
          downPaymentCents: q.downPaymentCents,
          liabilityLimits: q.liabilityLimits,
          coverageType: q.coverageType,
          collisionDeductible: q.collisionDeductible,
          comprehensiveDeductible: q.comprehensiveDeductible,
          source: q.source,
        })),
      };
    }),

  ingest: publicProcedure
    .input(z.object({
      quoteRequestId: z.string(),
      quotes: z.array(ingestQuoteSchema).min(1),
      adminToken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const adminToken = process.env.ADMIN_TOKEN;
      if (adminToken && input.adminToken !== adminToken) {
        console.log('[QUOTES] Ingest attempt without valid admin token (allowing for now in dev)');
      }

      const qr = await quoteStore.getQuoteRequest(input.quoteRequestId);
      if (!qr) throw new Error('QuoteRequest not found');

      const stored = await quoteStore.ingestQuotes(input.quoteRequestId, input.quotes);
      const lead = await leadStore.get(qr.leadId);

      await emitWebhook('lead.ready_to_quote' as any, {
        event: 'quote.completed',
        occurredAt: new Date().toISOString(),
        leadId: qr.leadId,
        quoteRequestId: qr.id,
        phone: lead?.phone,
        language: lead?.language ?? 'en',
        status: 'COMPLETED',
        canQuote: true,
        completenessScore: lead?.score ?? 100,
        quoteCount: stored.length,
        bestPremiumCents: stored[0]?.premiumCents,
      });

      await logLeadEvent(qr.leadId, 'quote.completed', 'system', undefined, {
        quoteRequestId: qr.id,
        quoteCount: stored.length,
        bestPremiumCents: stored[0]?.premiumCents,
      });

      console.log(`[QUOTES] Ingested ${stored.length} quotes for QuoteRequest ${input.quoteRequestId}`);

      return {
        ok: true,
        quoteCount: stored.length,
        bestPremiumCents: stored[0]?.premiumCents ?? null,
      };
    }),

  fail: publicProcedure
    .input(z.object({
      quoteRequestId: z.string(),
      reason: z.string().min(3),
      adminToken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const qr = await quoteStore.getQuoteRequest(input.quoteRequestId);
      if (!qr) throw new Error('QuoteRequest not found');

      const updated = await quoteStore.failQuoteRequest(input.quoteRequestId, input.reason);
      const lead = await leadStore.get(qr.leadId);

      await emitWebhook('lead.ready_to_quote' as any, {
        event: 'quote.failed',
        occurredAt: new Date().toISOString(),
        leadId: qr.leadId,
        quoteRequestId: qr.id,
        phone: lead?.phone,
        language: lead?.language ?? 'en',
        status: 'FAILED',
        canQuote: true,
        completenessScore: lead?.score ?? 100,
      });

      await logLeadEvent(qr.leadId, 'quote.failed', 'system', undefined, {
        quoteRequestId: qr.id,
        reason: input.reason,
      });

      console.log(`[QUOTES] Failed QuoteRequest ${input.quoteRequestId}: ${input.reason}`);

      return { ok: true, status: updated?.status };
    }),

  reset: publicProcedure
    .input(z.object({
      quoteRequestId: z.string(),
      adminToken: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = await quoteStore.resetQuoteRequest(input.quoteRequestId);
      if (!updated) throw new Error('QuoteRequest not found');

      console.log(`[QUOTES] Reset QuoteRequest ${input.quoteRequestId}`);

      return { ok: true, status: updated.status };
    }),

  getQuoteRequest: publicProcedure
    .input(z.object({ quoteRequestId: z.string() }))
    .query(async ({ input }) => {
      const qr = await quoteStore.getQuoteRequest(input.quoteRequestId);
      if (!qr) return null;

      const quotes = await quoteStore.getQuotesByRequest(qr.id);
      const lead = await leadStore.get(qr.leadId);

      return {
        quoteRequest: {
          id: qr.id,
          leadId: qr.leadId,
          status: qr.status,
          requestedBy: qr.requestedBy,
          assignedTo: qr.assignedTo,
          notes: qr.notes,
          createdAt: qr.createdAt,
          updatedAt: qr.updatedAt,
          completedAt: qr.completedAt,
        },
        lead: lead ? {
          id: lead.id,
          phone: lead.phone,
          language: lead.language,
          status: lead.status,
          score: lead.score,
        } : null,
        quotes: quotes.map(q => ({
          id: q.id,
          provider: q.provider,
          productName: q.productName,
          termMonths: q.termMonths,
          paymentPlan: q.paymentPlan,
          premiumCents: q.premiumCents,
          downPaymentCents: q.downPaymentCents,
          liabilityLimits: q.liabilityLimits,
          coverageType: q.coverageType,
          collisionDeductible: q.collisionDeductible,
          comprehensiveDeductible: q.comprehensiveDeductible,
          source: q.source,
          createdAt: q.createdAt,
        })),
        intakeSnapshot: qr.intakeJson,
      };
    }),

  assignQuoteRequest: publicProcedure
    .input(z.object({
      quoteRequestId: z.string(),
      assignedTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = await quoteStore.updateQuoteRequestAssignment(input.quoteRequestId, input.assignedTo);
      if (!updated) throw new Error('QuoteRequest not found');

      return { ok: true, assignedTo: updated.assignedTo };
    }),
});

console.log('[QUOTES_REAL_ROUTER] Module loaded');
