import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface LeadsTable {
  id: string;
  phone: string | null;
  language: string;
  consent: boolean;
  intake_json: Record<string, unknown>;
  status: string;
  can_quote: boolean;
  score: number;
  missing_required: { fieldKey: string; message: string }[];
  missing_recommended: { fieldKey: string; message: string }[];
  next_question_en: string | null;
  next_question_es: string | null;
  assigned_to: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteRequestsTable {
  id: string;
  lead_id: string;
  intake_json: Record<string, unknown>;
  status: string;
  assigned_to: string | null;
  requested_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface QuotesTable {
  id: string;
  quote_request_id: string;
  provider: string;
  product_name: string | null;
  term_months: number | null;
  payment_plan: string | null;
  premium_cents: number;
  down_payment_cents: number | null;
  liability_limits: string | null;
  coverage_type: string | null;
  collision_deductible: number | null;
  comprehensive_deductible: number | null;
  source: string;
  external_ref: string | null;
  raw_json: unknown | null;
  created_at: string;
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabaseClient: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  console.log('[SUPABASE] Client initialized with URL:', supabaseUrl);
} else {
  console.error('[SUPABASE] ⚠️ CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('[SUPABASE] Production requires Supabase. Leads will NOT be persisted without it.');
}

export const supabase = supabaseClient;

export function isSupabaseConfigured(): boolean {
  return supabaseClient !== null;
}

export function requireSupabase(): void {
  if (!supabaseClient) {
    throw new Error(
      'SUPABASE NOT CONFIGURED: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables. Leads cannot be saved without Supabase in production.'
    );
  }
}

export function getSupabase(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Supabase not configured - set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  return supabaseClient;
}
