import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  Bell,
  RefreshCw,
  Plus,
  ChevronRight,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Car,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { SAVER } from '@/constants/theme';

type RetentionTab = 'vault' | 'payments' | 'renewals';

export default function RetentionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language } = useApp();
  const [activeTab, setActiveTab] = useState<RetentionTab>('vault');
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isEs = language === 'es';

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const copy = useMemo(() => {
    if (isEs) {
      return {
        title: 'Mi Vault',
        subtitle: 'Tus pólizas, pagos y renovaciones.',
        vaultTab: 'Pólizas',
        paymentsTab: 'Pagos',
        renewalsTab: 'Renovaciones',
        noPolicies: 'Sin pólizas aún',
        noPoliciesDesc: 'Sube tu póliza para agregarla a tu vault.',
        uploadPolicy: 'Subir Póliza',
        noPayments: 'Sin recordatorios de pago',
        noPaymentsDesc: 'Agrega un recordatorio para nunca perder un pago.',
        addReminder: 'Agregar Recordatorio',
        noRenewals: 'Sin renovaciones pendientes',
        noRenewalsDesc: 'Las renovaciones aparecerán cuando agregues pólizas.',
        active: 'Activa',
        expired: 'Vencida',
        dueIn: 'Vence en',
        days: 'días',
        paid: 'Pagado',
        pending: 'Pendiente',
        overdue: 'Vencido',
        snoozed: 'Pospuesto',
        markPaid: 'Marcar Pagado',
        snooze: 'Posponer 3 días',
        renewalIn: 'Renovación en',
        recheckSavings: 'Re-verificar ahorros',
        renewed: 'Renovada',
        freeReminders: 'GRATIS',
        freeRemindersDesc: 'Recordatorios de pago gratis. Nunca se te pasa.',
      };
    }
    return {
      title: 'My Vault',
      subtitle: 'Your policies, payments, and renewals.',
      vaultTab: 'Policies',
      paymentsTab: 'Payments',
      renewalsTab: 'Renewals',
      noPolicies: 'No policies yet',
      noPoliciesDesc: 'Upload your policy to add it to your vault.',
      uploadPolicy: 'Upload Policy',
      noPayments: 'No payment reminders',
      noPaymentsDesc: 'Add a reminder to never miss a payment.',
      addReminder: 'Add Reminder',
      noRenewals: 'No renewals pending',
      noRenewalsDesc: 'Renewals will appear when you add policies.',
      active: 'Active',
      expired: 'Expired',
      dueIn: 'Due in',
      days: 'days',
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      snoozed: 'Snoozed',
      markPaid: 'Mark Paid',
      snooze: 'Snooze 3 days',
      renewalIn: 'Renewal in',
      recheckSavings: 'Recheck savings',
      renewed: 'Renewed',
      freeReminders: 'FREE',
      freeRemindersDesc: 'Free payment reminders. Never miss one.',
    };
  }, [isEs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise(resolve => setTimeout(resolve, 600));
    setRefreshing(false);
  }, []);

  const tabs = useMemo(() => [
    { key: 'vault' as const, label: copy.vaultTab, icon: Shield },
    { key: 'payments' as const, label: copy.paymentsTab, icon: Bell },
    { key: 'renewals' as const, label: copy.renewalsTab, icon: RefreshCw },
  ], [copy]);

  const renderEmptyState = (
    icon: React.ElementType,
    title: string,
    desc: string,
    ctaLabel?: string,
    onCta?: () => void,
  ) => {
    const IconComponent = icon;
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <IconComponent size={36} color={SAVER.textMuted} strokeWidth={1.5} />
        </View>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyDesc}>{desc}</Text>
        {ctaLabel && onCta && (
          <Pressable
            style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.85 }]}
            onPress={onCta}
          >
            <Plus size={16} color={SAVER.accent} />
            <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
          </Pressable>
        )}
      </View>
    );
  };

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
            <tab.icon
              size={16}
              color={activeTab === tab.key ? SAVER.accent : SAVER.textMuted}
              strokeWidth={2}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.freeBanner}>
        <LinearGradient
          colors={[SAVER.greenLight, 'rgba(0,201,111,0.04)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.freeBannerGradient}
        >
          <View style={styles.freeBadge}>
            <Text style={styles.freeBadgeText}>{copy.freeReminders}</Text>
          </View>
          <Text style={styles.freeBannerText}>{copy.freeRemindersDesc}</Text>
        </LinearGradient>
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
          {activeTab === 'vault' && (
            renderEmptyState(
              FileText,
              copy.noPolicies,
              copy.noPoliciesDesc,
              copy.uploadPolicy,
              () => router.push('/upload-document' as never),
            )
          )}

          {activeTab === 'payments' && (
            renderEmptyState(
              Bell,
              copy.noPayments,
              copy.noPaymentsDesc,
              copy.addReminder,
              () => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                Alert.alert(
                  isEs ? 'Próximamente' : 'Coming Soon',
                  isEs ? 'Los recordatorios de pago estarán disponibles pronto.' : 'Payment reminders will be available soon.',
                );
              },
            )
          )}

          {activeTab === 'renewals' && (
            renderEmptyState(
              RefreshCw,
              copy.noRenewals,
              copy.noRenewalsDesc,
            )
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
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
  freeBanner: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  freeBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
  },
  freeBadge: {
    backgroundColor: SAVER.green,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  freeBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
    color: SAVER.text,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: SAVER.text,
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 14,
    color: SAVER.textMuted,
    textAlign: 'center' as const,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: SAVER.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.2)',
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: SAVER.accent,
  },
});
