import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { 
  missingFields, 
  canQuote, 
  getIntakeStatus, 
  buildMissingFieldsMessage,
  IntakeCase,
} from "../utils/intakeGate";
import { 
  emitWebhook,
  emitLeadMissingFieldsUpdated,
  emitLeadReadyToQuote,
  buildMissingFieldsWhatsAppMessage,
} from "../utils/webhookEmitter";
import { leadStore } from "../store/leadStore";
import { isSupabaseConfigured } from "@/backend/supabase/client";
import type { IntakeStatus } from "@/types/intake";

const intakeDriverSchema = z.object({
  fullName: z.string().optional(),
  dob: z.string().optional(),
  idType: z.enum(['TXDL', 'TX_ID', 'Matricula', 'Other']).optional(),
  idLast4: z.string().optional(),
  idPhoto: z.string().optional(),
});

const intakeVehicleSchema = z.object({
  vin: z.string().optional(),
  year: z.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
});

const intakeCaseSchema = z.object({
  insuredFullName: z.string().optional(),
  phone: z.string().optional(),
  garagingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  contactPreference: z.enum(['whatsapp', 'call', 'text']).optional(),
  language: z.enum(['en', 'es']).default('en'),
  drivers: z.array(intakeDriverSchema).optional(),
  vehicles: z.array(intakeVehicleSchema).optional(),
  coverageType: z.enum(['minimum', 'full']).optional(),
  liabilityLimits: z.string().optional(),
  collisionDeductible: z.number().optional(),
  compDeductible: z.number().optional(),
  financedOrLienholder: z.boolean().optional(),
  currentPolicyDoc: z.string().optional(),
  currentCarrier: z.string().optional(),
  currentPremium: z.number().optional(),
  policyExpiryDate: z.string().optional(),
  drivingHistory: z.object({
    hasTicketsOrAccidents: z.boolean().optional(),
    details: z.string().optional(),
  }).optional(),
  extras: z.object({
    roadside: z.boolean().optional(),
    rentalReimbursement: z.boolean().optional(),
    umUim: z.boolean().optional(),
    pip: z.boolean().optional(),
    medPay: z.boolean().optional(),
  }).optional(),
  consentContactAllowed: z.boolean().optional(),
});

export const intakeRouter = createTRPCRouter({
  submit: publicProcedure
    .input(z.object({
      userId: z.string(),
      intake: intakeCaseSchema,
    }))
    .mutation(async ({ input }) => {
      const { userId, intake } = input;
      const language = intake.language || 'en';
      
      console.log(`[INTAKE] Processing intake for user ${userId}`);
      
      const missing = missingFields(intake as IntakeCase);
      const ready = canQuote(intake as IntakeCase);
      const status = getIntakeStatus(intake as IntakeCase);
      const messageData = buildMissingFieldsMessage(intake as IntakeCase, language);
      
      const requiredMissing = missing.filter(f => f.severity === 'required');
      const recommendedMissing = missing.filter(f => f.severity === 'recommended');
      
      const completenessScore = Math.max(0, 100 - (requiredMissing.length * 10) - (recommendedMissing.length * 3));
      
      console.log(`[INTAKE] Status: ${status}, Ready: ${ready}, Missing: ${missing.length}`);
      console.log(`[INTAKE] Supabase configured: ${isSupabaseConfigured()}`);
      
      // Map LeadIntakeStatus to IntakeStatus for storage
      const mapStatusToIntakeStatus = (s: string): IntakeStatus => {
        if (s === 'READY_TO_QUOTE') return 'READY_TO_QUOTE';
        if (s === 'NEEDS_INFO') return 'NEEDS_INFO';
        return 'WAITING_DOCS';
      };
      
      // Persist to Supabase via leadStore if configured
      let leadId: string;
      try {
        const leadRecord = await leadStore.create({
          phone: intake.phone,
          language: language as 'en' | 'es',
          consent: intake.consentContactAllowed ?? false,
          intakeJson: intake as any,
          status: mapStatusToIntakeStatus(status),
          canQuote: ready,
          score: completenessScore,
          missingRequired: requiredMissing.map(f => ({ fieldKey: f.key, message: f.context || f.labelKey })),
          missingRecommended: recommendedMissing.map(f => ({ fieldKey: f.key, message: f.context || f.labelKey })),
          nextQuestionEn: messageData.required[0] || undefined,
          nextQuestionEs: messageData.required[0] || undefined,
        });
        leadId = leadRecord.id;
        console.log(`[INTAKE] Lead persisted to ${isSupabaseConfigured() ? 'Supabase' : 'memory'}: ${leadId}`);
      } catch (err) {
        console.error(`[INTAKE] Failed to persist lead:`, err);
        leadId = `lead_${Date.now()}`;
      }
      
      if (ready) {
        console.log(`[INTAKE] Lead ${leadId} is READY_TO_QUOTE, emitting webhook`);
        
        await emitWebhook('lead.ready_to_quote', {
          leadId,
          userId,
          phone: intake.phone,
          language,
          status: 'READY_TO_QUOTE',
          intake: {
            insuredFullName: intake.insuredFullName,
            vehicles: intake.vehicles?.length || 0,
            drivers: intake.drivers?.length || 0,
            coverageType: intake.coverageType,
            liabilityLimits: intake.liabilityLimits,
          },
          readyAt: new Date().toISOString(),
        });
      } else {
        console.log(`[INTAKE] Lead ${leadId} needs more info, emitting missing_fields webhook`);
        
        const whatsappMessageEn = buildMissingFieldsWhatsAppMessage(messageData.required, 'en');
        const whatsappMessageEs = buildMissingFieldsWhatsAppMessage(messageData.required, 'es');
        
        await emitLeadMissingFieldsUpdated({
          leadId,
          userId,
          phone: intake.phone || '',
          language,
          status,
          missingRequired: requiredMissing,
          missingRecommended: recommendedMissing,
          canQuote: false,
          missingFieldsMessageEn: whatsappMessageEn,
          missingFieldsMessageEs: whatsappMessageEs,
          updatedAt: new Date().toISOString(),
        });
      }
      
      return {
        leadId,
        status,
        ready,
        completenessScore,
        missingRequired: messageData.required,
        missingRecommended: messageData.recommended,
        missingFields: missing,
        message: ready 
          ? (language === 'es' ? '✅ ¡Listo para cotizar!' : '✅ Ready to quote!')
          : buildMissingFieldsWhatsAppMessage(messageData.required, language),
      };
    }),

  getMissingFields: publicProcedure
    .input(z.object({
      intake: intakeCaseSchema,
      language: z.enum(['en', 'es']).default('en'),
    }))
    .query(({ input }) => {
      const { intake, language } = input;
      
      const missing = missingFields(intake as IntakeCase);
      const ready = canQuote(intake as IntakeCase);
      const status = getIntakeStatus(intake as IntakeCase);
      const messageData = buildMissingFieldsMessage(intake as IntakeCase, language);
      
      const requiredMissing = missing.filter(f => f.severity === 'required');
      const recommendedMissing = missing.filter(f => f.severity === 'recommended');
      const completenessScore = Math.max(0, 100 - (requiredMissing.length * 10) - (recommendedMissing.length * 3));
      
      return {
        status,
        ready,
        completenessScore,
        missingRequired: messageData.required,
        missingRecommended: messageData.recommended,
        missingFields: missing,
        nextQuestion: ready ? null : messageData.required[0],
      };
    }),

  submitField: publicProcedure
    .input(z.object({
      userId: z.string(),
      leadId: z.string(),
      key: z.string(),
      value: z.unknown(),
      currentIntake: intakeCaseSchema,
    }))
    .mutation(async ({ input }) => {
      const { userId, leadId, key, value, currentIntake } = input;
      const language = currentIntake.language || 'en';
      
      console.log(`[INTAKE] Field update for lead ${leadId}: ${key} = ${JSON.stringify(value)}`);
      
      const updatedIntake = { ...currentIntake };
      
      if (key === 'insuredFullName') updatedIntake.insuredFullName = value as string;
      else if (key === 'phone') updatedIntake.phone = value as string;
      else if (key === 'garagingAddress.zip') {
        updatedIntake.garagingAddress = { ...updatedIntake.garagingAddress, zip: value as string };
      }
      else if (key === 'coverageType') updatedIntake.coverageType = value as 'minimum' | 'full';
      else if (key === 'liabilityLimits') updatedIntake.liabilityLimits = value as string;
      else if (key === 'collisionDeductible') updatedIntake.collisionDeductible = value as number;
      else if (key === 'compDeductible') updatedIntake.compDeductible = value as number;
      else if (key.startsWith('vehicles[') && key.includes('.vin')) {
        const idx = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
        if (!updatedIntake.vehicles) updatedIntake.vehicles = [];
        if (!updatedIntake.vehicles[idx]) updatedIntake.vehicles[idx] = {};
        updatedIntake.vehicles[idx].vin = value as string;
      }
      else if (key.startsWith('drivers[') && key.includes('.dob')) {
        const idx = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
        if (!updatedIntake.drivers) updatedIntake.drivers = [];
        if (!updatedIntake.drivers[idx]) updatedIntake.drivers[idx] = {};
        updatedIntake.drivers[idx].dob = value as string;
      }
      else if (key.startsWith('drivers[') && key.includes('.fullName')) {
        const idx = parseInt(key.match(/\[(\d+)\]/)?.[1] || '0');
        if (!updatedIntake.drivers) updatedIntake.drivers = [];
        if (!updatedIntake.drivers[idx]) updatedIntake.drivers[idx] = {};
        updatedIntake.drivers[idx].fullName = value as string;
      }
      
      const missing = missingFields(updatedIntake as IntakeCase);
      const ready = canQuote(updatedIntake as IntakeCase);
      const status = getIntakeStatus(updatedIntake as IntakeCase);
      const messageData = buildMissingFieldsMessage(updatedIntake as IntakeCase, language);
      
      const requiredMissing = missing.filter(f => f.severity === 'required');
      const recommendedMissing = missing.filter(f => f.severity === 'recommended');
      const completenessScore = Math.max(0, 100 - (requiredMissing.length * 10) - (recommendedMissing.length * 3));
      
      await emitWebhook('lead.updated', {
        leadId,
        userId,
        fieldUpdated: key,
        newStatus: status,
        completenessScore,
        updatedAt: new Date().toISOString(),
      });
      
      if (ready) {
        await emitLeadReadyToQuote({
          leadId,
          userId,
          phone: updatedIntake.phone || '',
          language,
        });
      }
      
      return {
        status,
        ready,
        completenessScore,
        missingRequired: messageData.required,
        missingRecommended: messageData.recommended,
        missingFields: missing,
        updatedIntake,
        nextQuestion: ready ? null : messageData.required[0],
      };
    }),
});

console.log('[INTAKE_ROUTER] Module loaded');
