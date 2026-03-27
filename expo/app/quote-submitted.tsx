import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CheckCircle,
  MessageCircle,
  ArrowRight,
  Shield,
  Clock,
  Gift,
  Search,
  Bell,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { SAVER } from '@/constants/theme';
import StatusBadge from '@/components/ui/StatusBadge';

const WHATSAPP_NUMBER = '+19567738844';

export default function QuoteSubmittedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(cardFade, {
      toValue: 1,
      duration: 600,
      delay: 500,
      useNativeDriver: true,
    }).start();

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [scaleAnim, fadeAnim, cardFade]);

  const isEs = language === 'es';

  const t = useMemo(() => isEs ? {
    title: '¡Solicitud Recibida!',
    subtitle: 'Revisaremos tu información y te contactaremos solo si encontramos ahorros o necesitamos algo específico.',
    statusLabel: 'Estado',
    nextStepTitle: 'Qué sigue',
    step1: 'Revisamos tu información',
    step2: 'Comparamos tarifas de múltiples aseguradoras',
    step3: 'Te contactamos solo si encontramos valor',
    channelLabel: 'Te contactaremos por',
    channelValue: 'WhatsApp',
    whatsappCta: 'Escríbenos por WhatsApp',
    whatsappMsg: 'Hola, acabo de enviar mis datos en Saver. ¿Pueden ayudarme con una cotización?',
    shareCta: '¿Conoces a alguien que también pueda ahorrar?',
    shareBtn: 'Comparte Saver',
    goHome: 'Volver al Inicio',
  } : {
    title: 'Request Received!',
    subtitle: "We'll review your info and contact you only if we find savings or need something specific.",
    statusLabel: 'Status',
    nextStepTitle: 'What happens next',
    step1: 'We review your information',
    step2: 'We compare rates from multiple carriers',
    step3: 'We contact you only if we find value',
    channelLabel: "We'll reach you via",
    channelValue: 'WhatsApp',
    whatsappCta: 'Message us on WhatsApp',
    whatsappMsg: 'Hi, I just submitted my info on Saver. Can you help me with a quote?',
    shareCta: 'Know someone who could save too?',
    shareBtn: 'Share Saver',
    goHome: 'Back to Home',
  }, [isEs]);

  const handleWhatsAppPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(t.whatsappMsg)}`;
    Linking.openURL(url);
  };

  const handleReferralPress = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    router.push('/referral' as any);
  };

  const handleGoHome = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    router.replace('/');
  };

  const nextSteps = [
    { icon: Search, label: t.step1, color: SAVER.accent },
    { icon: Shield, label: t.step2, color: SAVER.green },
    { icon: Bell, label: t.step3, color: SAVER.orange },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A1120', '#0D1A2D', '#0A1120']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowOrb} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 40,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.heroSection, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.checkIconWrap}>
            <View style={styles.checkIconGlow} />
            <LinearGradient
              colors={[SAVER.green, SAVER.greenDark]}
              style={styles.checkIconGradient}
            >
              <CheckCircle size={36} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: fadeAnim }}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>{t.statusLabel}</Text>
            <StatusBadge status="READY_TO_QUOTE" language={language} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.cardsSection, { opacity: cardFade }]}>
          <View style={styles.nextStepsCard}>
            <Text style={styles.nextStepsTitle}>{t.nextStepTitle}</Text>
            {nextSteps.map((s, i) => (
              <View key={i} style={styles.nextStepRow}>
                <View style={[styles.nextStepIcon, { backgroundColor: `${s.color}18` }]}>
                  <s.icon size={16} color={s.color} />
                </View>
                <Text style={styles.nextStepLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.channelCard}>
            <View style={styles.channelRow}>
              <Text style={styles.channelLabel}>{t.channelLabel}</Text>
              <View style={styles.channelBadge}>
                <MessageCircle size={14} color={SAVER.whatsapp} />
                <Text style={styles.channelValue}>{t.channelValue}</Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={handleWhatsAppPress}
            style={({ pressed }) => [styles.whatsappBtn, pressed && { opacity: 0.9 }]}
          >
            <MessageCircle size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.whatsappBtnText}>{t.whatsappCta}</Text>
          </Pressable>

          <Pressable
            onPress={handleReferralPress}
            style={({ pressed }) => [styles.referralCard, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.referralIconWrap}>
              <Gift size={18} color={SAVER.orange} />
            </View>
            <View style={styles.referralTextWrap}>
              <Text style={styles.referralTitle}>{t.shareCta}</Text>
              <Text style={styles.referralCta}>{t.shareBtn}</Text>
            </View>
            <ChevronRight size={18} color={SAVER.orange} />
          </Pressable>

          <Pressable
            onPress={handleGoHome}
            style={({ pressed }) => [styles.goHomeBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.goHomeText}>{t.goHome}</Text>
            <ArrowRight size={16} color={SAVER.textMuted} />
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SAVER.bg,
  },
  glowOrb: {
    position: 'absolute',
    top: -40,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: SAVER.green,
    opacity: 0.06,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  checkIconWrap: {
    position: 'relative',
  },
  checkIconGlow: {
    position: 'absolute',
    top: -16,
    left: -16,
    right: -16,
    bottom: -16,
    borderRadius: 50,
    backgroundColor: SAVER.green,
    opacity: 0.12,
  },
  checkIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: SAVER.text,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: SAVER.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 28,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: SAVER.textMuted,
  },
  cardsSection: {
    gap: 14,
  },
  nextStepsCard: {
    backgroundColor: SAVER.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  nextStepsTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: SAVER.text,
    marginBottom: 16,
  },
  nextStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
  },
  nextStepIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStepLabel: {
    flex: 1,
    fontSize: 14,
    color: SAVER.textSecondary,
    fontWeight: '500' as const,
  },
  channelCard: {
    backgroundColor: SAVER.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  channelLabel: {
    fontSize: 13,
    color: SAVER.textMuted,
    fontWeight: '500' as const,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SAVER.whatsappLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  channelValue: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: SAVER.whatsapp,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: SAVER.whatsapp,
    paddingVertical: 16,
    borderRadius: 14,
  },
  whatsappBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SAVER.orangeLight,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.15)',
    borderRadius: 16,
    padding: 16,
  },
  referralIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,149,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTextWrap: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 13,
    color: SAVER.text,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  referralCta: {
    fontSize: 15,
    color: SAVER.orange,
    fontWeight: '700' as const,
  },
  goHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
  },
  goHomeText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: SAVER.textMuted,
  },
});
