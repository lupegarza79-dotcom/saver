import React, { useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Linking,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { FileText, Upload, MessageCircle, Shield } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useApp();

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
        tagline: "GRATIS • FÁCIL • RÁPIDO",
        cta1: "Obtener Cotización",
        cta1Sub: "1–2 minutos",
        cta2: "Subir Póliza",
        cta2Sub: "PDF o Foto",
        agent: "Soy Agente",
        terms: "Términos",
        whatsappHelp: "¿Necesitas ayuda?",
      };
    }
    return {
      title: "Save on\nAuto Insurance",
      subtitle: "Upload your policy or answer a few questions.\nGet real quotes. No spam.",
      tagline: "FREE • EASY • FAST",
      cta1: "Get Quote",
      cta1Sub: "1–2 min",
      cta2: "Upload Policy",
      cta2Sub: "PDF or Photo",
      agent: "I'm an Agent",
      terms: "Terms",
      whatsappHelp: "Need help?",
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

  const handleWhatsApp = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    Linking.openURL("https://wa.me/19567738844");
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

      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Shield size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>Saver</Text>
        </View>

        <View style={styles.langPill}>
          <Pressable
            onPress={() => setLanguage("en")}
            style={[styles.langBtn, language === "en" && styles.langBtnActive]}
          >
            <Text style={[styles.langText, language === "en" && styles.langTextActive]}>
              EN
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setLanguage("es")}
            style={[styles.langBtn, language === "es" && styles.langBtnActive]}
          >
            <Text style={[styles.langText, language === "es" && styles.langTextActive]}>
              ES
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>
        <Text style={styles.tagline}>{copy.tagline}</Text>

        <View style={styles.ctaContainer}>
          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: quoteScale }] }]}>
            <Pressable
              onPress={handleGetQuote}
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.btnIconWrap}>
                <FileText size={22} color="#FFFFFF" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.primaryTitle}>{copy.cta1}</Text>
                <Text style={styles.primarySub}>{copy.cta1Sub}</Text>
              </View>
            </Pressable>
          </Animated.View>

          <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: uploadScale }] }]}>
            <Pressable
              onPress={handleUpload}
              style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.92 }]}
            >
              <View style={styles.btnIconWrapAlt}>
                <Upload size={22} color="#0B5FFF" />
              </View>
              <View style={styles.btnTextWrap}>
                <Text style={styles.secondaryTitle}>{copy.cta2}</Text>
                <Text style={styles.secondarySub}>{copy.cta2Sub}</Text>
              </View>
            </Pressable>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerLinks}>
          <Pressable onPress={handleAgentPress} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{copy.agent}</Text>
          </Pressable>
          <View style={styles.footerDot} />
          <Pressable onPress={handleTermsPress} style={styles.footerLink}>
            <Text style={styles.footerLinkText}>{copy.terms}</Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={handleWhatsApp}
        style={[styles.whatsappFab, { bottom: Math.max(insets.bottom, 16) + 60 }]}
      >
        <MessageCircle size={24} color="#FFFFFF" fill="#FFFFFF" />
      </Pressable>
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
  langPill: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    padding: 3,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  langBtnActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  langText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700" as const,
    fontSize: 13,
  },
  langTextActive: {
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800" as const,
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: "center" as const,
  },
  subtitle: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "500" as const,
    marginBottom: 8,
    textAlign: "center" as const,
  },
  tagline: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700" as const,
    letterSpacing: 2,
    marginBottom: 32,
    textAlign: "center" as const,
  },
  ctaContainer: {
    gap: 14,
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
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(11,95,255,0.12)",
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
    gap: 14,
    padding: 18,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  secondaryTitle: {
    color: "#0F172A",
    fontSize: 17,
    fontWeight: "700" as const,
  },
  secondarySub: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "500" as const,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  footerLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  footerLinkText: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  whatsappFab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#25D366",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
