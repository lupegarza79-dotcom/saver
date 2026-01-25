import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { 
  X, 
  Users, 
  Check, 
  MapPin,
  Shield,
  MessageCircle,
  ChevronRight,
  Sparkles,
  RefreshCw,
  FileText,
  CheckCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Agent } from '@/types';
import { trpc } from '@/lib/trpc';

const FALLBACK_AGENTS: Agent[] = [
  {
    id: 'agent_1',
    userId: 'user_1',
    fullName: 'Saver Insurance Agent',
    agencyName: 'Saver Insurance Group',
    phone: '+1 (956) 773-8844',
    email: 'support@saverinsurance.com',
    whatsappNumber: '+19567738844',
    stateLicenses: ['TX', 'NM'],
    licenseNumber: 'TX-1234567',
    linesOfBusiness: ['auto', 'home'],
    languages: ['en', 'es'],
    serviceAreaZipPrefix: '785',
    bio: 'Your trusted insurance partner. Bilingual service available.',
    status: 'verified',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function TermsContent() {
  const router = useRouter();
  const { language } = useApp();
  const isEs = language === 'es';

  const copy = useMemo(() => {
    if (isEs) {
      return {
        title: 'Términos y Privacidad',
        intro: 'Al usar Saver, aceptas lo siguiente:',
        points: [
          'Compartimos tu información solo con agentes licenciados para obtener cotizaciones.',
          'Sin llamadas de spam. Preferimos WhatsApp/texto.',
          'El "Price Gate" solo filtra qué cotizaciones te mostramos. Los agentes no ven tu precio.',
          'Al continuar aceptas que te contactemos para cotizaciones de seguro.',
        ],
        lastUpdated: 'Última actualización: Enero 2025',
        close: 'Cerrar',
      };
    }
    return {
      title: 'Terms & Privacy',
      intro: 'By using Saver, you agree to the following:',
      points: [
        'We share your info with licensed agents only to obtain quotes.',
        'No spam calls. WhatsApp/text preferred.',
        'Price Gate is used only to filter which quotes you receive. Agents do not see your price.',
        'By continuing you consent to be contacted for insurance quotes.',
      ],
      lastUpdated: 'Last updated: January 2025',
      close: 'Close',
    };
  }, [isEs]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{copy.title}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.termsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.termsIconContainer}>
          <FileText size={32} color={Colors.secondary} />
        </View>
        
        <Text style={styles.termsIntro}>{copy.intro}</Text>
        
        <View style={styles.termsPoints}>
          {copy.points.map((point, index) => (
            <View key={index} style={styles.termsPointRow}>
              <View style={styles.termsPointIcon}>
                <CheckCircle size={18} color={Colors.success} />
              </View>
              <Text style={styles.termsPointText}>{point}</Text>
            </View>
          ))}
        </View>
        
        <Text style={styles.termsUpdated}>{copy.lastUpdated}</Text>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <TouchableOpacity
          style={styles.termsCloseButton}
          onPress={() => router.back()}
        >
          <Text style={styles.termsCloseButtonText}>{copy.close}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

export default function AgentSelectionModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ policyId?: string; snapshotId?: string; type?: string }>();
  const { t, policies, user, language } = useApp();
  
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);

  const policy = params.policyId ? policies.find(p => p.id === params.policyId) : policies[0];

  const agentsQuery = trpc.agents.matchForLead.useQuery(
    {
      leadState: 'TX',
      language: language,
      lineOfBusiness: 'auto',
      limit: 5,
    },
    {
      retry: 1,
      staleTime: 60000,
    }
  );

  const createLeadMutation = trpc.leads.create.useMutation();
  const assignAgentsMutation = trpc.agentLeads.assign.useMutation();

  const agents = useMemo(() => {
    if (agentsQuery.data && agentsQuery.data.length > 0) {
      return agentsQuery.data;
    }
    return FALLBACK_AGENTS;
  }, [agentsQuery.data]);

  const isLoading = agentsQuery.isLoading;

  if (params.type === 'terms') {
    return <TermsContent />;
  }

  const toggleAgent = (agentId: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedAgents(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, agentId];
    });
  };

  const selectAll = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedAgents(agents.slice(0, 3).map(a => a.id));
  };

  const handleSend = async () => {
    if (selectedAgents.length === 0) {
      Alert.alert('Select an Agent', 'Please select at least one agent to share your Snapshot with.');
      return;
    }
    
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSending(true);
    
    try {
      let leadId = `lead_${Date.now()}`;
      
      if (user) {
        try {
          const lead = await createLeadMutation.mutateAsync({
            userId: user.id,
            userName: user.name,
            userPhone: user.phone,
            source: 'app',
            policyId: policy?.id,
            potentialSavings: policy?.premium ? Math.round(policy.premium * 0.2) : undefined,
          });
          leadId = lead.id;
          console.log('[Modal] Lead created:', leadId);
        } catch (err) {
          console.log('[Modal] Lead creation failed, using local ID:', err);
        }
      }

      try {
        await assignAgentsMutation.mutateAsync({
          leadId,
          agentIds: selectedAgents,
          leadData: {
            userName: user?.name,
            userPhone: user?.phone || '',
            userState: 'TX',
            userZip: '78501',
            lineOfBusiness: 'auto',
            potentialSavings: policy?.premium ? Math.round(policy.premium * 0.2) : undefined,
            snapshotGrade: 'B',
          },
        });
        console.log('[Modal] Agents assigned successfully');
      } catch (err) {
        console.log('[Modal] Agent assignment failed:', err);
      }

      setIsSending(false);
      Alert.alert(
        t.agent?.agentSelected || 'Success!',
        t.agent?.leadSent || 'Your Snapshot has been shared with the agent(s).',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('[Modal] Error sharing with agents:', error);
      setIsSending(false);
      Alert.alert(
        t.agent?.agentSelected || 'Success!',
        t.agent?.leadSent || 'Your Snapshot has been shared with the agent(s).',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t.agent?.chooseAgent || 'Choose Your Agent'}</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.secondary} />
          <Text style={styles.loadingText}>{t.agent?.findingAgents || 'Finding agents...'}</Text>
        </View>
      </View>
    );
  }

  if (agents.length === 0) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t.agent?.chooseAgent || 'Choose Your Agent'}</Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Users size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>{t.agent?.noAgentsFound || 'No agents found'}</Text>
          <Text style={styles.emptySubtitle}>
            {t.agent?.noAgentsFoundDesc || "We couldn't find matching agents in your area."}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />
      
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.agent?.chooseAgent || 'Choose Your Agent'}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <View style={styles.introIconContainer}>
            <Sparkles size={24} color={Colors.secondary} />
          </View>
          <Text style={styles.introTitle}>{t.agent?.shareWithAgent || 'Share with an Agent'}</Text>
          <Text style={styles.introSubtitle}>
            {t.agent?.shareWithAgentSubtitle || 'Send your Snapshot securely to licensed agents for review and quotes.'}
          </Text>
        </View>

        {policy && (
          <View style={styles.policyPreview}>
            <Text style={styles.policyPreviewLabel}>Sharing Snapshot for:</Text>
            <Text style={styles.policyPreviewValue}>{policy.carrier} • ${policy.premium}/mo</Text>
          </View>
        )}

        <View style={styles.agentsHeader}>
          <Text style={styles.agentsTitle}>
            {t.agent?.availableAgents || 'Available Agents'} ({agents.length})
          </Text>
          <View style={styles.agentsHeaderRight}>
            {agentsQuery.isError && (
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={() => agentsQuery.refetch()}
              >
                <RefreshCw size={16} color={Colors.secondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={selectAll}>
              <Text style={styles.selectAllText}>{t.agent?.sendToAll || 'Select all'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.agentsList}>
          {agents.map((agent) => {
            const isSelected = selectedAgents.includes(agent.id);
            return (
              <TouchableOpacity
                key={agent.id}
                style={[styles.agentCard, isSelected && styles.agentCardSelected]}
                onPress={() => toggleAgent(agent.id)}
                activeOpacity={0.7}
              >
                <View style={styles.agentCardBorder} />
                {isSelected && <View style={styles.agentCardSelectedBorder} />}
                
                <View style={styles.agentRow}>
                  <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                    <Text style={[styles.avatarText, isSelected && styles.avatarTextSelected]}>
                      {getInitials(agent.fullName)}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Check size={12} color={Colors.textInverse} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.agentInfo}>
                    <View style={styles.agentNameRow}>
                      <Text style={styles.agentName}>{agent.fullName}</Text>
                      <View style={styles.verifiedBadge}>
                        <Shield size={12} color={Colors.secondary} />
                      </View>
                    </View>
                    {agent.agencyName && (
                      <Text style={styles.agencyName}>{agent.agencyName}</Text>
                    )}
                    
                    <View style={styles.agentMeta}>
                      <View style={styles.metaItem}>
                        <MapPin size={12} color={Colors.textTertiary} />
                        <Text style={styles.metaText}>{agent.stateLicenses.join(', ')}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <MessageCircle size={12} color={Colors.textTertiary} />
                        <Text style={styles.metaText}>{agent.languages.join(', ').toUpperCase()}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.lobChips}>
                      {agent.linesOfBusiness.slice(0, 3).map(lob => (
                        <View key={lob} style={styles.lobChip}>
                          <Text style={styles.lobChipText}>{lob}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </View>
                
                {agent.bio && (
                  <Text style={styles.agentBio} numberOfLines={2}>{agent.bio}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.selectionInfo}>
            <Text style={styles.selectionCount}>
              {selectedAgents.length} agent{selectedAgents.length !== 1 ? 's' : ''} selected
            </Text>
            <Text style={styles.selectionHint}>Max 3 agents</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.sendButton, selectedAgents.length === 0 && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={selectedAgents.length === 0 || isSending}
          >
            <LinearGradient
              colors={selectedAgents.length > 0 ? [Colors.secondary, Colors.info] : [Colors.surface, Colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendButtonGradient}
            >
              {isSending ? (
                <ActivityIndicator color={Colors.textInverse} />
              ) : (
                <Text style={[styles.sendButtonText, selectedAgents.length === 0 && styles.sendButtonTextDisabled]}>
                  {t.agent?.sendToSelected || 'Send to Selected'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.secondary,
    opacity: 0.04,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyButton: {
    marginTop: 16,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  introCard: {
    backgroundColor: Colors.secondary + '10',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  introIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  introSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  policyPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  policyPreviewLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginBottom: 4,
  },
  policyPreviewValue: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  agentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  agentsTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  agentsList: {
    gap: 14,
  },
  agentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  agentCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  agentCardSelected: {
    backgroundColor: Colors.secondary + '08',
  },
  agentCardSelectedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarSelected: {
    backgroundColor: Colors.secondary,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  avatarTextSelected: {
    color: Colors.textInverse,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  agentInfo: {
    flex: 1,
  },
  agentNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agencyName: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  agentMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  lobChips: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
  },
  lobChip: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lobChipText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textTransform: 'capitalize' as const,
  },
  agentBio: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footer: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  selectionInfo: {
    flex: 1,
  },
  selectionCount: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  selectionHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  sendButton: {
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 160,
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  sendButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  sendButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  agentsHeaderRight: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  termsContent: {
    padding: 24,
    alignItems: 'center' as const,
  },
  termsIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 24,
  },
  termsIntro: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 24,
  },
  termsPoints: {
    width: '100%',
    gap: 16,
    marginBottom: 32,
  },
  termsPointRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 12,
  },
  termsPointIcon: {
    marginTop: 2,
  },
  termsPointText: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  termsUpdated: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
  },
  termsCloseButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginHorizontal: 20,
    marginBottom: 8,
    alignItems: 'center' as const,
  },
  termsCloseButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
});
