import * as z from "zod";
import { createTRPCRouter, adminProcedure } from "../create-context";
import { leadStore } from "../store/leadStore";
import { quoteStore } from "../store/quoteStore";
import type { IntakeStatus, QuoteRequestStatus } from "@/types/intake";

export const adminOpsRouter = createTRPCRouter({
  listLeads: adminProcedure
    .input(z.object({
      status: z.enum(['WAITING_DOCS', 'NEEDS_INFO', 'READY_TO_QUOTE']).optional(),
      assignedTo: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const leads = await leadStore.list({
        status: input.status as IntakeStatus | undefined,
        assignedTo: input.assignedTo,
        limit: input.limit,
      });

      return {
        leads: leads.map(l => ({
          id: l.id,
          phone: l.phone,
          language: l.language,
          status: l.status,
          canQuote: l.canQuote,
          score: l.score,
          assignedTo: l.assignedTo,
          missingRequired: l.missingRequired.slice(0, 5),
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        })),
        total: leads.length,
      };
    }),

  getLead: adminProcedure
    .input(z.object({
      leadId: z.string(),
    }))
    .query(async ({ input }) => {
      const lead = await leadStore.get(input.leadId);
      if (!lead) throw new Error('Lead not found');

      const quoteRequests = await quoteStore.getQuoteRequestsByLead(lead.id);

      const quoteRequestsWithQuotes = await Promise.all(
        quoteRequests.map(async (qr) => {
          const quotes = await quoteStore.getQuotesByRequest(qr.id);
          return {
            id: qr.id,
            status: qr.status,
            assignedTo: qr.assignedTo,
            notes: qr.notes,
            quotesCount: quotes.length,
            createdAt: qr.createdAt,
            completedAt: qr.completedAt,
          };
        })
      );

      return {
        lead: {
          id: lead.id,
          phone: lead.phone,
          language: lead.language,
          consent: lead.consent,
          status: lead.status,
          canQuote: lead.canQuote,
          score: lead.score,
          assignedTo: lead.assignedTo,
          internalNotes: lead.internalNotes,
          missingRequired: lead.missingRequired,
          missingRecommended: lead.missingRecommended,
          nextQuestionEn: lead.nextQuestionEn,
          nextQuestionEs: lead.nextQuestionEs,
          createdAt: lead.createdAt,
          updatedAt: lead.updatedAt,
        },
        intake: lead.intakeJson,
        quoteRequests: quoteRequestsWithQuotes,
      };
    }),

  searchLeads: adminProcedure
    .input(z.object({
      query: z.string().min(1),
    }))
    .query(async ({ input }) => {
      const leads = await leadStore.search(input.query);

      return {
        leads: leads.map(l => ({
          id: l.id,
          phone: l.phone,
          language: l.language,
          status: l.status,
          canQuote: l.canQuote,
          score: l.score,
          assignedTo: l.assignedTo,
          updatedAt: l.updatedAt,
        })),
        count: leads.length,
      };
    }),

  updateLeadAssignment: adminProcedure
    .input(z.object({
      leadId: z.string(),
      assignedTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = await leadStore.update(input.leadId, { assignedTo: input.assignedTo });
      if (!updated) throw new Error('Lead not found');

      return { ok: true, assignedTo: updated.assignedTo };
    }),

  updateLeadNotes: adminProcedure
    .input(z.object({
      leadId: z.string(),
      internalNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = await leadStore.update(input.leadId, { internalNotes: input.internalNotes });
      if (!updated) throw new Error('Lead not found');

      return { ok: true, internalNotes: updated.internalNotes };
    }),

  listQuoteRequests: adminProcedure
    .input(z.object({
      status: z.enum(['REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED']).optional(),
      assignedTo: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const requests = await quoteStore.listQuoteRequests({
        status: input.status as QuoteRequestStatus | undefined,
        assignedTo: input.assignedTo,
        limit: input.limit,
      });

      const quoteRequestsWithDetails = await Promise.all(
        requests.map(async (qr) => {
          const lead = await leadStore.get(qr.leadId);
          const quotes = await quoteStore.getQuotesByRequest(qr.id);
          const best = quotes[0];

          return {
            id: qr.id,
            leadId: qr.leadId,
            leadPhone: lead?.phone,
            status: qr.status,
            assignedTo: qr.assignedTo,
            quotesCount: quotes.length,
            bestPremiumCents: best?.premiumCents,
            bestProvider: best?.provider,
            createdAt: qr.createdAt,
            completedAt: qr.completedAt,
          };
        })
      );

      return {
        quoteRequests: quoteRequestsWithDetails,
        total: requests.length,
      };
    }),

  getStats: adminProcedure
    .input(z.object({}))
    .query(async () => {
      const leadStats = await leadStore.getStats();
      const quoteStats = await quoteStore.getStats();

      return {
        leads: leadStats,
        quotes: quoteStats,
        summary: {
          totalLeads: leadStats.total,
          readyToQuote: leadStats.readyToQuote,
          needsInfo: leadStats.needsInfo,
          waitingDocs: leadStats.waitingDocs,
          totalQuoteRequests: quoteStats.totalRequests,
          completedQuotes: quoteStats.byStatus.COMPLETED || 0,
          pendingQuotes: (quoteStats.byStatus.REQUESTED || 0) + (quoteStats.byStatus.IN_PROGRESS || 0),
        },
      };
    }),

  exportLeadsCsv: adminProcedure
    .input(z.object({
      status: z.enum(['WAITING_DOCS', 'NEEDS_INFO', 'READY_TO_QUOTE']).optional(),
    }))
    .query(async ({ input }) => {
      const csv = await leadStore.exportCsv({ status: input.status as IntakeStatus | undefined });

      return {
        csv,
        filename: `leads_${input.status || 'all'}_${new Date().toISOString().split('T')[0]}.csv`,
      };
    }),

  createQuoteRequest: adminProcedure
    .input(z.object({
      leadId: z.string(),
      requestedBy: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const lead = await leadStore.get(input.leadId);
      if (!lead) throw new Error('Lead not found');

      if (!lead.canQuote || lead.status !== 'READY_TO_QUOTE') {
        throw new Error('Lead is not READY_TO_QUOTE');
      }

      const qr = await quoteStore.createQuoteRequest({
        leadId: lead.id,
        intakeJson: lead.intakeJson,
        requestedBy: input.requestedBy,
        notes: input.notes,
      });

      return { quoteRequestId: qr.id };
    }),

  ingestQuotes: adminProcedure
    .input(z.object({
      quoteRequestId: z.string(),
      quotes: z.array(z.object({
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
      })).min(1),
    }))
    .mutation(async ({ input }) => {
      const stored = await quoteStore.ingestQuotes(input.quoteRequestId, input.quotes);

      return {
        ok: true,
        quoteCount: stored.length,
        bestPremiumCents: stored[0]?.premiumCents ?? null,
      };
    }),

  failQuoteRequest: adminProcedure
    .input(z.object({
      quoteRequestId: z.string(),
      reason: z.string().min(3),
    }))
    .mutation(async ({ input }) => {
      const updated = await quoteStore.failQuoteRequest(input.quoteRequestId, input.reason);
      if (!updated) throw new Error('QuoteRequest not found');

      return { ok: true, status: updated.status };
    }),

  resetQuoteRequest: adminProcedure
    .input(z.object({
      quoteRequestId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const updated = await quoteStore.resetQuoteRequest(input.quoteRequestId);
      if (!updated) throw new Error('QuoteRequest not found');

      return { ok: true, status: updated.status };
    }),

  updateQuoteRequestAssignment: adminProcedure
    .input(z.object({
      quoteRequestId: z.string(),
      assignedTo: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const updated = await quoteStore.updateQuoteRequestAssignment(input.quoteRequestId, input.assignedTo);
      if (!updated) throw new Error('QuoteRequest not found');

      return { ok: true, assignedTo: updated.assignedTo };
    }),

  bulkCreateQuoteRequests: adminProcedure
    .input(z.object({
      leadIds: z.array(z.string()).min(1).max(50),
      requestedBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const results: { leadId: string; quoteRequestId?: string; error?: string }[] = [];

      for (const leadId of input.leadIds) {
        try {
          const lead = await leadStore.get(leadId);
          if (!lead) {
            results.push({ leadId, error: 'Lead not found' });
            continue;
          }

          if (!lead.canQuote || lead.status !== 'READY_TO_QUOTE') {
            results.push({ leadId, error: 'Lead is not READY_TO_QUOTE' });
            continue;
          }

          const hasOpen = await quoteStore.hasOpenQuoteRequest(leadId);
          if (hasOpen) {
            results.push({ leadId, error: 'Already has open quote request' });
            continue;
          }

          const qr = await quoteStore.createQuoteRequest({
            leadId: lead.id,
            intakeJson: lead.intakeJson,
            requestedBy: input.requestedBy,
          });

          results.push({ leadId, quoteRequestId: qr.id });
        } catch (err) {
          results.push({ leadId, error: err instanceof Error ? err.message : 'Unknown error' });
        }
      }

      return {
        ok: true,
        created: results.filter(r => r.quoteRequestId).length,
        failed: results.filter(r => r.error).length,
        results,
      };
    }),
});

console.log('[ADMIN_OPS_ROUTER] Module loaded');
