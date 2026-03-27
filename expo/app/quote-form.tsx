import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Phone,
  User,
  MapPin,
  Car,
  Shield,
  Users,
  Home,
  MessageCircle,
  PhoneCall,
  MessageSquare,
  Bell,
  Info,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { submitQuoteForm, type ContactPreference } from '@/services/IntakeService';
import { SAVER } from '@/constants/theme';
import ProgressBar from '@/components/ProgressBar';
import FormInput from '@/components/ui/FormInput';
import PhoneInput from '@/components/ui/PhoneInput';
import SegmentedSelector from '@/components/ui/SegmentedSelector';
import YesNoToggle from '@/components/ui/YesNoToggle';
import RadioCards from '@/components/ui/RadioCards';
import ConsentCheckbox from '@/components/ui/ConsentCheckbox';
import CoverageExplainer from '@/components/ui/CoverageExplainer';
import SummaryRow from '@/components/ui/SummaryRow';
import SectionHeader from '@/components/ui/SectionHeader';

type WizardStep =
  | 'phone'
  | 'name'
  | 'zip'
  | 'driversCount'
  | 'driverInfo'
  | 'vehiclesCount'
  | 'vin'
  | 'coverage'
  | 'discounts'
  | 'communication'
  | 'reminders'
  | 'summary';

interface DriverEntry {
  name: string;
  dob: string;
}

interface FormData {
  phone: string;
  fullName: string;
  zip: string;
  driversCount: number;
  drivers: DriverEntry[];
  vehiclesCount: number;
  vins: string[];
  coverage: 'minimum' | 'full' | null;
  currentlyInsured: boolean | null;
  insuredMonths: string | null;
  homeowner: boolean | null;
  contactPreference: ContactPreference | null;
  languagePref: 'en' | 'es';
  savingsThreshold: number;
  consentGiven: boolean;
  wantsReminders: boolean | null;
  reminderChannel: ContactPreference | null;
  reminderConsent: boolean;
}

const STEPS: WizardStep[] = [
  'phone', 'name', 'zip', 'driversCount', 'driverInfo',
  'vehiclesCount', 'vin', 'coverage', 'discounts',
  'communication', 'reminders', 'summary',
];

export default function QuoteFormScreen() {
  const { language, setLanguage, setConsentGiven: setAppConsent } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<WizardStep>('phone');
  const [currentDriverIndex, setCurrentDriverIndex] = useState(0);
  const [currentVehicleIndex, setCurrentVehicleIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCoverageExplainer, setShowCoverageExplainer] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [form, setForm] = useState<FormData>({
    phone: '',
    fullName: '',
    zip: '',
    driversCount: 1,
    drivers: [{ name: '', dob: '' }],
    vehiclesCount: 1,
    vins: [''],
    coverage: null,
    currentlyInsured: null,
    insuredMonths: null,
    homeowner: null,
    contactPreference: 'whatsapp',
    languagePref: language,
    savingsThreshold: 10,
    consentGiven: false,
    wantsReminders: null,
    reminderChannel: null,
    reminderConsent: false,
  });

  const isEs = language === 'es';

  const t = useMemo(() => {
    const w = isEs ? {
      phoneTitle: 'Tu número de teléfono',
      phoneSub: 'Solo te contactamos cuando hay algo útil.',
      phoneHint: 'WhatsApp preferido — sin spam, nunca.',
      nameTitle: 'Tu nombre',
      nameSub: 'Como aparece en tu póliza o identificación.',
      namePlaceholder: 'Nombre completo',
      zipTitle: 'Tu código postal',
      zipSub: 'Donde se guarda el vehículo.',
      driversTitle: '¿Cuántos conductores?',
      driversSub: 'Incluye a todos los conductores de la póliza.',
      driverInfoTitle: 'Conductor {n}',
      driverInfoSub: 'Nombre y fecha de nacimiento.',
      driverNamePH: 'Nombre del conductor',
      driverDobPH: 'MM/DD/AAAA',
      vehiclesTitle: '¿Cuántos vehículos?',
      vehiclesSub: 'Incluye todos los vehículos a asegurar.',
      vinTitle: 'VIN del vehículo {n}',
      vinSub: 'Encuéntralo en el tablero o puerta del conductor.',
      vinPH: 'VIN de 17 caracteres',
      vinSkip: 'Aún no lo tengo',
      coverageTitle: 'Preferencia de cobertura',
      coverageSub: '¿Qué nivel de protección quieres?',
      coverageMin: 'Mínimo (30/60/25)',
      coverageMinDesc: 'Mínimo legal en Texas.',
      coverageFull: 'Cobertura Full',
      coverageFullDesc: 'Responsabilidad + Colisión + Comprehensivo.',
      coverageExplain: '¿Qué significa esto?',
      discountsTitle: 'Descuentos',
      discountsSub: 'Ayúdanos a encontrar la mejor tarifa.',
      currentlyInsured: '¿Actualmente asegurado?',
      insuredMonths: '¿Cuánto tiempo continuo?',
      months3: '3+ meses', months6: '6+ meses', months12: '12+ meses',
      homeowner: '¿Dueño de casa?',
      commTitle: '¿Cómo te contactamos?',
      commSub: 'Solo te contactamos cuando hay valor real.',
      contactMethod: 'Método de contacto preferido',
      contactWA: 'WhatsApp', contactTxt: 'Texto', contactCall: 'Llamada',
      savingsLabel: 'Solo contáctame si puedes ahorrarme al menos',
      langPref: 'Idioma preferido',
      consentLabel: 'Acepto ser contactado sobre cotizaciones de seguro por mi método preferido.',
      consentSub: 'Sin spam. Solo te contactamos cuando hay algo útil.',
      reminderTitle: 'Recordatorios de pago',
      reminderSub: '¿Te gustaría recibir recordatorios útiles sobre pagos y renovaciones?',
      reminderYes: 'Sí, recuérdame',
      reminderNo: 'Ahora no',
      reminderChannel: 'Canal de recordatorio',
      reminderConsent: 'Me gustaría recibir recordatorios de pago y renovación.',
      summaryTitle: 'Revisa tu información',
      summarySub: 'Asegúrate de que todo esté correcto.',
      sContact: 'CONTACTO', sDrivers: 'CONDUCTORES', sVehicles: 'VEHÍCULOS',
      sCoverage: 'COBERTURA', sDiscounts: 'DESCUENTOS', sPrefs: 'PREFERENCIAS',
      missing: 'No proporcionado',
      readyLabel: 'Listo para cotizar',
      almostLabel: 'Casi listo',
      submitBtn: 'Enviar para Cotizar',
      submittingBtn: 'Enviando...',
      back: 'Atrás', next: 'Siguiente', yes: 'Sí', no: 'No',
    } : {
      phoneTitle: 'Your phone number',
      phoneSub: "We'll only contact you when there's something useful.",
      phoneHint: 'WhatsApp preferred — no spam, ever.',
      nameTitle: 'Your name',
      nameSub: 'As it appears on your policy or ID.',
      namePlaceholder: 'Full name',
      zipTitle: 'Your ZIP code',
      zipSub: 'Where the vehicle is garaged.',
      driversTitle: 'How many drivers?',
      driversSub: 'Include all drivers on the policy.',
      driverInfoTitle: 'Driver {n}',
      driverInfoSub: 'Name and date of birth.',
      driverNamePH: 'Driver name',
      driverDobPH: 'MM/DD/YYYY',
      vehiclesTitle: 'How many vehicles?',
      vehiclesSub: 'Include all vehicles to insure.',
      vinTitle: 'Vehicle {n} VIN',
      vinSub: 'Find it on the dashboard or driver door sticker.',
      vinPH: '17-character VIN',
      vinSkip: "I don't have it yet",
      coverageTitle: 'Coverage preference',
      coverageSub: 'What level of protection do you want?',
      coverageMin: 'Minimum (30/60/25)',
      coverageMinDesc: 'Texas legal minimum liability.',
      coverageFull: 'Full Coverage',
      coverageFullDesc: 'Liability + Collision + Comprehensive.',
      coverageExplain: 'What does this mean?',
      discountsTitle: 'Discounts',
      discountsSub: 'Help us find the best rate.',
      currentlyInsured: 'Currently insured?',
      insuredMonths: 'How long continuously?',
      months3: '3+ months', months6: '6+ months', months12: '12+ months',
      homeowner: 'Homeowner?',
      commTitle: 'How should we reach you?',
      commSub: "We only contact you when there's real value.",
      contactMethod: 'Preferred contact method',
      contactWA: 'WhatsApp', contactTxt: 'Text', contactCall: 'Call',
      savingsLabel: 'Only contact me if you can save me at least',
      langPref: 'Preferred language',
      consentLabel: 'I agree to be contacted about insurance quotes via my preferred method.',
      consentSub: 'No spam. We only reach out when there\'s something useful.',
      reminderTitle: 'Payment reminders',
      reminderSub: 'Would you like helpful reminders about payments and renewals?',
      reminderYes: 'Yes, remind me',
      reminderNo: 'Not now',
      reminderChannel: 'Reminder channel',
      reminderConsent: "I'd like to receive payment and renewal reminders.",
      summaryTitle: 'Review your info',
      summarySub: 'Make sure everything looks correct.',
      sContact: 'CONTACT', sDrivers: 'DRIVERS', sVehicles: 'VEHICLES',
      sCoverage: 'COVERAGE', sDiscounts: 'DISCOUNTS', sPrefs: 'PREFERENCES',
      missing: 'Not provided',
      readyLabel: 'Ready to quote',
      almostLabel: 'Almost ready',
      submitBtn: 'Submit for Quotes',
      submittingBtn: 'Submitting...',
      back: 'Back', next: 'Next', yes: 'Yes', no: 'No',
    };
    return w;
  }, [isEs]);

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length;
  const progress = (stepIndex + 1) / totalSteps;

  const updateForm = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const animateSlide = useCallback((direction: 'forward' | 'back') => {
    slideAnim.setValue(direction === 'forward' ? 40 : -40);
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
  }, [slideAnim]);

  const goForward = useCallback((nextStep: WizardStep) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateSlide('forward');
    setStep(nextStep);
  }, [animateSlide]);

  const goBack = useCallback(() => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    animateSlide('back');
    const idx = STEPS.indexOf(step);
    if (idx <= 0) {
      router.back();
      return;
    }
    const prevStep = STEPS[idx - 1];
    if (prevStep === 'driverInfo') setCurrentDriverIndex(form.driversCount - 1);
    if (prevStep === 'vin') setCurrentVehicleIndex(form.vehiclesCount - 1);
    setStep(prevStep);
  }, [step, form.driversCount, form.vehiclesCount, animateSlide, router]);

  const handleNext = useCallback(() => {
    switch (step) {
      case 'phone': {
        const digits = form.phone.replace(/\D/g, '');
        if (digits.length < 10) {
          Alert.alert(isEs ? 'Teléfono inválido' : 'Invalid phone', isEs ? 'Ingresa un número de 10 dígitos.' : 'Please enter a 10-digit number.');
          return;
        }
        goForward('name');
        break;
      }
      case 'name':
        if (form.fullName.trim().length < 2) {
          Alert.alert(isEs ? 'Nombre requerido' : 'Name required', isEs ? 'Ingresa tu nombre completo.' : 'Please enter your full name.');
          return;
        }
        goForward('zip');
        break;
      case 'zip':
        if (form.zip.replace(/\D/g, '').length < 5) {
          Alert.alert(isEs ? 'ZIP inválido' : 'Invalid ZIP', isEs ? 'Ingresa un código postal de 5 dígitos.' : 'Please enter a 5-digit ZIP code.');
          return;
        }
        goForward('driversCount');
        break;
      case 'driversCount':
        goForward('driverInfo');
        break;
      case 'driverInfo':
        if (currentDriverIndex < form.driversCount - 1) {
          setCurrentDriverIndex(prev => prev + 1);
          animateSlide('forward');
        } else {
          setCurrentDriverIndex(0);
          goForward('vehiclesCount');
        }
        break;
      case 'vehiclesCount':
        goForward('vin');
        break;
      case 'vin':
        if (currentVehicleIndex < form.vehiclesCount - 1) {
          setCurrentVehicleIndex(prev => prev + 1);
          animateSlide('forward');
        } else {
          setCurrentVehicleIndex(0);
          goForward('coverage');
        }
        break;
      case 'coverage':
        if (!form.coverage) {
          Alert.alert(isEs ? 'Elige cobertura' : 'Choose coverage', isEs ? 'Selecciona un tipo de cobertura.' : 'Please select a coverage type.');
          return;
        }
        goForward('discounts');
        break;
      case 'discounts':
        goForward('communication');
        break;
      case 'communication':
        if (!form.consentGiven) {
          Alert.alert(isEs ? 'Consentimiento requerido' : 'Consent required', isEs ? 'Acepta los términos para continuar.' : 'Please accept the terms to continue.');
          return;
        }
        goForward('reminders');
        break;
      case 'reminders':
        goForward('summary');
        break;
      case 'summary':
        handleSubmit();
        break;
    }
  }, [step, form, currentDriverIndex, currentVehicleIndex, goForward, animateSlide, isEs]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAppConsent(true);

    console.log('[QuoteForm] Submitting form data...');
    try {
      const result = await submitQuoteForm({
        phone: form.phone,
        fullName: form.fullName,
        zip: form.zip,
        drivers: form.drivers.filter(d => d.name.trim()),
        vehiclesCount: form.vehiclesCount,
        vins: form.vins.filter(v => v.trim()),
        coverage: form.coverage || 'minimum',
        currentlyInsured: form.currentlyInsured,
        insuredMonths: form.insuredMonths,
        homeowner: form.homeowner,
        contactPreference: form.contactPreference || 'whatsapp',
        language: form.languagePref,
        consentGiven: form.consentGiven,
      });

      console.log('[QuoteForm] Submit result:', result);
      router.replace('/quote-submitted' as any);
    } catch (err) {
      console.error('[QuoteForm] Submit error:', err);
      Alert.alert(
        isEs ? 'Error' : 'Error',
        isEs ? 'No pudimos enviar tu solicitud. Intenta de nuevo.' : "We couldn't submit your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [form, isSubmitting, isEs, router, setAppConsent]);

  const updateDriver = useCallback((index: number, field: keyof DriverEntry, value: string) => {
    setForm(prev => {
      const drivers = [...prev.drivers];
      drivers[index] = { ...drivers[index], [field]: value };
      return { ...prev, drivers };
    });
  }, []);

  const updateVin = useCallback((index: number, value: string) => {
    setForm(prev => {
      const vins = [...prev.vins];
      vins[index] = value.toUpperCase();
      return { ...prev, vins };
    });
  }, []);

  const setDriversCount = useCallback((count: number) => {
    setForm(prev => {
      const drivers = [...prev.drivers];
      while (drivers.length < count) drivers.push({ name: '', dob: '' });
      return { ...prev, driversCount: count, drivers: drivers.slice(0, count) };
    });
    setCurrentDriverIndex(0);
  }, []);

  const setVehiclesCount = useCallback((count: number) => {
    setForm(prev => {
      const vins = [...prev.vins];
      while (vins.length < count) vins.push('');
      return { ...prev, vehiclesCount: count, vins: vins.slice(0, count) };
    });
    setCurrentVehicleIndex(0);
  }, []);

  const canProceed = useMemo(() => {
    switch (step) {
      case 'phone': return form.phone.replace(/\D/g, '').length >= 10;
      case 'name': return form.fullName.trim().length >= 2;
      case 'zip': return form.zip.replace(/\D/g, '').length >= 5;
      case 'driversCount': return true;
      case 'driverInfo': return form.drivers[currentDriverIndex]?.name.trim().length >= 2;
      case 'vehiclesCount': return true;
      case 'vin': return true;
      case 'coverage': return form.coverage !== null;
      case 'discounts': return true;
      case 'communication': return form.consentGiven;
      case 'reminders': return form.wantsReminders !== null;
      case 'summary': return true;
      default: return false;
    }
  }, [step, form, currentDriverIndex]);

  const isReadyToQuote = useMemo(() => {
    const hasPhone = form.phone.replace(/\D/g, '').length >= 10;
    const hasName = form.fullName.trim().length >= 2;
    const hasZip = form.zip.replace(/\D/g, '').length >= 5;
    const hasCoverage = form.coverage !== null;
    const hasDriver = form.drivers.some(d => d.name.trim().length >= 2);
    return hasPhone && hasName && hasZip && hasCoverage && hasDriver;
  }, [form]);

  const renderStepContent = () => {
    switch (step) {
      case 'phone':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.whatsapp}18` }]}>
                <Phone size={22} color={SAVER.whatsapp} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.phoneTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.phoneSub}</Text>
            <PhoneInput
              value={form.phone}
              onChangeText={(v) => updateForm('phone', v)}
              hint={t.phoneHint}
              testID="phone-input"
            />
          </View>
        );

      case 'name':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.accent}18` }]}>
                <User size={22} color={SAVER.accent} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.nameTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.nameSub}</Text>
            <FormInput
              value={form.fullName}
              onChangeText={(v) => updateForm('fullName', v)}
              placeholder={t.namePlaceholder}
              autoCapitalize="words"
              testID="name-input"
            />
          </View>
        );

      case 'zip':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.green}18` }]}>
                <MapPin size={22} color={SAVER.green} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.zipTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.zipSub}</Text>
            <FormInput
              value={form.zip}
              onChangeText={(v) => updateForm('zip', v.replace(/\D/g, '').slice(0, 5))}
              placeholder="78501"
              keyboardType="number-pad"
              maxLength={5}
              testID="zip-input"
            />
          </View>
        );

      case 'driversCount':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.accent}18` }]}>
                <Users size={22} color={SAVER.accent} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.driversTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.driversSub}</Text>
            <SegmentedSelector
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3+' },
              ]}
              value={String(form.driversCount)}
              onSelect={(v) => setDriversCount(parseInt(v))}
            />
          </View>
        );

      case 'driverInfo':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.accent}18` }]}>
                <User size={22} color={SAVER.accent} />
              </View>
            </View>
            <Text style={styles.stepTitle}>
              {t.driverInfoTitle.replace('{n}', String(currentDriverIndex + 1))}
            </Text>
            <Text style={styles.stepSubtitle}>{t.driverInfoSub}</Text>
            <FormInput
              label={isEs ? 'Nombre' : 'Name'}
              value={form.drivers[currentDriverIndex]?.name || ''}
              onChangeText={(v) => updateDriver(currentDriverIndex, 'name', v)}
              placeholder={t.driverNamePH}
              autoCapitalize="words"
              testID="driver-name-input"
            />
            <FormInput
              label={isEs ? 'Fecha de nacimiento' : 'Date of birth'}
              value={form.drivers[currentDriverIndex]?.dob || ''}
              onChangeText={(v) => updateDriver(currentDriverIndex, 'dob', v)}
              placeholder={t.driverDobPH}
              keyboardType="number-pad"
              testID="driver-dob-input"
            />
          </View>
        );

      case 'vehiclesCount':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.green}18` }]}>
                <Car size={22} color={SAVER.green} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.vehiclesTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.vehiclesSub}</Text>
            <SegmentedSelector
              options={[
                { value: '1', label: '1' },
                { value: '2', label: '2' },
                { value: '3', label: '3+' },
              ]}
              value={String(form.vehiclesCount)}
              onSelect={(v) => setVehiclesCount(parseInt(v))}
            />
          </View>
        );

      case 'vin':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.green}18` }]}>
                <Car size={22} color={SAVER.green} />
              </View>
            </View>
            <Text style={styles.stepTitle}>
              {t.vinTitle.replace('{n}', String(currentVehicleIndex + 1))}
            </Text>
            <Text style={styles.stepSubtitle}>{t.vinSub}</Text>
            <FormInput
              value={form.vins[currentVehicleIndex] || ''}
              onChangeText={(v) => updateVin(currentVehicleIndex, v)}
              placeholder={t.vinPH}
              autoCapitalize="characters"
              maxLength={17}
              testID="vin-input"
            />
            <Pressable
              onPress={() => updateVin(currentVehicleIndex, '')}
              style={styles.skipLink}
            >
              <Text style={styles.skipLinkText}>{t.vinSkip}</Text>
            </Pressable>
          </View>
        );

      case 'coverage':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.accent}18` }]}>
                <Shield size={22} color={SAVER.accent} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.coverageTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.coverageSub}</Text>
            <RadioCards
              options={[
                {
                  value: 'minimum',
                  label: t.coverageMin,
                  description: t.coverageMinDesc,
                  icon: <Shield size={18} color={SAVER.textSecondary} />,
                  badge: 'TX MIN',
                },
                {
                  value: 'full',
                  label: t.coverageFull,
                  description: t.coverageFullDesc,
                  icon: <Shield size={18} color={SAVER.accent} />,
                },
              ]}
              value={form.coverage}
              onSelect={(v) => updateForm('coverage', v as 'minimum' | 'full')}
            />
            <Pressable
              onPress={() => setShowCoverageExplainer(true)}
              style={styles.explainLink}
            >
              <Info size={14} color={SAVER.accent} />
              <Text style={styles.explainLinkText}>{t.coverageExplain}</Text>
            </Pressable>
          </View>
        );

      case 'discounts':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.orange}18` }]}>
                <Home size={22} color={SAVER.orange} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.discountsTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.discountsSub}</Text>
            <YesNoToggle
              label={t.currentlyInsured}
              value={form.currentlyInsured}
              onSelect={(v) => updateForm('currentlyInsured', v)}
              yesLabel={t.yes}
              noLabel={t.no}
            />
            {form.currentlyInsured && (
              <SegmentedSelector
                label={t.insuredMonths}
                options={[
                  { value: '3', label: t.months3 },
                  { value: '6', label: t.months6 },
                  { value: '12', label: t.months12 },
                ]}
                value={form.insuredMonths}
                onSelect={(v) => updateForm('insuredMonths', v)}
              />
            )}
            <YesNoToggle
              label={t.homeowner}
              value={form.homeowner}
              onSelect={(v) => updateForm('homeowner', v)}
              yesLabel={t.yes}
              noLabel={t.no}
            />
          </View>
        );

      case 'communication':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.whatsapp}18` }]}>
                <MessageCircle size={22} color={SAVER.whatsapp} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.commTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.commSub}</Text>

            <RadioCards
              label={t.contactMethod}
              options={[
                { value: 'whatsapp', label: t.contactWA, icon: <MessageCircle size={16} color={SAVER.whatsapp} /> },
                { value: 'text', label: t.contactTxt, icon: <MessageSquare size={16} color={SAVER.accent} /> },
                { value: 'call', label: t.contactCall, icon: <PhoneCall size={16} color={SAVER.orange} /> },
              ]}
              value={form.contactPreference}
              onSelect={(v) => updateForm('contactPreference', v as ContactPreference)}
            />

            <View style={styles.savingsRow}>
              <Text style={styles.savingsLabel}>{t.savingsLabel}</Text>
              <View style={styles.savingsSelector}>
                {[5, 10, 15, 20].map(n => (
                  <Pressable
                    key={n}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      updateForm('savingsThreshold', n);
                    }}
                    style={[styles.savingsChip, form.savingsThreshold === n && styles.savingsChipActive]}
                  >
                    <Text style={[styles.savingsChipText, form.savingsThreshold === n && styles.savingsChipTextActive]}>
                      {n}%
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <SegmentedSelector
              label={t.langPref}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
              ]}
              value={form.languagePref}
              onSelect={(v) => {
                updateForm('languagePref', v as 'en' | 'es');
                setLanguage(v as 'en' | 'es');
              }}
            />

            <View style={styles.consentSection}>
              <ConsentCheckbox
                checked={form.consentGiven}
                onToggle={(v) => updateForm('consentGiven', v)}
                label={t.consentLabel}
                sublabel={t.consentSub}
              />
            </View>
          </View>
        );

      case 'reminders':
        return (
          <View>
            <View style={styles.stepIconRow}>
              <View style={[styles.stepIconCircle, { backgroundColor: `${SAVER.green}18` }]}>
                <Bell size={22} color={SAVER.green} />
              </View>
            </View>
            <Text style={styles.stepTitle}>{t.reminderTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.reminderSub}</Text>

            <RadioCards
              options={[
                { value: 'yes', label: t.reminderYes, icon: <Bell size={16} color={SAVER.green} /> },
                { value: 'no', label: t.reminderNo, icon: <Bell size={16} color={SAVER.textMuted} /> },
              ]}
              value={form.wantsReminders === null ? null : form.wantsReminders ? 'yes' : 'no'}
              onSelect={(v) => {
                updateForm('wantsReminders', v === 'yes');
                if (v === 'yes' && !form.reminderChannel) {
                  updateForm('reminderChannel', form.contactPreference);
                }
              }}
            />

            {form.wantsReminders && (
              <>
                <SegmentedSelector
                  label={t.reminderChannel}
                  options={[
                    { value: 'whatsapp', label: t.contactWA },
                    { value: 'text', label: t.contactTxt },
                    { value: 'call', label: t.contactCall },
                  ]}
                  value={form.reminderChannel}
                  onSelect={(v) => updateForm('reminderChannel', v as ContactPreference)}
                />
                <ConsentCheckbox
                  checked={form.reminderConsent}
                  onToggle={(v) => updateForm('reminderConsent', v)}
                  label={t.reminderConsent}
                />
              </>
            )}
          </View>
        );

      case 'summary':
        return (
          <View>
            <Text style={styles.stepTitle}>{t.summaryTitle}</Text>
            <Text style={styles.stepSubtitle}>{t.summarySub}</Text>

            <View style={[styles.readinessBadge, isReadyToQuote ? styles.readinessBadgeReady : styles.readinessBadgeAlmost]}>
              <Check size={14} color={isReadyToQuote ? SAVER.green : SAVER.orange} />
              <Text style={[styles.readinessText, { color: isReadyToQuote ? SAVER.green : SAVER.orange }]}>
                {isReadyToQuote ? t.readyLabel : t.almostLabel}
              </Text>
            </View>

            <View style={styles.summarySection}>
              <SectionHeader title={t.sContact} />
              <SummaryRow
                label={isEs ? 'Teléfono' : 'Phone'}
                value={form.phone || t.missing}
                icon={<Phone size={14} color={SAVER.accent} />}
                missing={!form.phone}
              />
              <SummaryRow
                label={isEs ? 'Nombre' : 'Name'}
                value={form.fullName || t.missing}
                icon={<User size={14} color={SAVER.accent} />}
                missing={!form.fullName}
              />
              <SummaryRow
                label="ZIP"
                value={form.zip || t.missing}
                icon={<MapPin size={14} color={SAVER.accent} />}
                missing={!form.zip}
              />
            </View>

            <View style={styles.summarySection}>
              <SectionHeader title={t.sDrivers} />
              {form.drivers.filter(d => d.name.trim()).map((d, i) => (
                <SummaryRow
                  key={i}
                  label={`${isEs ? 'Conductor' : 'Driver'} ${i + 1}`}
                  value={`${d.name}${d.dob ? ` • ${d.dob}` : ''}`}
                  icon={<Users size={14} color={SAVER.accent} />}
                />
              ))}
            </View>

            <View style={styles.summarySection}>
              <SectionHeader title={t.sVehicles} />
              {form.vins.filter(v => v.trim()).length > 0 ? (
                form.vins.filter(v => v.trim()).map((v, i) => (
                  <SummaryRow
                    key={i}
                    label={`${isEs ? 'Vehículo' : 'Vehicle'} ${i + 1}`}
                    value={v}
                    icon={<Car size={14} color={SAVER.green} />}
                  />
                ))
              ) : (
                <SummaryRow
                  label={isEs ? 'VINs' : 'VINs'}
                  value={t.missing}
                  icon={<Car size={14} color={SAVER.green} />}
                  missing
                />
              )}
            </View>

            <View style={styles.summarySection}>
              <SectionHeader title={t.sCoverage} />
              <SummaryRow
                label={isEs ? 'Tipo' : 'Type'}
                value={form.coverage === 'minimum' ? t.coverageMin : form.coverage === 'full' ? t.coverageFull : t.missing}
                icon={<Shield size={14} color={SAVER.accent} />}
                missing={!form.coverage}
              />
            </View>

            <View style={styles.summarySection}>
              <SectionHeader title={t.sPrefs} />
              <SummaryRow
                label={isEs ? 'Contacto' : 'Contact'}
                value={form.contactPreference === 'whatsapp' ? 'WhatsApp' : form.contactPreference === 'text' ? (isEs ? 'Texto' : 'Text') : (isEs ? 'Llamada' : 'Call')}
                icon={<MessageCircle size={14} color={SAVER.whatsapp} />}
              />
              <SummaryRow
                label={isEs ? 'Ahorro mínimo' : 'Min savings'}
                value={`${form.savingsThreshold}%`}
              />
              {form.wantsReminders && (
                <SummaryRow
                  label={isEs ? 'Recordatorios' : 'Reminders'}
                  value={isEs ? 'Sí' : 'Yes'}
                  icon={<Bell size={14} color={SAVER.green} />}
                />
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: isEs ? 'Obtener Cotización' : 'Get a Quote',
          headerBackTitle: t.back,
          headerStyle: { backgroundColor: SAVER.bg },
          headerTintColor: SAVER.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />

      <ProgressBar
        progress={progress}
        currentStep={stepIndex + 1}
        totalSteps={totalSteps}
      />

      <CoverageExplainer
        visible={showCoverageExplainer}
        onClose={() => setShowCoverageExplainer(false)}
        language={language}
      />

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
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            {renderStepContent()}
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable style={styles.backBtn} onPress={goBack} testID="step-back">
            <ChevronLeft size={20} color={SAVER.textSecondary} />
            <Text style={styles.backBtnText}>{t.back}</Text>
          </Pressable>

          <Pressable
            style={[styles.nextBtn, !canProceed && styles.nextBtnDisabled]}
            onPress={handleNext}
            disabled={!canProceed || isSubmitting}
            testID="step-next"
          >
            {step === 'summary' ? (
              <Text style={styles.nextBtnText}>
                {isSubmitting ? t.submittingBtn : t.submitBtn}
              </Text>
            ) : (
              <>
                <Text style={styles.nextBtnText}>{t.next}</Text>
                <ChevronRight size={18} color="#FFFFFF" />
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
    backgroundColor: SAVER.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepIconRow: {
    marginBottom: 16,
  },
  stepIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: SAVER.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: SAVER.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipLinkText: {
    fontSize: 14,
    color: SAVER.textMuted,
    fontWeight: '500' as const,
    textDecorationLine: 'underline' as const,
  },
  explainLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    alignSelf: 'center',
  },
  explainLinkText: {
    fontSize: 14,
    color: SAVER.accent,
    fontWeight: '600' as const,
  },
  savingsRow: {
    marginBottom: 20,
  },
  savingsLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: SAVER.textSecondary,
    marginBottom: 10,
  },
  savingsSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  savingsChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: SAVER.surfaceLight,
    borderWidth: 1,
    borderColor: SAVER.border,
    alignItems: 'center',
  },
  savingsChipActive: {
    backgroundColor: SAVER.greenLight,
    borderColor: SAVER.green,
  },
  savingsChipText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: SAVER.textSecondary,
  },
  savingsChipTextActive: {
    color: SAVER.green,
  },
  consentSection: {
    marginTop: 8,
  },
  readinessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 24,
  },
  readinessBadgeReady: {
    backgroundColor: SAVER.greenLight,
  },
  readinessBadgeAlmost: {
    backgroundColor: SAVER.orangeLight,
  },
  readinessText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  summarySection: {
    marginBottom: 20,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: SAVER.textSecondary,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SAVER.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginLeft: 'auto',
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
