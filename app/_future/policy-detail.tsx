import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform, Alert, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { 
  Shield, 
  Calendar, 
  DollarSign, 
  Car, 
  Users, 
  Share2,
  FileText,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Zap,
  TrendingDown,
  CheckCircle,
  Video,
  Play,
  UserCheck,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

const MAX_WIDTH = 800;

export default function PolicyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { policies, t, getVideoEvidenceForPolicy } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  
  const isWeb = Platform.OS === 'web';
  const isWideScreen = windowWidth > 768;
  
  const policy = policies.find(p => p.id === id);
  const videoEvidence = id ? getVideoEvidenceForPolicy(id) : undefined;

  if (!policy) {
    return (
      <View style={styles.container}>
        <View style={styles.errorState}>
          <AlertTriangle size={48} color={Colors.warning} />
          <Text style={styles.errorTitle}>Policy not found</Text>
          <TouchableOpacity style={styles.backButtonError} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const daysUntilExpiry = Math.ceil(
    (new Date(policy.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  const isExpired = daysUntilExpiry <= 0;

  const handleShare = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      await Share.share({
        message: `Insurance Policy: ${policy.carrier}\nPolicy #: ${policy.policyNumber}\nValid until: ${new Date(policy.expirationDate).toLocaleDateString()}`,
        title: 'Share Policy Info',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleShareSnapshot = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const snapshotMessage = t.snapshot?.shareMessage || "This is my Saver Snapshot. Can you beat this policy?";
    const fullMessage = `${snapshotMessage}\n\n${policy.carrier} - $${policy.premium}/mo\nCoverage: ${policy.liabilityBI} BI / ${policy.liabilityPD} PD\nDeductible: $${policy.deductibleComp}`;
    
    if (Platform.OS === 'web') {
      try {
        await Clipboard.setStringAsync(fullMessage);
        Alert.alert('Copied!', t.snapshot?.snapshotCopied || 'Snapshot copied. Share it on WhatsApp or with your agent.');
      } catch (error) {
        console.log('Copy error:', error);
      }
    } else {
      try {
        await Share.share({
          message: fullMessage,
          title: 'Share Saver Snapshot',
        });
      } catch (error) {
        console.log('Share error:', error);
      }
    }
  };

  const getStatusColor = () => {
    if (isExpired) return Colors.danger;
    if (isExpiringSoon) return Colors.warning;
    return Colors.success;
  };

  const getStatusText = () => {
    if (isExpired) return 'Expired';
    if (isExpiringSoon) return `Expires in ${daysUntilExpiry} days`;
    return 'Active';
  };

  const getSnapshotGrade = () => {
    if (policy.premium && policy.premium > 150) return 'B';
    if (policy.premium && policy.premium > 100) return 'A';
    return 'A';
  };

  const gradeColors: Record<string, string> = {
    'A': Colors.success,
    'B': Colors.warning,
    'C': Colors.accent,
  };

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />
      <View style={styles.backgroundGlow2} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={[styles.header, isWeb && styles.webHeader]}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Policy Details</Text>
          <TouchableOpacity style={styles.shareHeaderButton} onPress={handleShare}>
            <Share2 size={20} color={Colors.secondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.webContentContainer]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, isWeb && styles.webContentInner]}>
          <View style={styles.snapshotCard}>
            <LinearGradient
              colors={[Colors.secondary + '20', Colors.secondary + '08']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.snapshotGradient}
            >
              <View style={styles.snapshotBorder} />
              <View style={styles.snapshotHeader}>
                <View style={styles.snapshotTitleRow}>
                  <Sparkles size={20} color={Colors.secondary} />
                  <Text style={styles.snapshotTitle}>{t.snapshot?.title || 'Saver Snapshot'}</Text>
                </View>
                <View style={[styles.gradeChip, { backgroundColor: gradeColors[getSnapshotGrade()] + '20' }]}>
                  <Text style={[styles.gradeText, { color: gradeColors[getSnapshotGrade()] }]}>
                    {t.snapshot?.grade || 'Grade'}: {getSnapshotGrade()}
                  </Text>
                </View>
              </View>

              <View style={[styles.snapshotStats, isWideScreen && styles.snapshotStatsWide]}>
                <View style={styles.snapshotStat}>
                  <Text style={styles.snapshotStatLabel}>{t.snapshot?.premium || 'Premium'}</Text>
                  <Text style={styles.snapshotStatValue}>${policy.premium}/mo</Text>
                </View>
                <View style={styles.snapshotStatDivider} />
                <View style={styles.snapshotStat}>
                  <Text style={styles.snapshotStatLabel}>{t.snapshot?.coverage || 'Coverage'}</Text>
                  <Text style={styles.snapshotStatValue}>OK</Text>
                </View>
                <View style={styles.snapshotStatDivider} />
                <View style={styles.snapshotStat}>
                  <Text style={styles.snapshotStatLabel}>{t.snapshot?.deductible || 'Deductible'}</Text>
                  <Text style={[styles.snapshotStatValue, { color: Colors.warning }]}>High</Text>
                </View>
              </View>

              <View style={styles.findingsSection}>
                <Text style={styles.findingsTitle}>{t.snapshot?.findings || 'Findings'}</Text>
                <View style={styles.findingItem}>
                  <AlertTriangle size={14} color={Colors.warning} />
                  <Text style={styles.findingText}>
                    {t.snapshot?.finding1 || "You're paying more than about 70% of drivers with similar coverage."}
                  </Text>
                </View>
                <View style={styles.findingItem}>
                  <AlertTriangle size={14} color={Colors.warning} />
                  <Text style={styles.findingText}>
                    {t.snapshot?.finding2 || "Your deductible is higher than average."}
                  </Text>
                </View>
              </View>

              <View style={styles.snapshotActions}>
                <TouchableOpacity 
                  style={styles.fixButton}
                  onPress={() => router.push('/quotes')}
                >
                  <LinearGradient
                    colors={[Colors.secondary, Colors.info]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.fixButtonGradient}
                  >
                    <Zap size={18} color={Colors.textInverse} />
                    <Text style={styles.fixButtonText}>{t.snapshot?.fixThis || 'Fix this for me'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.shareSnapshotButton}
                  onPress={handleShareSnapshot}
                >
                  <Share2 size={18} color={Colors.secondary} />
                  <Text style={styles.shareSnapshotText}>{t.snapshot?.shareSnapshot || 'Share Snapshot'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.shareWithAgentButton}
                onPress={() => router.push(`/modal?policyId=${policy.id}`)}
              >
                <UserCheck size={18} color={Colors.success} />
                <Text style={styles.shareWithAgentText}>{t.agent?.shareWithAgent || 'Share with an Agent'}</Text>
                <ChevronRight size={18} color={Colors.success} />
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <View style={styles.headerCard}>
            <View style={styles.headerCardBorder} />
            <View style={styles.carrierRow}>
              <View style={styles.carrierLogo}>
                <LinearGradient
                  colors={[Colors.secondary, Colors.info]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.carrierLogoGradient}
                >
                  <Shield size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>
              <View style={styles.carrierInfo}>
                <Text style={styles.carrierName}>{policy.carrier}</Text>
                <Text style={styles.policyNumber}>#{policy.policyNumber}</Text>
              </View>
            </View>

            <View style={[styles.statusBanner, { backgroundColor: getStatusColor() + '15' }]}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={[styles.statusText, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
          </View>

          <View style={[styles.detailsGrid, isWideScreen && styles.detailsGridWide]}>
            <View style={[styles.section, isWideScreen && styles.sectionWide]}>
              <Text style={styles.sectionTitle}>Coverage Details</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailsBorder} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Monthly Premium</Text>
                  <Text style={styles.detailValue}>${policy.premium}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Liability (BI/PD)</Text>
                  <Text style={styles.detailValue}>{policy.liabilityBI} / {policy.liabilityPD}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Comprehensive Deductible</Text>
                  <Text style={styles.detailValue}>${policy.deductibleComp}</Text>
                </View>
                <View style={[styles.detailRow, styles.detailRowLast]}>
                  <Text style={styles.detailLabel}>Collision Deductible</Text>
                  <Text style={styles.detailValue}>${policy.deductibleColl}</Text>
                </View>
              </View>
            </View>

            <View style={[styles.section, isWideScreen && styles.sectionWide]}>
              <Text style={styles.sectionTitle}>Policy Period</Text>
              <View style={styles.detailsCard}>
                <View style={styles.detailsBorder} />
                <View style={styles.detailRow}>
                  <View style={styles.detailWithIcon}>
                    <Calendar size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailLabel}>Effective Date</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {new Date(policy.effectiveDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <View style={styles.detailWithIcon}>
                    <Calendar size={16} color={Colors.textSecondary} />
                    <Text style={styles.detailLabel}>Expiration Date</Text>
                  </View>
                  <Text style={styles.detailValue}>
                    {new Date(policy.expirationDate).toLocaleDateString()}
                  </Text>
                </View>
                {policy.nextPaymentDue && (
                  <View style={[styles.detailRow, styles.detailRowLast]}>
                    <View style={styles.detailWithIcon}>
                      <DollarSign size={16} color={Colors.textSecondary} />
                      <Text style={styles.detailLabel}>Next Payment</Text>
                    </View>
                    <Text style={styles.detailValue}>
                      {new Date(policy.nextPaymentDue).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t.policy?.vehicleEvidenceTitle || 'Vehicle Evidence'}</Text>
            <TouchableOpacity 
              style={styles.evidenceCard}
              onPress={() => router.push(`/evidence-wizard?policyId=${policy.id}&type=pre_inspection`)}
            >
              <View style={styles.evidenceCardBorder} />
              {videoEvidence ? (
                <>
                  <View style={styles.evidencePreview}>
                    <LinearGradient
                      colors={[Colors.secondary + '20', Colors.secondary + '08']}
                      style={styles.evidencePreviewGradient}
                    >
                      <Play size={24} color={Colors.secondary} />
                    </LinearGradient>
                  </View>
                  <View style={styles.evidenceInfo}>
                    <Text style={styles.evidenceInfoTitle}>
                      {t.policy?.vehicleEvidenceView || 'View last video'}
                    </Text>
                    <Text style={styles.evidenceInfoSubtitle}>
                      {new Date(videoEvidence.capturedAt).toLocaleDateString()} • {videoEvidence.durationSeconds}s
                    </Text>
                  </View>
                  <View style={styles.evidenceAction}>
                    <Video size={18} color={Colors.secondary} />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.evidenceIconContainer}>
                    <LinearGradient
                      colors={[Colors.secondary + '20', Colors.secondary + '08']}
                      style={styles.evidenceIconGradient}
                    >
                      <Video size={24} color={Colors.secondary} />
                    </LinearGradient>
                  </View>
                  <View style={styles.evidenceInfo}>
                    <Text style={styles.evidenceInfoTitle}>
                      {t.policy?.vehicleEvidenceRecord || 'Record vehicle video'}
                    </Text>
                    <Text style={styles.evidenceInfoSubtitle}>
                      {t.policy?.vehicleEvidenceSubtitleEmpty || "Short guided video to document your car's condition."}
                    </Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textTertiary} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vehicles ({policy.vehicles.length})</Text>
            {policy.vehicles.map((vehicle) => (
              <View key={vehicle.id} style={styles.itemCard}>
                <View style={styles.itemCardBorder} />
                <View style={[styles.itemIcon, { backgroundColor: Colors.info + '15' }]}>
                  <Car size={20} color={Colors.info} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Text>
                  {vehicle.vin && (
                    <Text style={styles.itemSubtitle}>VIN: {vehicle.vin}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Drivers ({policy.drivers.length})</Text>
            {policy.drivers.map((driver) => (
              <View key={driver.id} style={styles.itemCard}>
                <View style={styles.itemCardBorder} />
                <View style={[styles.itemIcon, { backgroundColor: Colors.accentPurple + '15' }]}>
                  <Users size={20} color={Colors.accentPurple} />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemTitle}>{driver.name}</Text>
                  <Text style={styles.itemSubtitle}>
                    {driver.isPrimary ? 'Primary Driver' : 'Additional Driver'}
                  </Text>
                </View>
                {driver.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <CheckCircle size={14} color={Colors.success} />
                  </View>
                )}
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/quotes')}>
            <View style={styles.actionCardBorder} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.success + '15' }]}>
                <TrendingDown size={24} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.actionTitle}>Find Better Rates</Text>
                <Text style={styles.actionSubtitle}>Compare quotes from top carriers</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={styles.actionCardBorder} />
            <View style={styles.actionContent}>
              <View style={[styles.actionIcon, { backgroundColor: Colors.info + '15' }]}>
                <FileText size={24} color={Colors.info} />
              </View>
              <View>
                <Text style={styles.actionTitle}>View Documents</Text>
                <Text style={styles.actionSubtitle}>ID cards, declarations, and more</Text>
              </View>
            </View>
            <ChevronRight size={20} color={Colors.textTertiary} />
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
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
    backgroundColor: Colors.secondary,
    opacity: 0.04,
  },
  backgroundGlow2: {
    position: 'absolute',
    bottom: 100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.info,
    opacity: 0.03,
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
  webHeader: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  shareHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  webContentContainer: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  contentInner: {
    flex: 1,
  },
  webContentInner: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    paddingHorizontal: 20,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  backButtonError: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.secondary,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
  snapshotCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 20,
  },
  snapshotGradient: {
    padding: 24,
    position: 'relative',
  },
  snapshotBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  snapshotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  snapshotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  snapshotTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  gradeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  snapshotStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  snapshotStatsWide: {
    justifyContent: 'space-around',
  },
  snapshotStat: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  snapshotStatValue: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  snapshotStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.border,
  },
  findingsSection: {
    marginBottom: 20,
  },
  findingsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  findingItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  findingText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  snapshotActions: {
    flexDirection: 'row',
    gap: 12,
  },
  fixButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  fixButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  fixButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  shareSnapshotButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: Colors.secondary + '15',
    borderRadius: 14,
  },
  shareSnapshotText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  shareWithAgentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginTop: 12,
    backgroundColor: Colors.success + '15',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  shareWithAgentText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  headerCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  carrierLogo: {
    marginRight: 14,
  },
  carrierLogoGradient: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carrierInfo: {
    flex: 1,
  },
  carrierName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  policyNumber: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  detailsGrid: {
    gap: 20,
  },
  detailsGridWide: {
    flexDirection: 'row',
  },
  section: {
    marginBottom: 20,
  },
  sectionWide: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  detailsBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailRowLast: {
    borderBottomWidth: 0,
  },
  detailWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  itemCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  itemSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  primaryBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.success + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  actionCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 40,
  },
  evidenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  evidenceCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.secondary + '30',
  },
  evidenceIconContainer: {
    marginRight: 14,
  },
  evidenceIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidencePreview: {
    marginRight: 14,
  },
  evidencePreviewGradient: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceInfo: {
    flex: 1,
  },
  evidenceInfoTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  evidenceInfoSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 3,
  },
  evidenceAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
