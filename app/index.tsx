import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
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
  MessageCircle,
  Users,
  ChevronRight,
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
    heroTitle: language === 'es' ? 'Ahorra en Seguro de Auto' : 'Save on Auto Insurance',
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
    agentSubtitle: language === 'es' ? 'Recibe leads calificados.' : 'Get qualified leads.',
    agentCta: language === 'es' ? 'Acceso agentes' : 'Agent sign in',
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryDark]}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.content, { paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Shield size={16} color="#FFFFFF" />
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
            <Upload size={18} color={COLORS.primary} />
            <Text style={styles.primaryCTAText}>{t.uploadCta}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.trustBadges}>
          <Text style={styles.trustChip}>{t.trustFree}</Text>
          <Text style={styles.trustDot}>•</Text>
          <Text style={styles.trustChip}>{t.trustEasy}</Text>
          <Text style={styles.trustDot}>•</Text>
          <Text style={styles.trustChip}>{t.trustFast}</Text>
        </View>

        <View style={styles.howItWorksSection}>
          <Text style={styles.sectionTitle}>{t.howItWorks}</Text>
          
          <View style={styles.stepsCard}>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepText}>{t.step1}</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepText}>{t.step2}</Text>
            </View>
            <View style={styles.stepRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
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
            <MessageCircle size={16} color="#25D366" />
            <Text style={styles.whatsappCTAText}>{t.whatsappCta}</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          style={styles.agentCard}
          onPress={handleAgentsPress}
          activeOpacity={0.7}
        >
          <View style={styles.agentCardLeft}>
            <View style={styles.agentIconWrapper}>
              <Users size={18} color={COLORS.primary} />
            </View>
            <View style={styles.agentTextContent}>
              <Text style={styles.agentCardTitle}>{t.agentTitle}</Text>
              <Text style={styles.agentCardSubtitle}>{t.agentSubtitle}</Text>
            </View>
          </View>
          <ChevronRight size={16} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
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
    height: 240,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  heroSection: {
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 30,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  ctaContainer: {
    marginBottom: 8,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryCTAText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.primary,
    letterSpacing: 0.2,
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 6,
  },
  trustChip: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.95)',
    letterSpacing: 0.8,
  },
  trustDot: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  howItWorksSection: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  stepsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500' as const,
  },
  whatsappContainer: {
    marginBottom: 10,
  },
  whatsappCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#25D366',
  },
  whatsappCTAText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#25D366',
  },
  agentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  agentCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  agentIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agentTextContent: {
    flex: 1,
  },
  agentCardTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 1,
  },
  agentCardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
