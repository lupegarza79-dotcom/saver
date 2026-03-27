import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/contexts/AppContext';
import type { IntakeStatus } from '@/types';
import type { QuoteInput, MissingField } from '@/utils/quoteReadiness';

export interface SaverLead {
  id: string;
  phone?: string;
  language: string;
  consent: boolean;
  intake_json: QuoteInput;
  status: string;
  can_quote: boolean;
  score: number;
  missing_required: { fieldKey: string; message: string }[];
  missing_recommended: { fieldKey: string; message: string }[];
  next_question_en?: string;
  next_question_es?: string;
  created_at: string;
  updated_at: string;
}

export const [SaverProvider, useSaver] = createContextHook(() => {
  const { user, language } = useApp();
  const queryClient = useQueryClient();
  const [currentLeadId, setCurrentLeadId] = useState<string | null>(null);

  const leadsQuery = useQuery({
    queryKey: ['saver-leads', user?.phone],
    queryFn: async () => {
      if (!user?.phone) return [];
      console.log('[SaverContext] Fetching leads for phone:', user.phone);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('phone', user.phone)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('[SaverContext] Error fetching leads:', error);
        return [];
      }
      console.log('[SaverContext] Fetched', data?.length, 'leads');
      return (data || []) as SaverLead[];
    },
    enabled: !!user?.phone,
    staleTime: 30000,
  });

  const submitQuoteMutation = useMutation({
    mutationFn: async (payload: {
      phone: string;
      full_name: string;
      zip: string;
      vehicles: { vin: string }[];
      drivers: { name: string; dob: string }[];
      coverage_type: string;
      currently_insured: boolean | null;
      insured_months: string | null;
      homeowner: boolean | null;
    }) => {
      console.log('[SaverContext] Submitting quote to Supabase:', payload);
      const { error } = await supabase.from('leads').insert({
        ...payload,
        source: 'quote-form',
        status: 'new',
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.error('[SaverContext] Quote submit error:', error);
        throw new Error(error.message);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saver-leads'] });
    },
  });

  const submitAgentApplicationMutation = useMutation({
    mutationFn: async (payload: {
      full_name: string;
      phone: string;
      email: string;
      licensed: boolean;
      states: string;
      years_experience: number | null;
      notes: string | null;
    }) => {
      console.log('[SaverContext] Submitting agent application:', payload);
      const { error } = await supabase.from('agent_applications').insert({
        ...payload,
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.error('[SaverContext] Agent application error:', error);
        throw new Error(error.message);
      }
      return { success: true };
    },
  });

  const submitIntakeMutation = useMutation({
    mutationFn: async (payload: {
      intake: QuoteInput;
      userId: string;
    }) => {
      console.log('[SaverContext] Submitting intake:', payload.userId);
      const {
        missingFields: missingFieldsFn,
        canQuote,
        getIntakeStatus,
      } = await import('@/utils/quoteReadiness');

      const missing = missingFieldsFn(payload.intake);
      const ready = canQuote(payload.intake);
      const status = getIntakeStatus(payload.intake);

      const leadId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const { error } = await supabase.from('leads').insert({
        id: leadId,
        phone: payload.intake.phone,
        language: payload.intake.language || language,
        consent: payload.intake.consentContactAllowed || false,
        intake_json: payload.intake,
        status: status,
        can_quote: ready,
        score: Math.round((1 - missing.length / 15) * 100),
        missing_required: missing
          .filter((m: MissingField) => m.severity === 'required')
          .map((m: MissingField) => ({ fieldKey: m.key, message: m.label_en })),
        missing_recommended: missing
          .filter((m: MissingField) => m.severity === 'recommended')
          .map((m: MissingField) => ({ fieldKey: m.key, message: m.label_en })),
        next_question_en: missing[0]?.label_en,
        next_question_es: missing[0]?.label_es,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('[SaverContext] Intake insert error:', error);
        throw new Error(error.message);
      }

      setCurrentLeadId(leadId);
      queryClient.invalidateQueries({ queryKey: ['saver-leads'] });

      return {
        leadId,
        status,
        ready,
        missingCount: missing.length,
      };
    },
  });

  const latestLead = useMemo(() => {
    return leadsQuery.data?.[0] ?? null;
  }, [leadsQuery.data]);

  const leadStatus = useMemo((): IntakeStatus | null => {
    if (!latestLead) return null;
    return latestLead.status as IntakeStatus;
  }, [latestLead]);

  return {
    leads: leadsQuery.data ?? [],
    isLoadingLeads: leadsQuery.isLoading,
    latestLead,
    leadStatus,
    currentLeadId,
    setCurrentLeadId,
    submitQuote: submitQuoteMutation,
    submitAgentApplication: submitAgentApplicationMutation,
    submitIntake: submitIntakeMutation,
    refreshLeads: () => queryClient.invalidateQueries({ queryKey: ['saver-leads'] }),
  };
});
