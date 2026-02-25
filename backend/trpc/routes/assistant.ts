import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import { leadStore } from "../store/leadStore";
import { quoteStore } from "../store/quoteStore";
import { applyAssistantAnswer, getFieldMeta } from "@/utils/assistantFieldMap";
import {
  missingFields,
  canQuote,
  getIntakeStatus,
  completenessScore,
  type MissingField as GateMissingField,
  type QuoteInput as GateQuoteInput,
} from "@/utils/quoteReadiness";
import type { QuoteInput, IntakeStatus, AssistantTurn } from "@/types/intake";
import { emitWebhook } from "../utils/webhookEmitter";
import { logLeadEvent } from "../utils/logEvent";

function runGate(input: QuoteInput): {
  canQuote: boolean;
  status: IntakeStatus;
  missingFields: GateMissingField[];
  completenessScore: number;
  nextQuestion?: { en: string; es: string };
  missingRequired: { fieldKey: string; message: string }[];
  missingRecommended: { fieldKey: string; message: string }[];
} {
  const gateInput = input as unknown as GateQuoteInput;
  const missing = missingFields(gateInput);
  const rawStatus = getIntakeStatus(gateInput);
  const ready = canQuote(gateInput);
  const score = completenessScore(gateInput, missing);
  
  const status: IntakeStatus = rawStatus === 'READY_TO_QUOTE' ? 'READY_TO_QUOTE' 
    : rawStatus === 'WAITING_DOCS' ? 'WAITING_DOCS' 
    : 'NEEDS_INFO';

  const missingRequired = missing
    .filter(f => f.priority === 1 && f.severity === 'required')
    .map(f => ({
      fieldKey: f.key,
      message: input.language === 'es' ? f.label_es : f.label_en,
    }));

  const missingRecommended = missing
    .filter(f => f.severity === 'recommended')
    .map(f => ({
      fieldKey: f.key,
      message: input.language === 'es' ? f.label_es : f.label_en,
    }));

  let nextQuestion: { en: string; es: string } | undefined;
  
  if (status === 'WAITING_DOCS') {
    nextQuestion = {
      en: 'Please upload a photo/PDF of your current policy (declarations page) to begin.',
      es: 'Por favor sube una foto/PDF de tu póliza actual (declaración) para comenzar.',
    };
  } else {
    const nextField = missing.find(f => f.priority === 1) ?? missing[0];
    if (nextField) {
      nextQuestion = { en: nextField.label_en, es: nextField.label_es };
    } else if (status === 'READY_TO_QUOTE') {
      nextQuestion = {
        en: 'Great! We have everything we need. Let me prepare your quote.',
        es: '¡Perfecto! Tenemos todo lo necesario. Déjame preparar tu cotización.',
      };
    }
  }

  return {
    canQuote: ready,
    status,
    missingFields: missing,
    completenessScore: score,
    nextQuestion,
    missingRequired,
    missingRecommended,
  };
}

function pickExpectedFieldKey(gated: ReturnType<typeof runGate>): string | null {
  const required = gated.missingRequired;
  if (required.length === 0) return null;
  
  const next = required[0];
  if (!next) return null;
  
  if (next.fieldKey === 'drivers') return 'drivers[0].fullName';
  if (next.fieldKey === 'vehicles') return 'vehicles[0].vin';
  
  return next.fieldKey;
}

function buildFollowUpMessage(gated: ReturnType<typeof runGate>): { en: string; es: string } {
  if (gated.status === 'READY_TO_QUOTE') {
    return {
      en: '✅ You\'re ready! We have everything needed. We\'ll send real quotes shortly.',
      es: '✅ ¡Listo! Ya tenemos todo lo necesario. En breve te enviamos cotizaciones reales.',
    };
  }

  const q = gated.nextQuestion;
  if (!q) {
    return {
      en: 'Please complete your info to receive real quotes.',
      es: 'Por favor completa tu información para recibir cotizaciones reales.',
    };
  }

  return {
    en: `Quick question: ${q.en}`,
    es: `Una pregunta rápida: ${q.es}`,
  };
}

const intakeSchema = z.object({
  phone: z.string().optional(),
  language: z.enum(['en', 'es']).default('en'),
  consentToContact: z.boolean().optional(),
  insuredFullName: z.string().optional(),
  garagingAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  contactPreference: z.enum(['whatsapp', 'call', 'text']).optional(),
  drivers: z.array(z.object({
    fullName: z.string().optional(),
    dob: z.string().optional(),
    idType: z.enum(['TXDL', 'TX_ID', 'Matricula', 'Other']).optional(),
    idLast4: z.string().optional(),
    idPhoto: z.string().optional(),
    licenseNumber: z.string().optional(),
  })).optional(),
  vehicles: z.array(z.object({
    vin: z.string().optional(),
    year: z.number().optional(),
    make: z.string().optional(),
    model: z.string().optional(),
  })).optional(),
  coverageType: z.enum(['minimum', 'full']).optional(),
  liabilityLimits: z.string().optional(),
  collisionDeductible: z.number().optional(),
  comprehensiveDeductible: z.number().optional(),
  financedOrLienholder: z.boolean().optional(),
  currentPolicyDoc: z.string().optional(),
  currentCarrier: z.string().optional(),
  currentPremium: z.number().optional(),
  effectiveDate: z.string().optional(),
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
});

export const assistantRouter = createTRPCRouter({
  submitIntake: publicProcedure
    .input(z.object({
      userId: z.string().optional(),
      leadId: z.string().optional(),
      intake: intakeSchema,
    }))
    .mutation(async ({ input }) => {
      const intake = input.intake as QuoteInput;
      const gated = runGate(intake);

      const lead = await leadStore.upsert(input.leadId, {
        phone: intake.phone,
        language: intake.language || 'en',
        consent: intake.consentToContact === true,
        intakeJson: intake,
        status: gated.status,
        canQuote: gated.canQuote,
        score: gated.completenessScore,
        missingRequired: gated.missingRequired,
        missingRecommended: gated.missingRecommended,
        nextQuestionEn: gated.nextQuestion?.en,
        nextQuestionEs: gated.nextQuestion?.es,
      });

      const event = gated.canQuote ? 'lead.ready_to_quote' : 'lead.missing_fields_updated';
      const followUp = buildFollowUpMessage(gated);
      const expectedKey = pickExpectedFieldKey(gated);

      await logLeadEvent(lead.id, 'lead.intake_submitted', 'customer', input.userId, {
        status: gated.status,
        canQuote: gated.canQuote,
        completenessScore: gated.completenessScore,
        isNew: !input.leadId,
      });

      await emitWebhook(event as any, {
        leadId: lead.id,
        userId: input.userId,
        phone: lead.phone,
        language: intake.language || 'en',
        status: gated.status,
        canQuote: gated.canQuote,
        completenessScore: gated.completenessScore,
        missingRequired: gated.missingRequired,
        missingRecommended: gated.missingRecommended,
        nextQuestion: gated.nextQuestion,
        followUpMessage: followUp,
        expectedFieldKey: expectedKey,
      });

      const autoCreateQR = process.env.AUTO_CREATE_QUOTE_REQUEST === 'true';
      let quoteRequestId: string | undefined;
      
      const hasOpen = await quoteStore.hasOpenQuoteRequest(lead.id);
      if (autoCreateQR && gated.canQuote && !hasOpen) {
        const qr = await quoteStore.createQuoteRequest({
          leadId: lead.id,
          intakeJson: intake,
          requestedBy: 'auto',
        });
        quoteRequestId = qr.id;
        console.log(`[ASSISTANT] Auto-created QuoteRequest ${qr.id} for lead ${lead.id}`);
        
        await emitWebhook('lead.ready_to_quote' as any, {
          event: 'quote.requested',
          leadId: lead.id,
          quoteRequestId: qr.id,
          phone: lead.phone,
          language: intake.language || 'en',
          status: 'REQUESTED',
          canQuote: true,
          completenessScore: gated.completenessScore,
        });
      }

      return {
        leadId: lead.id,
        quoteRequestId,
        status: gated.status,
        canQuote: gated.canQuote,
        completenessScore: gated.completenessScore,
        missingRequired: gated.missingRequired,
        missingRecommended: gated.missingRecommended,
        nextQuestion: gated.nextQuestion,
        expectedField: expectedKey ? { fieldKey: expectedKey, ...getFieldMeta(expectedKey) } : undefined,
        followUpMessage: followUp,
      };
    }),

  getTurn: publicProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ input }) => {
      const lead = await leadStore.get(input.leadId);
      if (!lead) throw new Error('Lead not found');

      const intake = lead.intakeJson;
      const gated = runGate(intake);
      const expectedKey = pickExpectedFieldKey(gated);
      const followUp = buildFollowUpMessage(gated);

      const turn: AssistantTurn = {
        leadId: lead.id,
        status: gated.status,
        canQuote: gated.canQuote,
        completenessScore: gated.completenessScore,
        missingRequired: gated.missingRequired,
        missingRecommended: gated.missingRecommended,
        nextQuestion: gated.nextQuestion ?? {
          en: 'Please upload your policy to begin.',
          es: 'Por favor sube tu póliza para comenzar.',
        },
        expectedField: expectedKey ? { fieldKey: expectedKey, ...getFieldMeta(expectedKey) } : undefined,
        followUpMessage: followUp,
      };

      return turn;
    }),

  answer: publicProcedure
    .input(z.object({
      leadId: z.string(),
      expectedFieldKey: z.string(),
      rawAnswer: z.string(),
      userId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const lead = await leadStore.get(input.leadId);
      if (!lead) throw new Error('Lead not found');

      const currentIntake = lead.intakeJson;
      const applied = applyAssistantAnswer(currentIntake, input.expectedFieldKey, input.rawAnswer);

      if (!applied.ok) {
        const gated = runGate(currentIntake);
        return {
          leadId: lead.id,
          status: gated.status,
          canQuote: gated.canQuote,
          completenessScore: gated.completenessScore,
          missingRequired: gated.missingRequired,
          missingRecommended: gated.missingRecommended,
          nextQuestion: applied.error,
          expectedField: { fieldKey: input.expectedFieldKey, ...getFieldMeta(input.expectedFieldKey) },
          followUpMessage: applied.error,
          validationError: true,
        };
      }

      const gated = runGate(applied.updated);

      await leadStore.update(lead.id, {
        phone: applied.updated.phone ?? lead.phone,
        language: applied.updated.language,
        consent: applied.updated.consentToContact === true,
        intakeJson: applied.updated,
        status: gated.status,
        canQuote: gated.canQuote,
        score: gated.completenessScore,
        missingRequired: gated.missingRequired,
        missingRecommended: gated.missingRecommended,
        nextQuestionEn: gated.nextQuestion?.en,
        nextQuestionEs: gated.nextQuestion?.es,
      });

      const event = gated.canQuote ? 'lead.ready_to_quote' : 'lead.missing_fields_updated';
      const followUp = buildFollowUpMessage(gated);
      const expectedKey = pickExpectedFieldKey(gated);

      await logLeadEvent(lead.id, 'lead.answer_submitted', 'customer', input.userId, {
        fieldKey: input.expectedFieldKey,
        newStatus: gated.status,
        canQuote: gated.canQuote,
        completenessScore: gated.completenessScore,
      });

      await emitWebhook(event as any, {
        leadId: lead.id,
        userId: input.userId,
        phone: applied.updated.phone ?? lead.phone,
        language: applied.updated.language,
        status: gated.status,
        canQuote: gated.canQuote,
        completenessScore: gated.completenessScore,
        missingRequired: gated.missingRequired,
        missingRecommended: gated.missingRecommended,
        nextQuestion: gated.nextQuestion,
        followUpMessage: followUp,
        expectedFieldKey: expectedKey,
      });

      const autoCreateQR = process.env.AUTO_CREATE_QUOTE_REQUEST === 'true';
      let quoteRequestId: string | undefined;
      
      const hasOpen = await quoteStore.hasOpenQuoteRequest(lead.id);
      if (autoCreateQR && gated.canQuote && !hasOpen) {
        const qr = await quoteStore.createQuoteRequest({
          leadId: lead.id,
          intakeJson: applied.updated,
          requestedBy: 'auto',
        });
        quoteRequestId = qr.id;
        console.log(`[ASSISTANT] Auto-created QuoteRequest ${qr.id} for lead ${lead.id}`);
      }

      return {
        leadId: lead.id,
        quoteRequestId,
        status: gated.status,
        canQuote: gated.canQuote,
        completenessScore: gated.completenessScore,
        missingRequired: gated.missingRequired,
        missingRecommended: gated.missingRecommended,
        nextQuestion: gated.nextQuestion ?? {
          en: 'Great! We have everything we need. Let me prepare your quote.',
          es: '¡Perfecto! Tenemos todo lo necesario. Déjame preparar tu cotización.',
        },
        expectedField: expectedKey ? { fieldKey: expectedKey, ...getFieldMeta(expectedKey) } : undefined,
        followUpMessage: followUp,
        validationError: false,
      };
    }),

  getLead: publicProcedure
    .input(z.object({ leadId: z.string() }))
    .query(async ({ input }) => {
      const lead = await leadStore.get(input.leadId);
      if (!lead) return null;

      return {
        leadId: lead.id,
        phone: lead.phone,
        language: lead.language,
        status: lead.status,
        canQuote: lead.canQuote,
        completenessScore: lead.score,
        missingRequired: lead.missingRequired,
        missingRecommended: lead.missingRecommended,
        nextQuestion: {
          en: lead.nextQuestionEn ?? '',
          es: lead.nextQuestionEs ?? '',
        },
        intake: lead.intakeJson,
        assignedTo: lead.assignedTo,
        internalNotes: lead.internalNotes,
        createdAt: lead.createdAt,
        updatedAt: lead.updatedAt,
      };
    }),
});

console.log('[ASSISTANT_ROUTER] Module loaded');
