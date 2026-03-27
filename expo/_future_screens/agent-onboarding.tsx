import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Shield, 
  Briefcase, 
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { LineOfBusiness } from '@/types';

const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  text: '#111111',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  primaryBlue: '#1275FF',
  primaryGreen: '#0BBE7D',
  border: '#E5E7EB',
  success: '#0BBE7D',
  successLight: '#DCFCE7',
  warning: '#FBBF24',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
};

const LINES_OF_BUSINESS: { key: LineOfBusiness; label: string }[] = [
  { key: 'auto', label: 'Auto' },
  { key: 'home', label: 'Home' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'life', label: 'Life' },
  { key: 'health', label: 'Health' },
  { key: 'other', label: 'Other' },
];

type Step = 'info' | 'licensing' | 'business' | 'review';

export default function AgentOnboardingScreen() {
  const router = useRouter();
  const { user, agentProfile, setAgentProfile, setUserRole, language } = useApp();
  
  const [currentStep, setCurrentStep] = useState<Step>('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [selectedLanguages, setSelectedLanguages] = useState<('en' | 'es')[]>(['en']);
  
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseExpiry, setLicenseExpiry] = useState('');
  const [zipCoverage, setZipCoverage] = useState('');
  const [acceptUrgentLeads, setAcceptUrgentLeads] = useState(false);
  const [driversDisclaimerAccepted, setDriversDisclaimerAccepted] = useState(false);
  const [agentResponsibilityAccepted, setAgentResponsibilityAccepted] = useState(false);
  
  const [selectedLines, setSelectedLines] = useState<LineOfBusiness[]>([]);
  const [serviceAreaZip, setServiceAreaZip] = useState('');
  const [bio, setBio] = useState('');

  const { t } = useApp();
  const text = t.agents;

  const steps: Step[] = ['info', 'licensing', 'business', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  const toggleLanguage = (lang: 'en' | 'es') => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };

  const toggleLine = (line: LineOfBusiness) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setSelectedLines(prev => 
      prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
    );
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'info':
        return fullName.length >= 2 && phone.length >= 10 && email.includes('@') && selectedLanguages.length > 0;
      case 'licensing':
        return licenseNumber.length >= 4 && licenseExpiry.length >= 8;
      case 'business':
        return selectedLines.length > 0;
      case 'review':
        return driversDisclaimerAccepted && agentResponsibilityAccepted;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsSubmitting(true);
    
    try {
      const now = new Date().toISOString();
      const zipCoverageArray: string[] | undefined = zipCoverage 
        ? zipCoverage.split(',').map(z => z.trim()).filter(Boolean) 
        : undefined;
      const newAgent = {
        id: `agent_${Date.now()}`,
        userId: user?.id || '',
        fullName,
        agencyName: agencyName || undefined,
        phone,
        email,
        whatsappNumber: whatsappNumber || undefined,
        stateLicenses: ['TX'],
        licenseNumber,
        licenseExpiry,
        zipCoverage: zipCoverageArray,
        acceptsUrgentLeads: acceptUrgentLeads,
        linesOfBusiness: selectedLines,
        languages: selectedLanguages,
        serviceAreaZipPrefix: serviceAreaZip || undefined,
        bio: bio || undefined,
        status: 'pending' as const,
        createdAt: now,
        updatedAt: now,
      };
      
      await setAgentProfile(newAgent);
      await setUserRole('agent');
      
      Alert.alert(
        text.pendingTitle,
        text.pendingSubtitle,
        [{ text: 'OK', onPress: () => router.replace('/') }]
      );
    } catch (error) {
      console.error('[AgentOnboarding] Error:', error);
      Alert.alert('Error', 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (agentProfile) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{text.title}</Text>
            <View style={styles.headerSpacer} />
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[
              styles.statusIconContainer,
              { backgroundColor: agentProfile.status === 'verified' ? COLORS.successLight : 
                agentProfile.status === 'rejected' ? COLORS.dangerLight : COLORS.warningLight }
            ]}>
              {agentProfile.status === 'verified' ? (
                <CheckCircle size={48} color={COLORS.success} />
              ) : agentProfile.status === 'rejected' ? (
                <XCircle size={48} color={COLORS.danger} />
              ) : (
                <Clock size={48} color={COLORS.warning} />
              )}
            </View>
            <Text style={styles.statusTitle}>
              {agentProfile.status === 'verified' ? text.verified :
               agentProfile.status === 'rejected' ? text.rejected :
               text.pendingTitle}
            </Text>
            <Text style={styles.statusDesc}>
              {agentProfile.status === 'pending' && text.pendingSubtitle}
              {agentProfile.status === 'rejected' && agentProfile.rejectionReason}
            </Text>
            
            <TouchableOpacity 
              style={styles.homeButton}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.homeButtonText}>{text.goHome}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'info':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <User size={24} color={COLORS.primaryBlue} />
              </View>
              <Text style={styles.stepTitle}>{text.stepInfo}</Text>
            </View>
            
            <View style={styles.trialBanner}>
              <Text style={styles.trialBannerText}>{text.trialInfo}</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.fullName} *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full name"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.agencyName}</Text>
              <TextInput
                style={styles.input}
                value={agencyName}
                onChangeText={setAgencyName}
                placeholder="Smith Insurance Agency"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.phone} *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.email} *</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="john@agency.com"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.whatsapp}</Text>
              <TextInput
                style={styles.input}
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.languages} *</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, selectedLanguages.includes('en') && styles.chipSelected]}
                  onPress={() => toggleLanguage('en')}
                >
                  <Text style={[styles.chipText, selectedLanguages.includes('en') && styles.chipTextSelected]}>
                    English
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.chip, selectedLanguages.includes('es') && styles.chipSelected]}
                  onPress={() => toggleLanguage('es')}
                >
                  <Text style={[styles.chipText, selectedLanguages.includes('es') && styles.chipTextSelected]}>
                    Español
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
        
      case 'licensing':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Shield size={24} color={COLORS.primaryBlue} />
              </View>
              <Text style={styles.stepTitle}>{text.stepLicensing}</Text>
            </View>

            <View style={styles.texasNotice}>
              <Text style={styles.texasNoticeText}>{text.texasOnly}</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.licenseState} *</Text>
              <View style={styles.fixedStateContainer}>
                <Text style={styles.fixedStateText}>TX</Text>
                <Text style={styles.fixedStateHelper}>{text.currentlyTexas}</Text>
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.licenseNumber} *</Text>
              <TextInput
                style={styles.input}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="TX-123456789"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.licenseExpiry} *</Text>
              <TextInput
                style={styles.input}
                value={licenseExpiry}
                onChangeText={setLicenseExpiry}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.zipCoverage}</Text>
              <TextInput
                style={styles.input}
                value={zipCoverage}
                onChangeText={setZipCoverage}
                placeholder="78501, 78520, 78550..."
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <TouchableOpacity 
              style={styles.toggleRow}
              onPress={() => setAcceptUrgentLeads(!acceptUrgentLeads)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptUrgentLeads && styles.checkboxChecked]}>
                {acceptUrgentLeads && <CheckCircle size={16} color="#FFFFFF" />}
              </View>
              <Text style={styles.toggleLabel}>{text.acceptUrgent}</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'business':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <Briefcase size={24} color={COLORS.primaryBlue} />
              </View>
              <Text style={styles.stepTitle}>{text.stepBusiness}</Text>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.linesOfBusiness} *</Text>
              <View style={styles.chipRow}>
                {LINES_OF_BUSINESS.map(line => (
                  <TouchableOpacity
                    key={line.key}
                    style={[styles.chip, selectedLines.includes(line.key) && styles.chipSelected]}
                    onPress={() => toggleLine(line.key)}
                  >
                    <Text style={[styles.chipText, selectedLines.includes(line.key) && styles.chipTextSelected]}>
                      {line.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.serviceArea}</Text>
              <TextInput
                style={styles.input}
                value={serviceAreaZip}
                onChangeText={setServiceAreaZip}
                placeholder="785"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="number-pad"
                maxLength={5}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>{text.bioLabel}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell clients about yourself..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );
        
      case 'review':
        return (
          <View style={styles.stepContent}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIconContainer}>
                <CheckCircle size={24} color={COLORS.primaryBlue} />
              </View>
              <Text style={styles.stepTitle}>{text.stepReview}</Text>
            </View>
            
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>{language === 'es' ? 'Nombre' : 'Name'}</Text>
              <Text style={styles.reviewValue}>{fullName}</Text>
            </View>
            
            {agencyName && (
              <View style={styles.reviewCard}>
                <Text style={styles.reviewLabel}>{language === 'es' ? 'Agencia' : 'Agency'}</Text>
                <Text style={styles.reviewValue}>{agencyName}</Text>
              </View>
            )}
            
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>{language === 'es' ? 'Contacto' : 'Contact'}</Text>
              <Text style={styles.reviewValue}>{phone} • {email}</Text>
            </View>
            
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>{language === 'es' ? 'Licencia #' : 'License #'}</Text>
              <Text style={styles.reviewValue}>{licenseNumber}</Text>
            </View>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>{language === 'es' ? 'Líneas' : 'Lines'}</Text>
              <Text style={styles.reviewValue}>{selectedLines.join(', ')}</Text>
            </View>

            <View style={styles.disclaimerSection}>
              <Text style={styles.disclaimerTitle}>{text.legalAgreements}</Text>
              
              <TouchableOpacity 
                style={styles.disclaimerRow}
                onPress={() => setDriversDisclaimerAccepted(!driversDisclaimerAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, driversDisclaimerAccepted && styles.checkboxChecked]}>
                  {driversDisclaimerAccepted && <CheckCircle size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.disclaimerText}>{text.driversDisclaimer}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.disclaimerRow}
                onPress={() => setAgentResponsibilityAccepted(!agentResponsibilityAccepted)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, agentResponsibilityAccepted && styles.checkboxChecked]}>
                  {agentResponsibilityAccepted && <CheckCircle size={16} color="#FFFFFF" />}
                </View>
                <Text style={styles.disclaimerText}>{text.agentResponsibility}</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <ChevronLeft size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{text.title}</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        <View style={styles.progressContainer}>
          {steps.map((step, index) => (
            <View key={step} style={styles.progressStep}>
              <View style={[
                styles.progressDot,
                index <= currentStepIndex && styles.progressDotActive,
                index < currentStepIndex && styles.progressDotComplete,
              ]}>
                {index < currentStepIndex ? (
                  <CheckCircle size={14} color="#FFFFFF" />
                ) : (
                  <Text style={[styles.progressNumber, index <= currentStepIndex && styles.progressNumberActive]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              {index < steps.length - 1 && (
                <View style={[styles.progressLine, index < currentStepIndex && styles.progressLineActive]} />
              )}
            </View>
          ))}
        </View>
      </SafeAreaView>
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>
      
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerContent}>
          {currentStep === 'review' ? (
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting || !canProceed()}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? text.loading : text.apply}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, !canProceed() && styles.buttonDisabled]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>{text.next}</Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  headerSpacer: {
    width: 44,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: {
    borderColor: COLORS.primaryBlue,
    backgroundColor: COLORS.primaryBlue + '20',
  },
  progressDotComplete: {
    backgroundColor: COLORS.primaryBlue,
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.textTertiary,
  },
  progressNumberActive: {
    color: COLORS.primaryBlue,
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: COLORS.border,
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: COLORS.primaryBlue,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  stepContent: {
    gap: 20,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryBlue + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primaryBlue + '20',
    borderColor: COLORS.primaryBlue,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: COLORS.textSecondary,
  },
  chipTextSelected: {
    color: COLORS.primaryBlue,
  },
  texasNotice: {
    backgroundColor: COLORS.warningLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  texasNoticeText: {
    fontSize: 14,
    color: COLORS.warning,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  fixedStateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fixedStateText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  fixedStateHelper: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontStyle: 'italic' as const,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primaryBlue,
    borderColor: COLORS.primaryBlue,
  },
  disclaimerSection: {
    marginTop: 20,
    gap: 16,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  reviewCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 4,
  },
  reviewLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  footer: {
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerContent: {
    padding: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 16,
    borderRadius: 14,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  statusIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: COLORS.text,
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  homeButton: {
    marginTop: 24,
    backgroundColor: COLORS.primaryBlue,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  trialBanner: {
    backgroundColor: COLORS.primaryBlue + '10',
    borderWidth: 1,
    borderColor: COLORS.primaryBlue + '30',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  trialBannerText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.primaryBlue,
    textAlign: 'center',
    lineHeight: 20,
  },
});
