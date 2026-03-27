import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  MessageCircle,
  Phone,
  Send,
  Download,
  Copy,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import Toast from './components/Toast';
import ReadyBulkPanel from './components/ReadyBulkPanel';
import { buildFollowUpForLead, buildWhatsAppUrl } from './utils/followup';
import type { IntakeStatus, QuoteRequestStatus } from '@/types/intake';

type InboxView = 'leads' | 'quotes';
type LeadStatusFilter = IntakeStatus | 'all';
type QuoteStatusFilter = QuoteRequestStatus | 'all';

interface LeadSummary {
  id: string;
  phone?: string;
  language: string;
  status: IntakeStatus;
  canQuote: boolean;
  score: number;
  assignedTo?: string;
  missingRequired: { fieldKey: string; message: string }[];
  createdAt: string;
  updatedAt: string;
}

interface QuoteRequestSummary {
  id: string;
  leadId: string;
  leadPhone?: string;
  status: QuoteRequestStatus;
  assignedTo?: string;
  quotesCount: number;
  bestPremiumCents?: number;
  bestProvider?: string;
  createdAt: string;
  completedAt?: string;
}

function hapticFeedback() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function getStatusColor(status: IntakeStatus | QuoteRequestStatus) {
  switch (status) {
    case 'WAITING_DOCS': return Colors.warning;
    case 'NEEDS_INFO': return Colors.info;
    case 'READY_TO_QUOTE': return Colors.success;
    case 'REQUESTED': return Colors.info;
    case 'IN_PROGRESS': return Colors.warning;
    case 'COMPLETED': return Colors.success;
    case 'FAILED': return Colors.danger;
    case 'EXPIRED': return Colors.textTertiary;
    default: return Colors.textSecondary;
  }
}

function getStatusIcon(status: IntakeStatus | QuoteRequestStatus) {
  switch (status) {
    case 'WAITING_DOCS': return <Clock size={14} color={getStatusColor(status)} />;
    case 'NEEDS_INFO': return <AlertCircle size={14} color={getStatusColor(status)} />;
    case 'READY_TO_QUOTE': return <CheckCircle size={14} color={getStatusColor(status)} />;
    case 'REQUESTED': return <Clock size={14} color={getStatusColor(status)} />;
    case 'IN_PROGRESS': return <RefreshCw size={14} color={getStatusColor(status)} />;
    case 'COMPLETED': return <CheckCircle size={14} color={getStatusColor(status)} />;
    case 'FAILED': return <XCircle size={14} color={getStatusColor(status)} />;
    default: return <AlertCircle size={14} color={getStatusColor(status)} />;
  }
}

export default function InboxScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [inboxView, setInboxView] = useState<InboxView>('leads');
  const [leadFilter, setLeadFilter] = useState<LeadStatusFilter>('all');
  const [quoteFilter, setQuoteFilter] = useState<QuoteStatusFilter>('all');
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    visible: false,
    message: '',
    type: 'info',
  });

  const statsQuery = trpc.adminOps.getStats.useQuery({});

  const leadsQuery = trpc.adminOps.listLeads.useQuery({
    status: leadFilter === 'all' ? undefined : leadFilter,
    limit: 50,
  }, {
    refetchInterval: 30000,
  });

  const quoteRequestsQuery = trpc.adminOps.listQuoteRequests.useQuery({
    status: quoteFilter === 'all' ? undefined : quoteFilter,
    limit: 50,
  }, {
    refetchInterval: 30000,
  });

  const createQuoteRequestMutation = trpc.adminOps.createQuoteRequest.useMutation({
    onSuccess: (data) => {
      quoteRequestsQuery.refetch();
      leadsQuery.refetch();
      setToast({ visible: true, message: `QuoteRequest created: ${data.quoteRequestId.slice(0, 12)}...`, type: 'success' });
    },
    onError: (err) => setToast({ visible: true, message: err.message, type: 'error' }),
  });

  const failQuoteRequestMutation = trpc.adminOps.failQuoteRequest.useMutation({
    onSuccess: () => {
      quoteRequestsQuery.refetch();
      setToast({ visible: true, message: 'QuoteRequest marked as FAILED', type: 'success' });
    },
    onError: (err) => setToast({ visible: true, message: err.message, type: 'error' }),
  });

  const resetQuoteRequestMutation = trpc.adminOps.resetQuoteRequest.useMutation({
    onSuccess: () => {
      quoteRequestsQuery.refetch();
      setToast({ visible: true, message: 'QuoteRequest reset to REQUESTED', type: 'success' });
    },
    onError: (err) => setToast({ visible: true, message: err.message, type: 'error' }),
  });



  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      statsQuery.refetch(),
      leadsQuery.refetch(),
      quoteRequestsQuery.refetch(),
    ]);
    setRefreshing(false);
  }, [statsQuery, leadsQuery, quoteRequestsQuery]);

  const handleOpenWhatsApp = (phone?: string, message?: string) => {
    if (!phone) {
      Alert.alert('Error', 'No phone number available');
      return;
    }
    hapticFeedback();
    const url = buildWhatsAppUrl(phone, message || '');
    Linking.openURL(url);
  };

  const handleCreateQuoteRequest = (leadId: string) => {
    Alert.alert(
      'Create Quote Request',
      'This will create a QuoteRequest for this lead. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create',
          onPress: () => {
            hapticFeedback();
            createQuoteRequestMutation.mutate({ leadId });
          },
        },
      ]
    );
  };

  const handleFailQuoteRequest = (qrId: string) => {
    Alert.prompt(
      'Mark as Failed',
      'Enter a reason for failing this quote request:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fail',
          style: 'destructive',
          onPress: (reason: string | undefined) => {
            if (reason && reason.length >= 3) {
              hapticFeedback();
              failQuoteRequestMutation.mutate({ quoteRequestId: qrId, reason });
            } else {
              Alert.alert('Error', 'Reason must be at least 3 characters');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleResetQuoteRequest = (qrId: string) => {
    Alert.alert(
      'Reset Quote Request',
      'This will delete all quotes and reset status to REQUESTED. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            hapticFeedback();
            resetQuoteRequestMutation.mutate({ quoteRequestId: qrId });
          },
        },
      ]
    );
  };

  const handleExportCsv = () => {
    hapticFeedback();
    const statusParam = leadFilter === 'all' ? '' : `?status=${leadFilter}`;
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const csvUrl = `${baseUrl}/api/admin/export/leads.csv${statusParam}`;
    
    if (Platform.OS === 'web') {
      window.open(csvUrl, '_blank');
    } else {
      Linking.openURL(csvUrl);
    }
    
    setToast({
      visible: true,
      message: 'CSV download started',
      type: 'success',
    });
  };

  const handleCopyFollowUp = (lead: LeadSummary) => {
    const message = buildFollowUpForLead({
      leadId: lead.id,
      phone: lead.phone,
      intake: {} as any,
      language: lead.language as 'en' | 'es',
    });

    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(message);
    } else {
      Clipboard.setStringAsync(message);
    }

    hapticFeedback();
    setToast({ visible: true, message: 'Follow-up message copied!', type: 'success' });
  };

  const leads = (leadsQuery.data?.leads || []) as LeadSummary[];
  const quoteRequests = (quoteRequestsQuery.data?.quoteRequests || []) as QuoteRequestSummary[];
  const stats = statsQuery.data?.summary;

  const leadStatusOptions: { key: LeadStatusFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: stats?.totalLeads },
    { key: 'WAITING_DOCS', label: 'Waiting', count: stats?.waitingDocs },
    { key: 'NEEDS_INFO', label: 'Needs Info', count: stats?.needsInfo },
    { key: 'READY_TO_QUOTE', label: 'Ready', count: stats?.readyToQuote },
  ];

  const quoteStatusOptions: { key: QuoteStatusFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'REQUESTED', label: 'Requested' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
    { key: 'FAILED', label: 'Failed' },
  ];

  const renderLeadCard = (lead: LeadSummary) => (
    <View key={lead.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardPhone}>{lead.phone || 'No phone'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(lead.status) + '20' }]}>
            {getStatusIcon(lead.status)}
            <Text style={[styles.statusText, { color: getStatusColor(lead.status) }]}>
              {lead.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.scoreText}>{lead.score}%</Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>
          {lead.language.toUpperCase()} · {formatTime(lead.updatedAt)}
        </Text>
        {lead.assignedTo && (
          <Text style={styles.assignedText}>→ {lead.assignedTo}</Text>
        )}
      </View>

      {lead.missingRequired.length > 0 && lead.status !== 'READY_TO_QUOTE' && (
        <View style={styles.missingPreview}>
          <Text style={styles.missingLabel}>Missing:</Text>
          <Text style={styles.missingText} numberOfLines={1}>
            {lead.missingRequired.slice(0, 2).map(m => m.fieldKey).join(', ')}
            {lead.missingRequired.length > 2 ? ` +${lead.missingRequired.length - 2}` : ''}
          </Text>
        </View>
      )}

      <View style={styles.cardActions}>
        {lead.phone && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleOpenWhatsApp(lead.phone)}
            >
              <MessageCircle size={16} color={Colors.success} />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                hapticFeedback();
                Linking.openURL(`tel:${lead.phone}`);
              }}
            >
              <Phone size={16} color={Colors.info} />
              <Text style={styles.actionBtnText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleCopyFollowUp(lead)}
            >
              <Copy size={16} color={Colors.secondary} />
              <Text style={styles.actionBtnText}>Copy Msg</Text>
            </TouchableOpacity>
          </>
        )}
        {lead.status === 'READY_TO_QUOTE' && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={() => handleCreateQuoteRequest(lead.id)}
          >
            <Send size={16} color={Colors.textInverse} />
            <Text style={[styles.actionBtnText, { color: Colors.textInverse }]}>Quote</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderQuoteRequestCard = (qr: QuoteRequestSummary) => (
    <View key={qr.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.cardPhone}>{qr.leadPhone || qr.leadId.slice(0, 12)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(qr.status) + '20' }]}>
            {getStatusIcon(qr.status)}
            <Text style={[styles.statusText, { color: getStatusColor(qr.status) }]}>{qr.status}</Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.quotesCountText}>{qr.quotesCount} quotes</Text>
        </View>
      </View>

      {qr.bestPremiumCents && (
        <View style={styles.bestQuote}>
          <Text style={styles.bestQuoteLabel}>Best:</Text>
          <Text style={styles.bestQuoteValue}>
            {formatMoney(qr.bestPremiumCents)} · {qr.bestProvider}
          </Text>
        </View>
      )}

      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>
          Created {formatTime(qr.createdAt)}
          {qr.completedAt && ` · Completed ${formatTime(qr.completedAt)}`}
        </Text>
      </View>

      <View style={styles.cardActions}>
        {(qr.status === 'REQUESTED' || qr.status === 'IN_PROGRESS') && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDanger]}
            onPress={() => handleFailQuoteRequest(qr.id)}
          >
            <XCircle size={16} color={Colors.danger} />
            <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Fail</Text>
          </TouchableOpacity>
        )}
        {(qr.status === 'COMPLETED' || qr.status === 'FAILED') && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleResetQuoteRequest(qr.id)}
          >
            <RefreshCw size={16} color={Colors.warning} />
            <Text style={styles.actionBtnText}>Reset</Text>
          </TouchableOpacity>
        )}
        {qr.leadPhone && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleOpenWhatsApp(qr.leadPhone)}
          >
            <MessageCircle size={16} color={Colors.success} />
            <Text style={styles.actionBtnText}>WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.secondary}
          />
        }
      >
        <View style={styles.inboxToggle}>
          <TouchableOpacity
            style={[styles.inboxToggleBtn, inboxView === 'leads' && styles.inboxToggleBtnActive]}
            onPress={() => { hapticFeedback(); setInboxView('leads'); }}
          >
            <Users size={16} color={inboxView === 'leads' ? Colors.textInverse : Colors.textSecondary} />
            <Text style={[styles.inboxToggleText, inboxView === 'leads' && styles.inboxToggleTextActive]}>
              Leads ({stats?.totalLeads || 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.inboxToggleBtn, inboxView === 'quotes' && styles.inboxToggleBtnActive]}
            onPress={() => { hapticFeedback(); setInboxView('quotes'); }}
          >
            <FileText size={16} color={inboxView === 'quotes' ? Colors.textInverse : Colors.textSecondary} />
            <Text style={[styles.inboxToggleText, inboxView === 'quotes' && styles.inboxToggleTextActive]}>
              Quotes ({stats?.totalQuoteRequests || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {inboxView === 'leads' ? (
          <>
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {leadStatusOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterChip, leadFilter === opt.key && styles.filterChipActive]}
                    onPress={() => { hapticFeedback(); setLeadFilter(opt.key); }}
                  >
                    <Text style={[styles.filterChipText, leadFilter === opt.key && styles.filterChipTextActive]}>
                      {opt.label} {opt.count !== undefined ? `(${opt.count})` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.exportBtn} onPress={handleExportCsv}>
                  <Download size={14} color={Colors.secondary} />
                  <Text style={styles.exportBtnText}>CSV</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {leadFilter === 'READY_TO_QUOTE' && leads.length > 0 && (
              <ReadyBulkPanel leads={leads} onActionComplete={onRefresh} />
            )}

            <View style={styles.cardList}>
              {leads.length === 0 ? (
                <View style={styles.emptyState}>
                  <Users size={32} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>No leads found</Text>
                </View>
              ) : (
                leads.map(renderLeadCard)
              )}
            </View>
          </>
        ) : (
          <>
            <View style={styles.filterRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {quoteStatusOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.filterChip, quoteFilter === opt.key && styles.filterChipActive]}
                    onPress={() => { hapticFeedback(); setQuoteFilter(opt.key); }}
                  >
                    <Text style={[styles.filterChipText, quoteFilter === opt.key && styles.filterChipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.cardList}>
              {quoteRequests.length === 0 ? (
                <View style={styles.emptyState}>
                  <FileText size={32} color={Colors.textSecondary} />
                  <Text style={styles.emptyText}>No quote requests found</Text>
                </View>
              ) : (
                quoteRequests.map(renderQuoteRequestCard)
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inboxToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  inboxToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inboxToggleBtnActive: {
    backgroundColor: Colors.secondary,
  },
  inboxToggleText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  inboxToggleTextActive: {
    color: Colors.textInverse,
  },
  filterRow: {
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: Colors.secondary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  exportBtnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.secondary,
  },
  cardList: {
    gap: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardPhone: {
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
  scoreText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  quotesCountText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
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
  missingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  missingLabel: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '500' as const,
  },
  missingText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  bestQuote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bestQuoteLabel: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500' as const,
  },
  bestQuoteValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.secondary,
  },
  actionBtnDanger: {
    backgroundColor: Colors.danger + '15',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
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
});
