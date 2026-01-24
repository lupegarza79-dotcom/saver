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
  Users,
  Target,
  PhoneOff,
  MessageCircle,
  CheckCircle,
  ArrowLeft,
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

export default function AgentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();

  const ctaScale = useRef(new Animated.Value(1)).current;

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

  const handleJoin = () => {
    animatePress(ctaScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
    joinCta: language === 'es' ? 'Únete como Agente' : 'Join as an Agent',
    benefit1Title: language === 'es' ? 'Leads calificados' : 'Qualified leads',
    benefit1Desc: language === 'es' ? 'Conductores con póliza actual listos para cotizar' : 'Drivers with current policy ready to quote',
    benefit2Title: language === 'es' ? 'Sin llamadas en frío' : 'No cold calls',
    benefit2Desc: language === 'es' ? 'Los conductores te contactan a ti primero' : 'Drivers contact you first',
    benefit3Title: language === 'es' ? 'WhatsApp listo' : 'WhatsApp ready',
    benefit3Desc: language === 'es' ? 'Comunícate con leads por WhatsApp' : 'Communicate with leads via WhatsApp',
    texasNote: language === 'es' ? 'Actualmente solo agentes con licencia en Texas.' : 'Currently Texas licensed agents only.',
    back: language === 'es' ? 'Atrás' : 'Back',
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

        <Animated.View style={[styles.ctaContainer, { transform: [{ scale: ctaScale }] }]}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={handleJoin}
            activeOpacity={0.9}
          >
            <Users size={22} color={COLORS.primary} />
            <Text style={styles.primaryCTAText}>{t.joinCta}</Text>
          </TouchableOpacity>
        </Animated.View>

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
    height: 340,
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
  ctaContainer: {
    marginBottom: 40,
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
  benefitsSection: {
    gap: 16,
    marginBottom: 32,
  },
  benefitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  benefitIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  benefitDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
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
});
