import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Linking,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Shield,
  Target,
  PhoneOff,
  MessageCircle,
  CheckCircle,
  ArrowLeft,
  ChevronRight,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  FileText,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { supabase } from "@/lib/supabase";

const COLORS = {
  background: '#F7F9FC',
  surface: '#FFFFFF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  success: '#10B981',
  accent: '#0EA5E9',
  error: '#EF4444',
};

const WHATSAPP_NUMBER = '+19567738844';

export default function AgentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();

  const [submitted, setSubmitted] = useState<boolean>(false);
  const [fullName, setFullName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [licensed, setLicensed] = useState<boolean>(false);
  const [states, setStates] = useState<string>('');
  const [yearsOfExperience, setYearsOfExperience] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const ctaScale = useRef(new Animated.Value(1)).current;

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.back();
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = language === 'es' ? 'Nombre requerido' : 'Name required';
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      newErrors.phone = language === 'es' ? 'Teléfono inválido' : 'Invalid phone';
    }
    if (!email.trim() || !email.includes('@')) {
      newErrors.email = language === 'es' ? 'Email inválido' : 'Invalid email';
    }
    if (!states.trim()) {
      newErrors.states = language === 'es' ? 'Estado(s) requerido(s)' : 'State(s) required';
    }
    if (!yearsOfExperience.trim()) {
      newErrors.yearsOfExperience = language === 'es' ? 'Experiencia requerida' : 'Experience required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      return;
    }

    animatePress(ctaScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsSubmitting(true);

    try {
      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        licensed,
        states: states.trim(),
        years_experience: yearsOfExperience ? Number(yearsOfExperience) : null,
        notes: notes.trim() || null,
        created_at: new Date().toISOString(),
      };

      console.log('[AGENTS] Submitting to Supabase:', payload);
      const { error } = await supabase.from('agent_applications').insert(payload);

      if (error) {
        console.error('[AGENTS] Supabase insert error:', error);
        setIsSubmitting(false);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }

      console.log('[AGENTS] Application submitted successfully');
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      setSubmitted(true);
    } catch (error: any) {
      console.error('[AGENTS] Error submitting application:', error);
      setIsSubmitting(false);
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
  };

  const handleWhatsApp = () => {
    const message = language === 'es'
      ? 'Hola, soy agente de seguros de auto y quiero unirme a Saver para recibir leads.'
      : 'Hi, I am an auto insurance agent and I want to join Saver to receive leads.';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const t = {
    heroTitle: language === 'es' ? 'Agentes de\nSeguro de Auto' : 'Auto Insurance\nAgents',
    heroSubtitle: language === 'es' 
      ? 'Recibe leads calificados de conductores buscando mejor precio.'
      : 'Get qualified leads from drivers looking for better rates.',
    applyNow: language === 'es' ? 'Aplicar Ahora' : 'Apply Now',
    benefit1Title: language === 'es' ? 'Leads calificados' : 'Qualified leads',
    benefit1Desc: language === 'es' ? 'Conductores con póliza actual listos para cotizar' : 'Drivers with current policy ready to quote',
    benefit2Title: language === 'es' ? 'Sin llamadas en frío' : 'No cold calls',
    benefit2Desc: language === 'es' ? 'Los conductores te contactan a ti primero' : 'Drivers contact you first',
    benefit3Title: language === 'es' ? 'WhatsApp listo' : 'WhatsApp ready',
    benefit3Desc: language === 'es' ? 'Comunícate con leads por WhatsApp' : 'Communicate with leads via WhatsApp',
    texasNote: language === 'es' ? 'Actualmente solo agentes con licencia en Texas.' : 'Currently Texas licensed agents only.',
    back: language === 'es' ? 'Atrás' : 'Back',
    formTitle: language === 'es' ? 'Aplicación de Agente' : 'Agent Application',
    fullName: language === 'es' ? 'Nombre Completo' : 'Full Name',
    phoneLabel: language === 'es' ? 'Teléfono' : 'Phone',
    emailLabel: language === 'es' ? 'Email' : 'Email',
    licensedLabel: language === 'es' ? '¿Tienes licencia?' : 'Licensed?',
    statesLabel: language === 'es' ? 'Estado(s)' : 'State(s)',
    statesPlaceholder: language === 'es' ? 'ej. Texas, California' : 'e.g. Texas, California',
    yearsLabel: language === 'es' ? 'Años de experiencia' : 'Years of experience',
    notesLabel: language === 'es' ? 'Notas (opcional)' : 'Notes (optional)',
    notesPlaceholder: language === 'es' ? 'Cuéntanos más sobre ti...' : 'Tell us more about yourself...',
    submit: language === 'es' ? 'Enviar Aplicación' : 'Submit Application',
    submitting: language === 'es' ? 'Enviando...' : 'Submitting...',
    thankYouTitle: language === 'es' ? '¡Gracias!' : 'Thank You!',
    thankYouMessage: language === 'es' 
      ? 'Hemos recibido tu aplicación. Nos pondremos en contacto contigo pronto.'
      : 'We have received your application. We will contact you soon.',
    whatsappCTA: language === 'es' ? 'Chatear por WhatsApp' : 'Chat on WhatsApp',
    backHome: language === 'es' ? 'Volver al Inicio' : 'Back to Home',
  };

  if (submitted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.success, '#059669']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.backButton} />
            <LanguageSwitcher variant="pill" />
          </View>

          <View style={styles.successIcon}>
            <CheckCircle size={64} color="#FFFFFF" />
          </View>

          <View style={styles.successSection}>
            <Text style={styles.successTitle}>{t.thankYouTitle}</Text>
            <Text style={styles.successMessage}>{t.thankYouMessage}</Text>
          </View>

          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleWhatsApp}
            activeOpacity={0.9}
          >
            <MessageCircle size={22} color={COLORS.success} />
            <Text style={styles.whatsappButtonText}>{t.whatsappCTA}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backHomeButton}
            onPress={() => router.push('/')}
            activeOpacity={0.7}
          >
            <Text style={styles.backHomeText}>{t.backHome}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
            <Text style={styles.backText}>{t.back}</Text>
          </TouchableOpacity>
          <LanguageSwitcher variant="pill" />
        </View>

        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Shield size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>Saver</Text>
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{t.heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{t.heroSubtitle}</Text>
        </View>

        <View style={styles.benefitsSection}>
          <View style={styles.benefitCard}>
            <View style={styles.benefitIconWrapper}>
              <Target size={24} color={COLORS.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{t.benefit1Title}</Text>
              <Text style={styles.benefitDesc}>{t.benefit1Desc}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textMuted} />
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIconWrapper}>
              <PhoneOff size={24} color={COLORS.success} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{t.benefit2Title}</Text>
              <Text style={styles.benefitDesc}>{t.benefit2Desc}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textMuted} />
          </View>

          <View style={styles.benefitCard}>
            <View style={styles.benefitIconWrapper}>
              <MessageCircle size={24} color={COLORS.accent} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>{t.benefit3Title}</Text>
              <Text style={styles.benefitDesc}>{t.benefit3Desc}</Text>
            </View>
            <ChevronRight size={20} color={COLORS.textMuted} />
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t.formTitle}</Text>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <User size={16} color={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>{t.fullName}</Text>
            </View>
            <TextInput
              style={[styles.input, errors.fullName && styles.inputError]}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
              }}
              placeholder={t.fullName}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />
            {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Phone size={16} color={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>{t.phoneLabel}</Text>
            </View>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors({ ...errors, phone: '' });
              }}
              placeholder="+1 (956) 773-8844"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Mail size={16} color={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>{t.emailLabel}</Text>
            </View>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              placeholder="agent@example.com"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.switchRow}>
              <View style={styles.inputLabelRow}>
                <Shield size={16} color={COLORS.textSecondary} />
                <Text style={styles.inputLabel}>{t.licensedLabel}</Text>
              </View>
              <Switch
                value={licensed}
                onValueChange={setLicensed}
                trackColor={{ false: COLORS.border, true: COLORS.primary }}
                thumbColor={COLORS.surface}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <MapPin size={16} color={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>{t.statesLabel}</Text>
            </View>
            <TextInput
              style={[styles.input, errors.states && styles.inputError]}
              value={states}
              onChangeText={(text) => {
                setStates(text);
                if (errors.states) setErrors({ ...errors, states: '' });
              }}
              placeholder={t.statesPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="words"
            />
            {errors.states && <Text style={styles.errorText}>{errors.states}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Clock size={16} color={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>{t.yearsLabel}</Text>
            </View>
            <TextInput
              style={[styles.input, errors.yearsOfExperience && styles.inputError]}
              value={yearsOfExperience}
              onChangeText={(text) => {
                setYearsOfExperience(text);
                if (errors.yearsOfExperience) setErrors({ ...errors, yearsOfExperience: '' });
              }}
              placeholder="5"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />
            {errors.yearsOfExperience && <Text style={styles.errorText}>{errors.yearsOfExperience}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <FileText size={16} color={COLORS.textSecondary} />
              <Text style={styles.inputLabel}>{t.notesLabel}</Text>
            </View>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder={t.notesPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>{t.submit}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.noteSection}>
          <CheckCircle size={16} color={COLORS.textMuted} />
          <Text style={styles.noteText}>{t.texasNote}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#FFFFFF',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSection: {
    marginBottom: 32,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: '#FFFFFF',
    letterSpacing: -1.5,
    lineHeight: 44,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
  },
  benefitsSection: {
    gap: 12,
    marginBottom: 24,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  benefitIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 24,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    height: 100,
    paddingTop: 16,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  noteText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  successIcon: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 32,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 24,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  whatsappButtonText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.success,
  },
  backHomeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backHomeText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: 'rgba(255,255,255,0.8)',
  },
});
