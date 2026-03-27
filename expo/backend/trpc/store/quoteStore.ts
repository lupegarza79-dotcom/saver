import type { QuoteRequest, StoredQuote, QuoteRequestStatus, QuoteInput } from '@/types/intake';
import { getSupabase, isSupabaseConfigured, type QuoteRequestsTable, type QuotesTable } from '@/backend/supabase/client';

function rowToQuoteRequest(row: QuoteRequestsTable): QuoteRequest {
  return {
    id: row.id,
    leadId: row.lead_id,
    intakeJson: row.intake_json as unknown as QuoteInput,
    status: row.status as QuoteRequestStatus,
    requestedBy: row.requested_by ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  };
}

function rowToStoredQuote(row: QuotesTable): StoredQuote {
  return {
    id: row.id,
    quoteRequestId: row.quote_request_id,
    provider: row.provider,
    productName: row.product_name ?? undefined,
    termMonths: row.term_months ?? undefined,
    paymentPlan: row.payment_plan ?? undefined,
    premiumCents: row.premium_cents,
    downPaymentCents: row.down_payment_cents ?? undefined,
    liabilityLimits: row.liability_limits ?? undefined,
    coverageType: row.coverage_type ?? undefined,
    collisionDeductible: row.collision_deductible ?? undefined,
    comprehensiveDeductible: row.comprehensive_deductible ?? undefined,
    source: row.source as 'AGENT' | 'API' | 'COMPARATIVE_RATER',
    externalRef: row.external_ref ?? undefined,
    rawJson: row.raw_json ?? undefined,
    createdAt: row.created_at,
  };
}

class QuoteStoreMemory {
  private quoteRequests: Map<string, QuoteRequest> = new Map();
  private quotes: Map<string, StoredQuote> = new Map();

  generateRequestId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateQuoteId(): string {
    return `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createQuoteRequest(data: {
    leadId: string;
    intakeJson: QuoteInput;
    requestedBy?: string;
    notes?: string;
  }): QuoteRequest {
    const id = this.generateRequestId();
    const now = new Date().toISOString();
    
    const qr: QuoteRequest = {
      id,
      leadId: data.leadId,
      intakeJson: data.intakeJson,
      status: 'REQUESTED',
      requestedBy: data.requestedBy,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
    
    this.quoteRequests.set(id, qr);
    console.log(`[QUOTE_STORE_MEMORY] Created QuoteRequest ${id} for lead ${data.leadId}`);
    return qr;
  }

  getQuoteRequest(id: string): QuoteRequest | undefined {
    return this.quoteRequests.get(id);
  }

  getQuoteRequestsByLead(leadId: string): QuoteRequest[] {
    return Array.from(this.quoteRequests.values())
      .filter(qr => qr.leadId === leadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getLatestQuoteRequest(leadId: string): QuoteRequest | undefined {
    const requests = this.getQuoteRequestsByLead(leadId);
    return requests[0];
  }

  hasOpenQuoteRequest(leadId: string): boolean {
    const requests = this.getQuoteRequestsByLead(leadId);
    return requests.some(qr => qr.status === 'REQUESTED' || qr.status === 'IN_PROGRESS');
  }

  updateQuoteRequestStatus(id: string, status: QuoteRequestStatus, notes?: string): QuoteRequest | undefined {
    const qr = this.quoteRequests.get(id);
    if (!qr) return undefined;
    
    const updated: QuoteRequest = {
      ...qr,
      status,
      notes: notes ?? qr.notes,
      updatedAt: new Date().toISOString(),
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : qr.completedAt,
    };
    
    this.quoteRequests.set(id, updated);
    console.log(`[QUOTE_STORE_MEMORY] Updated QuoteRequest ${id} status to ${status}`);
    return updated;
  }

  updateQuoteRequestAssignment(id: string, assignedTo?: string): QuoteRequest | undefined {
    const qr = this.quoteRequests.get(id);
    if (!qr) return undefined;
    
    const updated: QuoteRequest = {
      ...qr,
      assignedTo,
      updatedAt: new Date().toISOString(),
    };
    
    this.quoteRequests.set(id, updated);
    return updated;
  }

  ingestQuotes(quoteRequestId: string, quotesData: {
    provider: string;
    productName?: string;
    termMonths?: number;
    paymentPlan?: string;
    premiumCents: number;
    downPaymentCents?: number;
    liabilityLimits?: string;
    coverageType?: string;
    collisionDeductible?: number;
    comprehensiveDeductible?: number;
    source?: 'AGENT' | 'API' | 'COMPARATIVE_RATER';
    externalRef?: string;
    rawJson?: unknown;
  }[]): StoredQuote[] {
    const qr = this.quoteRequests.get(quoteRequestId);
    if (!qr) {
      throw new Error('QuoteRequest not found');
    }
    
    if (qr.status === 'REQUESTED') {
      this.updateQuoteRequestStatus(quoteRequestId, 'IN_PROGRESS');
    }
    
    const now = new Date().toISOString();
    const created: StoredQuote[] = [];
    
    for (const data of quotesData) {
      const id = this.generateQuoteId();
      const quote: StoredQuote = {
        id,
        quoteRequestId,
        provider: data.provider,
        productName: data.productName,
        termMonths: data.termMonths,
        paymentPlan: data.paymentPlan,
        premiumCents: data.premiumCents,
        downPaymentCents: data.downPaymentCents,
        liabilityLimits: data.liabilityLimits,
        coverageType: data.coverageType,
        collisionDeductible: data.collisionDeductible,
        comprehensiveDeductible: data.comprehensiveDeductible,
        source: data.source ?? 'AGENT',
        externalRef: data.externalRef,
        rawJson: data.rawJson,
        createdAt: now,
      };
      
      this.quotes.set(id, quote);
      created.push(quote);
    }
    
    this.updateQuoteRequestStatus(quoteRequestId, 'COMPLETED');
    console.log(`[QUOTE_STORE_MEMORY] Ingested ${created.length} quotes for QuoteRequest ${quoteRequestId}`);
    
    return created;
  }

  getQuotesByRequest(quoteRequestId: string): StoredQuote[] {
    return Array.from(this.quotes.values())
      .filter(q => q.quoteRequestId === quoteRequestId)
      .sort((a, b) => a.premiumCents - b.premiumCents);
  }

  getQuotesByLead(leadId: string): StoredQuote[] {
    const requests = this.getQuoteRequestsByLead(leadId);
    const requestIds = new Set(requests.map(r => r.id));
    
    return Array.from(this.quotes.values())
      .filter(q => requestIds.has(q.quoteRequestId))
      .sort((a, b) => a.premiumCents - b.premiumCents);
  }

  deleteQuotesByRequest(quoteRequestId: string): number {
    const toDelete = Array.from(this.quotes.entries())
      .filter(([_, q]) => q.quoteRequestId === quoteRequestId)
      .map(([id]) => id);
    
    for (const id of toDelete) {
      this.quotes.delete(id);
    }
    
    console.log(`[QUOTE_STORE_MEMORY] Deleted ${toDelete.length} quotes for QuoteRequest ${quoteRequestId}`);
    return toDelete.length;
  }

  resetQuoteRequest(quoteRequestId: string): QuoteRequest | undefined {
    const deleted = this.deleteQuotesByRequest(quoteRequestId);
    const qr = this.updateQuoteRequestStatus(quoteRequestId, 'REQUESTED');
    
    if (qr) {
      const updated: QuoteRequest = {
        ...qr,
        completedAt: undefined,
      };
      this.quoteRequests.set(quoteRequestId, updated);
      console.log(`[QUOTE_STORE_MEMORY] Reset QuoteRequest ${quoteRequestId}, deleted ${deleted} quotes`);
      return updated;
    }
    
    return undefined;
  }

  failQuoteRequest(quoteRequestId: string, reason: string): QuoteRequest | undefined {
    return this.updateQuoteRequestStatus(quoteRequestId, 'FAILED', reason);
  }

  listQuoteRequests(options?: {
    status?: QuoteRequestStatus;
    assignedTo?: string;
    limit?: number;
  }): QuoteRequest[] {
    let results = Array.from(this.quoteRequests.values());
    
    if (options?.status) {
      results = results.filter(qr => qr.status === options.status);
    }
    
    if (options?.assignedTo) {
      results = results.filter(qr => qr.assignedTo === options.assignedTo);
    }
    
    results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }
    
    return results;
  }

  getStats(): {
    totalRequests: number;
    totalQuotes: number;
    byStatus: Record<QuoteRequestStatus, number>;
    avgQuotesPerRequest: number;
  } {
    const requests = Array.from(this.quoteRequests.values());
    const quotes = Array.from(this.quotes.values());
    
    const byStatus: Record<QuoteRequestStatus, number> = {
      REQUESTED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      FAILED: 0,
      EXPIRED: 0,
    };
    
    for (const qr of requests) {
      byStatus[qr.status] = (byStatus[qr.status] || 0) + 1;
    }
    
    const completedCount = byStatus.COMPLETED || 1;
    const quotesForCompleted = quotes.filter(q => {
      const qr = this.quoteRequests.get(q.quoteRequestId);
      return qr?.status === 'COMPLETED';
    }).length;
    
    return {
      totalRequests: requests.length,
      totalQuotes: quotes.length,
      byStatus,
      avgQuotesPerRequest: quotesForCompleted / completedCount,
    };
  }
}

class QuoteStoreSupabase {
  generateRequestId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateQuoteId(): string {
    return `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createQuoteRequest(data: {
    leadId: string;
    intakeJson: QuoteInput;
    requestedBy?: string;
    notes?: string;
  }): Promise<QuoteRequest> {
    const id = this.generateRequestId();
    const now = new Date().toISOString();
    
    const insert = {
      id,
      lead_id: data.leadId,
      intake_json: data.intakeJson as unknown as Record<string, unknown>,
      status: 'REQUESTED' as const,
      requested_by: data.requestedBy ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };
    
    const { data: row, error } = await getSupabase()
      .from('quote_requests')
      .insert(insert as any)
      .select()
      .single();
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error creating quote request:`, error);
      throw new Error(`Failed to create quote request: ${error.message}`);
    }
    
    console.log(`[QUOTE_STORE_SUPABASE] Created QuoteRequest ${id} for lead ${data.leadId}`);
    return rowToQuoteRequest(row as QuoteRequestsTable);
  }

  async getQuoteRequest(id: string): Promise<QuoteRequest | undefined> {
    const { data: row, error } = await getSupabase()
      .from('quote_requests')
      .select()
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      console.error(`[QUOTE_STORE_SUPABASE] Error getting quote request:`, error);
      return undefined;
    }
    
    return rowToQuoteRequest(row as QuoteRequestsTable);
  }

  async getQuoteRequestsByLead(leadId: string): Promise<QuoteRequest[]> {
    const { data: rows, error } = await getSupabase()
      .from('quote_requests')
      .select()
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error getting quote requests by lead:`, error);
      return [];
    }
    
    return (rows as QuoteRequestsTable[]).map(rowToQuoteRequest);
  }

  async getLatestQuoteRequest(leadId: string): Promise<QuoteRequest | undefined> {
    const requests = await this.getQuoteRequestsByLead(leadId);
    return requests[0];
  }

  async hasOpenQuoteRequest(leadId: string): Promise<boolean> {
    const { data: rows, error } = await getSupabase()
      .from('quote_requests')
      .select('id')
      .eq('lead_id', leadId)
      .in('status', ['REQUESTED', 'IN_PROGRESS'])
      .limit(1);
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error checking open quote request:`, error);
      return false;
    }
    
    return rows.length > 0;
  }

  async updateQuoteRequestStatus(id: string, status: QuoteRequestStatus, notes?: string): Promise<QuoteRequest | undefined> {
    const update: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    
    if (notes !== undefined) {
      update.notes = notes;
    }
    
    if (status === 'COMPLETED') {
      update.completed_at = new Date().toISOString();
    }
    
    const { data: row, error } = await getSupabase()
      .from('quote_requests')
      .update(update as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error updating quote request status:`, error);
      return undefined;
    }
    
    console.log(`[QUOTE_STORE_SUPABASE] Updated QuoteRequest ${id} status to ${status}`);
    return rowToQuoteRequest(row as QuoteRequestsTable);
  }

  async updateQuoteRequestAssignment(id: string, assignedTo?: string): Promise<QuoteRequest | undefined> {
    const update = {
      assigned_to: assignedTo ?? null,
      updated_at: new Date().toISOString(),
    };
    
    const { data: row, error } = await getSupabase()
      .from('quote_requests')
      .update(update as any)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error updating quote request assignment:`, error);
      return undefined;
    }
    
    return rowToQuoteRequest(row as QuoteRequestsTable);
  }

  async ingestQuotes(quoteRequestId: string, quotesData: {
    provider: string;
    productName?: string;
    termMonths?: number;
    paymentPlan?: string;
    premiumCents: number;
    downPaymentCents?: number;
    liabilityLimits?: string;
    coverageType?: string;
    collisionDeductible?: number;
    comprehensiveDeductible?: number;
    source?: 'AGENT' | 'API' | 'COMPARATIVE_RATER';
    externalRef?: string;
    rawJson?: unknown;
  }[]): Promise<StoredQuote[]> {
    const qr = await this.getQuoteRequest(quoteRequestId);
    if (!qr) {
      throw new Error('QuoteRequest not found');
    }
    
    if (qr.status === 'REQUESTED') {
      await this.updateQuoteRequestStatus(quoteRequestId, 'IN_PROGRESS');
    }
    
    const now = new Date().toISOString();
    const inserts = quotesData.map(data => ({
      id: this.generateQuoteId(),
      quote_request_id: quoteRequestId,
      provider: data.provider,
      product_name: data.productName ?? null,
      term_months: data.termMonths ?? null,
      payment_plan: data.paymentPlan ?? null,
      premium_cents: data.premiumCents,
      down_payment_cents: data.downPaymentCents ?? null,
      liability_limits: data.liabilityLimits ?? null,
      coverage_type: data.coverageType ?? null,
      collision_deductible: data.collisionDeductible ?? null,
      comprehensive_deductible: data.comprehensiveDeductible ?? null,
      source: data.source ?? 'AGENT',
      external_ref: data.externalRef ?? null,
      raw_json: data.rawJson ?? null,
      created_at: now,
    }));
    
    const { data: rows, error } = await getSupabase()
      .from('quotes')
      .insert(inserts as any)
      .select();
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error ingesting quotes:`, error);
      throw new Error(`Failed to ingest quotes: ${error.message}`);
    }
    
    await this.updateQuoteRequestStatus(quoteRequestId, 'COMPLETED');
    console.log(`[QUOTE_STORE_SUPABASE] Ingested ${rows.length} quotes for QuoteRequest ${quoteRequestId}`);
    
    return (rows as QuotesTable[]).map(rowToStoredQuote);
  }

  async getQuotesByRequest(quoteRequestId: string): Promise<StoredQuote[]> {
    const { data: rows, error } = await getSupabase()
      .from('quotes')
      .select()
      .eq('quote_request_id', quoteRequestId)
      .order('premium_cents', { ascending: true });
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error getting quotes by request:`, error);
      return [];
    }
    
    return (rows as QuotesTable[]).map(rowToStoredQuote);
  }

  async getQuotesByLead(leadId: string): Promise<StoredQuote[]> {
    const requests = await this.getQuoteRequestsByLead(leadId);
    if (requests.length === 0) return [];
    
    const requestIds = requests.map(r => r.id);
    
    const { data: rows, error } = await getSupabase()
      .from('quotes')
      .select()
      .in('quote_request_id', requestIds)
      .order('premium_cents', { ascending: true });
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error getting quotes by lead:`, error);
      return [];
    }
    
    return (rows as QuotesTable[]).map(rowToStoredQuote);
  }

  async deleteQuotesByRequest(quoteRequestId: string): Promise<number> {
    const { data: deleted, error } = await getSupabase()
      .from('quotes')
      .delete()
      .eq('quote_request_id', quoteRequestId)
      .select('id');
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error deleting quotes:`, error);
      return 0;
    }
    
    console.log(`[QUOTE_STORE_SUPABASE] Deleted ${deleted.length} quotes for QuoteRequest ${quoteRequestId}`);
    return deleted.length;
  }

  async resetQuoteRequest(quoteRequestId: string): Promise<QuoteRequest | undefined> {
    const deleted = await this.deleteQuotesByRequest(quoteRequestId);
    
    const update = {
      status: 'REQUESTED' as const,
      completed_at: null,
      updated_at: new Date().toISOString(),
    };
    
    const { data: row, error } = await getSupabase()
      .from('quote_requests')
      .update(update as any)
      .eq('id', quoteRequestId)
      .select()
      .single();
    
    if (error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error resetting quote request:`, error);
      return undefined;
    }
    
    console.log(`[QUOTE_STORE_SUPABASE] Reset QuoteRequest ${quoteRequestId}, deleted ${deleted} quotes`);
    return rowToQuoteRequest(row as QuoteRequestsTable);
  }

  async failQuoteRequest(quoteRequestId: string, reason: string): Promise<QuoteRequest | undefined> {
    return this.updateQuoteRequestStatus(quoteRequestId, 'FAILED', reason);
  }

  async listQuoteRequests(options?: {
    status?: QuoteRequestStatus;
    assignedTo?: string;
    limit?: number;
  }): Promise<QuoteRequest[]> {
    let query = getSupabase()
      .from('quote_requests')
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
      console.error(`[QUOTE_STORE_SUPABASE] Error listing quote requests:`, error);
      return [];
    }
    
    return (rows as QuoteRequestsTable[]).map(rowToQuoteRequest);
  }

  async getStats(): Promise<{
    totalRequests: number;
    totalQuotes: number;
    byStatus: Record<QuoteRequestStatus, number>;
    avgQuotesPerRequest: number;
  }> {
    const [requestsResult, quotesResult] = await Promise.all([
      getSupabase().from('quote_requests').select('status'),
      getSupabase().from('quotes').select('quote_request_id'),
    ]);
    
    if (requestsResult.error || quotesResult.error) {
      console.error(`[QUOTE_STORE_SUPABASE] Error getting stats`);
      return {
        totalRequests: 0,
        totalQuotes: 0,
        byStatus: { REQUESTED: 0, IN_PROGRESS: 0, COMPLETED: 0, FAILED: 0, EXPIRED: 0 },
        avgQuotesPerRequest: 0,
      };
    }
    
    const requests = requestsResult.data;
    const quotes = quotesResult.data;
    
    const byStatus: Record<QuoteRequestStatus, number> = {
      REQUESTED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      FAILED: 0,
      EXPIRED: 0,
    };
    
    for (const qr of requests as { status: string }[]) {
      const status = qr.status as QuoteRequestStatus;
      byStatus[status] = (byStatus[status] || 0) + 1;
    }
    
    const completedCount = byStatus.COMPLETED || 1;
    
    return {
      totalRequests: requests.length,
      totalQuotes: quotes.length,
      byStatus,
      avgQuotesPerRequest: quotes.length / completedCount,
    };
  }
}

const memoryStore = new QuoteStoreMemory();
const supabaseStore = new QuoteStoreSupabase();

export const quoteStore = {
  generateRequestId(): string {
    return isSupabaseConfigured() ? supabaseStore.generateRequestId() : memoryStore.generateRequestId();
  },

  generateQuoteId(): string {
    return isSupabaseConfigured() ? supabaseStore.generateQuoteId() : memoryStore.generateQuoteId();
  },

  async createQuoteRequest(data: {
    leadId: string;
    intakeJson: QuoteInput;
    requestedBy?: string;
    notes?: string;
  }): Promise<QuoteRequest> {
    if (isSupabaseConfigured()) {
      return supabaseStore.createQuoteRequest(data);
    }
    return memoryStore.createQuoteRequest(data);
  },

  async getQuoteRequest(id: string): Promise<QuoteRequest | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getQuoteRequest(id);
    }
    return memoryStore.getQuoteRequest(id);
  },

  async getQuoteRequestsByLead(leadId: string): Promise<QuoteRequest[]> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getQuoteRequestsByLead(leadId);
    }
    return memoryStore.getQuoteRequestsByLead(leadId);
  },

  async getLatestQuoteRequest(leadId: string): Promise<QuoteRequest | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getLatestQuoteRequest(leadId);
    }
    return memoryStore.getLatestQuoteRequest(leadId);
  },

  async hasOpenQuoteRequest(leadId: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      return supabaseStore.hasOpenQuoteRequest(leadId);
    }
    return memoryStore.hasOpenQuoteRequest(leadId);
  },

  async updateQuoteRequestStatus(id: string, status: QuoteRequestStatus, notes?: string): Promise<QuoteRequest | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.updateQuoteRequestStatus(id, status, notes);
    }
    return memoryStore.updateQuoteRequestStatus(id, status, notes);
  },

  async updateQuoteRequestAssignment(id: string, assignedTo?: string): Promise<QuoteRequest | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.updateQuoteRequestAssignment(id, assignedTo);
    }
    return memoryStore.updateQuoteRequestAssignment(id, assignedTo);
  },

  async ingestQuotes(quoteRequestId: string, quotesData: {
    provider: string;
    productName?: string;
    termMonths?: number;
    paymentPlan?: string;
    premiumCents: number;
    downPaymentCents?: number;
    liabilityLimits?: string;
    coverageType?: string;
    collisionDeductible?: number;
    comprehensiveDeductible?: number;
    source?: 'AGENT' | 'API' | 'COMPARATIVE_RATER';
    externalRef?: string;
    rawJson?: unknown;
  }[]): Promise<StoredQuote[]> {
    if (isSupabaseConfigured()) {
      return supabaseStore.ingestQuotes(quoteRequestId, quotesData);
    }
    return memoryStore.ingestQuotes(quoteRequestId, quotesData);
  },

  async getQuotesByRequest(quoteRequestId: string): Promise<StoredQuote[]> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getQuotesByRequest(quoteRequestId);
    }
    return memoryStore.getQuotesByRequest(quoteRequestId);
  },

  async getQuotesByLead(leadId: string): Promise<StoredQuote[]> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getQuotesByLead(leadId);
    }
    return memoryStore.getQuotesByLead(leadId);
  },

  async deleteQuotesByRequest(quoteRequestId: string): Promise<number> {
    if (isSupabaseConfigured()) {
      return supabaseStore.deleteQuotesByRequest(quoteRequestId);
    }
    return memoryStore.deleteQuotesByRequest(quoteRequestId);
  },

  async resetQuoteRequest(quoteRequestId: string): Promise<QuoteRequest | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.resetQuoteRequest(quoteRequestId);
    }
    return memoryStore.resetQuoteRequest(quoteRequestId);
  },

  async failQuoteRequest(quoteRequestId: string, reason: string): Promise<QuoteRequest | undefined> {
    if (isSupabaseConfigured()) {
      return supabaseStore.failQuoteRequest(quoteRequestId, reason);
    }
    return memoryStore.failQuoteRequest(quoteRequestId, reason);
  },

  async listQuoteRequests(options?: {
    status?: QuoteRequestStatus;
    assignedTo?: string;
    limit?: number;
  }): Promise<QuoteRequest[]> {
    if (isSupabaseConfigured()) {
      return supabaseStore.listQuoteRequests(options);
    }
    return memoryStore.listQuoteRequests(options);
  },

  async getStats(): Promise<{
    totalRequests: number;
    totalQuotes: number;
    byStatus: Record<QuoteRequestStatus, number>;
    avgQuotesPerRequest: number;
  }> {
    if (isSupabaseConfigured()) {
      return supabaseStore.getStats();
    }
    return memoryStore.getStats();
  },
};
