import React, { useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  Upload,
  MessageCircle,
  Shield,
  ChevronRight,
  Zap,
  Lock,
  Star,
} from "lucide-react-native";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();

  const uploadScale = useRef(new Animated.Value(1)).current;
  const quoteScale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const isEs = language === "es";

  const copy = useMemo(() => {
    if (isEs) {
      return {
        badge: "AHORRA HASTA 40%",
        title: "Seguro de Auto\nMás Barato",
        subtitle:
          "Sube tu póliza y te buscamos mejor precio.\nSolo te contactamos si hay ahorro real.",
        uploadTitle: "Subir Póliza",
        uploadSub: "Página de Declaraciones o Tarjeta ID",
        uploadTag: "RÁPIDO",
        or: "o",
        quoteTitle: "Responde unas preguntas",
        quoteSub: "Te guiamos paso a paso — toma 2 min",
        trust1: "Sin spam",
        trust2: "Solo si ahorras",
        trust3: "Datos seguros",
        agent: "¿Eres agente?",
        agentCta: "Únete aquí",
        terms: "Términos",
        version: "Saver v1.0",
      };
    }
    return {
      badge: "SAVE UP TO 40%",
      title: "Cheaper Auto\nInsurance",
      subtitle:
        "Upload your policy and we find a better price.\nWe only contact you if real savings exist.",
      uploadTitle: "Upload Policy",
      uploadSub: "Declarations Page or ID Card",
      uploadTag: "FAST",
      or: "or",
      quoteTitle: "Answer a few questions",
      quoteSub: "We guide you step by step — takes 2 min",
      trust1: "No spam",
      trust2: "Only if cheaper",
      trust3: "Data secure",
      agent: "Are you an agent?",
      agentCta: "Join here",
      terms: "Terms",
      version: "Saver v1.0",
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
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.push("/agents" as any);
  };

  const handleTermsPress = () => {
    router.push("/modal?type=terms" as any);
  };

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

      <View
        style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 16 }]}
      >
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Shield size={16} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.brandText}>Saver</Text>
        </View>
        <LanguageSwitcher variant="pill" />
      </View>

      <View style={styles.content}>
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

        <View style={styles.ctaSection}>
          <Animated.View
            style={[styles.ctaWrapper, { transform: [{ scale: uploadScale }] }]}
          >
            <Pressable
              onPress={handleUpload}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.92 },
              ]}
              testID="upload-policy-button"
            >
              <LinearGradient
                colors={["#0066FF", "#0052CC"]}
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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{copy.or}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Animated.View
            style={[styles.ctaWrapper, { transform: [{ scale: quoteScale }] }]}
          >
            <Pressable
              onPress={handleGetQuote}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.92 },
              ]}
              testID="answer-questions-button"
            >
              <View style={styles.secondaryIconCircle}>
                <MessageCircle size={18} color="#00C96F" strokeWidth={2.5} />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.secondaryTitle}>{copy.quoteTitle}</Text>
                <Text style={styles.secondarySub}>{copy.quoteSub}</Text>
              </View>
              <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Lock size={13} color="#00C96F" strokeWidth={2.5} />
            <Text style={styles.trustText}>{copy.trust1}</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Star size={13} color="#00C96F" strokeWidth={2.5} />
            <Text style={styles.trustText}>{copy.trust2}</Text>
          </View>
          <View style={styles.trustDot} />
          <View style={styles.trustItem}>
            <Shield size={13} color="#00C96F" strokeWidth={2.5} />
            <Text style={styles.trustText}>{copy.trust3}</Text>
          </View>
        </View>
      </View>

      <View
        style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Pressable
          onPress={handleAgentPress}
          style={({ pressed }) => [
            styles.agentRow,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.agentLabel}>{copy.agent}</Text>
          <Text style={styles.agentCta}>{copy.agentCta}</Text>
          <ChevronRight size={14} color="rgba(255,255,255,0.4)" />
        </Pressable>

        <View style={styles.footerBottom}>
          <Pressable onPress={handleTermsPress} hitSlop={8}>
            <Text style={styles.footerLink}>{copy.terms}</Text>
          </Pressable>
          <View style={styles.footerDot} />
          <Text style={styles.footerVersion}>{copy.version}</Text>
        </View>
      </View>
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
    backgroundColor: "#0066FF",
    opacity: 0.08,
  },
  glowOrb2: {
    position: "absolute",
    bottom: 100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#00C96F",
    opacity: 0.04,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    backgroundColor: "#0066FF",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: {
    color: "#FFFFFF",
    fontWeight: "800" as const,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
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
    marginBottom: 32,
  },
  ctaSection: {
    gap: 10,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 2,
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
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 28,
    gap: 8,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  trustText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500" as const,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    marginBottom: 14,
  },
  agentLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  agentCta: {
    color: "#0066FF",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  footerBottom: {
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
  footerVersion: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 13,
    fontWeight: "400" as const,
  },
});
