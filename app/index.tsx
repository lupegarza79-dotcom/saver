import React, { useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Shield,
  Upload,
  MessageCircle,
  Users,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const COLORS = {
  background: '#FFFFFF',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  surface: '#F8FAFC',
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();

  const uploadScale = useRef(new Animated.Value(1)).current;
  const chatScale = useRef(new Animated.Value(1)).current;
  const agentScale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleUpload = () => {
    animatePress(uploadScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/upload-document" as any);
  };

  const handleChatIntake = () => {
    animatePress(chatScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/ai-assistant?mode=intake" as any);
  };

  const handleAgentsPress = () => {
    animatePress(agentScale);
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.push("/agents" as any);
  };

  const t = {
    heroTitle: language === 'es' ? 'Ahorra en Seguro de Auto' : 'Save on Auto Insurance',
    heroSubtitle: language === 'es' 
      ? 'Sube tu póliza o responde unas preguntas.\nRecibe cotizaciones reales. Sin spam.' 
      : 'Upload your policy or answer a few questions.\nGet real quotes. No spam.',
    uploadCta: language === 'es' ? 'Subir Póliza' : 'Upload Policy',
    uploadHint: language === 'es' ? 'Declarations Page o ID Cards' : 'Declarations Page or ID Cards',
    chatCta: language === 'es' ? '¿No tienes tu póliza?' : "Don't have your policy?",
    chatCtaAction: language === 'es' ? 'Contesta unas preguntas' : 'Answer a few questions',
    trustFree: language === 'es' ? 'GRATIS' : 'FREE',
    trustEasy: language === 'es' ? 'FÁCIL' : 'EASY',
    trustFast: language === 'es' ? 'RÁPIDO' : 'FAST',
    agentCta: language === 'es' ? 'Soy Agente' : "I'm an Agent",
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Shield size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.logoText}>Saver</Text>
        </View>
        <LanguageSwitcher variant="pill" />
      </View>

      <View style={styles.heroSection}>
        <Text style={styles.heroTitle}>{t.heroTitle}</Text>
        <Text style={styles.heroSubtitle}>{t.heroSubtitle}</Text>
      </View>

      <View style={styles.trustBadges}>
        <Text style={styles.trustChip}>{t.trustFree}</Text>
        <Text style={styles.trustDot}>•</Text>
        <Text style={styles.trustChip}>{t.trustEasy}</Text>
        <Text style={styles.trustDot}>•</Text>
        <Text style={styles.trustChip}>{t.trustFast}</Text>
      </View>

      <View style={styles.actionsContainer}>
        <Animated.View style={{ transform: [{ scale: uploadScale }] }}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={handleUpload}
            activeOpacity={0.9}
          >
            <Upload size={22} color="#FFFFFF" />
            <View style={styles.ctaTextContainer}>
              <Text style={styles.primaryCTAText}>{t.uploadCta}</Text>
              <Text style={styles.primaryCTAHint}>{t.uploadHint}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{language === 'es' ? 'o' : 'or'}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Animated.View style={{ transform: [{ scale: chatScale }] }}>
          <TouchableOpacity
            style={styles.secondaryCTA}
            onPress={handleChatIntake}
            activeOpacity={0.8}
          >
            <MessageCircle size={20} color={COLORS.primary} />
            <View style={styles.ctaTextContainer}>
              <Text style={styles.secondaryCTALabel}>{t.chatCta}</Text>
              <Text style={styles.secondaryCTAText}>{t.chatCtaAction}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: agentScale }] }}>
          <TouchableOpacity
            style={styles.agentButton}
            onPress={handleAgentsPress}
            activeOpacity={0.8}
          >
            <Users size={16} color={COLORS.textMuted} />
            <Text style={styles.agentButtonText}>{t.agentCta}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800" as const,
    color: COLORS.text,
    letterSpacing: -1,
    lineHeight: 38,
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
  },
  trustBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 10,
  },
  trustChip: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: COLORS.primary,
    letterSpacing: 1,
  },
  trustDot: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  primaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 14,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaTextContainer: {
    flex: 1,
  },
  primaryCTAText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  primaryCTAHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
  secondaryCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  secondaryCTALabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  secondaryCTAText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.primary,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
  },
  agentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  agentButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500' as const,
  },
});
