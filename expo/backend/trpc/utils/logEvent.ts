import { getSupabase, isSupabaseConfigured } from "@/backend/supabase/client";

export async function logLeadEvent(
  leadId: string,
  eventType: string,
  actorRole: string,
  actorId?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log(`[EVENT_SKIP] Supabase not configured, skipping: ${eventType} for lead ${leadId}`);
    return;
  }

  try {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await getSupabase()
      .from('lead_events')
      .insert({
        id,
        lead_id: leadId,
        event_type: eventType,
        actor_role: actorRole,
        actor_id: actorId ?? null,
        metadata: metadata ?? {},
      } as Record<string, unknown>);
    console.log(`[EVENT] ${eventType} logged for lead ${leadId}`);
  } catch (err) {
    console.error('[EVENT] Failed to log event:', err);
  }
}
