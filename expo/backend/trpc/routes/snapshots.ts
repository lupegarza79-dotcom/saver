import * as z from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { db } from "@/backend/db";
import { PolicySnapshot, Lead, SnapshotGrade } from "@/types";



export const snapshotsRouter = createTRPCRouter({
  generate: protectedProcedure
    .input(z.object({
      policyId: z.string(),
      carrier: z.string(),
      premium: z.number(),
      deductibleComp: z.number().optional(),
      deductibleColl: z.number().optional(),
      liabilityBI: z.string().optional(),
      liabilityPD: z.string().optional(),
      vehicleYear: z.number().optional(),
      vehicleMake: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log(`[SNAPSHOTS] Generating snapshot for policy ${input.policyId}`);
      
      const snapshot: PolicySnapshot = {
        id: `snap_${Date.now()}`,
        policyId: input.policyId,
        grade: input.premium > 200 ? 'C' : 'B',
        monthlySavings: Math.round(input.premium * 0.15 + Math.random() * 20),
        findings: [
          `You're paying ${input.premium}/month with ${input.carrier}`,
          input.deductibleComp && input.deductibleComp >= 1000 
            ? 'Your deductible is on the higher side, which lowers your premium'
            : 'Your deductible seems reasonable for your coverage level',
          'We found similar drivers paying less for comparable coverage',
        ],
        recommendations: [
          'Consider bundling with home/renters insurance for 10-15% savings',
          'Ask about safe driver or low mileage discounts',
          'Compare quotes from at least 3 carriers before renewal',
        ],
        coverageScore: 70 + Math.round(Math.random() * 20),
        priceScore: 50 + Math.round(Math.random() * 30),
        overallScore: 60 + Math.round(Math.random() * 25),
        createdAt: new Date().toISOString(),
      };

      console.log(`[SNAPSHOTS] Generated snapshot: Grade ${snapshot.grade}, savings ${snapshot.monthlySavings}/mo`);
      return db.createSnapshot(snapshot);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return db.getSnapshot(input.id);
    }),

  getByPolicy: publicProcedure
    .input(z.object({ policyId: z.string() }))
    .query(({ input }) => {
      return db.getSnapshotByPolicy(input.policyId);
    }),

  list: publicProcedure.query(() => {
    return db.getAllSnapshots();
  }),
});

export const leadsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      userId: z.string(),
      userName: z.string().optional(),
      userPhone: z.string(),
      source: z.enum(['app', 'whatsapp', 'referral']).default('app'),
      policyId: z.string().optional(),
      potentialSavings: z.number().optional(),
    }))
    .mutation(({ input }) => {
      const existingLead = db.getLeadByUser(input.userId);
      if (existingLead) {
        console.log(`[LEADS] Lead already exists for user ${input.userId}`);
        return existingLead;
      }

      const lead: Lead = {
        id: `lead_${Date.now()}`,
        userId: input.userId,
        userName: input.userName,
        userPhone: input.userPhone,
        status: 'new',
        source: input.source,
        policyId: input.policyId,
        potentialSavings: input.potentialSavings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(`[LEADS] Creating new lead for ${input.userPhone}`);
      return db.createLead(lead);
    }),

  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(['new', 'contacted', 'snapshot_sent', 'interested', 'quoted', 'won', 'lost', 'follow_up']),
      notes: z.string().optional(),
      nextFollowUpAt: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const updates: Partial<Lead> = {
        status: input.status,
        lastContactedAt: new Date().toISOString(),
      };
      if (input.notes) updates.notes = input.notes;
      if (input.nextFollowUpAt) updates.nextFollowUpAt = input.nextFollowUpAt;

      console.log(`[LEADS] Updating lead ${input.id} to status: ${input.status}`);
      return db.updateLead(input.id, updates);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return db.getLead(input.id);
    }),

  list: publicProcedure.query(() => {
    return db.getAllLeads();
  }),

  needingFollowUp: publicProcedure.query(() => {
    return db.getLeadsNeedingFollowUp();
  }),

  byStatus: publicProcedure
    .input(z.object({ status: z.enum(['new', 'contacted', 'snapshot_sent', 'interested', 'quoted', 'won', 'lost', 'follow_up']) }))
    .query(({ input }) => {
      return db.getLeadsByStatus(input.status);
    }),
});
