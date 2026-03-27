import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BarChart3,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Phone,
  FileText,
  Shield,
  RefreshCw,
  ChevronRight,
  Zap,
  Target,
  Gift,
  Bell,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { SAVER } from '@/constants/theme';
import { trpc } from '@/lib/trpc';

interface MetricCard {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

interface FunnelStep {
  label: string;
  value: number;
  color: string;
  pct: number;
}

export default function OpsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'funnel' | 'leads' | 'retention'>('funnel');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isEs = language === 'es';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const copy = useMemo(() => {
    if (isEs) {
      return {
        title: 'Centro de Operaciones',
        subtitle: 'Panel de control SAVER OS',
        funnelTab: 'Embudo',
        leadsTab: 'Leads',
        retentionTab: 'Retención',
        newLeads: 'Nuevos Leads',
        waitingDocs: 'Esperando Docs',
        needsInfo: 'Necesita Info',
        readyToQuote: 'Listo para Cotizar',
        quoting: 'Cotizando',
        quoted: 'Cotizado',
        savingsFound: 'Ahorro Encontrado',
        bound: 'Contratado',
        noClose: 'Sin Cierre',
        activePolicies: 'Pólizas Activas',
        pendingPayments: 'Pagos Pendientes',
        paymentsRecovered: 'Pagos Recuperados',
        renewalsPending: 'Renovaciones Pendientes',
        renewalsRetained: 'Renovaciones Retenidas',
        totalReferrals: 'Total Referidos',
        referralsClosed: 'Referidos Cerrados',
        overdueFollowups: 'Seguimientos Vencidos',
        pendingFollowups: 'Seguimientos Pendientes',
        viewAll: 'Ver Todo',
        opsMetrics: 'Métricas de Operaciones',
        retentionMetrics: 'Métricas de Retención',
        referralMetrics: 'Métricas de Referidos',
        leadFunnel: 'Embudo de Leads',
        noData: 'Sin datos aún',
        noDataDesc: 'Los datos aparecerán cuando haya leads en el sistema.',
      };
    }
    return {
      title: 'Operations Center',
      subtitle: 'SAVER OS Control Panel',
      funnelTab: 'Funnel',
      leadsTab: 'Leads',
      retentionTab: 'Retention',
      newLeads: 'New Leads',
      waitingDocs: 'Waiting Docs',
      needsInfo: 'Needs Info',
      readyToQuote: 'Ready to Quote',
      quoting: 'Quoting',
      quoted: 'Quoted',
      savingsFound: 'Savings Found',
      bound: 'Bound/Closed',
      noClose: 'No-Close',
      activePolicies: 'Active Policies',
      pendingPayments: 'Pending Payments',
      paymentsRecovered: 'Payments Recovered',
      renewalsPending: 'Renewals Pending',
      renewalsRetained: 'Renewals Retained',
      totalReferrals: 'Total Referrals',
      referralsClosed: 'Referrals Closed',
      overdueFollowups: 'Overdue Follow-ups',
      pendingFollowups: 'Pending Follow-ups',
      viewAll: 'View All',
      opsMetrics: 'Operations Metrics',
      retentionMetrics: 'Retention Metrics',
      referralMetrics: 'Referral Metrics',
      leadFunnel: 'Lead Funnel',
      noData: 'No data yet',
      noDataDesc: 'Data will appear when leads are in the system.',
    };
  }, [isEs]);

  const metricsQuery = trpc.funnel.getMetrics.useQuery({});
  const m = metricsQuery.data;
  const f = m?.funnel;
  const ret = m?.retention;
  const ref = m?.referrals;

  const funnelSteps: FunnelStep[] = useMemo(() => {
    const total = f?.totalLeads ?? 0;
    const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;
    return [
      { label: copy.newLeads, value: total, color: '#8B9DC3', pct: 100 },
      { label: copy.waitingDocs, value: f?.waitingDocs ?? 0, color: SAVER.orange, pct: pct(f?.waitingDocs ?? 0) },
      { label: copy.needsInfo, value: f?.needsInfo ?? 0, color: SAVER.accent, pct: pct(f?.needsInfo ?? 0) },
      { label: copy.readyToQuote, value: f?.readyToQuote ?? 0, color: SAVER.green, pct: pct(f?.readyToQuote ?? 0) },
      { label: copy.quoting, value: f?.quotingInProgress ?? 0, color: '#7C3AED', pct: pct(f?.quotingInProgress ?? 0) },
      { label: copy.quoted, value: f?.quoted ?? 0, color: '#0EA5E9', pct: pct(f?.quoted ?? 0) },
      { label: copy.savingsFound, value: f?.savingsFound ?? 0, color: '#10B981', pct: pct(f?.savingsFound ?? 0) },
      { label: copy.bound, value: f?.boundClosed ?? 0, color: '#00C96F', pct: pct(f?.boundClosed ?? 0) },
    ];
  }, [f, copy]);

  const opsCards: MetricCard[] = useMemo(() => [
    { label: copy.overdueFollowups, value: 0, icon: AlertTriangle, color: SAVER.error, bgColor: SAVER.errorLight },
    { label: copy.pendingFollowups, value: 0, icon: Clock, color: SAVER.orange, bgColor: SAVER.orangeLight },
    { label: copy.readyToQuote, value: f?.readyToQuote ?? 0, icon: Zap, color: SAVER.green, bgColor: SAVER.greenLight },
    { label: copy.noClose, value: f?.noClose ?? 0, icon: Target, color: '#7C3AED', bgColor: 'rgba(124,58,237,0.12)' },
  ], [copy, f]);

  const retentionCards: MetricCard[] = useMemo(() => [
    { label: copy.activePolicies, value: ret?.activePolicies ?? 0, icon: Shield, color: SAVER.accent, bgColor: SAVER.accentLight },
    { label: copy.pendingPayments, value: ret?.paymentsPending ?? 0, icon: Bell, color: SAVER.orange, bgColor: SAVER.orangeLight },
    { label: copy.paymentsRecovered, value: ret?.paymentsRecovered ?? 0, icon: CheckCircle, color: SAVER.green, bgColor: SAVER.greenLight },
    { label: copy.renewalsPending, value: ret?.renewalsPending ?? 0, icon: RefreshCw, color: '#0EA5E9', bgColor: 'rgba(14,165,233,0.12)' },
    { label: copy.renewalsRetained, value: ret?.renewalsRetained ?? 0, icon: TrendingUp, color: SAVER.green, bgColor: SAVER.greenLight },
  ], [copy, ret]);

  const referralCards: MetricCard[] = useMemo(() => [
    { label: copy.totalReferrals, value: ref?.totalInvites ?? 0, icon: Gift, color: SAVER.orange, bgColor: SAVER.orangeLight },
    { label: copy.referralsClosed, value: ref?.closed ?? 0, icon: CheckCircle, color: SAVER.green, bgColor: SAVER.greenLight },
  ], [copy, ref]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await metricsQuery.refetch();
    setRefreshing(false);
  }, [metricsQuery]);

  const tabs = useMemo(() => [
    { key: 'funnel' as const, label: copy.funnelTab },
    { key: 'leads' as const, label: copy.leadsTab },
    { key: 'retention' as const, label: copy.retentionTab },
  ], [copy]);

  const renderMetricGrid = (cards: MetricCard[]) => (
    <View style={styles.metricsGrid}>
      {cards.map((card, i) => (
        <Pressable
          key={i}
          style={({ pressed }) => [styles.metricCard, pressed && { opacity: 0.85 }]}
        >
          <View style={[styles.metricIconWrap, { backgroundColor: card.bgColor }]}>
            <card.icon size={18} color={card.color} strokeWidth={2.5} />
          </View>
          <Text style={styles.metricValue}>{card.value}</Text>
          <Text style={styles.metricLabel} numberOfLines={2}>{card.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  const renderFunnel = () => (
    <View style={styles.funnelSection}>
      <Text style={styles.sectionTitle}>{copy.leadFunnel}</Text>
      <View style={styles.funnelContainer}>
        {funnelSteps.map((step, i) => (
          <View key={i} style={styles.funnelRow}>
            <View style={styles.funnelLabelCol}>
              <Text style={styles.funnelLabel} numberOfLines={1}>{step.label}</Text>
            </View>
            <View style={styles.funnelBarCol}>
              <View style={styles.funnelBarBg}>
                <View
                  style={[
                    styles.funnelBarFill,
                    {
                      backgroundColor: step.color,
                      width: `${Math.max(step.pct, 3)}%`,
                    },
                  ]}
                />
              </View>
            </View>
            <Text style={styles.funnelValue}>{step.value}</Text>
          </View>
        ))}
      </View>
      {(f?.totalLeads ?? 0) === 0 && (
        <View style={styles.emptyState}>
          <BarChart3 size={32} color={SAVER.textMuted} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>{copy.noData}</Text>
          <Text style={styles.emptyDesc}>{copy.noDataDesc}</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: copy.title,
          headerStyle: { backgroundColor: SAVER.bg },
          headerTintColor: SAVER.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <LinearGradient
        colors={['#080E1A', '#101B2E', '#0A1322']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => {
              setActiveTab(tab.key);
              if (Platform.OS !== 'web') Haptics.selectionAsync();
            }}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={SAVER.accent} />
          }
        >
          {activeTab === 'funnel' && (
            <>
              {renderFunnel()}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{copy.opsMetrics}</Text>
                {renderMetricGrid(opsCards)}
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{copy.referralMetrics}</Text>
                {renderMetricGrid(referralCards)}
              </View>
            </>
          )}

          {activeTab === 'leads' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.opsMetrics}</Text>
              {renderMetricGrid(opsCards)}
              <Pressable
                style={({ pressed }) => [styles.viewAllBtn, pressed && { opacity: 0.8 }]}
                onPress={() => router.push('/admin/inbox' as never)}
              >
                <Text style={styles.viewAllText}>{copy.viewAll}</Text>
                <ChevronRight size={16} color={SAVER.accent} />
              </Pressable>
              <View style={styles.emptyState}>
                <Users size={32} color={SAVER.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>{copy.noData}</Text>
                <Text style={styles.emptyDesc}>{copy.noDataDesc}</Text>
              </View>
            </View>
          )}

          {activeTab === 'retention' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{copy.retentionMetrics}</Text>
              {renderMetricGrid(retentionCards)}
              <View style={styles.emptyState}>
                <Shield size={32} color={SAVER.textMuted} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>{copy.noData}</Text>
                <Text style={styles.emptyDesc}>{copy.noDataDesc}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SAVER.bg,
  },
  flex: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: SAVER.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.25)',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: SAVER.textMuted,
  },
  tabTextActive: {
    color: SAVER.accent,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: SAVER.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48%' as unknown as number,
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: SAVER.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: SAVER.text,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: SAVER.textMuted,
    lineHeight: 16,
  },
  funnelSection: {
    marginBottom: 24,
  },
  funnelContainer: {
    backgroundColor: SAVER.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SAVER.border,
    gap: 10,
  },
  funnelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  funnelLabelCol: {
    width: 90,
  },
  funnelLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: SAVER.textSecondary,
  },
  funnelBarCol: {
    flex: 1,
  },
  funnelBarBg: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  funnelBarFill: {
    height: '100%',
    borderRadius: 7,
    minWidth: 4,
  },
  funnelValue: {
    width: 32,
    fontSize: 13,
    fontWeight: '700' as const,
    color: SAVER.text,
    textAlign: 'right' as const,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: SAVER.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.15)',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: SAVER.accent,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: SAVER.textSecondary,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 13,
    color: SAVER.textMuted,
    textAlign: 'center' as const,
    lineHeight: 19,
    paddingHorizontal: 24,
  },
});
