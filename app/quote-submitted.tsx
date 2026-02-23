import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, MessageCircle, Phone, ArrowRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';

const DARK = {
  bg: '#0A1120',
  surface: '#111B2E',
  border: '#1E2D45',
  text: '#F0F4F8',
  textSecondary: '#8B9DC3',
  textMuted: '#5A6E8A',
  accent: '#0066FF',
  green: '#00C96F',
  greenLight: 'rgba(0,201,111,0.12)',
  whatsapp: '#25D366',
};

const WHATSAPP_NUMBER = '+19567738844';
const WHATSAPP_DISPLAY = '+1 956-773-8844';

export default function QuoteSubmittedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [scaleAnim, fadeAnim]);

  const handleWhatsAppPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const message =
      language === 'es'
        ? 'Hola, acabo de enviar mis datos en Saver. ¿Pueden ayudarme con una cotización?'
        : 'Hi, I just submitted my info on Saver. Can you help me with a quote?';
    const url = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  const isEs = language === 'es';

  const text = {
    badge: isEs ? 'LISTO PARA COTIZAR' : 'READY TO QUOTE',
    title: isEs ? '¡Enviado!' : 'Submitted!',
    message: isEs
      ? 'Recibimos tus datos. Solo te contactaremos si encontramos ahorro real.'
      : 'We received your info. We will only contact you if real savings are found.',
    nextStep: isEs ? 'Te contactaremos por WhatsApp:' : "We'll contact you via WhatsApp:",
    whatsappButton: isEs ? 'Enviar mensaje ahora' : 'Send a message now',
    timeNote: isEs
      ? 'Normalmente respondemos en menos de 24 horas.'
      : 'We typically respond within 24 hours.',
    button: isEs ? 'Volver al inicio' : 'Go to Home',
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0A1120', '#101B2E', '#0A1120']}
        style={StyleSheet.absoluteFill}
      />

      <View
        style={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20) + 40,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Animated.View
          style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}
        >
          <View style={styles.iconGlow} />
          <CheckCircle size={72} color={DARK.green} strokeWidth={1.5} />
        </Animated.View>

        <View style={styles.badgeRow}>
          <View style={styles.readyBadge}>
            <Text style={styles.readyBadgeText}>{text.badge}</Text>
          </View>
        </View>

        <Text style={styles.title}>{text.title}</Text>
        <Text style={styles.message}>{text.message}</Text>

        <Animated.View style={[styles.whatsappSection, { opacity: fadeAnim }]}>
          <Text style={styles.nextStepText}>{text.nextStep}</Text>
          <View style={styles.phoneRow}>
            <Phone size={16} color={DARK.whatsapp} />
            <Text style={styles.phoneNumber}>{WHATSAPP_DISPLAY}</Text>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.whatsappButton,
              pressed && { opacity: 0.9 },
            ]}
            onPress={handleWhatsAppPress}
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.whatsappButtonText}>{text.whatsappButton}</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.timeNote}>{text.timeNote}</Text>

        <View style={styles.spacer} />

        <Pressable
          style={({ pressed }) => [
            styles.homeButton,
            pressed && { opacity: 0.9 },
          ]}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.homeButtonText}>{text.button}</Text>
          <ArrowRight size={18} color={DARK.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  iconGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 60,
    backgroundColor: DARK.green,
    opacity: 0.08,
  },
  badgeRow: {
    marginBottom: 16,
  },
  readyBadge: {
    backgroundColor: DARK.greenLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  readyBadgeText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: DARK.green,
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: DARK.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: DARK.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  whatsappSection: {
    width: '100%',
    backgroundColor: DARK.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  nextStepText: {
    fontSize: 15,
    color: DARK.text,
    fontWeight: '600' as const,
    marginBottom: 12,
    textAlign: 'center',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  phoneNumber: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: DARK.whatsapp,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DARK.whatsapp,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    gap: 10,
    width: '100%',
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  timeNote: {
    fontSize: 13,
    color: DARK.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  spacer: {
    flex: 1,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,102,255,0.1)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.2)',
    width: '100%',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: DARK.accent,
  },
});
