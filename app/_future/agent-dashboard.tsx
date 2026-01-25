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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  Phone,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  Shield,
  ChevronRight,
  AlertCircle,
  Star,
  Zap,
  DollarSign,
  MapPin,
  Car,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc';
import { AgentLeadStatus, SUBSCRIPTION_PLANS } from '@/types';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type FilterStatus = 'all' | 'invited' | 'contacted' | 'quoted' | 'won' | 'lost';

interface LeadWithData {
  id: string;
  leadId: string;
  agentId: string;
  status: AgentLeadStatus;
  notes?: string;
  contactedAt?: string;
  quotedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  leadData?: {
    userName?: string;
    userPhone: string;
    userState?: string;
    userZip?: string;
    lineOfBusiness?: string;
    potentialSavings?: number;
    snapshotGrade?: string;
  };
}

export default function AgentDashboardScreen() {
  const router = useRouter();
  const { t, agentProfile } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const agentId = agentProfile?.id || '';

  const leadsQuery = trpc.agentLeads.getByAgent.useQuery(
    { agentId },
    { enabled: !!agentId, refetchInterval: 30000 }
  );

  const statsQuery = trpc.agentLeads.getStats.useQuery(
    { agentId },
    { enabled: !!agentId, refetchInterval: 30000 }
  );

  const updateStatusMutation = trpc.agentLeads.updateStatus.useMutation({
    onSuccess: () => {
      leadsQuery.refetch();
      statsQuery.refetch();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([leadsQuery.refetch(), statsQuery.refetch()]);
    setRefreshing(false);
  }, [leadsQuery, statsQuery]);

  const handleStatusUpdate = (assignmentId: string, newStatus: AgentLeadStatus, notes?: string) => {
    updateStatusMutation.mutate({ id: assignmentId, status: newStatus, notes });
  };

  const handleContactLead = (phone: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Linking.openURL(`tel:${phone}`);
  };

  const handleWhatsAppLead = (phone: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const cleanPhone = phone.replace(/\D/g, '');
    Linking.openURL(`https://wa.me/${cleanPhone}`);
  };

  const leads = (leadsQuery.data || []) as LeadWithData[];
  const stats = statsQuery.data;

  const filteredLeads = filter === 'all' 
    ? leads 
    : leads.filter(l => l.status === filter);

  const isPending = agentProfile?.status === 'pending';
  const isRejected = agentProfile?.status === 'rejected';

  const currentPlan = SUBSCRIPTION_PLANS.find(p => p.tier === 'free');
  const newLeadsCount = leads.filter(l => l.status === 'invited').length;

  const getStatusColor = (status: AgentLeadStatus) => {
    switch (status) {
      case 'invited': return Colors.info;
      case 'accepted': return Colors.secondary;
      case 'contacted': return Colors.warning;
      case 'quoted': return Colors.primary;
      case 'won': return Colors.success;
      case 'lost': return Colors.danger;
      default: return Colors.textSecondary;
    }
  };

  const getStatusLabel = (status: AgentLeadStatus) => {
    const labels: Record<AgentLeadStatus, string> = {
      invited: t.agent?.invited || 'New',
      accepted: t.agent?.accepted || 'Accepted',
      contacted: t.agent?.contacted || 'Contacted',
      quoted: t.agent?.quoted || 'Quoted',
      won: t.agent?.won || 'Won',
      lost: t.agent?.lost || 'Lost',
      declined: 'Declined',
    };
    return labels[status] || status;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (!agentProfile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Agent Dashboard' }} />
        <SafeAreaView edges={['bottom']} style={styles.safeArea}>
          <View style={styles.emptyContainer}>
            <Shield size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>Not an Agent</Text>
            <Text style={styles.emptySubtitle}>
              Complete agent onboarding to access your dashboard.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/_future/agent-onboarding' as any)}
            >
              <Text style={styles.primaryButtonText}>Become an Agent</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: t.agent?.myLeads || 'Agent Dashboard',
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.text,
          headerRight: () => <LanguageSwitcher variant="compact" style={{ marginRight: 16 }} />,
        }}
      />
      <SafeAreaView edges={['bottom']} style={styles.safeArea}>
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
          {isPending && (
            <View style={styles.pendingBanner}>
              <LinearGradient
                colors={[Colors.warning + '20', Colors.warningLight]}
                style={styles.pendingGradient}
              >
                <AlertCircle size={20} color={Colors.warning} />
                <View style={styles.pendingText}>
                  <Text style={styles.pendingTitle}>
                    {t.agent?.pendingVerification || 'Pending Verification'}
                  </Text>
                  <Text style={styles.pendingSubtitle}>
                    {t.agent?.pendingVerificationDesc || "You'll receive leads once approved."}
                  </Text>
                </View>
              </LinearGradient>
            </View>
          )}

          {isRejected && (
            <View style={styles.pendingBanner}>
              <LinearGradient
                colors={[Colors.danger + '20', Colors.dangerLight]}
                style={styles.pendingGradient}
              >
                <XCircle size={20} color={Colors.danger} />
                <View style={styles.pendingText}>
                  <Text style={[styles.pendingTitle, { color: Colors.danger }]}>
                    {t.agent?.rejected || 'Application Rejected'}
                  </Text>
                  {agentProfile.rejectionReason && (
                    <Text style={styles.pendingSubtitle}>
                      {agentProfile.rejectionReason}
                    </Text>
                  )}
                </View>
              </LinearGradient>
            </View>
          )}

          {newLeadsCount > 0 && !isPending && (
            <View style={styles.alertBanner}>
              <LinearGradient
                colors={[Colors.success + '20', Colors.successLight]}
                style={styles.alertGradient}
              >
                <Zap size={18} color={Colors.success} />
                <Text style={styles.alertText}>
                  You have {newLeadsCount} new lead{newLeadsCount > 1 ? 's' : ''} waiting for contact.
                </Text>
              </LinearGradient>
            </View>
          )}

          <View style={styles.header}>
            <View style={styles.agentInfo}>
              <View style={styles.agentAvatar}>
                <Text style={styles.agentAvatarText}>
                  {agentProfile.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View>
                <Text style={styles.agentName}>{agentProfile.fullName}</Text>
                <Text style={styles.agentAgency}>{agentProfile.agencyName || 'Independent Agent'}</Text>
              </View>
            </View>
            {agentProfile.status === 'verified' && (
              <View style={styles.verifiedBadge}>
                <Shield size={14} color={Colors.success} />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.info + '15' }]}>
                <Users size={18} color={Colors.info} />
              </View>
              <Text style={styles.statValue}>{stats?.total ?? 0}</Text>
              <Text style={styles.statLabel}>Total Leads</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.warning + '15' }]}>
                <Clock size={18} color={Colors.warning} />
              </View>
              <Text style={styles.statValue}>{(stats?.invited ?? 0) + (stats?.accepted ?? 0)}</Text>
              <Text style={styles.statLabel}>Needs Contact</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primary + '15' }]}>
                <MessageCircle size={18} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats?.quoted ?? 0}</Text>
              <Text style={styles.statLabel}>Quoted</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: Colors.success + '15' }]}>
                <TrendingUp size={18} color={Colors.success} />
              </View>
              <Text style={styles.statValue}>{stats?.won ?? 0}</Text>
              <Text style={styles.statLabel}>Won</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.planCard}
            onPress={() => router.push('/_future/agent-subscription' as any)}
          >
            <View style={styles.planCardBorder} />
            <View style={styles.planInfo}>
              <View style={styles.planBadge}>
                <Star size={12} color={Colors.secondary} />
                <Text style={styles.planBadgeText}>{currentPlan?.name || 'Free'}</Text>
              </View>
              <Text style={styles.planTitle}>Your Plan</Text>
              <Text style={styles.planSubtitle}>
                {typeof currentPlan?.features.maxLeadsPerMonth === 'number'
                  ? `${currentPlan.features.maxLeadsPerMonth} leads/month`
                  : 'Unlimited leads'}
              </Text>
            </View>
            <View style={styles.planAction}>
              <Text style={styles.planActionText}>Upgrade</Text>
              <ChevronRight size={16} color={Colors.secondary} />
            </View>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {t.agent?.myLeads || 'My Leads'} ({filteredLeads.length})
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}
              contentContainerStyle={styles.filterContent}
            >
              {(['all', 'invited', 'contacted', 'quoted', 'won', 'lost'] as FilterStatus[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.filterChip, filter === status && styles.filterChipActive]}
                  onPress={() => setFilter(status)}
                >
                  <Text style={[styles.filterChipText, filter === status && styles.filterChipTextActive]}>
                    {status === 'all' ? 'All' : getStatusLabel(status as AgentLeadStatus)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredLeads.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={32} color={Colors.textSecondary} />
                <Text style={styles.emptyStateTitle}>No leads yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  {isPending
                    ? 'You\'ll receive leads once your profile is verified.'
                    : 'Leads will appear here when users share their Snapshots with you.'}
                </Text>
              </View>
            ) : (
              <View style={styles.leadsList}>
                {filteredLeads.map((assignment) => {
                  const leadData = assignment.leadData;
                  const userName = leadData?.userName || 'Saver User';
                  const userPhone = leadData?.userPhone || '';
                  const userState = leadData?.userState || 'TX';
                  const lineOfBusiness = leadData?.lineOfBusiness || 'auto';
                  const potentialSavings = leadData?.potentialSavings;
                  const snapshotGrade = leadData?.snapshotGrade;
                  
                  return (
                  <View key={assignment.id} style={styles.leadCard}>
                    <View style={styles.leadHeader}>
                      <View style={styles.leadInfo}>
                        <Text style={styles.leadName}>{userName}</Text>
                        <View style={styles.leadMeta}>
                          <MapPin size={12} color={Colors.textTertiary} />
                          <Text style={styles.leadMetaText}>{userState}</Text>
                          <Car size={12} color={Colors.textTertiary} style={{ marginLeft: 8 }} />
                          <Text style={styles.leadMetaText}>{lineOfBusiness.charAt(0).toUpperCase() + lineOfBusiness.slice(1)}</Text>
                          {snapshotGrade && (
                            <View style={[styles.gradeBadge, { marginLeft: 8 }]}>
                              <Text style={styles.gradeBadgeText}>Grade {snapshotGrade}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(assignment.status) + '20' }]}>
                        <Text style={[styles.statusBadgeText, { color: getStatusColor(assignment.status) }]}>
                          {getStatusLabel(assignment.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.leadDetails}>
                      {potentialSavings ? (
                        <View style={styles.leadDetailRow}>
                          <DollarSign size={14} color={Colors.success} />
                          <Text style={styles.leadDetailText}>${potentialSavings}/mo potential savings</Text>
                        </View>
                      ) : (
                        <View style={styles.leadDetailRow}>
                          <Zap size={14} color={Colors.secondary} />
                          <Text style={[styles.leadDetailText, { color: Colors.secondary }]}>New lead</Text>
                        </View>
                      )}
                      <Text style={styles.leadTime}>{formatTime(assignment.createdAt)}</Text>
                    </View>

                    <View style={styles.leadActions}>
                      {userPhone ? (
                        <>
                          <TouchableOpacity
                            style={styles.leadActionBtn}
                            onPress={() => handleContactLead(userPhone)}
                          >
                            <Phone size={16} color={Colors.secondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.leadActionBtn}
                            onPress={() => handleWhatsAppLead(userPhone)}
                          >
                            <MessageCircle size={16} color={Colors.success} />
                          </TouchableOpacity>
                        </>
                      ) : null}

                      {assignment.status === 'invited' && (
                        <TouchableOpacity
                          style={[styles.leadStatusBtn, { backgroundColor: Colors.warning + '15' }]}
                          onPress={() => handleStatusUpdate(assignment.id, 'contacted')}
                        >
                          <Text style={[styles.leadStatusBtnText, { color: Colors.warning }]}>
                            Mark Contacted
                          </Text>
                        </TouchableOpacity>
                      )}

                      {assignment.status === 'contacted' && (
                        <TouchableOpacity
                          style={[styles.leadStatusBtn, { backgroundColor: Colors.primary + '15' }]}
                          onPress={() => handleStatusUpdate(assignment.id, 'quoted')}
                        >
                          <Text style={[styles.leadStatusBtnText, { color: Colors.primary }]}>
                            Mark Quoted
                          </Text>
                        </TouchableOpacity>
                      )}

                      {assignment.status === 'quoted' && (
                        <>
                          <TouchableOpacity
                            style={[styles.leadStatusBtn, { backgroundColor: Colors.success + '15' }]}
                            onPress={() => handleStatusUpdate(assignment.id, 'won')}
                          >
                            <CheckCircle size={14} color={Colors.success} />
                            <Text style={[styles.leadStatusBtnText, { color: Colors.success }]}>Won</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.leadStatusBtn, { backgroundColor: Colors.danger + '15' }]}
                            onPress={() => handleStatusUpdate(assignment.id, 'lost')}
                          >
                            <XCircle size={14} color={Colors.danger} />
                            <Text style={[styles.leadStatusBtnText, { color: Colors.danger }]}>Lost</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    {assignment.notes && (
                      <View style={styles.leadNotes}>
                        <Text style={styles.leadNotesText}>{assignment.notes}</Text>
                      </View>
                    )}
                  </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  pendingBanner: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 14,
    overflow: 'hidden',
  },
  pendingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  pendingText: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.warning,
    marginBottom: 2,
  },
  pendingSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  alertBanner: {
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    overflow: 'hidden',
  },
  alertGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  alertText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 20,
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  agentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentAvatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.secondary,
  },
  agentName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  agentAgency: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    paddingTop: 8,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  planCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  planInfo: {
    flex: 1,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  planSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  planAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  planActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  section: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  filterRow: {
    marginBottom: 12,
    marginLeft: -16,
    marginRight: -16,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.secondary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.textInverse,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.surface,
    borderRadius: 14,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 12,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  leadsList: {
    gap: 12,
  },
  leadCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  leadHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  leadInfo: {
    flex: 1,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  leadMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  leadMetaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  leadDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  leadDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  leadDetailText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.success,
  },
  leadTime: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  leadActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  leadActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  leadStatusBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  leadNotes: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  leadNotesText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
  },
  gradeBadge: {
    backgroundColor: Colors.secondary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradeBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
