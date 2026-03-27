import React, { useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Upload,
  MessageCircle,
  Shield,
  ChevronRight,
  Zap,
  Search,
  Bell,
  Gift,
  BarChart3,
  Wallet,
} from "lucide-react-native";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import TrustBadges from "@/components/TrustBadges";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";
import { SAVER } from "@/constants/theme";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();

  const uploadScale = useRef(new Animated.Value(1)).current;
  const quoteScale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, []);

  const isEs = language === "es";

  const copy = useMemo(() => {
    if (isEs) {
      return {
        badge: "AHORRA HASTA 40%",
        title: "Ahorra en\nSeguro de Auto",
        subtitle: "Sube tu póliza o responde unas preguntas.\nSolo te contactamos si hay ahorro real.",
        uploadTitle: "Subir Póliza",
        uploadSub: "Página de Declaraciones o Tarjeta ID",
        uploadTag: "RÁPIDO",
        uploadNote: "La forma más rápida",
        or: "o",
        quoteTitle: "Responde unas preguntas",
        quoteSub: "Te guiamos paso a paso — toma 2 min",
        quoteNote: "¿No tienes tu póliza? No hay problema.",
        trust1: "Sin spam",
        trust2: "Solo si ahorras",
        trust3: "Datos seguros",
        howTitle: "Cómo funciona",
        step1: "Sube tu póliza o responde",
        step1sub: "Toma menos de 2 minutos",
        step2: "Revisamos y comparamos",
        step2sub: "Múltiples aseguradoras a la vez",
        step3: "Te contactamos si hay ahorro",
        step3sub: "Solo cuando hay valor real",
        referTitle: "¿Quieres ayudar a alguien a ahorrar?",
        referCta: "Comparte Saver",
        agent: "¿Eres agente?",
        agentCta: "Únete aquí",
        terms: "Términos",
        privacy: "Privacidad",
      };
    }
    return {
      badge: "SAVE UP TO 40%",
      title: "Save on\nAuto Insurance",
      subtitle: "Upload your policy or answer a few questions.\nWe only contact you if real savings exist.",
      uploadTitle: "Upload Policy",
      uploadSub: "Declarations Page or ID Card",
      uploadTag: "FAST",
      uploadNote: "Fastest way",
      or: "or",
      quoteTitle: "Answer a few questions",
      quoteSub: "We guide you step by step — takes 2 min",
      quoteNote: "No policy photo? No problem.",
      trust1: "No spam",
      trust2: "Only if cheaper",
      trust3: "Data secure",
      howTitle: "How it works",
      step1: "Upload or answer",
      step1sub: "Takes less than 2 minutes",
      step2: "We review and compare",
      step2sub: "Multiple carriers at once",
      step3: "We contact you if savings exist",
      step3sub: "Only when there's real value",
      referTitle: "Want to help someone save too?",
      referCta: "Share Saver",
      agent: "Are you an agent?",
      agentCta: "Join here",
      terms: "Terms",
      privacy: "Privacy",
    };
  }, [isEs]);

  const handleUpload = () => {
    animatePress(uploadScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/upload-document" as any);
  };

  const handleGetQuote = () => {
    animatePress(quoteScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/quote-form" as any);
  };

  const handleAgentPress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push("/agents" as any);
  };

  const handleReferralPress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push("/referral" as any);
  };

  const handleTermsPress = () => {
    router.push("/modal?type=terms" as any);
  };

  const handleOpsPress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push("/ops" as any);
  };

  const handleRetentionPress = () => {
    if (Platform.OS !== "web") Haptics.selectionAsync();
    router.push("/retention" as any);
  };

  const steps = [
    { icon: Upload, num: "1", title: copy.step1, sub: copy.step1sub, color: SAVER.accent },
    { icon: Search, num: "2", title: copy.step2, sub: copy.step2sub, color: SAVER.green },
    { icon: Bell, num: "3", title: copy.step3, sub: copy.step3sub, color: SAVER.orange },
  ];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#080E1A", "#101B2E", "#0A1322"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
      />
      <View style={styles.glowOrb} />
      <View style={styles.glowOrb2} />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 16 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Shield size={16} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.brandText}>Saver</Text>
        </View>
        <LanguageSwitcher variant="pill" />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.badgeRow}>
            <LinearGradient
              colors={["#00C96F", "#00A85A"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badge}
            >
              <Zap size={12} color="#FFFFFF" strokeWidth={3} />
              <Text style={styles.badgeText}>{copy.badge}</Text>
            </LinearGradient>
          </View>

          <Text style={styles.title}>{copy.title}</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
        </View>

        <View style={styles.ctaSection}>
          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: uploadScale }] }]}>
            <Pressable
              onPress={handleUpload}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
              testID="upload-policy-button"
            >
              <LinearGradient
                colors={[SAVER.accent, SAVER.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryBtnGradient}
              >
                <View style={styles.btnLeft}>
                  <View style={styles.btnIconCircle}>
                    <Upload size={20} color="#FFFFFF" strokeWidth={2.5} />
                  </View>
                  <View style={styles.btnTextWrap}>
                    <Text style={styles.primaryTitle}>{copy.uploadTitle}</Text>
                    <Text style={styles.primarySub}>{copy.uploadSub}</Text>
                  </View>
                </View>
                <View style={styles.fastTag}>
                  <Text style={styles.fastTagText}>{copy.uploadTag}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <Text style={styles.noteText}>{copy.uploadNote}</Text>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{copy.or}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: quoteScale }] }]}>
            <Pressable
              onPress={handleGetQuote}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
              testID="answer-questions-button"
            >
              <View style={styles.secondaryIconCircle}>
                <MessageCircle size={18} color={SAVER.green} strokeWidth={2.5} />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.secondaryTitle}>{copy.quoteTitle}</Text>
                <Text style={styles.secondarySub}>{copy.quoteSub}</Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </Animated.View>

          <Text style={styles.noteText}>{copy.quoteNote}</Text>
        </View>

        <View style={styles.trustSection}>
          <TrustBadges
            items={[
              { icon: "lock", label: copy.trust1 },
              { icon: "star", label: copy.trust2 },
              { icon: "shield", label: copy.trust3 },
            ]}
          />
        </View>

        <View style={styles.howSection}>
          <Text style={styles.howTitle}>{copy.howTitle}</Text>
          <View style={styles.stepsContainer}>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: `${s.color}18` }]}>
                  <Text style={[styles.stepNumText, { color: s.color }]}>{s.num}</Text>
                </View>
                <View style={styles.stepTextWrap}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepSub}>{s.sub}</Text>
                </View>
                {i < steps.length - 1 && <View style={styles.stepConnector} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.quickActionsRow}>
          <Pressable
            onPress={handleRetentionPress}
            style={({ pressed }) => [styles.quickActionCard, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: SAVER.accentLight }]}>
              <Wallet size={18} color={SAVER.accent} strokeWidth={2.5} />
            </View>
            <Text style={styles.quickActionLabel}>
              {isEs ? 'Mi Vault' : 'My Vault'}
            </Text>
            <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
          </Pressable>
          <Pressable
            onPress={handleOpsPress}
            style={({ pressed }) => [styles.quickActionCard, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(124,58,237,0.12)' }]}>
              <BarChart3 size={18} color="#7C3AED" strokeWidth={2.5} />
            </View>
            <Text style={styles.quickActionLabel}>
              {isEs ? 'Operaciones' : 'Operations'}
            </Text>
            <ChevronRight size={14} color="rgba(255,255,255,0.3)" />
          </Pressable>
        </View>

        <Pressable
          onPress={handleReferralPress}
          style={({ pressed }) => [styles.referralCard, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.referralIconWrap}>
            <Gift size={20} color={SAVER.orange} />
          </View>
          <View style={styles.referralTextWrap}>
            <Text style={styles.referralTitle}>{copy.referTitle}</Text>
            <Text style={styles.referralCta}>{copy.referCta}</Text>
          </View>
          <ChevronRight size={18} color={SAVER.orange} />
        </Pressable>

        <View style={styles.footerSection}>
          <Pressable
            onPress={handleAgentPress}
            style={({ pressed }) => [styles.agentRow, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.agentLabel}>{copy.agent}</Text>
            <Text style={styles.agentCta}>{copy.agentCta}</Text>
            <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
          </Pressable>

          <View style={styles.footerLinks}>
            <Pressable onPress={handleTermsPress} hitSlop={8}>
              <Text style={styles.footerLink}>{copy.terms}</Text>
            </Pressable>
            <View style={styles.footerDot} />
            <Pressable onPress={handleTermsPress} hitSlop={8}>
              <Text style={styles.footerLink}>{copy.privacy}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
  },
  glowOrb: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: SAVER.accent,
    opacity: 0.08,
  },
  glowOrb2: {
    position: "absolute",
    bottom: 100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: SAVER.green,
    opacity: 0.04,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: SAVER.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: "#FFFFFF",
    fontWeight: "800" as const,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroSection: {
    paddingTop: 20,
    marginBottom: 28,
  },
  badgeRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.5,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800" as const,
    letterSpacing: -1,
    marginBottom: 14,
  },
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "400" as const,
  },
  ctaSection: {
    gap: 6,
  },
  ctaWrapper: {
    borderRadius: 16,
  },
  primaryBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 18,
    borderRadius: 16,
  },
  btnLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  btnIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextWrap: {
    flex: 1,
  },
  primaryTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700" as const,
  },
  primarySub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    fontWeight: "500" as const,
    marginTop: 3,
  },
  fastTag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  fastTagText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800" as const,
    letterSpacing: 1,
  },
  noteText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 4,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 6,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    fontWeight: "500" as const,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  secondaryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,201,111,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  secondarySub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "400" as const,
    marginTop: 2,
  },
  trustSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  howSection: {
    marginBottom: 24,
  },
  howTitle: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: SAVER.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginBottom: 16,
  },
  stepsContainer: {
    gap: 0,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    position: "relative",
  },
  stepNum: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: {
    fontSize: 15,
    fontWeight: "800" as const,
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: SAVER.text,
    marginBottom: 2,
  },
  stepSub: {
    fontSize: 12,
    color: SAVER.textMuted,
  },
  stepConnector: {
    position: "absolute",
    left: 17,
    top: 48,
    width: 2,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 1,
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  quickActionCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 14,
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    color: SAVER.text,
  },
  referralCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: SAVER.orangeLight,
    borderWidth: 1,
    borderColor: "rgba(255,149,0,0.15)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  referralIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,149,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  referralTextWrap: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 14,
    color: SAVER.text,
    fontWeight: "500" as const,
    marginBottom: 2,
  },
  referralCta: {
    fontSize: 15,
    color: SAVER.orange,
    fontWeight: "700" as const,
  },
  footerSection: {
    gap: 12,
    paddingTop: 4,
    paddingBottom: 8,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  agentLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  agentCta: {
    color: SAVER.accent,
    fontSize: 14,
    fontWeight: "600" as const,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 4,
  },
  footerLink: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 13,
    fontWeight: "500" as const,
    textDecorationLine: "underline" as const,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});
