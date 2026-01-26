import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Check, Globe } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc';

type WizardStep = 'phone' | 'name' | 'zip' | 'vehicleCount' | 'vin' | 'coverage';

interface FormData {
  phone: string;
  fullName: string;
  zip: string;
  vehicleCount: number;
  vins: string[];
  coverage: 'liability' | 'full' | null;
}

const COLORS = {
  background: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  success: '#10B981',
};

export default function QuoteFormScreen() {
  const { language, setLanguage, setConsentGiven, user } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<WizardStep>('phone');
  const [currentVinIndex, setCurrentVinIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    phone: '',
    fullName: '',
    zip: '',
    vehicleCount: 1,
    vins: [],
    coverage: null,
  });
  const [error, setError] = useState('');

  const isEs = language === 'es';

  const copy = useMemo(() => {
    if (isEs) {
      return {
        headerTitle: 'Obtener Cotización',
        back: 'Atrás',
        next: 'Siguiente',
        submit: 'Enviar',
        stepOf: 'de',
        phoneTitle: '¿Cuál es tu teléfono?',
        phoneSubtitle: 'Te contactaremos por WhatsApp o texto.',
        phonePlaceholder: '(555) 123-4567',
        phoneError: 'Ingresa un número de 10 dígitos',
        nameTitle: '¿Cuál es tu nombre completo?',
        nameSubtitle: 'Como aparece en tu licencia de conducir.',
        namePlaceholder: 'Juan Pérez',
        nameError: 'Ingresa tu nombre completo',
        zipTitle: '¿Cuál es tu código postal?',
        zipSubtitle: 'Donde guardas tu vehículo.',
        zipPlaceholder: '78501',
        zipError: 'Ingresa un código postal de 5 dígitos',
        vehicleCountTitle: '¿Cuántos vehículos?',
        vehicleCountSubtitle: 'Selecciona el número de vehículos a asegurar.',
        vinTitle: (i: number, total: number) => `VIN del vehículo ${i + 1} de ${total}`,
        vinSubtitle: 'Encuentra el VIN en tu tablero o puerta.',
        vinPlaceholder: '1HGBH41JXMN109186',
        vinError: 'El VIN debe tener 17 caracteres',
        vinDuplicateError: 'Este VIN ya fue ingresado',
        coverageTitle: '¿Qué cobertura prefieres?',
        coverageSubtitle: 'Elige el tipo de protección.',
        liabilityOnly: 'Solo Responsabilidad',
        liabilityDesc: 'Cobertura mínima requerida por ley (30/60/25)',
        fullCoverage: 'Cobertura Completa',
        fullDesc: 'Incluye colisión y comprensivo',
        submitting: 'Enviando...',
        submitError: 'Error al enviar. Intenta de nuevo.',
      };
    }
    return {
      headerTitle: 'Get a Quote',
      back: 'Back',
      next: 'Next',
      submit: 'Submit',
      stepOf: 'of',
      phoneTitle: "What's your phone number?",
      phoneSubtitle: "We'll contact you via WhatsApp or text.",
      phonePlaceholder: '(555) 123-4567',
      phoneError: 'Enter a valid 10-digit number',
      nameTitle: "What's your full name?",
      nameSubtitle: 'As it appears on your driver\'s license.',
      namePlaceholder: 'John Smith',
      nameError: 'Enter your full name',
      zipTitle: "What's your ZIP code?",
      zipSubtitle: 'Where you park your vehicle.',
      zipPlaceholder: '78501',
      zipError: 'Enter a valid 5-digit ZIP code',
      vehicleCountTitle: 'How many vehicles?',
      vehicleCountSubtitle: 'Select the number of vehicles to insure.',
      vinTitle: (i: number, total: number) => `VIN for vehicle ${i + 1} of ${total}`,
      vinSubtitle: 'Find your VIN on the dashboard or door jamb.',
      vinPlaceholder: '1HGBH41JXMN109186',
      vinError: 'VIN must be exactly 17 characters',
      vinDuplicateError: 'This VIN was already entered',
      coverageTitle: 'What coverage do you prefer?',
      coverageSubtitle: 'Choose your level of protection.',
      liabilityOnly: 'Liability Only',
      liabilityDesc: 'Minimum coverage required by law (30/60/25)',
      fullCoverage: 'Full Coverage',
      fullDesc: 'Includes collision and comprehensive',
      submitting: 'Submitting...',
      submitError: 'Failed to submit. Please try again.',
    };
  }, [isEs]);

  const submitIntakeMutation = trpc.intake.submit.useMutation({
    onSuccess: () => {
      console.log('[QUOTE_FORM] Lead submitted successfully');
      setConsentGiven(true);
      router.push('/quote-submitted');
    },
    onError: (err) => {
      console.error('[QUOTE_FORM] Submit error:', err);
      setIsSubmitting(false);
      Alert.alert(isEs ? 'Error' : 'Error', copy.submitError);
    },
  });

  const steps = useMemo<WizardStep[]>(() => ['phone', 'name', 'zip', 'vehicleCount', 'vin', 'coverage'], []);
  const currentStepIndex = steps.indexOf(step);
  const totalSteps = steps.length;

  const toggleLanguage = useCallback(() => {
    setLanguage(isEs ? 'en' : 'es');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [isEs, setLanguage]);

  const validateCurrentStep = useCallback((): boolean => {
    setError('');

    switch (step) {
      case 'phone': {
        const digits = formData.phone.replace(/\D/g, '');
        if (digits.length !== 10) {
          setError(copy.phoneError);
          return false;
        }
        return true;
      }
      case 'name': {
        if (formData.fullName.trim().length < 2) {
          setError(copy.nameError);
          return false;
        }
        return true;
      }
      case 'zip': {
        const zipDigits = formData.zip.replace(/\D/g, '');
        if (zipDigits.length !== 5) {
          setError(copy.zipError);
          return false;
        }
        return true;
      }
      case 'vehicleCount':
        return formData.vehicleCount >= 1 && formData.vehicleCount <= 3;
      case 'vin': {
        const currentVin = formData.vins[currentVinIndex] || '';
        const cleanVin = currentVin.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (cleanVin.length !== 17) {
          setError(copy.vinError);
          return false;
        }
        const otherVins = formData.vins.filter((_, i) => i !== currentVinIndex);
        if (otherVins.includes(cleanVin)) {
          setError(copy.vinDuplicateError);
          return false;
        }
        return true;
      }
      case 'coverage':
        return formData.coverage !== null;
      default:
        return true;
    }
  }, [step, formData, currentVinIndex, copy]);

  const goNext = useCallback(() => {
    if (!validateCurrentStep()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (step === 'vin') {
      const cleanVin = (formData.vins[currentVinIndex] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const updatedVins = [...formData.vins];
      updatedVins[currentVinIndex] = cleanVin;
      setFormData(prev => ({ ...prev, vins: updatedVins }));

      if (currentVinIndex < formData.vehicleCount - 1) {
        setCurrentVinIndex(currentVinIndex + 1);
        return;
      }
    }

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
      setError('');
    }
  }, [step, currentStepIndex, steps, formData, currentVinIndex, validateCurrentStep]);

  const goBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (step === 'vin' && currentVinIndex > 0) {
      setCurrentVinIndex(currentVinIndex - 1);
      setError('');
      return;
    }

    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
      setError('');
      if (steps[prevIndex] === 'vin') {
        setCurrentVinIndex(formData.vehicleCount - 1);
      }
    } else {
      router.back();
    }
  }, [step, currentStepIndex, steps, currentVinIndex, formData.vehicleCount, router]);

  const handleSubmit = useCallback(async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      await submitIntakeMutation.mutateAsync({
        userId: user?.id || `user_${Date.now()}`,
        intake: {
          phone: formData.phone.replace(/\D/g, ''),
          insuredFullName: formData.fullName.trim(),
          garagingAddress: { zip: formData.zip.replace(/\D/g, ''), state: 'TX' },
          contactPreference: 'whatsapp',
          language: isEs ? 'es' : 'en',
          consentContactAllowed: true,
          vehicles: formData.vins.map(vin => ({ vin })),
          coverageType: formData.coverage === 'liability' ? 'minimum' : 'full',
        },
      });
    } catch (err) {
      console.error('[QUOTE_FORM] Submit failed:', err);
    }
  }, [formData, isEs, user, submitIntakeMutation, validateCurrentStep]);

  const updateVin = useCallback((text: string) => {
    const updatedVins = [...formData.vins];
    updatedVins[currentVinIndex] = text.toUpperCase();
    setFormData(prev => ({ ...prev, vins: updatedVins }));
    setError('');
  }, [currentVinIndex, formData.vins]);

  const renderStepContent = () => {
    switch (step) {
      case 'phone':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{copy.phoneTitle}</Text>
            <Text style={styles.stepSubtitle}>{copy.phoneSubtitle}</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder={copy.phonePlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={formData.phone}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, phone: text }));
                setError('');
              }}
              keyboardType="phone-pad"
              autoFocus
              testID="phone-input"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'name':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{copy.nameTitle}</Text>
            <Text style={styles.stepSubtitle}>{copy.nameSubtitle}</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder={copy.namePlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={formData.fullName}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, fullName: text }));
                setError('');
              }}
              autoCapitalize="words"
              autoFocus
              testID="name-input"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'zip':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{copy.zipTitle}</Text>
            <Text style={styles.stepSubtitle}>{copy.zipSubtitle}</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder={copy.zipPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={formData.zip}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, zip: text.replace(/\D/g, '').slice(0, 5) }));
                setError('');
              }}
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
              testID="zip-input"
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'vehicleCount':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{copy.vehicleCountTitle}</Text>
            <Text style={styles.stepSubtitle}>{copy.vehicleCountSubtitle}</Text>
            <View style={styles.countSelector}>
              {[1, 2, 3].map((count) => (
                <Pressable
                  key={count}
                  style={[
                    styles.countOption,
                    formData.vehicleCount === count && styles.countOptionSelected,
                  ]}
                  onPress={() => {
                    setFormData(prev => ({
                      ...prev,
                      vehicleCount: count,
                      vins: prev.vins.slice(0, count),
                    }));
                    if (Platform.OS !== 'web') {
                      Haptics.selectionAsync();
                    }
                  }}
                  testID={`vehicle-count-${count}`}
                >
                  <Text
                    style={[
                      styles.countText,
                      formData.vehicleCount === count && styles.countTextSelected,
                    ]}
                  >
                    {count}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        );

      case 'vin':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>
              {copy.vinTitle(currentVinIndex, formData.vehicleCount)}
            </Text>
            <Text style={styles.stepSubtitle}>{copy.vinSubtitle}</Text>
            <TextInput
              style={[styles.input, styles.vinInput, error ? styles.inputError : null]}
              placeholder={copy.vinPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              value={formData.vins[currentVinIndex] || ''}
              onChangeText={updateVin}
              autoCapitalize="characters"
              maxLength={17}
              autoFocus
              testID={`vin-input-${currentVinIndex}`}
            />
            <Text style={styles.vinCounter}>
              {(formData.vins[currentVinIndex] || '').replace(/[^A-Z0-9]/gi, '').length}/17
            </Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        );

      case 'coverage':
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{copy.coverageTitle}</Text>
            <Text style={styles.stepSubtitle}>{copy.coverageSubtitle}</Text>
            <View style={styles.coverageOptions}>
              <Pressable
                style={[
                  styles.coverageCard,
                  formData.coverage === 'liability' && styles.coverageCardSelected,
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, coverage: 'liability' }));
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                }}
                testID="coverage-liability"
              >
                <View style={styles.coverageHeader}>
                  <Text
                    style={[
                      styles.coverageTitle,
                      formData.coverage === 'liability' && styles.coverageTitleSelected,
                    ]}
                  >
                    {copy.liabilityOnly}
                  </Text>
                  {formData.coverage === 'liability' && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={styles.coverageDesc}>{copy.liabilityDesc}</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.coverageCard,
                  formData.coverage === 'full' && styles.coverageCardSelected,
                ]}
                onPress={() => {
                  setFormData(prev => ({ ...prev, coverage: 'full' }));
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                }}
                testID="coverage-full"
              >
                <View style={styles.coverageHeader}>
                  <Text
                    style={[
                      styles.coverageTitle,
                      formData.coverage === 'full' && styles.coverageTitleSelected,
                    ]}
                  >
                    {copy.fullCoverage}
                  </Text>
                  {formData.coverage === 'full' && (
                    <View style={styles.checkCircle}>
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  )}
                </View>
                <Text style={styles.coverageDesc}>{copy.fullDesc}</Text>
              </Pressable>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const isLastStep = step === 'coverage';
  const canProceed = (() => {
    switch (step) {
      case 'phone':
        return formData.phone.replace(/\D/g, '').length === 10;
      case 'name':
        return formData.fullName.trim().length >= 2;
      case 'zip':
        return formData.zip.replace(/\D/g, '').length === 5;
      case 'vehicleCount':
        return true;
      case 'vin':
        return (formData.vins[currentVinIndex] || '').replace(/[^A-Z0-9]/gi, '').length === 17;
      case 'coverage':
        return formData.coverage !== null;
      default:
        return false;
    }
  })();

  const getProgress = () => {
    let progress = currentStepIndex;
    if (step === 'vin') {
      progress = currentStepIndex + (currentVinIndex / formData.vehicleCount);
    }
    return (progress + 1) / totalSteps;
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: copy.headerTitle,
          headerBackTitle: copy.back,
          headerRight: () => (
            <Pressable onPress={toggleLanguage} style={styles.langButton} hitSlop={8}>
              <Globe size={18} color={COLORS.primary} />
              <Text style={styles.langText}>{isEs ? 'EN' : 'ES'}</Text>
            </Pressable>
          ),
        }}
      />

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${getProgress() * 100}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {currentStepIndex + 1} {copy.stepOf} {totalSteps}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {renderStepContent()}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable
            style={styles.backButton}
            onPress={goBack}
            testID="back-button"
          >
            <ChevronLeft size={20} color={COLORS.textSecondary} />
            <Text style={styles.backButtonText}>{copy.back}</Text>
          </Pressable>

          <Pressable
            style={[
              styles.nextButton,
              !canProceed && styles.nextButtonDisabled,
            ]}
            onPress={isLastStep ? handleSubmit : goNext}
            disabled={!canProceed || isSubmitting}
            testID="next-button"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.nextButtonText}>
                  {isLastStep ? copy.submit : copy.next}
                </Text>
                {!isLastStep && <ChevronRight size={20} color="#FFFFFF" />}
              </>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
  },
  langText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 8,
    lineHeight: 32,
  },
  stepSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 32,
    lineHeight: 22,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: COLORS.text,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  vinInput: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 1,
  },
  vinCounter: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'right',
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 8,
  },
  countSelector: {
    flexDirection: 'row',
    gap: 16,
  },
  countOption: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  countText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: COLORS.textSecondary,
  },
  countTextSelected: {
    color: COLORS.primary,
  },
  coverageOptions: {
    gap: 16,
  },
  coverageCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  coverageCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  coverageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  coverageTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  coverageTitleSelected: {
    color: COLORS.primary,
  },
  coverageDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 28,
    gap: 6,
  },
  nextButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
