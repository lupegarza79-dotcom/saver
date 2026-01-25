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
import { Upload, MessageCircle, Shield, BadgeCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useApp } from "@/contexts/AppContext";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useApp();

  const uploadScale = useRef(new Animated.Value(1)).current;
  const chatScale = useRef(new Animated.Value(1)).current;

  const animatePress = useCallback((scale: Animated.Value) => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const isEs = language === "es";

  const copy = useMemo(() => {
    if (isEs) {
      return {
        title: "Ahorra en\nSeguro de Auto",
        subtitle: "Sube tu póliza o contesta preguntas.\nRecibe cotizaciones reales. Sin spam.",
        chips: "GRATIS • FÁCIL • RÁPIDO",
        uploadTitle: "Subir Póliza",
        uploadSub: "Declarations Page o ID Cards",
        chatTop: "¿No tienes tu póliza?",
        chatTitle: "Contesta unas preguntas",
        chatSub: "Te guiamos 1-por-1 para armar tu perfil",
        agent: "Soy Agente",
        trust1: "Sin llamadas",
        trust2: "Tú eliges",
        trust3: "Ahorros reales",
      };
    }
    return {
      title: "Save on\nAuto Insurance",
      subtitle: "Upload your policy or answer a few questions.\nGet real quotes. No spam.",
      chips: "FREE • EASY • FAST",
      uploadTitle: "Upload Policy",
      uploadSub: "Declarations Page or ID Cards",
      chatTop: "Don't have your policy?",
      chatTitle: "Answer a few questions",
      chatSub: "We guide you one-by-one to build your profile",
      agent: "I'm an Agent",
      trust1: "No calls",
      trust2: "You choose",
      trust3: "Real savings",
    };
  }, [isEs]);

  const handleUpload = () => {
    animatePress(uploadScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/upload-document");
  };

  const handleChat = () => {
    animatePress(chatScale);
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/ai-assistant?mode=intake");
  };

  const handleAgentPress = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    router.push("/agents");
  };

  return (
    <View style={[styles.root, { paddingTop: Math.max(insets.top, 14) }]}>
      <LinearGradient
        colors={["#0B1220", "#0B1B3A", "#0B1220"]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.header}>
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

        <Text style={styles.chips}>{copy.chips}</Text>

        <Animated.View style={{ transform: [{ scale: uploadScale }] }}>
          <Pressable
            onPress={handleUpload}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.92 }]}
          >
            <View style={styles.primaryLeft}>
              <Upload size={20} color="#FFFFFF" />
            </View>
            <View style={styles.btnTextWrap}>
              <Text style={styles.primaryTitle}>{copy.uploadTitle}</Text>
              <Text style={styles.primarySub}>{copy.uploadSub}</Text>
            </View>
          </Pressable>
        </Animated.View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{isEs ? "o" : "or"}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Animated.View style={{ transform: [{ scale: chatScale }] }}>
          <Pressable
            onPress={handleChat}
            style={({ pressed }) => [styles.secondaryCard, pressed && { opacity: 0.94 }]}
          >
            <View style={styles.secondaryIcon}>
              <MessageCircle size={20} color="#0B5FFF" />
            </View>
            <View style={styles.btnTextWrap}>
              <Text style={styles.secondaryTop}>{copy.chatTop}</Text>
              <Text style={styles.secondaryTitle}>{copy.chatTitle}</Text>
              <Text style={styles.secondarySub}>{copy.chatSub}</Text>
            </View>
          </Pressable>
        </Animated.View>

        <View style={styles.trustRow}>
          <View style={styles.trustChip}>
            <BadgeCheck size={16} color="#22C55E" />
            <Text style={styles.trustText}>{copy.trust1}</Text>
          </View>
          <View style={styles.trustChip}>
            <BadgeCheck size={16} color="#22C55E" />
            <Text style={styles.trustText}>{copy.trust2}</Text>
          </View>
          <View style={styles.trustChip}>
            <BadgeCheck size={16} color="#22C55E" />
            <Text style={styles.trustText}>{copy.trust3}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Pressable onPress={handleAgentPress} style={styles.agentLink}>
          <Text style={styles.agentText}>{copy.agent}</Text>
        </Pressable>
        <Text style={styles.footerTiny}>Saver v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { 
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 6,
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
    borderRadius: 12,
    backgroundColor: "rgba(59,130,246,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandText: { 
    color: "#EAF2FF", 
    fontWeight: "900" as const, 
    fontSize: 18,
  },
  langPill: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  langBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  langBtnActive: { 
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  langText: { 
    color: "rgba(255,255,255,0.75)", 
    fontWeight: "800" as const, 
    fontSize: 12,
  },
  langTextActive: { 
    color: "#FFFFFF",
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    justifyContent: "center",
    gap: 14,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 40,
    lineHeight: 44,
    fontWeight: "900" as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600" as const,
  },
  chips: {
    color: "rgba(255,255,255,0.80)",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "900" as const,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#0B5FFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  primaryLeft: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  btnTextWrap: {
    flex: 1,
  },
  primaryTitle: { 
    color: "#FFFFFF", 
    fontSize: 16, 
    fontWeight: "900" as const,
  },
  primarySub: { 
    color: "rgba(255,255,255,0.80)", 
    fontSize: 12, 
    marginTop: 2, 
    fontWeight: "700" as const,
  },
  dividerRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10,
  },
  dividerLine: { 
    flex: 1, 
    height: 1, 
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  dividerText: { 
    color: "rgba(255,255,255,0.50)", 
    fontWeight: "800" as const,
  },
  secondaryCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  secondaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(11,95,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryTop: { 
    color: "#334155", 
    fontSize: 12, 
    fontWeight: "800" as const,
  },
  secondaryTitle: { 
    color: "#0F172A", 
    fontSize: 16, 
    fontWeight: "900" as const, 
    marginTop: 2,
  },
  secondarySub: { 
    color: "#475569", 
    fontSize: 12, 
    fontWeight: "700" as const, 
    marginTop: 2,
  },
  trustRow: { 
    flexDirection: "row", 
    gap: 10, 
    flexWrap: "wrap",
  },
  trustChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  trustText: { 
    color: "rgba(255,255,255,0.85)", 
    fontWeight: "800" as const, 
    fontSize: 12,
  },
  footer: { 
    paddingHorizontal: 18, 
    paddingTop: 6,
  },
  agentLink: { 
    alignSelf: "center", 
    paddingVertical: 10, 
    paddingHorizontal: 14,
  },
  agentText: { 
    color: "rgba(255,255,255,0.65)", 
    fontWeight: "800" as const,
  },
  footerTiny: { 
    textAlign: "center", 
    color: "rgba(255,255,255,0.35)", 
    fontWeight: "700" as const, 
    fontSize: 12,
  },
});
