import { supabase } from '@/lib/supabase';
import { checkQuoteReadiness, getRequiredMissing, getRecommendedMissing } from '@/utils/quoteReadiness';
import type { IntakeStatus } from '@/types/intake';
import { quoteFormToIntakeJson, uploadIntakeToIntakeJson } from './intakeAdapter';
import type { QuoteInput } from '@/types/intake';
import type { LeadInsert } from '@/backend/supabase/types';

export type ContactPreference = 'whatsapp' | 'text' | 'call';

export interface QuoteFormPayload {
  phone: string;
  fullName: string;
  zip: string;
  drivers: { name: string; dob: string }[];
  vehiclesCount: number;
  vins: string[];
  coverage: 'minimum' | 'full';
  currentlyInsured: boolean | null;
  insuredMonths: string | null;
  homeowner: boolean | null;
  contactPreference: ContactPreference;
  language: 'en' | 'es';
  consentGiven: boolean;
}

export interface UploadIntakePayload {
  insuredFullName?: string;
  phone?: string;
  zip?: string;
  contactPreference: ContactPreference;
  language: 'en' | 'es';
  consentGiven: boolean;
  drivers: {
    fullName?: string;
    dob?: string;
    idLast4?: string;
  }[];
  vehicles: {
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
  }[];
  coverageType?: 'minimum' | 'full';
  liabilityLimits?: string;
  collisionDeductible?: number;
  compDeductible?: number;
  currentCarrier?: string;
  currentPremium?: number;
  policyExpiryDate?: string;
  currentPolicyDoc?: string;
}

export interface ReferralPayload {
  referrerPhone?: string;
  referredName: string;
  referredPhone: string;
  language: 'en' | 'es';
  source: 'app_referral';
}

export interface SubmitResult {
  success: boolean;
  leadId?: string;
  error?: string;
}

function generateLeadId(): string {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildLeadInsert(
  intakeJson: QuoteInput,
  phone: string | undefined,
  language: 'en' | 'es',
  consent: boolean,
): LeadInsert {
  const readiness = checkQuoteReadiness(intakeJson);
  const requiredMissing = getRequiredMissing(intakeJson);
  const recommendedMissing = getRecommendedMissing(intakeJson);

  const missingRequired = requiredMissing.map((f) => ({
    fieldKey: f.key,
    message: f.label_en,
  }));

  const missingRecommended = recommendedMissing.map((f) => ({
    fieldKey: f.key,
    message: f.label_en,
  }));

  const nextQuestion = readiness.nextQuestion;

  const leadInsert: LeadInsert = {
    id: generateLeadId(),
    phone: phone?.replace(/\D/g, '') || null,
    language,
    consent,
    intake_json: intakeJson,
    status: readiness.status as IntakeStatus,
    can_quote: readiness.canQuote,
    score: readiness.completenessScore,
    missing_required: missingRequired,
    missing_recommended: missingRecommended,
    next_question_en: nextQuestion?.en ?? null,
    next_question_es: nextQuestion?.es ?? null,
  };

  console.log('[IntakeService] buildLeadInsert:', {
    id: leadInsert.id,
    status: leadInsert.status,
    can_quote: leadInsert.can_quote,
    score: leadInsert.score,
    missingRequired: missingRequired.length,
    missingRecommended: missingRecommended.length,
  });

  return leadInsert;
}

export async function submitQuoteForm(payload: QuoteFormPayload): Promise<SubmitResult> {
  console.log('[IntakeService] submitQuoteForm called');

  try {
    const intakeJson = quoteFormToIntakeJson(payload);
    const leadInsert = buildLeadInsert(
      intakeJson,
      payload.phone,
      payload.language,
      payload.consentGiven,
    );

    console.log('[IntakeService] Inserting lead:', leadInsert.id);

    const { error } = await supabase.from('leads').insert(leadInsert as unknown as Record<string, unknown>);
    if (error) {
      console.error('[IntakeService] submitQuoteForm insert error:', error);
      return { success: false, error: error.message };
    }

    console.log('[IntakeService] Quote form submitted successfully, leadId:', leadInsert.id);
    return { success: true, leadId: leadInsert.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[IntakeService] submitQuoteForm exception:', message);
    return { success: false, error: message };
  }
}

export async function submitUploadIntake(payload: UploadIntakePayload): Promise<SubmitResult> {
  console.log('[IntakeService] submitUploadIntake called');

  try {
    const intakeJson = uploadIntakeToIntakeJson(payload);
    const leadInsert = buildLeadInsert(
      intakeJson,
      payload.phone,
      payload.language,
      payload.consentGiven,
    );

    console.log('[IntakeService] Inserting lead:', leadInsert.id);

    const { error } = await supabase.from('leads').insert(leadInsert as unknown as Record<string, unknown>);
    if (error) {
      console.error('[IntakeService] submitUploadIntake insert error:', error);
      return { success: false, error: error.message };
    }

    console.log('[IntakeService] Upload intake submitted successfully, leadId:', leadInsert.id);
    return { success: true, leadId: leadInsert.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[IntakeService] submitUploadIntake exception:', message);
    return { success: false, error: message };
  }
}

export async function submitReferral(payload: ReferralPayload): Promise<SubmitResult> {
  console.log('[IntakeService] submitReferral called');

  try {
    const intakeJson: QuoteInput = {
      insuredFullName: payload.referredName.trim(),
      phone: payload.referredPhone.replace(/\D/g, ''),
      language: payload.language,
      consentToContact: false,
    };

    const leadInsert = buildLeadInsert(
      intakeJson,
      payload.referredPhone,
      payload.language,
      false,
    );

    console.log('[IntakeService] Inserting referral as lead:', leadInsert.id);

    const { error } = await supabase.from('leads').insert(leadInsert as unknown as Record<string, unknown>);
    if (error) {
      console.error('[IntakeService] submitReferral insert error (referrals table may not exist, writing to leads):', error);
      return { success: false, error: error.message };
    }

    console.log('[IntakeService] Referral submitted successfully as lead, leadId:', leadInsert.id);
    return { success: true, leadId: leadInsert.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[IntakeService] submitReferral exception:', message);
    return { success: false, error: message };
  }
}

export const IntakeService = {
  submitQuoteForm,
  submitUploadIntake,
  submitReferral,
};

export default IntakeService;
