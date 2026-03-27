-- Saver Insurance - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables

-- ============================================
-- LEADS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  phone TEXT,
  language TEXT NOT NULL CHECK (language IN ('en', 'es')),
  consent BOOLEAN NOT NULL DEFAULT false,
  intake_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('WAITING_DOCS', 'NEEDS_INFO', 'READY_TO_QUOTE')),
  can_quote BOOLEAN NOT NULL DEFAULT false,
  score INTEGER NOT NULL DEFAULT 0,
  missing_required JSONB NOT NULL DEFAULT '[]',
  missing_recommended JSONB NOT NULL DEFAULT '[]',
  next_question_en TEXT,
  next_question_es TEXT,
  assigned_to TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for leads
CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_can_quote ON leads(can_quote);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at DESC);

-- ============================================
-- QUOTE REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quote_requests (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  intake_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL CHECK (status IN ('REQUESTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED')),
  assigned_to TEXT,
  requested_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_lead_id ON quote_requests(lead_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_assigned_to ON quote_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quote_requests_updated_at ON quote_requests(updated_at DESC);

-- ============================================
-- QUOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  quote_request_id TEXT NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  product_name TEXT,
  term_months INTEGER,
  payment_plan TEXT,
  premium_cents INTEGER NOT NULL,
  down_payment_cents INTEGER,
  liability_limits TEXT,
  coverage_type TEXT,
  collision_deductible INTEGER,
  comprehensive_deductible INTEGER,
  source TEXT NOT NULL CHECK (source IN ('AGENT', 'API', 'COMPARATIVE_RATER')),
  external_ref TEXT,
  raw_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_quote_request_id ON quotes(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_provider ON quotes(provider);
CREATE INDEX IF NOT EXISTS idx_quotes_premium_cents ON quotes(premium_cents);

-- ============================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $func$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$func$;

-- Apply trigger to leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to quote_requests
DROP TRIGGER IF EXISTS update_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER update_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Enable RLS on all tables
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (backend access)
-- Service role bypasses RLS by default, but these are here for documentation

-- Leads policies
CREATE POLICY "Service role can manage leads" ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Quote requests policies
CREATE POLICY "Service role can manage quote_requests" ON quote_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Quotes policies
CREATE POLICY "Service role can manage quotes" ON quotes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================
-- ADMIN SCHEMA (private, not exposed to clients)
-- ============================================
CREATE SCHEMA IF NOT EXISTS admin;

-- Revoke public access to admin schema
REVOKE ALL ON SCHEMA admin FROM public;
REVOKE ALL ON SCHEMA admin FROM anon;
REVOKE ALL ON SCHEMA admin FROM authenticated;

-- Grant access only to service_role
GRANT ALL ON SCHEMA admin TO service_role;

-- ============================================
-- ADMIN VIEWS (private schema)
-- ============================================

-- Drop old public views if they exist (migration)
DROP VIEW IF EXISTS public.lead_summary;
DROP VIEW IF EXISTS public.intake_stats;

-- Lead summary view with latest quote request (admin only)
DROP VIEW IF EXISTS admin.lead_summary;
CREATE VIEW admin.lead_summary
WITH (security_invoker = true) AS
SELECT 
  l.*,
  qr.id as latest_quote_request_id,
  qr.status as latest_quote_request_status,
  qr.created_at as latest_quote_request_at,
  (SELECT COUNT(*) FROM public.quotes q WHERE q.quote_request_id = qr.id) as quote_count,
  (SELECT MIN(premium_cents) FROM public.quotes q WHERE q.quote_request_id = qr.id) as best_premium_cents
FROM public.leads l
LEFT JOIN LATERAL (
  SELECT * FROM public.quote_requests 
  WHERE lead_id = l.id 
  ORDER BY created_at DESC 
  LIMIT 1
) qr ON true;

-- Stats view (admin only)
DROP VIEW IF EXISTS admin.intake_stats;
CREATE VIEW admin.intake_stats
WITH (security_invoker = true) AS
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'WAITING_DOCS') as waiting_docs,
  COUNT(*) FILTER (WHERE status = 'NEEDS_INFO') as needs_info,
  COUNT(*) FILTER (WHERE status = 'READY_TO_QUOTE') as ready_to_quote,
  COUNT(*) FILTER (WHERE can_quote = true) as can_quote_count,
  AVG(score) as avg_score
FROM public.leads;

-- Grant view access to service_role
GRANT SELECT ON admin.lead_summary TO service_role;
GRANT SELECT ON admin.intake_stats TO service_role;

-- ============================================
-- AGENT APPLICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS agent_applications (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  licensed BOOLEAN NOT NULL,
  states TEXT NOT NULL,
  years_of_experience TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for agent_applications
CREATE INDEX IF NOT EXISTS idx_agent_applications_email ON agent_applications(email);
CREATE INDEX IF NOT EXISTS idx_agent_applications_created_at ON agent_applications(created_at DESC);

-- Enable RLS on agent_applications
ALTER TABLE agent_applications ENABLE ROW LEVEL SECURITY;

-- Agent applications policy
CREATE POLICY "Service role can manage agent_applications" ON agent_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
