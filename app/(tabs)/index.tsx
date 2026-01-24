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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Shield,
  MessageCircle,
  Upload,
  Phone,
  MessageSquare,
  Zap,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const COLORS = {
  background: '#0A1628',
  backgroundLight: '#1A2D4A',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  primary: '#3B82F6',
  primaryDark: '#2563EB',
  primaryLight: '#60A5FA',
  text: '#FFFFFF',
  textDark: '#1E293B',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#334155',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  accent: '#8B5CF6',
  accentGold: '#F59E0B',
};

const WHATSAPP_NUMBER = '+19567738844';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(16, insets.bottom + 60);
  const { language, t } = useApp();

  const ctaScale = useRef(new Animated.Value(1)).current;
  const aiButtonScale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const handlePrimaryCTA = () => {
    animatePress(ctaScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    router.push("/upload-document" as any);
  };

  const handleWhatsAppPress = () => {
    const message = language === 'es'
      ? 'Hola, quiero subir mi póliza de auto para ver si puedo ahorrar.'
      : 'Hi, I want to upload my auto policy to see if I can save.';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.backgroundLight, COLORS.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={{ paddingTop: insets.top }}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Shield size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.logoText}>Saver</Text>
          </View>
          <LanguageSwitcher variant="pill" />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: fabBottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heroTitle}>
          {language === 'es' ? 'AHORRA DINERO\nSeguro de Auto' : 'SAVE MONEY\nAuto Insurance'}
        </Text>

        <Text style={styles.heroSubtitle}>
          {language === 'es'
            ? 'Sube tu póliza. Recibe cotizaciones reales. Sin llamadas de spam.'
            : 'Upload your policy. Get real quotes. No spam calls.'}
        </Text>

        <Animated.View style={{ transform: [{ scale: ctaScale }], width: '100%', marginTop: 12 }}>
          <TouchableOpacity
            style={styles.primaryCTA}
            onPress={handlePrimaryCTA}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryDark]}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Upload size={20} color="#FFFFFF" />
              <Text style={styles.primaryCTAText}>{t.home.cta}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.howItWorksCard}>
          <Text style={styles.howItWorksTitle}>
            {language === 'es' ? 'Cómo funciona' : 'How it works'}
          </Text>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>
              {language === 'es' ? 'Sube foto de tu póliza actual' : 'Upload photo of your current policy'}
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              {language === 'es' ? 'Nuestro AI extrae tu info' : 'Our AI extracts your info'}
            </Text>
          </View>
          <View style={styles.stepRow}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              {language === 'es' ? 'Recibe cotizaciones reales por WhatsApp' : 'Get real quotes via WhatsApp'}
            </Text>
          </View>
        </View>

        <View style={styles.trustChipsContainer}>
          <View style={styles.trustChip}>
            <Phone size={14} color={COLORS.success} />
            <Text style={styles.trustChipText}>
              {language === 'es' ? 'Sin spam' : 'No spam'}
            </Text>
          </View>
          <TouchableOpacity style={styles.trustChip} onPress={handleWhatsAppPress} activeOpacity={0.7}>
            <MessageSquare size={14} color={COLORS.success} />
            <Text style={styles.trustChipText}>WhatsApp</Text>
          </TouchableOpacity>
          <View style={styles.trustChip}>
            <Zap size={14} color={COLORS.success} />
            <Text style={styles.trustChipText}>
              {language === 'es' ? 'Rápido' : 'Fast'}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.whatsappContainer} onPress={handleWhatsAppPress}>
          <Text style={styles.whatsappText}>{t.home.whatsappText} </Text>
          <Text style={styles.whatsappLink}>{t.home.whatsappLink}</Text>
        </TouchableOpacity>
      </ScrollView>

      <Animated.View
        style={[
          styles.aiButton,
          {
            transform: [{ scale: aiButtonScale }],
            bottom: fabBottom,
          }
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            animatePress(aiButtonScale);
            if (Platform.OS !== "web") {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            router.push("/ai-assistant" as any);
          }}
          activeOpacity={0.9}
          style={styles.aiButtonInner}
        >
          <MessageCircle size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontWeight: "800" as const,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: COLORS.text,
    letterSpacing: -1,
    lineHeight: 32,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  primaryCTA: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 28,
    gap: 12,
  },
  primaryCTAText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  trustChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  trustChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  trustChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  whatsappContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  whatsappText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  whatsappLink: {
    fontSize: 13,
    color: COLORS.primaryLight,
    fontWeight: '600' as const,
  },
  howItWorksCard: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  howItWorksTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: COLORS.primaryLight,
  },
  stepText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  aiButton: {
    position: 'absolute',
    right: 20,
    zIndex: 100,
    alignItems: 'center',
  },
  aiButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
});
