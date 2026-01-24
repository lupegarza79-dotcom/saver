import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Shield,
  Upload,
  FileSearch,
  MessageCircle,
  CheckCircle2,
  Users,
  ChevronRight,
  Zap,
  Clock,
  DollarSign,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

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
};

const WHATSAPP_NUMBER = '+19567738844';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();

  const ctaScale = useRef(new Animated.Value(1)).current;
  const whatsappScale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleUpload = () => {
    animatePress(ctaScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/upload-document" as any);
  };

  const handleWhatsApp = () => {
    animatePress(whatsappScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const message = language === 'es'
      ? 'Hola, quiero comparar mi seguro de auto. Adjunto mi póliza.'
      : 'Hi, I want to compare my auto insurance. Attaching my policy.';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const handleAgentsPress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.push("/agents" as any);
  };

  const t = {
    heroTitle: language === 'es' ? 'Ahorra en\nSeguro de Auto' : 'Save on\nAuto Insurance',
    heroSubtitle: language === 'es' 
      ? 'Sube tu póliza. Recibe cotizaciones reales. Sin spam.'
      : 'Upload your policy. Get real quotes. No spam.',
    uploadCta: language === 'es' ? 'Sube tu póliza' : 'Upload your policy',
    trustFree: language === 'es' ? 'GRATIS' : 'FREE',
    trustEasy: language === 'es' ? 'FÁCIL' : 'EASY',
    trustFast: language === 'es' ? 'RÁPIDO' : 'FAST',
    howItWorks: language === 'es' ? 'Cómo funciona' : 'How it works',
    step1: language === 'es' ? 'Sube foto de tu póliza' : 'Upload a photo of your policy',
    step2: language === 'es' ? 'Agentes licenciados la revisan' : 'Licensed agents review it',
    step3: language === 'es' ? 'Recibe cotizaciones por WhatsApp' : 'Get real quotes via WhatsApp',
    whatsappCta: language === 'es' ? 'Enviar por WhatsApp' : 'Send via WhatsApp',
    agentTitle: language === 'es' ? 'Agentes de seguros' : 'Insurance Agents',
    agentSubtitle: language === 'es' ? 'Recibe leads calificados de seguro de auto.' : 'Get qualified auto insurance leads.',
    agentCta: language === 'es' ? 'Acceso agentes' : 'Agent sign in',
  };

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
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Shield size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>Saver</Text>
          </View>
          <LanguageSwitcher variant="pill" />
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{t.heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{t.heroSubtitle}</Text>
        </View>

        <Animated.View style={[styles.ctaContainer, { transform: [{ scale: ctaScale }] }]}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={handleUpload}
            activeOpacity={0.9}
          >
            <Upload size={22} color={COLORS.primary} />
            <Text style={styles.primaryCTAText}>{t.uploadCta}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.trustBadges}>
          <View style={styles.trustItem}>
            <DollarSign size={16} color={COLORS.success} />
            <Text style={styles.trustText}>{t.trustFree}</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Zap size={16} color={COLORS.accent} />
            <Text style={styles.trustText}>{t.trustEasy}</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Clock size={16} color={COLORS.primary} />
            <Text style={styles.trustText}>{t.trustFast}</Text>
          </View>
        </View>

        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>{t.howItWorks}</Text>
          
          <View style={styles.stepsCard}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepIconWrapper}>
                <FileSearch size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.stepText}>{t.step1}</Text>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stepIconWrapper}>
                <CheckCircle2 size={24} color={COLORS.success} />
              </View>
              <Text style={styles.stepText}>{t.step2}</Text>
            </View>

            <View style={styles.stepConnector} />

            <View style={styles.stepItem}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={styles.stepIconWrapper}>
                <MessageCircle size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.stepText}>{t.step3}</Text>
            </View>
          </View>
        </View>

        <Animated.View style={[styles.whatsappContainer, { transform: [{ scale: whatsappScale }] }]}>
          <TouchableOpacity
            style={styles.whatsappCTA}
            onPress={handleWhatsApp}
            activeOpacity={0.8}
          >
            <MessageCircle size={20} color="#25D366" />
            <Text style={styles.whatsappCTAText}>{t.whatsappCta}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.agentSection}>
          <TouchableOpacity
            style={styles.agentCard}
            onPress={handleAgentsPress}
            activeOpacity={0.7}
          >
            <View style={styles.agentCardLeft}>
              <View style={styles.agentIconWrapper}>
                <Users size={24} color={COLORS.primary} />
              </View>
              <View style={styles.agentTextContent}>
                <Text style={styles.agentCardTitle}>{t.agentTitle}</Text>
                <Text style={styles.agentCardSubtitle}>{t.agentSubtitle}</Text>
              </View>
            </View>
            <View style={styles.agentCtaWrapper}>
              <Text style={styles.agentCtaText}>{t.agentCta}</Text>
              <ChevronRight size={18} color={COLORS.primary} />
            </View>
          </TouchableOpacity>
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
    height: 320,
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
    marginBottom: 40,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 38,
    fontWeight: "800" as const,
    color: '#FFFFFF',
    letterSpacing: -1.5,
    lineHeight: 46,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 17,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 26,
  },
  ctaContainer: {
    marginBottom: 20,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  primaryCTAText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 12,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },
  trustDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  howItWorksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  stepsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  stepIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500' as const,
    lineHeight: 22,
  },
  stepConnector: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.border,
    marginLeft: 13,
    marginVertical: 8,
  },
  whatsappContainer: {
    marginBottom: 32,
  },
  whatsappCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#25D366',
  },
  whatsappCTAText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#25D366',
  },
  agentSection: {
    marginTop: 8,
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  agentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  agentIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentTextContent: {
    flex: 1,
  },
  agentCardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  agentCardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  agentCtaWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  agentCtaText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
});
