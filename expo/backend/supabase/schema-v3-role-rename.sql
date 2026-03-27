-- ============================================
-- SAVER OS - Schema Migration v3: Role Rename
-- Run AFTER schema-v2.sql
-- Renames IAT1->IAT_1, IAT2->IAT_2, IAT3->IAT_3
-- ============================================

-- 1. Drop existing CHECK constraints, update data, re-add constraints

-- lead_events.actor_role
ALTER TABLE lead_events DROP CONSTRAINT IF EXISTS lead_events_actor_role_check;
UPDATE lead_events SET actor_role = 'IAT_1' WHERE actor_role = 'IAT1';
UPDATE lead_events SET actor_role = 'IAT_2' WHERE actor_role = 'IAT2';
UPDATE lead_events SET actor_role = 'IAT_3' WHERE actor_role = 'IAT3';
ALTER TABLE lead_events ADD CONSTRAINT lead_events_actor_role_check
  CHECK (actor_role IN ('IAT_1', 'IAT_2', 'IAT_3', 'IAM', 'system', 'customer'));

-- lead_communications.sent_by_role
ALTER TABLE lead_communications DROP CONSTRAINT IF EXISTS lead_communications_sent_by_role_check;
UPDATE lead_communications SET sent_by_role = 'IAT_1' WHERE sent_by_role = 'IAT1';
UPDATE lead_communications SET sent_by_role = 'IAT_2' WHERE sent_by_role = 'IAT2';
UPDATE lead_communications SET sent_by_role = 'IAT_3' WHERE sent_by_role = 'IAT3';
ALTER TABLE lead_communications ADD CONSTRAINT lead_communications_sent_by_role_check
  CHECK (sent_by_role IN ('IAT_1', 'IAT_2', 'IAT_3', 'IAM', 'system', 'customer'));

-- lead_followups.assigned_to_role
ALTER TABLE lead_followups DROP CONSTRAINT IF EXISTS lead_followups_assigned_to_role_check;
UPDATE lead_followups SET assigned_to_role = 'IAT_1' WHERE assigned_to_role = 'IAT1';
UPDATE lead_followups SET assigned_to_role = 'IAT_2' WHERE assigned_to_role = 'IAT2';
UPDATE lead_followups SET assigned_to_role = 'IAT_3' WHERE assigned_to_role = 'IAT3';
ALTER TABLE lead_followups ADD CONSTRAINT lead_followups_assigned_to_role_check
  CHECK (assigned_to_role IN ('IAT_1', 'IAT_2', 'IAT_3', 'IAM'));

-- lead_followups.escalation_target_role
ALTER TABLE lead_followups DROP CONSTRAINT IF EXISTS lead_followups_escalation_target_role_check;
UPDATE lead_followups SET escalation_target_role = 'IAT_1' WHERE escalation_target_role = 'IAT1';
UPDATE lead_followups SET escalation_target_role = 'IAT_2' WHERE escalation_target_role = 'IAT2';
UPDATE lead_followups SET escalation_target_role = 'IAT_3' WHERE escalation_target_role = 'IAT3';
ALTER TABLE lead_followups ADD CONSTRAINT lead_followups_escalation_target_role_check
  CHECK (escalation_target_role IN ('IAT_1', 'IAT_2', 'IAT_3', 'IAM'));

-- lead_commitments.created_by_role
ALTER TABLE lead_commitments DROP CONSTRAINT IF EXISTS lead_commitments_created_by_role_check;
UPDATE lead_commitments SET created_by_role = 'IAT_1' WHERE created_by_role = 'IAT1';
UPDATE lead_commitments SET created_by_role = 'IAT_2' WHERE created_by_role = 'IAT2';
UPDATE lead_commitments SET created_by_role = 'IAT_3' WHERE created_by_role = 'IAT3';
ALTER TABLE lead_commitments ADD CONSTRAINT lead_commitments_created_by_role_check
  CHECK (created_by_role IN ('IAT_1', 'IAT_2', 'IAT_3', 'IAM', 'system', 'customer'));
