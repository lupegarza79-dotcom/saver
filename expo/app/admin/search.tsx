import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageCircle,
  Phone,
  Send,
  Edit3,
  Save,
  Copy,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import Toast from './components/Toast';

import { buildFollowUpForLead, buildWhatsAppUrl } from './utils/followup';
import type { IntakeStatus, QuoteInput } from '@/types/intake';

function hapticFeedback() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function getStatusColor(status: IntakeStatus) {
  switch (status) {
    case 'WAITING_DOCS': return Colors.warning;
    case 'NEEDS_INFO': return Colors.info;
    case 'READY_TO_QUOTE': return Colors.success;
    default: return Colors.textSecondary;
  }
}

function getStatusIcon(status: IntakeStatus) {
  switch (status) {
    case 'WAITING_DOCS': return <Clock size={14} color={getStatusColor(status)} />;
    case 'NEEDS_INFO': return <AlertCircle size={14} color={getStatusColor(status)} />;
    case 'READY_TO_QUOTE': return <CheckCircle size={14} color={getStatusColor(status)} />;
    default: return <AlertCircle size={14} color={getStatusColor(status)} />;
  }
}

interface LeadSearchResult {
  id: string;
  phone?: string;
  language: string;
  status: IntakeStatus;
  canQuote: boolean;
  score: number;
  assignedTo?: string;
  updatedAt: string;
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [assignmentValue, setAssignmentValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const searchQueryTrpc = trpc.adminOps.searchLeads.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 3 }
  );

  const leadDetailQuery = trpc.adminOps.getLead.useQuery(
    { leadId: selectedLeadId || '' },
    { enabled: !!selectedLeadId }
  );

  const updateAssignmentMutation = trpc.adminOps.updateLeadAssignment.useMutation({
    onSuccess: () => {
      leadDetailQuery.refetch();
      setEditingAssignment(false);
      setToast({ visible: true, message: 'Assignment updated', type: 'success' });
    },
    onError: (err) => setToast({ visible: true, message: err.message, type: 'error' }),
  });

  const updateNotesMutation = trpc.adminOps.updateLeadNotes.useMutation({
    onSuccess: () => {
      leadDetailQuery.refetch();
      setEditingNotes(false);
      setToast({ visible: true, message: 'Notes updated', type: 'success' });
    },
    onError: (err) => setToast({ visible: true, message: err.message, type: 'error' }),
  });

  const createQuoteRequestMutation = trpc.adminOps.createQuoteRequest.useMutation({
    onSuccess: (data) => {
      leadDetailQuery.refetch();
      searchQueryTrpc.refetch();
      setToast({ visible: true, message: `QuoteRequest created: ${data.quoteRequestId.slice(0, 12)}...`, type: 'success' });
    },
    onError: (err) => setToast({ visible: true, message: err.message, type: 'error' }),
  });

  const handleSelectLead = (lead: LeadSearchResult) => {
    hapticFeedback();
    setSelectedLeadId(lead.id);
    setAssignmentValue(lead.assignedTo || '');
  };

  const handleCopyFollowUp = () => {
    const leadDetail = leadDetailQuery.data;
    if (!leadDetail) return;

    const message = buildFollowUpForLead({
      leadId: leadDetail.lead.id,
      phone: leadDetail.lead.phone,
      intake: (leadDetail.intake || {}) as QuoteInput,
      language: leadDetail.lead.language as 'en' | 'es',
    });

    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(message);
    } else {
      Clipboard.setStringAsync(message);
    }

    hapticFeedback();
    setToast({ visible: true, message: 'Follow-up message copied!', type: 'success' });
  };

  const handleOpenWhatsApp = (phone?: string) => {
    if (!phone) {
      Alert.alert('Error', 'No phone number available');
      return;
    }

    const leadDetail = leadDetailQuery.data;
    const message = leadDetail ? buildFollowUpForLead({
      leadId: leadDetail.lead.id,
      phone: leadDetail.lead.phone,
      intake: (leadDetail.intake || {}) as QuoteInput,
      language: leadDetail.lead.language as 'en' | 'es',
    }) : '';

    hapticFeedback();
    const url = buildWhatsAppUrl(phone, message);
    Linking.openURL(url);
  };

  const handleCreateQuoteRequest = () => {
    if (!selectedLeadId) return;
    createQuoteRequestMutation.mutate({ leadId: selectedLeadId });
  };

  const searchResults = (searchQueryTrpc.data?.leads || []) as LeadSearchResult[];
  const leadDetail = leadDetailQuery.data;

  const renderSearchResult = (lead: LeadSearchResult) => (
    <TouchableOpacity
      key={lead.id}
      style={styles.resultCard}
      onPress={() => handleSelectLead(lead)}
    >
      <View style={styles.resultHeader}>
        <Text style={styles.resultPhone}>{lead.phone || 'No phone'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
          {getStatusIcon(lead.status)}
          <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
            {lead.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
      <View style={styles.resultMeta}>
        <Text style={styles.metaText}>
          {lead.language.toUpperCase()} · Score: {lead.score}% · {formatTime(lead.updatedAt)}
        </Text>
        {lead.assignedTo && (
          <Text style={styles.assignedText}>→ {lead.assignedTo}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <View style={styles.searchContainer}>
        <Search size={18} color={Colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by phone or lead ID..."
          placeholderTextColor={Colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {searchQuery.length < 3 ? (
          <View style={styles.emptyState}>
            <Search size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>Enter at least 3 characters</Text>
            <Text style={styles.emptySubtext}>Search by phone number or lead ID</Text>
          </View>
        ) : searchQueryTrpc.isLoading ? (
          <View style={styles.emptyState}>
            <RefreshCw size={32} color={Colors.secondary} />
            <Text style={styles.emptyText}>Searching...</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <AlertCircle size={32} color={Colors.textSecondary} />
            <Text style={styles.emptyText}>No results for &quot;{searchQuery}&quot;</Text>
          </View>
        ) : (
          <View style={styles.resultsList}>
            <Text style={styles.resultsCount}>{searchResults.length} results</Text>
            {searchResults.map(renderSearchResult)}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedLeadId}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedLeadId(null)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lead Details</Text>
            <TouchableOpacity onPress={() => setSelectedLeadId(null)}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {leadDetailQuery.isLoading ? (
            <View style={styles.emptyState}>
              <RefreshCw size={32} color={Colors.secondary} />
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : leadDetail ? (
            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(leadDetail.lead.status) + '20' }]}>
                  {getStatusIcon(leadDetail.lead.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(leadDetail.lead.status) }]}>
                    {leadDetail.lead.status}
                  </Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Phone</Text>
                <View style={styles.detailRow}>
                  <Text style={styles.detailValue}>{leadDetail.lead.phone || 'N/A'}</Text>
                  {leadDetail.lead.phone && (
                    <View style={styles.detailActions}>
                      <TouchableOpacity
                        style={styles.detailActionBtn}
                        onPress={() => handleOpenWhatsApp(leadDetail.lead.phone)}
                      >
                        <MessageCircle size={16} color={Colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.detailActionBtn}
                        onPress={() => {
                          hapticFeedback();
                          Linking.openURL(`tel:${leadDetail.lead.phone}`);
                        }}
                      >
                        <Phone size={16} color={Colors.info} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Score</Text>
                <Text style={styles.detailValue}>{leadDetail.lead.score}%</Text>
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailLabelRow}>
                  <Text style={styles.detailLabel}>Assigned To</Text>
                  <TouchableOpacity onPress={() => { setEditingAssignment(true); setAssignmentValue(leadDetail.lead.assignedTo || ''); }}>
                    <Edit3 size={16} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>
                {editingAssignment ? (
                  <View style={styles.editRow}>
                    <TextInput
                      style={styles.editInput}
                      value={assignmentValue}
                      onChangeText={setAssignmentValue}
                      placeholder="Agent name..."
                      placeholderTextColor={Colors.textTertiary}
                    />
                    <TouchableOpacity
                      style={styles.saveBtn}
                      onPress={() => updateAssignmentMutation.mutate({ leadId: leadDetail.lead.id, assignedTo: assignmentValue || undefined })}
                    >
                      <Save size={16} color={Colors.textInverse} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingAssignment(false)}>
                      <X size={20} color={Colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.detailValue}>{leadDetail.lead.assignedTo || 'Unassigned'}</Text>
                )}
              </View>

              <View style={styles.detailSection}>
                <View style={styles.detailLabelRow}>
                  <Text style={styles.detailLabel}>Internal Notes</Text>
                  <TouchableOpacity onPress={() => { setEditingNotes(true); setNotesValue(leadDetail.lead.internalNotes || ''); }}>
                    <Edit3 size={16} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>
                {editingNotes ? (
                  <View style={styles.editColumn}>
                    <TextInput
                      style={[styles.editInput, styles.editTextarea]}
                      value={notesValue}
                      onChangeText={setNotesValue}
                      placeholder="Add notes..."
                      placeholderTextColor={Colors.textTertiary}
                      multiline
                      numberOfLines={4}
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={() => updateNotesMutation.mutate({ leadId: leadDetail.lead.id, internalNotes: notesValue || undefined })}
                      >
                        <Save size={16} color={Colors.textInverse} />
                        <Text style={styles.saveBtnText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingNotes(false)}>
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.detailValue}>{leadDetail.lead.internalNotes || 'No notes'}</Text>
                )}
              </View>

              {leadDetail.lead.missingRequired.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Missing Required</Text>
                  {leadDetail.lead.missingRequired.map((m, i) => (
                    <View key={i} style={styles.missingItem}>
                      <AlertCircle size={14} color={Colors.danger} />
                      <Text style={styles.missingItemText}>{m.message}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Actions</Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.actionBtn} onPress={handleCopyFollowUp}>
                    <Copy size={16} color={Colors.secondary} />
                    <Text style={styles.actionBtnText}>Copy WhatsApp Msg</Text>
                  </TouchableOpacity>
                </View>

                {leadDetail.lead.status === 'READY_TO_QUOTE' && leadDetail.lead.canQuote && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, createQuoteRequestMutation.isPending && styles.primaryBtnDisabled]}
                    onPress={handleCreateQuoteRequest}
                    disabled={createQuoteRequestMutation.isPending}
                  >
                    <Send size={18} color={Colors.textInverse} />
                    <Text style={styles.primaryBtnText}>
                      {createQuoteRequestMutation.isPending ? 'Creating...' : 'Create Quote Request'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {leadDetail.quoteRequests.length > 0 && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Quote Requests ({leadDetail.quoteRequests.length})</Text>
                  {leadDetail.quoteRequests.map((qr) => (
                    <View key={qr.id} style={styles.qrItem}>
                      <View style={styles.qrItemHeader}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(qr.status as IntakeStatus) + '20' }]}>
                          <Text style={[styles.statusText, { color: getStatusColor(qr.status as IntakeStatus) }]}>{qr.status}</Text>
                        </View>
                        <Text style={styles.qrItemQuotes}>{qr.quotesCount} quotes</Text>
                      </View>
                      <Text style={styles.qrItemId}>{qr.id.slice(0, 20)}...</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Lead ID</Text>
                <TouchableOpacity
                  style={styles.copyRow}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      navigator.clipboard?.writeText(leadDetail.lead.id);
                    } else {
                      Clipboard.setStringAsync(leadDetail.lead.id);
                    }
                    hapticFeedback();
                    setToast({ visible: true, message: 'Lead ID copied!', type: 'success' });
                  }}
                >
                  <Text style={styles.detailValueMono}>{leadDetail.lead.id}</Text>
                  <Copy size={14} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <AlertCircle size={32} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>Lead not found</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    margin: 16,
    marginBottom: 0,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resultsList: {
    gap: 12,
  },
  resultsCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultPhone: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  assignedText: {
    fontSize: 12,
    color: Colors.secondary,
    fontWeight: '500' as const,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  detailLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.text,
  },
  detailValueMono: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editColumn: {
    gap: 10,
  },
  editInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  editTextarea: {
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  cancelText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
  },
  missingItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  qrItem: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  qrItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  qrItemQuotes: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  qrItemId: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
