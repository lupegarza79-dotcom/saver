import type { LeadRecord, QuoteInput, IntakeStatus, Language } from '@/types/intake';
import { getSupabase, isSupabaseConfigured, type LeadsTable } from '@/backend/supabase/client';

function rowToLeadRecord(row: LeadsTable): LeadRecord {
  return {
    id: row.id,
    phone: row.phone ?? undefined,
    language: row.language as Language,
    consent: row.consent,
    intakeJson: row.intake_json as unknown as QuoteInput,
    status: row.status as IntakeStatus,
    canQuote: row.can_quote,
    score: row.score,
    missingRequired: row.missing_required,
    missingRecommended: row.missing_recommended,
    nextQuestionEn: row.next_question_en ?? undefined,
    nextQuestionEs: row.next_question_es ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    internalNotes: row.internal_notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class LeadStoreMemory {
  private leads: Map<string, LeadRecord> = new Map();

  generateId(): string {
    return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  create(data: {
    phone?: string;
    language: Language;
    consent: boolean;
    intakeJson: QuoteInput;
    status: IntakeStatus;
    canQuote: boolean;
    score: number;
    missingRequired: { fieldKey: string; message: string }[];
    missingRecommended: { fieldKey: string; message: string }[];
    nextQuestionEn?: string;
    nextQuestionEs?: string;
  }): LeadRecord {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const lead: LeadRecord = {
      id,
      phone: data.phone,
      language: data.language,
      consent: data.consent,
      intakeJson: data.intakeJson,
      status: data.status,
      canQuote: data.canQuote,
      score: data.score,
      missingRequired: data.missingRequired,
      missingRecommended: data.missingRecommended,
      nextQuestionEn: data.nextQuestionEn,
      nextQuestionEs: data.nextQuestionEs,
      createdAt: now,
      updatedAt: now,
    };
    
    this.leads.set(id, lead);
    console.log(`[LEAD_STORE_MEMORY] Created lead ${id}, status: ${data.status}`);
    return lead;
  }

  get(id: string): LeadRecord | undefined {
    return this.leads.get(id);
  }

  getByPhone(phone: string): LeadRecord | undefined {
    return Array.from(this.leads.values()).find(l => l.phone === phone);
  }

  update(id: string, data: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>): LeadRecord | undefined {
    const lead = this.leads.get(id);
    if (!lead) return undefined;
    
    const updated: LeadRecord = {
      ...lead,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    
    this.leads.set(id, updated);
    console.log(`[LEAD_STORE_MEMORY] Updated lead ${id}, status: ${updated.status}`);
    return updated;
  }

  upsert(leadId: string | undefined, data: {
    phone?: string;
    language: Language;
    consent: boolean;
    intakeJson: QuoteInput;
    status: IntakeStatus;
    canQuote: boolean;
    score: number;
    missingRequired: { fieldKey: string; message: string }[];
    missingRecommended: { fieldKey: string; message: string }[];
    nextQuestionEn?: string;
    nextQuestionEs?: string;
  }): LeadRecord {
    if (leadId) {
      const existing = this.leads.get(leadId);
      if (existing) {
        return this.update(leadId, data) as LeadRecord;
      }
    }
    return this.create(data);
  }

  list(options?: {
    status?: IntakeStatus;
    assignedTo?: string;
    limit?: number;
  }): LeadRecord[] {
    let results = Array.from(this.leads.values());
    
    if (options?.status) {
      results = results.filter(l => l.status === options.status);
    }
    
    if (options?.assignedTo) {
      results = results.filter(l => l.assignedTo === options.assignedTo);
    }
    
    results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }

  search(query: string): LeadRecord[] {
    const q = query.toLowerCase().replace(/[^\d]/g, '');
    
    return Array.from(this.leads.values()).filter(lead => {
      if (lead.id === query) return true;
      if (lead.phone) {
        const phoneDigits = lead.phone.replace(/[^\d]/g, '');
        if (phoneDigits.includes(q) || phoneDigits === q) return true;
        if (phoneDigits.endsWith(q)) return true;
      }
      return false;
    }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getStats(): {
    total: number;
    byStatus: Record<IntakeStatus, number>;
    readyToQuote: number;
    needsInfo: number;
    waitingDocs: number;
  } {
    const all = Array.from(this.leads.values());
    
    const byStatus: Record<IntakeStatus, number> = {
      WAITING_DOCS: 0,
      NEEDS_INFO: 0,
      READY_TO_QUOTE: 0,
    };
    
    for (const lead of all) {
      byStatus[lead.status] = (byStatus[lead.status] || 0) + 1;
    }
    
    return {
      total: all.length,
      byStatus,
      readyToQuote: byStatus.READY_TO_QUOTE,
      needsInfo: byStatus.NEEDS_INFO,
      waitingDocs: byStatus.WAITING_DOCS,
    };
  }

  exportCsv(options?: { status?: IntakeStatus }): string {
    let leads = Array.from(this.leads.values());
    
    if (options?.status) {
      leads = leads.filter(l => l.status === options.status);
    }
    
    leads.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    const headers = ['leadId', 'phone', 'language', 'status', 'score', 'canQuote', 'assignedTo', 'createdAt', 'updatedAt'];
    const rows = leads.map(l => [
      l.id,
      l.phone || '',
      l.language,
      l.status,
      String(l.score),
      String(l.canQuote),
      l.assignedTo || '',
      l.createdAt,
      l.updatedAt,
    ]);
    
    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}

class LeadStoreSupabase {
  generateId(): string {
    return `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async create(data: {
    phone?: string;
    language: Language;
    consent: boolean;
    intakeJson: QuoteInput;
    status: IntakeStatus;
    canQuote: boolean;
    score: number;
    missingRequired: { fieldKey: string; message: string }[];
    missingRecommended: { fieldKey: string; message: string }[];
    nextQuestionEn?: string;
    nextQuestionEs?: string;
  }): Promise<LeadRecord> {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const insert = {
      id,
      phone: data.phone ?? null,
      language: data.language,
      consent: data.consent,
      intake_json: data.intakeJson as unknown as Record<string, unknown>,
      status: data.status,
      can_quote: data.canQuote,
      score: data.score,
      missing_required: data.missingRequired,
      missing_recommended: data.missingRecommended,
      next_question_en: data.nextQuestionEn ?? null,
      next_question_es: data.nextQuestionEs ?? null,
      created_at: now,
      updated_at: now,
    };
    
    const { data: row, error } = await getSupabase()
      .from('leads')
      .insert(insert as any)
      .select()
      .single();
    
    if (error) {
      console.error(`[LEAD_STORE_SUPABASE] Error creating lead:`, error);
      throw new Error(`Failed to create lead: ${error.message}`);
    }
    
    console.log(`[LEAD_STORE_SUPABASE] Created lead ${id}, status: ${data.status}`);
    return rowToLeadRecord(row as LeadsTable);
  }

  async get(id: string): Promise<LeadRecord | undefined> {
    const { data: row, error } = await getSupabase()
      .from('leads')
      .select()
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      console.error(`[LEAD_STORE_SUPABASE] Error getting lead:`, error);
      return undefined;
    }
    
    return rowToLeadRecord(row as LeadsTable);
  }

  async getByPhone(phone: string): Promise<LeadRecord | undefined> {
    const { data: row, error } = await getSupabase()
      .from('leads')
      .select()
      .eq('phone', phone)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      console.error(`[LEAD_STORE_SUPABASE] Error getting lead by phone:`, error);
      return undefined;
    }
    
    return rowToLeadRecord(row as LeadsTable);
  }

  async update(id: string, data: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>): Promise<LeadRecord | undefined> {
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.phone !== undefined) update.phone = data.phone ?? null;
    if (data.language !== undefined) update.language = data.language;
    if (data.consent !== undefined) update.consent = data.consent;
    if (data.intakeJson !== undefined) update.intake_json = data.intakeJson;
    if (data.status !== undefined) update.status = data.status;
    if (data.canQuote !== undefined) update.can_quote = data.canQuote;
    if (data.score !== undefined) update.score = data.score;
    if (data.missingRequired !== undefined) update.missing_required = data.missingRequired;
    if (data.missingRecommended !== undefined) update.missing_recommended = data.missingRecommended;
    if (data.nextQuestionEn !== undefined) update.next_question_en = data.nextQuestionEn ?? null;
    if (data.nextQuestionEs !== undefined) update.next_question_es = data.nextQuestionEs ?? null;
    if (data.assignedTo !== undefined) update.assigned_to = data.assignedTo ?? null;
    if (data.internalNotes !== undefined) update.internal_notes = data.internalNotes ?? null;
    
    const { data: row, error } = await getSupabase()
      .from('leads')
      .update(update as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`[LEAD_STORE_SUPABASE] Error updating lead:`, error);
      return undefined;
    }
    
    console.log(`[LEAD_STORE_SUPABASE] Updated lead ${id}, status: ${(row as LeadsTable).status}`);
    return rowToLeadRecord(row as LeadsTable);
  }

  async upsert(leadId: string | undefined, data: {
    phone?: string;
    language: Language;
    consent: boolean;
    intakeJson: QuoteInput;
    status: IntakeStatus;
    canQuote: boolean;
    score: number;
    missingRequired: { fieldKey: string; message: string }[];
    missingRecommended: { fieldKey: string; message: string }[];
    nextQuestionEn?: string;
    nextQuestionEs?: string;
  }): Promise<LeadRecord> {
    if (leadId) {
      const existing = await this.get(leadId);
      if (existing) {
        return (await this.update(leadId, data)) as LeadRecord;
      }
    }
    return this.create(data);
  }

  async list(options?: {
    status?: IntakeStatus;
    assignedTo?: string;
    limit?: number;
  }): Promise<LeadRecord[]> {
    let query = getSupabase()
      .from('leads')
      .select()
      .order('updated_at', { ascending: false });
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    if (options?.assignedTo) {
      query = query.eq('assigned_to', options.assignedTo);
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data: rows, error } = await query;
    
    if (error) {
      console.error(`[LEAD_STORE_SUPABASE] Error listing leads:`, error);
      return [];
    }
    
    return (rows as LeadsTable[]).map(rowToLeadRecord);
  }

  async search(query: string): Promise<LeadRecord[]> {
    const q = query.toLowerCase().replace(/[^\d]/g, '');
    
    const { data: rows, error } = await getSupabase()
      .from('leads')
      .select()
      .or(`id.eq.${query},phone.ilike.%${q}%`)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error(`[LEAD_STORE_SUPABASE] Error searching leads:`, error);
      return [];
    }
    
    return (rows as LeadsTable[]).map(rowToLeadRecord);
  }

  async getStats(): Promise<{
    total: number;
    byStatus: Record<IntakeStatus, number>;
    readyToQuote: number;
    needsInfo: number;
    waitingDocs: number;
  }> {
    const { data: rows, error } = await getSupabase()
      .from('leads')
      .select('status');
    
    if (error) {
      console.error(`[LEAD_STORE_SUPABASE] Error getting stats:`, error);
      return {
        total: 0,
        byStatus: { WAITING_DOCS: 0, NEEDS_INFO: 0, READY_TO_QUOTE: 0 },
        readyToQuote: 0,
        needsInfo: 0,
        waitingDocs: 0,
      };
    }
    
    const byStatus: Record<IntakeStatus, number> = {
      WAITING_DOCS: 0,
      NEEDS_INFO: 0,
      READY_TO_QUOTE: 0,
    };
    
    for (const row of rows as { status: string }[]) {
      const status = row.status as IntakeStatus;
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    
    return {
      total: rows.length,
      byStatus,
      readyToQuote: byStatus.READY_TO_QUOTE,
      needsInfo: byStatus.NEEDS_INFO,
      waitingDocs: byStatus.WAITING_DOCS,
    };
  }

  async exportCsv(options?: { status?: IntakeStatus }): Promise<string> {
    let query = getSupabase()
      .from('leads')
      .select()
      .order('updated_at', { ascending: false });
    
    if (options?.status) {
      query = query.eq('status', options.status);
    }
    
    const { data: rows, error } = await query;
    
    if (error) {
      console.error(`[LEAD_STORE_SUPABASE] Error exporting CSV:`, error);
      return '';
    }
    
    const leads = rows.map(rowToLeadRecord);
    
    const headers = ['leadId', 'phone', 'language', 'status', 'score', 'canQuote', 'assignedTo', 'createdAt', 'updatedAt'];
    const csvRows = leads.map(l => [
      l.id,
      l.phone || '',
      l.language,
      l.status,
      String(l.score),
      String(l.canQuote),
      l.assignedTo || '',
      l.createdAt,
      l.updatedAt,
    ]);
    
    return [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
  }
}

const memoryStore = new LeadStoreMemory();
const supabaseStore = new LeadStoreSupabase();

export const leadStore = {
  generateId(): string {
    return supabaseStore.generateId();
  },

  async create(data: {
    phone?: string;
    language: Language;
    consent: boolean;
    intakeJson: QuoteInput;
    status: IntakeStatus;
    canQuote: boolean;
    score: number;
    missingRequired: { fieldKey: string; message: string }[];
    missingRecommended: { fieldKey: string; message: string }[];
    nextQuestionEn?: string;
    nextQuestionEs?: string;
  }): Promise<LeadRecord> {
    if (isSupabaseConfigured()) {
      return supabaseStore.create(data);
    }
    console.warn('[LEAD_STORE] ⚠️ Supabase not configured - using memory fallback (data will be lost on restart)');
    return memoryStore.create(data);
  },

  async get(id: string): Promise<LeadRecord | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.get(id);
    }
    return memoryStore.get(id);
  },

  async getByPhone(phone: string): Promise<LeadRecord | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getByPhone(phone);
    }
    return memoryStore.getByPhone(phone);
  },

  async update(id: string, data: Partial<Omit<LeadRecord, 'id' | 'createdAt'>>): Promise<LeadRecord | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.update(id, data);
    }
    return memoryStore.update(id, data);
  },

  async upsert(leadId: string | undefined, data: {
    phone?: string;
    language: Language;
    consent: boolean;
    intakeJson: QuoteInput;
    status: IntakeStatus;
    canQuote: boolean;
    score: number;
    missingRequired: { fieldKey: string; message: string }[];
    missingRecommended: { fieldKey: string; message: string }[];
    nextQuestionEn?: string;
    nextQuestionEs?: string;
  }): Promise<LeadRecord> {
    if (isSupabaseConfigured()) {
      return supabaseStore.upsert(leadId, data);
    }
    return memoryStore.upsert(leadId, data);
  },

  async list(options?: {
    status?: IntakeStatus;
    assignedTo?: string;
    limit?: number;
  }): Promise<LeadRecord[]> {
    if (isSupabaseConfigured()) {
      return supabaseStore.list(options);
    }
    return memoryStore.list(options);
  },

  async search(query: string): Promise<LeadRecord[]> {
    if (isSupabaseConfigured()) {
      return supabaseStore.search(query);
    }
    return memoryStore.search(query);
  },

  async getStats(): Promise<{
    total: number;
    byStatus: Record<IntakeStatus, number>;
    readyToQuote: number;
    needsInfo: number;
    waitingDocs: number;
  }> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getStats();
    }
    return memoryStore.getStats();
  },

  async exportCsv(options?: { status?: IntakeStatus }): Promise<string> {
    if (isSupabaseConfigured()) {
      return supabaseStore.exportCsv(options);
    }
    return memoryStore.exportCsv(options);
  },
};
