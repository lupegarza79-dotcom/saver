import * as z from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../create-context";
import { db } from "@/backend/db";
import { Policy, Document, Reminder, VideoEvidence, AccidentReport } from "@/types";

const vehicleSchema = z.object({
  id: z.string(),
  vin: z.string().optional(),
  year: z.number(),
  make: z.string(),
  model: z.string(),
  color: z.string().optional(),
});

const driverSchema = z.object({
  id: z.string(),
  name: z.string(),
  dob: z.string(),
  licenseNumber: z.string().optional(),
  licenseState: z.string().optional(),
  isPrimary: z.boolean(),
});

export const policiesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      userId: z.string(),
      carrier: z.string(),
      policyNumber: z.string(),
      effectiveDate: z.string(),
      expirationDate: z.string(),
      premium: z.number(),
      paymentFrequency: z.enum(['monthly', 'quarterly', 'semi-annual', 'annual']),
      nextPaymentDue: z.string().optional(),
      deductibleComp: z.number().optional(),
      deductibleColl: z.number().optional(),
      liabilityBI: z.string().optional(),
      liabilityPD: z.string().optional(),
      coveragesSummary: z.string().optional(),
      vehicles: z.array(vehicleSchema).default([]),
      drivers: z.array(driverSchema).default([]),
    }))
    .mutation(({ input }) => {
      const { userId, ...policyData } = input;
      
      const policy: Policy = {
        id: `policy_${Date.now()}`,
        ...policyData,
        isActive: true,
      };

      console.log(`[POLICIES] Creating policy for user ${userId}: ${policy.carrier}`);
      return db.createPolicy(policy, userId);
    }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      return db.getPolicy(input.id);
    }),

  list: publicProcedure.query(() => {
    return db.getAllPolicies();
  }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      carrier: z.string().optional(),
      premium: z.number().optional(),
      nextPaymentDue: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(({ input }) => {
      const { id, ...updates } = input;
      return db.updatePolicy(id, updates);
    }),
});

export const documentsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      userId: z.string(),
      caseId: z.string().optional(),
      policyId: z.string().optional(),
      type: z.enum(['DEC_PAGE', 'ID_CARD', 'DRIVER_LICENSE', 'REGISTRATION', 'OTHER']),
      name: z.string(),
      url: z.string(),
      source: z.enum(['whatsapp', 'upload_link', 'camera']),
    }))
    .mutation(({ input }) => {
      const { userId, ...docData } = input;
      
      const doc: Document = {
        id: `doc_${Date.now()}`,
        ...docData,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'user',
      };

      console.log(`[DOCUMENTS] Creating document for user ${userId}: ${doc.type}`);
      return db.createDocument(doc, userId);
    }),

  list: publicProcedure.query(() => {
    return db.getAllDocuments();
  }),
});

export const remindersRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      userId: z.string(),
      policyId: z.string(),
      type: z.enum(['payment', 'renewal']),
      dueAt: z.string(),
      amount: z.number().optional(),
      channel: z.enum(['whatsapp', 'sms', 'email']).default('whatsapp'),
    }))
    .mutation(({ input }) => {
      const { userId, ...reminderData } = input;
      
      const reminder: Reminder = {
        id: `reminder_${Date.now()}`,
        ...reminderData,
        status: 'pending',
      };

      console.log(`[REMINDERS] Creating reminder for user ${userId}: ${reminder.type}`);
      return db.createReminder(reminder, userId);
    }),

  list: publicProcedure.query(() => {
    return db.getAllReminders();
  }),

  upcoming: publicProcedure
    .input(z.object({ days: z.number().default(7) }))
    .query(({ input }) => {
      return db.getUpcomingReminders(input.days);
    }),

  markPaid: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ input }) => {
      return db.updateReminder(input.id, { 
        status: 'completed', 
        paidAt: new Date().toISOString() 
      });
    }),

  snooze: protectedProcedure
    .input(z.object({ id: z.string(), days: z.number() }))
    .mutation(({ input }) => {
      const snoozeUntil = new Date();
      snoozeUntil.setDate(snoozeUntil.getDate() + input.days);
      return db.updateReminder(input.id, { 
        status: 'snoozed', 
        snoozeUntil: snoozeUntil.toISOString() 
      });
    }),
});

export const videoEvidenceRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      userId: z.string(),
      policyId: z.string().optional(),
      caseId: z.string().optional(),
      type: z.enum(['pre_inspection', 'incident']),
      videoUrl: z.string(),
      thumbnailUrl: z.string().optional(),
      gpsLat: z.number().optional(),
      gpsLng: z.number().optional(),
      durationSeconds: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const evidence: VideoEvidence = {
        id: `evidence_${Date.now()}`,
        ...input,
        capturedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log(`[VIDEO_EVIDENCE] Creating evidence for user ${input.userId}: ${evidence.type}`);
      return db.createVideoEvidence(evidence);
    }),

  list: publicProcedure.query(() => {
    return db.getAllVideoEvidence();
  }),
});

export const accidentReportsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(z.object({
      userId: z.string(),
      policyId: z.string(),
      location: z.object({
        latitude: z.number(),
        longitude: z.number(),
        address: z.string().optional(),
      }).optional(),
      photos: z.array(z.string()).default([]),
      otherDriverInfo: z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        insurance: z.string().optional(),
        policyNumber: z.string().optional(),
        licensePlate: z.string().optional(),
      }).optional(),
      policeReportNumber: z.string().optional(),
      notes: z.string().optional(),
      evidenceVideoId: z.string().optional(),
    }))
    .mutation(({ input }) => {
      const { userId, ...reportData } = input;
      
      const report: AccidentReport = {
        id: `accident_${Date.now()}`,
        ...reportData,
        createdAt: new Date().toISOString(),
        submittedToInsurance: false,
        checklistCompleted: {
          safety: false,
          emergency: false,
          exchangeInfo: false,
          photos: false,
          policeReport: false,
        },
      };

      console.log(`[ACCIDENT_REPORTS] Creating report for user ${userId}`);
      return db.createAccidentReport(report, userId);
    }),

  list: publicProcedure.query(() => {
    return db.getAllAccidentReports();
  }),
});
