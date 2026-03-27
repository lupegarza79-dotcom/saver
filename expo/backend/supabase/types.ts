import type { QuoteInput, IntakeStatus, Language, QuoteRequestStatus } from '@/types/intake';

export interface Database {
  public: {
    Tables: {
      leads: {
        Row: LeadRow;
        Insert: LeadInsert;
        Update: LeadUpdate;
      };
      quote_requests: {
        Row: QuoteRequestRow;
        Insert: QuoteRequestInsert;
        Update: QuoteRequestUpdate;
      };
      quotes: {
        Row: QuoteRow;
        Insert: QuoteInsert;
        Update: QuoteUpdate;
      };
    };
  };
}

export interface LeadRow {
  id: string;
  phone: string | null;
  language: Language;
  consent: boolean;
  intake_json: QuoteInput;
  status: IntakeStatus;
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

export interface LeadInsert {
  id: string;
  phone?: string | null;
  language: Language;
  consent: boolean;
  intake_json: QuoteInput;
  status: IntakeStatus;
  can_quote: boolean;
  score: number;
  missing_required: { fieldKey: string; message: string }[];
  missing_recommended: { fieldKey: string; message: string }[];
  next_question_en?: string | null;
  next_question_es?: string | null;
  assigned_to?: string | null;
  internal_notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface LeadUpdate {
  phone?: string | null;
  language?: Language;
  consent?: boolean;
  intake_json?: QuoteInput;
  status?: IntakeStatus;
  can_quote?: boolean;
  score?: number;
  missing_required?: { fieldKey: string; message: string }[];
  missing_recommended?: { fieldKey: string; message: string }[];
  next_question_en?: string | null;
  next_question_es?: string | null;
  assigned_to?: string | null;
  internal_notes?: string | null;
  updated_at?: string;
}

export interface QuoteRequestRow {
  id: string;
  lead_id: string;
  intake_json: QuoteInput;
  status: QuoteRequestStatus;
  assigned_to: string | null;
  requested_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface QuoteRequestInsert {
  id: string;
  lead_id: string;
  intake_json: QuoteInput;
  status: QuoteRequestStatus;
  assigned_to?: string | null;
  requested_by?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
}

export interface QuoteRequestUpdate {
  lead_id?: string;
  intake_json?: QuoteInput;
  status?: QuoteRequestStatus;
  assigned_to?: string | null;
  requested_by?: string | null;
  notes?: string | null;
  updated_at?: string;
  completed_at?: string | null;
}

export interface QuoteRow {
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
  source: 'AGENT' | 'API' | 'COMPARATIVE_RATER';
  external_ref: string | null;
  raw_json: unknown | null;
  created_at: string;
}

export interface QuoteInsert {
  id: string;
  quote_request_id: string;
  provider: string;
  product_name?: string | null;
  term_months?: number | null;
  payment_plan?: string | null;
  premium_cents: number;
  down_payment_cents?: number | null;
  liability_limits?: string | null;
  coverage_type?: string | null;
  collision_deductible?: number | null;
  comprehensive_deductible?: number | null;
  source: 'AGENT' | 'API' | 'COMPARATIVE_RATER';
  external_ref?: string | null;
  raw_json?: unknown | null;
  created_at?: string;
}

export interface QuoteUpdate {
  quote_request_id?: string;
  provider?: string;
  product_name?: string | null;
  term_months?: number | null;
  payment_plan?: string | null;
  premium_cents?: number;
  down_payment_cents?: number | null;
  liability_limits?: string | null;
  coverage_type?: string | null;
  collision_deductible?: number | null;
  comprehensive_deductible?: number | null;
  source?: 'AGENT' | 'API' | 'COMPARATIVE_RATER';
  external_ref?: string | null;
  raw_json?: unknown | null;
}
