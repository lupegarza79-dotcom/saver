import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Platform, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  TrendingDown, 
  Shield, 
  Check, 
  Star,
  ChevronRight,
  ChevronLeft,
  Bell,
  AlertTriangle,
  Upload,
  Sparkles,
  FileText,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { Quote } from '@/types';
import { trpc } from '@/lib/trpc';

const MAX_WIDTH = 1100;

export default function QuotesScreen() {
  const router = useRouter();
  const { t, policies, user, updateUser } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const [selectedQuote, setSelectedQuote] = useState<string | null>(null);
  const [savingsOnlyMode, setSavingsOnlyMode] = useState(user?.notifyOnlyIfSavings ?? true);
  const [coverageAlert, setCoverageAlert] = useState(user?.notifyCoverageRisk ?? true);

  const isWeb = Platform.OS === 'web';
  const isWideScreen = windowWidth > 768;

  const currentPolicy = policies[0];
  const currentPremium = currentPolicy?.premium;
  const hasPolicy = policies.length > 0;

  const quotesQuery = trpc.quotesReal.list.useQuery(
    { leadId: user?.id || '', latestOnly: true },
    { enabled: !!user?.id }
  );

  const quoteRequestData = quotesQuery.data?.quoteRequest;
  const realQuotes: Quote[] = (quotesQuery.data?.quotes || []).map((q) => ({
    id: q.id,
    caseId: quoteRequestData?.id || '',
    carrier: q.provider,
    monthlyPremium: Math.round(q.premiumCents / 100),
    term: q.termMonths || 6,
    coveragesSummary: q.liabilityLimits || '',
    deductibleComp: q.comprehensiveDeductible ?? undefined,
    deductibleColl: q.collisionDeductible ?? undefined,
    downPayment: q.downPaymentCents ? Math.round(q.downPaymentCents / 100) : undefined,
    isRecommended: false,
    savingsVsCurrent: currentPremium ? Math.max(0, currentPremium - Math.round(q.premiumCents / 100)) : undefined,
    createdAt: quoteRequestData?.createdAt || new Date().toISOString(),
  }))

  const handleSelectQuote = (quoteId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setSelectedQuote(quoteId);
  };

  const handleSavingsModeChange = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSavingsOnlyMode(value);
    updateUser({ notifyOnlyIfSavings: value });
  };

  const handleCoverageAlertChange = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setCoverageAlert(value);
    updateUser({ notifyCoverageRisk: value });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyGlow} />
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={[Colors.secondary, Colors.info]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIconGradient}
        >
          <TrendingDown size={40} color="#FFFFFF" />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>{t.quotes?.noQuotes || 'No Quotes Yet'}</Text>
      <Text style={styles.emptySubtitle}>
        {t.quotes?.noQuotesSubtitle || "Upload your policy and we'll find potential savings for you automatically."}
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => router.push('/upload-document')}
      >
        <LinearGradient
          colors={[Colors.secondary, Colors.info]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Upload size={18} color={Colors.textInverse} />
          <Text style={styles.emptyButtonText}>{t.quotes?.uploadPolicy || 'Upload Policy'}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />
      <View style={styles.backgroundGlow2} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={[styles.headerWrapper, isWeb && styles.webWrapper]}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <View style={styles.headerIconContainer}>
                <LinearGradient
                  colors={[Colors.success, Colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.headerIconGradient}
                >
                  <TrendingDown size={18} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View>
                <Text style={styles.title}>{t.quotes?.title || 'Smart Savings'}</Text>
                <Text style={styles.subtitle}>{t.quotes?.subtitle || 'Based on your current policy, here are some options.'}</Text>
              </View>
            </View>
            <View style={styles.headerSpacer} />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.webContentContainer]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, isWeb && styles.webWrapper]}>
          {!hasPolicy ? (
            renderEmptyState()
          ) : (
            <>
              <View style={styles.currentPolicyCard}>
                <LinearGradient
                  colors={[Colors.surfaceLight, Colors.surface]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.currentPolicyGradient}
                >
                  <View style={styles.currentPolicyBorder} />
                  <View style={styles.currentPolicyHeader}>
                    <View style={styles.currentPolicyLabelRow}>
                      <FileText size={16} color={Colors.textSecondary} />
                      <Text style={styles.currentPolicyLabel}>{t.quotes?.currentPolicy || 'Current Policy'}</Text>
                    </View>
                    <View style={styles.currentPolicyBadge}>
                      <Text style={styles.currentPolicyBadgeText}>{currentPolicy?.carrier || 'Unknown'}</Text>
                    </View>
                  </View>
                  <View style={styles.currentPolicyAmount}>
                    {currentPremium ? (
                      <>
                        <Text style={styles.currentPolicyValue}>${currentPremium}</Text>
                        <Text style={styles.currentPolicyUnit}>/mo</Text>
                      </>
                    ) : (
                      <Text style={styles.currentPolicyValueUnknown}>—</Text>
                    )}
                  </View>
                </LinearGradient>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Sparkles size={18} color={Colors.secondary} />
                  <Text style={styles.sectionTitle}>{t.quotes?.newQuotes || 'Available Quotes'}</Text>
                </View>

                {realQuotes.length === 0 ? (
                  <View style={styles.noQuotesState}>
                    <View style={styles.noQuotesIcon}>
                      <TrendingDown size={32} color={Colors.textSecondary} />
                    </View>
                    <Text style={styles.noQuotesTitle}>
                      {t.quotes?.noQuotes || 'No Quotes Yet'}
                    </Text>
                    <Text style={styles.noQuotesSubtitle}>
                      {t.quotes?.noQuotesSubtitle || 'Complete your information to receive real quotes.'}
                    </Text>
                    <TouchableOpacity 
                      style={styles.completeInfoButton}
                      onPress={() => router.push('/ai-assistant')}
                    >
                      <Text style={styles.completeInfoButtonText}>
                        {t.quotes?.selectQuote ? 'Complete Info' : 'Complete My Info'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={[styles.quotesGrid, isWideScreen && styles.quotesGridWide]}>
                    {realQuotes.map((quote) => {
                      const isSelected = selectedQuote === quote.id;
                      return (
                        <TouchableOpacity
                          key={quote.id}
                          style={[
                            styles.quoteCard, 
                            isSelected && styles.quoteCardSelected,
                            isWideScreen && styles.quoteCardWide
                          ]}
                          onPress={() => handleSelectQuote(quote.id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.quoteBorder, isSelected && styles.quoteBorderSelected]} />
                          {quote.isRecommended && (
                            <View style={styles.recommendedBadge}>
                              <Star size={12} color={Colors.warning} />
                              <Text style={styles.recommendedText}>{t.quotes?.bestValue || 'Best Value'}</Text>
                            </View>
                          )}
                          
                          <View style={styles.quoteHeader}>
                            <View style={styles.carrierInfo}>
                              <View style={styles.carrierLogo}>
                                <Shield size={20} color={Colors.secondary} />
                              </View>
                              <Text style={styles.carrierName}>{quote.carrier}</Text>
                            </View>
                            <View style={styles.quoteAmount}>
                              <Text style={styles.quotePrice}>${quote.monthlyPremium}</Text>
                              <Text style={styles.quoteUnit}>/mo</Text>
                            </View>
                          </View>

                          {quote.savingsVsCurrent && quote.savingsVsCurrent > 0 && (
                            <View style={styles.savingsBadge}>
                              <Zap size={14} color={Colors.success} />
                              <Text style={styles.savingsText}>
                                Save ${quote.savingsVsCurrent}/mo (${quote.savingsVsCurrent * 12}/yr)
                              </Text>
                            </View>
                          )}

                          <View style={styles.quoteDetails}>
                            <View style={styles.quoteDetailRow}>
                              <Text style={styles.quoteDetailLabel}>Coverage</Text>
                              <Text style={styles.quoteDetailValue}>{quote.coveragesSummary}</Text>
                            </View>
                            {(quote.deductibleComp !== undefined || quote.deductibleColl !== undefined) && (
                            <View style={styles.quoteDetailRow}>
                              <Text style={styles.quoteDetailLabel}>Deductible</Text>
                              <Text style={styles.quoteDetailValue}>
                                {quote.deductibleComp !== undefined ? `${quote.deductibleComp}` : '—'} / {quote.deductibleColl !== undefined ? `${quote.deductibleColl}` : '—'}
                              </Text>
                            </View>
                            )}
                            {quote.downPayment !== undefined && quote.downPayment > 0 && (
                              <View style={styles.quoteDetailRow}>
                                <Text style={styles.quoteDetailLabel}>Down Payment</Text>
                                <Text style={styles.quoteDetailValue}>${quote.downPayment}</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.quoteActions}>
                            {isSelected ? (
                              <View style={styles.selectedIndicator}>
                                <Check size={18} color={Colors.success} />
                                <Text style={styles.selectedText}>Selected</Text>
                              </View>
                            ) : (
                              <View style={styles.selectButton}>
                                <Text style={styles.selectButtonText}>{t.quotes?.selectQuote || 'Select Quote'}</Text>
                                <ChevronRight size={18} color={Colors.secondary} />
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.preferencesSection}>
                <View style={styles.sectionHeader}>
                  <Bell size={18} color={Colors.info} />
                  <Text style={styles.sectionTitle}>Notification Preferences</Text>
                </View>
                
                <View style={styles.preferenceCard}>
                  <View style={styles.preferenceBorder} />
                  <View style={styles.preferenceRow}>
                    <View style={styles.preferenceInfo}>
                      <View style={styles.preferenceIcon}>
                        <Bell size={20} color={Colors.secondary} />
                      </View>
                      <View style={styles.preferenceTextContainer}>
                        <Text style={styles.preferenceTitle}>{t.quotes?.savingsMode || 'Savings-Only Mode'}</Text>
                        <Text style={styles.preferenceDesc}>{t.quotes?.savingsModeDesc || 'Only notify me if you find savings'}</Text>
                      </View>
                    </View>
                    <Switch
                      value={savingsOnlyMode}
                      onValueChange={handleSavingsModeChange}
                      trackColor={{ false: Colors.border, true: Colors.secondary + '50' }}
                      thumbColor={savingsOnlyMode ? Colors.secondary : Colors.textTertiary}
                    />
                  </View>

                  <View style={[styles.preferenceRow, styles.preferenceRowLast]}>
                    <View style={styles.preferenceInfo}>
                      <View style={[styles.preferenceIcon, styles.preferenceIconWarning]}>
                        <AlertTriangle size={20} color={Colors.warning} />
                      </View>
                      <View style={styles.preferenceTextContainer}>
                        <Text style={styles.preferenceTitle}>{t.quotes?.coverageAlert || 'Coverage Alert'}</Text>
                        <Text style={styles.preferenceDesc}>Alert if coverage is at risk</Text>
                      </View>
                    </View>
                    <Switch
                      value={coverageAlert}
                      onValueChange={handleCoverageAlertChange}
                      trackColor={{ false: Colors.border, true: Colors.warning + '50' }}
                      thumbColor={coverageAlert ? Colors.warning : Colors.textTertiary}
                    />
                  </View>
                </View>
              </View>
            </>
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      {selectedQuote && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={[styles.footerInner, isWeb && styles.webWrapper]}>
            <TouchableOpacity style={styles.continueButton}>
              <LinearGradient
                colors={[Colors.secondary, Colors.info]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButtonGradient}
              >
                <Text style={styles.continueButtonText}>Continue with Selected Quote</Text>
                <ChevronRight size={20} color={Colors.textInverse} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
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
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.success,
    opacity: 0.03,
  },
  backgroundGlow2: {
    position: 'absolute',
    bottom: 100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.secondary,
    opacity: 0.03,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  headerWrapper: {
    paddingHorizontal: 20,
  },
  webWrapper: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 16,
  },
  headerIconContainer: {
    marginRight: 14,
  },
  headerIconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },
  webContentContainer: {
    paddingHorizontal: 0,
  },
  contentInner: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    padding: 48,
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -80,
    marginLeft: -80,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.secondary,
    opacity: 0.05,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 280,
  },
  emptyButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  currentPolicyCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 28,
  },
  currentPolicyGradient: {
    padding: 20,
    position: 'relative',
  },
  currentPolicyBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentPolicyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentPolicyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentPolicyLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  currentPolicyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.secondary + '20',
    borderRadius: 12,
  },
  currentPolicyBadgeText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  currentPolicyAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currentPolicyValue: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  currentPolicyUnit: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quotesGrid: {
    gap: 14,
  },
  quotesGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  quoteCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  quoteCardWide: {
    width: 'calc(50% - 7px)' as any,
  },
  quoteBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  quoteBorderSelected: {
    borderColor: Colors.success,
  },
  quoteCardSelected: {
    backgroundColor: Colors.successLight,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.warningLight,
    borderRadius: 10,
    marginBottom: 14,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.warning,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  carrierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  carrierLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  quoteAmount: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  quotePrice: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  quoteUnit: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.successLight,
    borderRadius: 12,
    marginBottom: 16,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  quoteDetails: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  quoteDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quoteDetailLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  quoteDetailValue: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  quoteActions: {
    alignItems: 'center',
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectedText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  selectButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  preferencesSection: {
    marginTop: 4,
  },
  preferenceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  preferenceBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  preferenceRowLast: {
    borderBottomWidth: 0,
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  preferenceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceIconWarning: {
    backgroundColor: Colors.warning + '15',
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  preferenceDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerInner: {
    padding: 20,
  },
  continueButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  continueButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  bottomSpacer: {
    height: 40,
  },
  noQuotesState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noQuotesIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  noQuotesTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  noQuotesSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 280,
  },
  completeInfoButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  completeInfoButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  currentPolicyValueUnknown: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.textSecondary,
    letterSpacing: -1,
  },
});
