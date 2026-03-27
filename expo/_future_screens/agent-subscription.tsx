import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { 
  Crown,
  Check,
  X,
  Zap,
  TrendingUp,
  Users,
  Shield,
  Star,
  Clock,
  BarChart3,
  Sparkles,
  ChevronRight,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { SUBSCRIPTION_PLANS, SubscriptionTier } from '@/types';
import { trpc } from '@/lib/trpc';

const TIER_COLORS: Record<SubscriptionTier, readonly [string, string]> = {
  free: [Colors.surface, Colors.surfaceLight] as const,
  starter: [Colors.info, Colors.secondary] as const,
  pro: [Colors.secondary, '#9333EA'] as const,
  agency: ['#F59E0B', '#EF4444'] as const,
};

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  free: <Shield size={24} color={Colors.textSecondary} />,
  starter: <Zap size={24} color={Colors.textInverse} />,
  pro: <Crown size={24} color={Colors.textInverse} />,
  agency: <Star size={24} color={Colors.textInverse} />,
};

export default function AgentSubscriptionScreen() {
  const router = useRouter();
  const { t, user } = useApp();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('pro');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  // TODO: subscriptions router not yet implemented — stub queries for future use
  const subscriptionQuery = { data: null as any, isLoading: false, refetch: async () => {} };
  const upgradeMutation = { mutate: (_args: any) => { console.warn('subscriptions.upgrade not implemented'); }, isPending: false };

  const currentTier = subscriptionQuery.data?.subscription?.tier || 'free';

  const handleSelectPlan = (tier: SubscriptionTier) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedTier(tier);
  };

  const handleUpgrade = () => {
    if (!user?.id) return;
    
    if (selectedTier === 'free') {
      router.back();
      return;
    }

    Alert.alert(
      t.subscription?.confirmUpgrade || 'Confirm Upgrade',
      `${t.subscription?.upgradeToTier || 'Upgrade to'} ${selectedTier.toUpperCase()}?`,
      [
        { text: t.common?.cancel || 'Cancel', style: 'cancel' },
        {
          text: t.common?.continue || 'Continue',
          onPress: () => {
            upgradeMutation.mutate({
              agentId: user.id,
              tier: selectedTier,
              billingCycle,
            });
          },
        },
      ]
    );
  };

  const renderFeatureRow = (label: string, included: boolean, highlight?: boolean) => (
    <View style={styles.featureRow}>
      <View style={[styles.featureIcon, included && styles.featureIconActive]}>
        {included ? (
          <Check size={14} color={highlight ? Colors.secondary : Colors.success} />
        ) : (
          <X size={14} color={Colors.textTertiary} />
        )}
      </View>
      <Text style={[styles.featureText, !included && styles.featureTextDisabled]}>
        {label}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />
      
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t.subscription?.title || 'Agent Plans'}</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconContainer}>
            <Crown size={32} color={Colors.secondary} />
          </View>
          <Text style={styles.heroTitle}>
            {t.subscription?.heroTitle || 'Grow Your Business'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t.subscription?.heroSubtitle || 'Get more leads, close more deals, earn more commissions.'}
          </Text>
        </View>

        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'monthly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.billingText, billingCycle === 'monthly' && styles.billingTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.billingOption, billingCycle === 'yearly' && styles.billingOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text style={[styles.billingText, billingCycle === 'yearly' && styles.billingTextActive]}>
              Yearly
            </Text>
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 20%</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.plansGrid}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isSelected = selectedTier === plan.tier;
            const isCurrent = currentTier === plan.tier;
            const price = billingCycle === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
            
            return (
              <TouchableOpacity
                key={plan.tier}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                onPress={() => handleSelectPlan(plan.tier)}
                activeOpacity={0.8}
              >
                {isSelected && <View style={styles.planCardSelectedBorder} />}
                
                {plan.tier === 'pro' && (
                  <View style={styles.popularBadge}>
                    <Sparkles size={12} color={Colors.textInverse} />
                    <Text style={styles.popularBadgeText}>Most Popular</Text>
                  </View>
                )}

                <LinearGradient
                  colors={TIER_COLORS[plan.tier]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.planIconContainer}
                >
                  {TIER_ICONS[plan.tier]}
                </LinearGradient>

                <Text style={styles.planName}>{plan.name}</Text>
                
                <View style={styles.priceRow}>
                  {price === 0 ? (
                    <Text style={styles.priceText}>Free</Text>
                  ) : (
                    <>
                      <Text style={styles.priceCurrency}>$</Text>
                      <Text style={styles.priceText}>{price}</Text>
                      <Text style={styles.pricePeriod}>/mo</Text>
                    </>
                  )}
                </View>

                {isCurrent && (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>Current Plan</Text>
                  </View>
                )}

                <View style={styles.featuresList}>
                  {renderFeatureRow(
                    plan.features.maxLeadsPerMonth === 'unlimited' 
                      ? 'Unlimited leads' 
                      : `${plan.features.maxLeadsPerMonth} leads/month`,
                    true,
                    plan.tier !== 'free'
                  )}
                  {renderFeatureRow(
                    'Priority matching',
                    plan.features.priorityMatching
                  )}
                  {renderFeatureRow(
                    'Featured placement',
                    plan.features.featuredPlacement
                  )}
                  {renderFeatureRow(
                    'AI Assistant',
                    plan.features.aiAssistant
                  )}
                  {renderFeatureRow(
                    'Analytics dashboard',
                    plan.features.analyticsAccess !== 'none'
                  )}
                  {renderFeatureRow(
                    'Instant notifications',
                    plan.features.instantNotifications
                  )}
                </View>

                <View style={styles.planFooter}>
                  <View style={styles.responseTime}>
                    <Clock size={14} color={Colors.textTertiary} />
                    <Text style={styles.responseTimeText}>
                      {plan.features.responseTimeHours}h response
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>
            {t.subscription?.whyUpgrade || 'Why Upgrade?'}
          </Text>
          
          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <TrendingUp size={20} color={Colors.secondary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Get More Leads</Text>
              <Text style={styles.benefitDesc}>
                Higher tier = priority placement when users share Snapshots
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <Users size={20} color={Colors.secondary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>No Per-Lead Fees</Text>
              <Text style={styles.benefitDesc}>
                Flat monthly rate. Keep 100% of your commissions.
              </Text>
            </View>
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIcon}>
              <BarChart3 size={20} color={Colors.secondary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Track Performance</Text>
              <Text style={styles.benefitDesc}>
                See your conversion rates, response times, and rankings
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.legalNote}>
          <Text style={styles.legalText}>
            Texas-compliant: No per-lead fees. Subscription only.
          </Text>
          <Text style={styles.legalText}>
            Cancel anytime. No long-term contracts.
          </Text>
        </View>
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.selectedPlanInfo}>
            <Text style={styles.selectedPlanLabel}>Selected plan</Text>
            <Text style={styles.selectedPlanName}>
              {SUBSCRIPTION_PLANS.find(p => p.tier === selectedTier)?.name || 'Free'}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[
              styles.upgradeButton,
              selectedTier === currentTier && styles.upgradeButtonDisabled
            ]}
            onPress={handleUpgrade}
            disabled={selectedTier === currentTier || upgradeMutation.isPending}
          >
            <LinearGradient
              colors={selectedTier === currentTier 
                ? [Colors.surface, Colors.surface] 
                : TIER_COLORS[selectedTier]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeButtonGradient}
            >
              <Text style={[
                styles.upgradeButtonText,
                selectedTier === currentTier && styles.upgradeButtonTextDisabled
              ]}>
                {selectedTier === currentTier 
                  ? 'Current Plan' 
                  : selectedTier === 'free' 
                    ? 'Downgrade' 
                    : 'Upgrade Now'
                }
              </Text>
              {selectedTier !== currentTier && (
                <ChevronRight size={18} color={Colors.textInverse} />
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
    top: -150,
    right: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.secondary,
    opacity: 0.06,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  billingOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  billingOptionActive: {
    backgroundColor: Colors.secondary,
  },
  billingText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  billingTextActive: {
    color: Colors.textInverse,
  },
  saveBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  plansGrid: {
    gap: 16,
    marginBottom: 32,
  },
  planCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    position: 'relative',
    overflow: 'hidden',
  },
  planCardSelected: {
    borderColor: 'transparent',
  },
  planCardSelectedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.secondary,
  },
  popularBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  popularBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  priceCurrency: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  priceText: {
    fontSize: 36,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  pricePeriod: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
  currentBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  featuresList: {
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureIconActive: {
    backgroundColor: Colors.success + '20',
  },
  featureText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  featureTextDisabled: {
    color: Colors.textTertiary,
  },
  planFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  responseTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  responseTimeText: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  benefitsSection: {
    marginBottom: 24,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 16,
  },
  benefitCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  benefitIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  legalNote: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 20,
  },
  legalText: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
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
  selectedPlanInfo: {
    flex: 1,
  },
  selectedPlanLabel: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  selectedPlanName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  upgradeButton: {
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 160,
  },
  upgradeButtonDisabled: {
    opacity: 0.6,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 6,
  },
  upgradeButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  upgradeButtonTextDisabled: {
    color: Colors.textTertiary,
  },
});
