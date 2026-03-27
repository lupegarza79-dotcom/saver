-- ============================================
-- SAVER OS - Complete Schema Migration v2
-- Run AFTER schema.sql (additive migration)
-- ============================================

-- ============================================
-- 1. EXTEND LEADS TABLE
-- ============================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS preferred_channel TEXT CHECK (preferred_channel IN ('whatsapp', 'sms', 'email', 'call')) DEFAULT 'whatsapp';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('app', 'whatsapp', 'referral', 'upload', 'agent', 'manual')) DEFAULT 'app';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referral_id TEXT;

CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);

-- ============================================
-- 2. LEAD_EVENTS TABLE (Event Ledger / Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS lead_events (
  id TEXT PRIMARY KEY DEFAULT ('evt_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('IAT1', 'IAT2', 'IAT3', 'IAM', 'system', 'customer')),
  actor_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_lead_id ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_event_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_actor_role ON lead_events(actor_role);
CREATE INDEX IF NOT EXISTS idx_lead_events_created_at ON lead_events(created_at DESC);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage lead_events" ON lead_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 3. LEAD_COMMUNICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_communications (
  id TEXT PRIMARY KEY DEFAULT ('comm_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'call', 'in_app')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message_type TEXT NOT NULL CHECK (message_type IN ('initial_contact', 'follow_up', 'quote_delivery', 'reminder', 'escalation', 'info_request', 'commitment', 'general')),
  content TEXT,
  sent_by_role TEXT CHECK (sent_by_role IN ('IAT1', 'IAT2', 'IAT3', 'IAM', 'system', 'customer')),
  sent_by_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')) DEFAULT 'sent',
  external_ref TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_comms_lead_id ON lead_communications(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_comms_channel ON lead_communications(channel);
CREATE INDEX IF NOT EXISTS idx_lead_comms_created_at ON lead_communications(created_at DESC);

ALTER TABLE lead_communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage lead_communications" ON lead_communications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 4. LEAD_FOLLOWUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_followups (
  id TEXT PRIMARY KEY DEFAULT ('fu_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('scheduled', 'sla_warning', 'escalation', 'commitment_check', 'recheck_savings', 'renewal_prompt')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'skipped', 'escalated', 'overdue')) DEFAULT 'pending',
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  assigned_to_role TEXT CHECK (assigned_to_role IN ('IAT1', 'IAT2', 'IAT3', 'IAM')),
  assigned_to_id TEXT,
  escalation_target_role TEXT CHECK (escalation_target_role IN ('IAT1', 'IAT2', 'IAT3', 'IAM')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
  reason TEXT,
  outcome TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_followups_lead_id ON lead_followups(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_followups_status ON lead_followups(status);
CREATE INDEX IF NOT EXISTS idx_lead_followups_due_at ON lead_followups(due_at);
CREATE INDEX IF NOT EXISTS idx_lead_followups_assigned_to_role ON lead_followups(assigned_to_role);

ALTER TABLE lead_followups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage lead_followups" ON lead_followups
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_lead_followups_updated_at ON lead_followups;
CREATE TRIGGER update_lead_followups_updated_at
  BEFORE UPDATE ON lead_followups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. LEAD_COMMITMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS lead_commitments (
  id TEXT PRIMARY KEY DEFAULT ('cmt_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('callback', 'reminder', 'recheck', 'document_upload', 'custom')),
  promised_at TIMESTAMPTZ NOT NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'email', 'call')),
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'honored', 'missed', 'rescheduled', 'cancelled')) DEFAULT 'pending',
  honored_at TIMESTAMPTZ,
  followup_id TEXT REFERENCES lead_followups(id),
  created_by_role TEXT CHECK (created_by_role IN ('IAT1', 'IAT2', 'IAT3', 'IAM', 'system', 'customer')),
  created_by_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_commitments_lead_id ON lead_commitments(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_commitments_status ON lead_commitments(status);
CREATE INDEX IF NOT EXISTS idx_lead_commitments_promised_at ON lead_commitments(promised_at);

ALTER TABLE lead_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage lead_commitments" ON lead_commitments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_lead_commitments_updated_at ON lead_commitments;
CREATE TRIGGER update_lead_commitments_updated_at
  BEFORE UPDATE ON lead_commitments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. POLICIES TABLE (Retention Engine / Policy Vault)
-- ============================================
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY DEFAULT ('pol_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  phone TEXT,
  carrier TEXT NOT NULL,
  policy_number TEXT,
  product_type TEXT CHECK (product_type IN ('auto', 'home', 'commercial', 'life', 'health', 'other')) DEFAULT 'auto',
  effective_date DATE,
  expiration_date DATE,
  premium_cents INTEGER,
  payment_frequency TEXT CHECK (payment_frequency IN ('monthly', 'quarterly', 'semi_annual', 'annual')) DEFAULT 'monthly',
  next_payment_due DATE,
  next_payment_amount_cents INTEGER,
  deductible_collision INTEGER,
  deductible_comprehensive INTEGER,
  liability_bi TEXT,
  liability_pd TEXT,
  coverages_summary TEXT,
  vehicles_json JSONB DEFAULT '[]',
  drivers_json JSONB DEFAULT '[]',
  documents_json JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  bound_via_saver BOOLEAN DEFAULT false,
  original_quote_id TEXT REFERENCES quotes(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policies_lead_id ON policies(lead_id);
CREATE INDEX IF NOT EXISTS idx_policies_phone ON policies(phone);
CREATE INDEX IF NOT EXISTS idx_policies_carrier ON policies(carrier);
CREATE INDEX IF NOT EXISTS idx_policies_expiration_date ON policies(expiration_date);
CREATE INDEX IF NOT EXISTS idx_policies_is_active ON policies(is_active);

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage policies" ON policies
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_policies_updated_at ON policies;
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. PAYMENT_REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payment_reminders (
  id TEXT PRIMARY KEY DEFAULT ('pmr_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  policy_id TEXT REFERENCES policies(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  phone TEXT,
  carrier TEXT,
  amount_cents INTEGER,
  due_date DATE NOT NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'email')) DEFAULT 'whatsapp',
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'snoozed', 'paid', 'overdue', 'cancelled')) DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  snoozed_until DATE,
  recurrence TEXT CHECK (recurrence IN ('once', 'monthly', 'quarterly', 'semi_annual', 'annual')) DEFAULT 'monthly',
  rescue_attempted BOOLEAN DEFAULT false,
  rescue_outcome TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_policy_id ON payment_reminders(policy_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_due_date ON payment_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_phone ON payment_reminders(phone);

ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage payment_reminders" ON payment_reminders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_payment_reminders_updated_at ON payment_reminders;
CREATE TRIGGER update_payment_reminders_updated_at
  BEFORE UPDATE ON payment_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 8. RENEWAL_REMINDERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS renewal_reminders (
  id TEXT PRIMARY KEY DEFAULT ('rnw_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  policy_id TEXT REFERENCES policies(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  phone TEXT,
  carrier TEXT,
  renewal_date DATE NOT NULL,
  channel TEXT CHECK (channel IN ('whatsapp', 'sms', 'email')) DEFAULT 'whatsapp',
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent_30d', 'sent_7d', 'sent_1d', 'renewed', 'lapsed', 'requoted', 'cancelled')) DEFAULT 'pending',
  recheck_savings BOOLEAN DEFAULT true,
  recheck_result TEXT CHECK (recheck_result IN ('savings_found', 'no_savings', 'pending', 'not_checked')),
  savings_amount_cents INTEGER,
  new_quote_request_id TEXT REFERENCES quote_requests(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_renewal_reminders_policy_id ON renewal_reminders(policy_id);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_renewal_date ON renewal_reminders(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewal_reminders_status ON renewal_reminders(status);

ALTER TABLE renewal_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage renewal_reminders" ON renewal_reminders
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_renewal_reminders_updated_at ON renewal_reminders;
CREATE TRIGGER update_renewal_reminders_updated_at
  BEFORE UPDATE ON renewal_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. REFERRALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY DEFAULT ('ref_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  referrer_phone TEXT,
  referrer_lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  referred_name TEXT NOT NULL,
  referred_phone TEXT NOT NULL,
  referred_lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  source TEXT NOT NULL CHECK (source IN ('share_link', 'direct_form', 'whatsapp', 'post_success')) DEFAULT 'direct_form',
  status TEXT NOT NULL CHECK (status IN ('invited', 'started', 'quoted', 'closed', 'expired')) DEFAULT 'invited',
  language TEXT CHECK (language IN ('en', 'es')) DEFAULT 'en',
  reward_eligible BOOLEAN DEFAULT false,
  reward_type TEXT,
  reward_status TEXT CHECK (reward_status IN ('pending', 'approved', 'paid', 'denied')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_phone ON referrals(referrer_phone);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_phone ON referrals(referred_phone);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage referrals" ON referrals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_referrals_updated_at ON referrals;
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. EVIDENCE_PACKAGES TABLE (Remote Evidence Engine)
-- ============================================
CREATE TABLE IF NOT EXISTS evidence_packages (
  id TEXT PRIMARY KEY DEFAULT ('evp_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 8)),
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  policy_id TEXT REFERENCES policies(id) ON DELETE SET NULL,
  phone TEXT,
  package_type TEXT NOT NULL CHECK (package_type IN ('identity', 'vehicle_inspection', 'collision', 'other_than_collision', 'uninsured_motorist', 'general')) DEFAULT 'general',
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'complete', 'expired', 'rejected')) DEFAULT 'pending',
  checklist JSONB NOT NULL DEFAULT '{}',
  items JSONB NOT NULL DEFAULT '[]',
  geolocation JSONB,
  captured_at TIMESTAMPTZ,
  signature_url TEXT,
  consent_given BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_packages_lead_id ON evidence_packages(lead_id);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_status ON evidence_packages(status);
CREATE INDEX IF NOT EXISTS idx_evidence_packages_package_type ON evidence_packages(package_type);

ALTER TABLE evidence_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can manage evidence_packages" ON evidence_packages
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_evidence_packages_updated_at ON evidence_packages;
CREATE TRIGGER update_evidence_packages_updated_at
  BEFORE UPDATE ON evidence_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. QUOTE ORCHESTRATION EXTENSIONS
-- ============================================
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS carrier TEXT;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS progress_pct INTEGER DEFAULT 0;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS no_close_reason TEXT;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS no_close_details TEXT;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS savings_found BOOLEAN;
ALTER TABLE quote_requests ADD COLUMN IF NOT EXISTS savings_amount_cents INTEGER;

ALTER TABLE quotes ADD COLUMN IF NOT EXISTS is_best BOOLEAN DEFAULT false;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS savings_vs_current_cents INTEGER;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS agent_notes TEXT;

-- ============================================
-- 12. ADMIN VIEWS (updated)
-- ============================================
DROP VIEW IF EXISTS admin.lead_summary;
CREATE VIEW admin.lead_summary
WITH (security_invoker = true) AS
SELECT
  l.*,
  qr.id as latest_quote_request_id,
  qr.status as latest_quote_request_status,
  qr.created_at as latest_quote_request_at,
  qr.savings_found,
  qr.savings_amount_cents,
  (SELECT COUNT(*) FROM public.quotes q WHERE q.quote_request_id = qr.id) as quote_count,
  (SELECT MIN(premium_cents) FROM public.quotes q WHERE q.quote_request_id = qr.id) as best_premium_cents,
  (SELECT COUNT(*) FROM public.lead_followups f WHERE f.lead_id = l.id AND f.status = 'pending') as pending_followups,
  (SELECT COUNT(*) FROM public.lead_events e WHERE e.lead_id = l.id) as total_events,
  (SELECT MAX(e.created_at) FROM public.lead_events e WHERE e.lead_id = l.id) as last_event_at
FROM public.leads l
LEFT JOIN LATERAL (
  SELECT * FROM public.quote_requests
  WHERE lead_id = l.id
  ORDER BY created_at DESC
  LIMIT 1
) qr ON true;

GRANT SELECT ON admin.lead_summary TO service_role;

DROP VIEW IF EXISTS admin.intake_stats;
CREATE VIEW admin.intake_stats
WITH (security_invoker = true) AS
SELECT
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE status = 'WAITING_DOCS') as waiting_docs,
  COUNT(*) FILTER (WHERE status = 'NEEDS_INFO') as needs_info,
  COUNT(*) FILTER (WHERE status = 'READY_TO_QUOTE') as ready_to_quote,
  COUNT(*) FILTER (WHERE can_quote = true) as can_quote_count,
  AVG(score) as avg_score,
  COUNT(*) FILTER (WHERE source = 'referral') as referral_leads,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as leads_today,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as leads_this_week
FROM public.leads;

GRANT SELECT ON admin.intake_stats TO service_role;

-- Ops view for agent accountability
DROP VIEW IF EXISTS admin.ops_dashboard;
CREATE VIEW admin.ops_dashboard
WITH (security_invoker = true) AS
SELECT
  l.id as lead_id,
  l.phone,
  l.full_name,
  l.status,
  l.assigned_to,
  l.score,
  l.can_quote,
  l.source,
  l.created_at,
  l.updated_at,
  EXTRACT(EPOCH FROM (NOW() - l.updated_at)) / 3600 as hours_since_movement,
  (SELECT e.event_type FROM public.lead_events e WHERE e.lead_id = l.id ORDER BY e.created_at DESC LIMIT 1) as last_action,
  (SELECT e.actor_role FROM public.lead_events e WHERE e.lead_id = l.id ORDER BY e.created_at DESC LIMIT 1) as last_action_by,
  (SELECT e.created_at FROM public.lead_events e WHERE e.lead_id = l.id ORDER BY e.created_at DESC LIMIT 1) as last_action_at,
  (SELECT f.due_at FROM public.lead_followups f WHERE f.lead_id = l.id AND f.status = 'pending' ORDER BY f.due_at ASC LIMIT 1) as next_action_due,
  (SELECT COUNT(*) FROM public.lead_followups f WHERE f.lead_id = l.id AND f.status = 'pending') as pending_followups,
  (SELECT COUNT(*) FROM public.lead_followups f WHERE f.lead_id = l.id AND f.status = 'overdue') as overdue_followups,
  qr.id as latest_qr_id,
  qr.status as latest_qr_status,
  qr.progress_pct as latest_qr_progress,
  qr.no_close_reason
FROM public.leads l
LEFT JOIN LATERAL (
  SELECT * FROM public.quote_requests
  WHERE lead_id = l.id
  ORDER BY created_at DESC
  LIMIT 1
) qr ON true
ORDER BY
  CASE
    WHEN l.status = 'READY_TO_QUOTE' AND qr.id IS NULL THEN 0
    WHEN EXISTS (SELECT 1 FROM public.lead_followups f WHERE f.lead_id = l.id AND f.status = 'overdue') THEN 1
    ELSE 2
  END,
  l.updated_at ASC;

GRANT SELECT ON admin.ops_dashboard TO service_role;

-- Funnel metrics view
DROP VIEW IF EXISTS admin.funnel_metrics;
CREATE VIEW admin.funnel_metrics
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.leads) as total_leads,
  (SELECT COUNT(*) FROM public.leads WHERE status = 'WAITING_DOCS') as waiting_docs,
  (SELECT COUNT(*) FROM public.leads WHERE status = 'NEEDS_INFO') as needs_info,
  (SELECT COUNT(*) FROM public.leads WHERE status = 'READY_TO_QUOTE') as ready_to_quote,
  (SELECT COUNT(*) FROM public.quote_requests WHERE status = 'IN_PROGRESS') as quoting_in_progress,
  (SELECT COUNT(*) FROM public.quote_requests WHERE status = 'COMPLETED') as quoted,
  (SELECT COUNT(*) FROM public.quote_requests WHERE savings_found = true) as savings_found,
  (SELECT COUNT(*) FROM public.policies WHERE bound_via_saver = true) as bound_closed,
  (SELECT COUNT(*) FROM public.quote_requests WHERE no_close_reason IS NOT NULL) as no_close,
  (SELECT COUNT(*) FROM public.referrals) as total_referrals,
  (SELECT COUNT(*) FROM public.referrals WHERE status = 'closed') as referrals_closed,
  (SELECT COUNT(*) FROM public.payment_reminders WHERE status = 'paid') as payments_recovered,
  (SELECT COUNT(*) FROM public.renewal_reminders WHERE status = 'renewed') as renewals_retained;

GRANT SELECT ON admin.funnel_metrics TO service_role;

-- ============================================
-- 13. STORAGE BUCKETS (run via Supabase dashboard or API)
-- ============================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('policy-docs', 'policy-docs', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence-media', 'evidence-media', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('id-verification', 'id-verification', false);

-- Storage RLS (signed URLs via service role):
-- CREATE POLICY "Service role storage" ON storage.objects FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 14. ANON/AUTHENTICATED POLICIES (customer-facing)
-- ============================================
CREATE POLICY "Customers can insert own leads" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Customers can read own leads by phone" ON leads
  FOR SELECT TO anon, authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Customers can insert referrals" ON referrals
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Customers can read own referrals" ON referrals
  FOR SELECT TO anon, authenticated
  USING (referrer_phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Customers can insert evidence" ON evidence_packages
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Customers can read own policies" ON policies
  FOR SELECT TO anon, authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');

CREATE POLICY "Customers can read own payment reminders" ON payment_reminders
  FOR SELECT TO anon, authenticated
  USING (phone = current_setting('request.jwt.claims', true)::json->>'phone');
