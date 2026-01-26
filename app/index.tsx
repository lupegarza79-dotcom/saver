import React, { useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Upload, MessageCircle, Shield } from "lucide-react-native";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();

  const quoteScale = useRef(new Animated.Value(1)).current;
  const uploadScale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const isEs = language === "es";

  const copy = useMemo(() => {
    if (isEs) {
      return {
        title: "Ahorra en\nSeguro de Auto",
        subtitle: "Sube tu póliza o responde unas preguntas.\nCotizaciones reales. Sin spam.",
        tagline: "GRATIS  •  FÁCIL  •  RÁPIDO",
        uploadTitle: "Subir Póliza",
        uploadSub: "Página de Declaraciones o Tarjetas de ID",
        or: "o",
        quoteLabel: "¿No tienes tu póliza?",
        quoteTitle: "Responde unas preguntas",
        quoteSub: "Te guiamos paso a paso para crear tu perfil",
        agent: "Agentes de Seguros\nregístrense aquí.",
        terms: "Términos",
        version: "Saver v1.0",
      };
    }
    return {
      title: "Save on\nAuto Insurance",
      subtitle: "Upload your policy or answer a few questions.\nGet real quotes. No spam.",
      tagline: "FREE  •  EASY  •  FAST",
      uploadTitle: "Upload Policy",
      uploadSub: "Declarations Page or ID Cards",
      or: "or",
      quoteLabel: "Don't have your policy?",
      quoteTitle: "Answer a few questions",
      quoteSub: "We guide you one-by-one to build your profile",
      agent: "Insurance Agents\nsign up here.",
      terms: "Terms",
      version: "Saver v1.0",
    };
  }, [isEs]);

  const handleGetQuote = () => {
    animatePress(quoteScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/quote-form");
  };

  const handleUpload = () => {
    animatePress(uploadScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/upload-document");
  };

  const handleAgentPress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.push("/agents");
  };

  const handleTermsPress = () => {
    router.push("/modal?type=terms");
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0B1220", "#0F1D32", "#0B1220"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 24 }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Shield size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>Saver</Text>
        </View>

        <LanguageSwitcher variant="pill" />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <Text style={styles.tagline}>{copy.tagline}</Text>

        <View style={styles.ctaContainer}>
          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: uploadScale }] }]}>
            <Pressable
              onPress={handleUpload}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.btnIconWrap}>
                <Upload size={22} color="#FFFFFF" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.primaryTitle}>{copy.uploadTitle}</Text>
                <Text style={styles.primarySub}>{copy.uploadSub}</Text>
              </View>
            </Pressable>
          </Animated.View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{copy.or}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: quoteScale }] }]}>
            <Pressable
              onPress={handleGetQuote}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.btnIconWrapAlt}>
                <MessageCircle size={20} color="#FFFFFF" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.secondaryLabel}>{copy.quoteLabel}</Text>
                <Text style={styles.secondaryTitle}>{copy.quoteTitle}</Text>
                <Text style={styles.secondarySub}>{copy.quoteSub}</Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable onPress={handleAgentPress} style={styles.agentBtn}>
          <Text style={styles.agentBtnText}>{copy.agent}</Text>
        </Pressable>
        <View style={styles.footerLinks}>
          <Pressable onPress={handleTermsPress} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{copy.terms}</Text>
          </Pressable>
          <View style={styles.footerDot} />
          <Text style={styles.footerVersionText}>{copy.version}</Text>
        </View>
      </View>

      
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#0B5FFF",
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
  title: {
    color: "#FFFFFF",
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  subtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
    marginBottom: 12,
  },
  tagline: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700" as const,
    letterSpacing: 3,
    marginBottom: 28,
  },
  ctaContainer: {
    gap: 12,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  dividerText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500" as const,
  },
  ctaWrapper: {
    borderRadius: 16,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#0B5FFF",
  },
  btnIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnIconWrapAlt: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
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
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#1A8F4A",
  },
  secondaryLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500" as const,
    marginBottom: 2,
  },
  secondaryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  secondarySub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "400" as const,
    marginTop: 3,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: "center",
  },
  agentBtn: {
    backgroundColor: "#4F6EF7",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginBottom: 12,
  },
  agentBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600" as const,
    textAlign: "center" as const,
    lineHeight: 24,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  footerLink: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  footerLinkText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    fontWeight: "500" as const,
    textDecorationLine: "underline" as const,
  },
  footerVersionText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontWeight: "400" as const,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  
});
