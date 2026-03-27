import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  Animated,
  Share,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Gift,
  Users,
  Copy,
  Share2,
  MessageCircle,
  Check,
  Heart,
  Sparkles,
  Image as ImageIcon,
  Send,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { submitReferral } from '@/services/IntakeService';

const DARK = {
  bg: '#0A1120',
  surface: '#111B2E',
  surfaceLight: '#162035',
  text: '#F0F4F8',
  textSecondary: '#8B9DC3',
  textMuted: '#5A6E8A',
  border: '#1E2D45',
  accent: '#0066FF',
  accentLight: 'rgba(0,102,255,0.12)',
  green: '#00C96F',
  greenLight: 'rgba(0,201,111,0.12)',
  orange: '#FF9500',
  orangeLight: 'rgba(255,149,0,0.12)',
  whatsapp: '#25D366',
  whatsappLight: 'rgba(37,211,102,0.12)',
};

const WHATSAPP_NUMBER = '+19567738844';

export default function ReferralScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, user } = useApp();
  const [referralName, setReferralName] = useState('');
  const [referralPhone, setReferralPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isEs = language === 'es';

  const copy = useMemo(() => {
    if (isEs) {
      return {
        headerTitle: 'Refiere a un Amigo',
        back: 'Atrás',
        heroTitle: 'Comparte\nel Ahorro',
        heroSubtitle: 'Recomienda Saver a familia o amigos que necesiten mejor precio en su seguro de auto.',
        shareFamilyTitle: 'Comparte con familia y amigos',
        shareFamilyDesc: 'Envía este enlace por WhatsApp o texto.',
        copyLink: 'Copiar enlace',
        copied: 'Copiado',
        shareButton: 'Compartir',
        whatsappShare: 'Enviar por WhatsApp',
        orRefer: 'o refiere directamente',
        nameLabel: 'Nombre de tu referido',
        namePlaceholder: 'Juan Pérez',
        phoneLabel: 'Teléfono de tu referido',
        phonePlaceholder: '(555) 123-4567',
        sendReferral: 'Enviar Referido',
        benefit1: 'Tu amigo obtiene cotización gratis',
        benefit2: 'Solo lo contactamos si hay ahorro real',
        benefit3: 'Sin spam, sin llamadas en frío',
        flyerTitle: '¿Necesitas un flyer para redes sociales?',
        flyerDesc: 'Próximamente: descarga un flyer personalizado para compartir en Instagram, Facebook o TikTok.',
        flyerCta: 'Próximamente',
        sentTitle: '¡Referido Enviado!',
        sentMessage: 'Le enviaremos un mensaje a tu referido. Solo lo contactaremos si encontramos ahorro real.',
        sendAnother: 'Referir a otro amigo',
        goHome: 'Volver al inicio',
      };
    }
    return {
      headerTitle: 'Refer a Friend',
      back: 'Back',
      heroTitle: 'Share the\nSavings',
      heroSubtitle: 'Recommend Saver to family or friends who need a better deal on auto insurance.',
      shareFamilyTitle: 'Share with family & friends',
      shareFamilyDesc: 'Send this link via WhatsApp or text.',
      copyLink: 'Copy link',
      copied: 'Copied!',
      shareButton: 'Share',
      whatsappShare: 'Send via WhatsApp',
      orRefer: 'or refer directly',
      nameLabel: "Your friend's name",
      namePlaceholder: 'John Smith',
      phoneLabel: "Your friend's phone",
      phonePlaceholder: '(555) 123-4567',
      sendReferral: 'Send Referral',
      benefit1: 'Your friend gets a free quote',
      benefit2: 'We only contact them if real savings exist',
      benefit3: 'No spam, no cold calls',
      flyerTitle: 'Need a flyer for social media?',
      flyerDesc: 'Coming soon: download a custom flyer to share on Instagram, Facebook, or TikTok.',
      flyerCta: 'Coming Soon',
      sentTitle: 'Referral Sent!',
      sentMessage: "We'll reach out to your friend. We only contact them if we find real savings.",
      sendAnother: 'Refer another friend',
      goHome: 'Go to Home',
    };
  }, [isEs]);

  const referralLink = 'https://saver.app/r/invite';

  const handleCopyLink = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(referralLink);
      } else {
        const Clipboard = await import('expo-clipboard');
        await Clipboard.setStringAsync(referralLink);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.log('[REFERRAL] Copy failed');
    }
  }, [referralLink]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const message = isEs
      ? `¡Ahorra en tu seguro de auto con Saver! Cotización gratis, sin spam. ${referralLink}`
      : `Save on auto insurance with Saver! Free quote, no spam. ${referralLink}`;
    try {
      await Share.share({ message, url: referralLink });
    } catch {
      console.log('[REFERRAL] Share cancelled');
    }
  }, [isEs, referralLink]);

  const handleWhatsAppShare = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const message = isEs
      ? `¡Hola! Te recomiendo Saver para ahorrar en tu seguro de auto. Solo te contactan si encuentran mejor precio. Sin spam. Checa aquí: ${referralLink}`
      : `Hey! I recommend Saver for saving on auto insurance. They only contact you if they find a better price. No spam. Check it out: ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  }, [isEs, referralLink]);

  const handleSendReferral = useCallback(async () => {
    if (!referralName.trim() || referralPhone.replace(/\D/g, '').length < 10) {
      Alert.alert(
        isEs ? 'Información incompleta' : 'Incomplete info',
        isEs ? 'Ingresa nombre y teléfono válidos.' : 'Please enter a valid name and phone number.'
      );
      return;
    }
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();

    console.log('[REFERRAL] Sending referral:', { name: referralName, phone: referralPhone });

    const result = await submitReferral({
      referrerPhone: user?.phone,
      referredName: referralName,
      referredPhone: referralPhone,
      language: isEs ? 'es' : 'en',
      source: 'app_referral',
    });

    if (!result.success) {
      console.log('[REFERRAL] Backend submit failed, continuing with local flow');
    }

    setSent(true);
  }, [referralName, referralPhone, isEs, scaleAnim, user?.phone]);

  const handleSendAnother = useCallback(() => {
    setReferralName('');
    setReferralPhone('');
    setSent(false);
  }, []);

  if (sent) {
    return (
      <View style={styles.container}>
        <Stack.Screen
          options={{
            headerShown: true,
            title: copy.headerTitle,
            headerStyle: { backgroundColor: DARK.bg },
            headerTintColor: DARK.text,
            headerTitleStyle: { fontWeight: '700' as const },
          }}
        />
        <LinearGradient
          colors={['#0A1120', '#0D1A2D', '#0A1120']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.sentContent, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.sentIconWrap}>
            <View style={styles.sentIconGlow} />
            <Check size={56} color={DARK.green} strokeWidth={2} />
          </View>
          <Text style={styles.sentTitle}>{copy.sentTitle}</Text>
          <Text style={styles.sentMessage}>{copy.sentMessage}</Text>

          <Pressable
            style={({ pressed }) => [styles.sendAnotherBtn, pressed && { opacity: 0.9 }]}
            onPress={handleSendAnother}
          >
            <Gift size={18} color={DARK.accent} />
            <Text style={styles.sendAnotherText}>{copy.sendAnother}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.goHomeBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.goHomeText}>{copy.goHome}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: copy.headerTitle,
          headerBackTitle: copy.back,
          headerStyle: { backgroundColor: DARK.bg },
          headerTintColor: DARK.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <LinearGradient
        colors={['#0A1120', '#0D1A2D', '#0A1120']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glowOrb} />

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <View style={styles.heroIconWrap}>
            <LinearGradient
              colors={[DARK.orange, '#FF6B00']}
              style={styles.heroIconGradient}
            >
              <Gift size={28} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>{copy.heroTitle}</Text>
          <Text style={styles.heroSubtitle}>{copy.heroSubtitle}</Text>
        </View>

        <View style={styles.benefitsSection}>
          {[
            { icon: Sparkles, label: copy.benefit1 },
            { icon: Heart, label: copy.benefit2 },
            { icon: Users, label: copy.benefit3 },
          ].map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIconWrap}>
                <b.icon size={14} color={DARK.green} strokeWidth={2.5} />
              </View>
              <Text style={styles.benefitText}>{b.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.shareLinkCard}>
          <Text style={styles.shareLinkTitle}>{copy.shareFamilyTitle}</Text>
          <Text style={styles.shareLinkDesc}>{copy.shareFamilyDesc}</Text>
          <View style={styles.linkRow}>
            <Text style={styles.linkText} numberOfLines={1}>{referralLink}</Text>
            <Pressable
              style={[styles.copyBtn, copied && styles.copyBtnCopied]}
              onPress={handleCopyLink}
            >
              {copied ? (
                <Check size={16} color={DARK.green} />
              ) : (
                <Copy size={16} color={DARK.accent} />
              )}
              <Text style={[styles.copyBtnText, copied && { color: DARK.green }]}>
                {copied ? copy.copied : copy.copyLink}
              </Text>
            </Pressable>
          </View>

          <View style={styles.shareActions}>
            <Pressable
              style={({ pressed }) => [styles.whatsappShareBtn, pressed && { opacity: 0.9 }]}
              onPress={handleWhatsAppShare}
            >
              <MessageCircle size={18} color="#FFFFFF" />
              <Text style={styles.whatsappShareText}>{copy.whatsappShare}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.genericShareBtn, pressed && { opacity: 0.9 }]}
              onPress={handleShare}
            >
              <Share2 size={18} color={DARK.accent} />
              <Text style={styles.genericShareText}>{copy.shareButton}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.flyerCard}>
          <View style={styles.flyerIconWrap}>
            <ImageIcon size={20} color={DARK.orange} strokeWidth={2} />
          </View>
          <View style={styles.flyerTextWrap}>
            <Text style={styles.flyerTitle}>{copy.flyerTitle}</Text>
            <Text style={styles.flyerDesc}>{copy.flyerDesc}</Text>
          </View>
          <View style={styles.flyerBadge}>
            <Text style={styles.flyerBadgeText}>{copy.flyerCta}</Text>
          </View>
        </View>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{copy.orRefer}</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>{copy.nameLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={copy.namePlaceholder}
            placeholderTextColor={DARK.textMuted}
            value={referralName}
            onChangeText={setReferralName}
            autoCapitalize="words"
            testID="referral-name"
          />

          <Text style={[styles.inputLabel, { marginTop: 16 }]}>{copy.phoneLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={copy.phonePlaceholder}
            placeholderTextColor={DARK.textMuted}
            value={referralPhone}
            onChangeText={setReferralPhone}
            keyboardType="phone-pad"
            testID="referral-phone"
          />

          <Animated.View style={{ transform: [{ scale: scaleAnim }], marginTop: 20 }}>
            <Pressable
              style={({ pressed }) => [styles.sendReferralBtn, pressed && { opacity: 0.9 }]}
              onPress={handleSendReferral}
            >
              <LinearGradient
                colors={['#0066FF', '#0052CC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendReferralGradient}
              >
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.sendReferralText}>{copy.sendReferral}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  flex: {
    flex: 1,
  },
  glowOrb: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: DARK.orange,
    opacity: 0.06,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  heroIconWrap: {
    marginBottom: 20,
  },
  heroIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '800' as const,
    color: DARK.text,
    textAlign: 'center',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 15,
    color: DARK.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  benefitsSection: {
    gap: 10,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: DARK.greenLight,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  benefitIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(0,201,111,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: DARK.text,
  },
  shareLinkCard: {
    backgroundColor: DARK.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: DARK.border,
    marginBottom: 14,
  },
  shareLinkTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: DARK.text,
    marginBottom: 4,
  },
  shareLinkDesc: {
    fontSize: 13,
    color: DARK.textMuted,
    marginBottom: 16,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.surfaceLight,
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    marginBottom: 14,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: DARK.textSecondary,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: DARK.accentLight,
  },
  copyBtnCopied: {
    backgroundColor: DARK.greenLight,
  },
  copyBtnText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: DARK.accent,
  },
  shareActions: {
    flexDirection: 'row',
    gap: 10,
  },
  whatsappShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK.whatsapp,
    paddingVertical: 14,
    borderRadius: 12,
  },
  whatsappShareText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  genericShareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK.accentLight,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.2)',
  },
  genericShareText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: DARK.accent,
  },
  flyerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.orangeLight,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.15)',
  },
  flyerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,149,0,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flyerTextWrap: {
    flex: 1,
  },
  flyerTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: DARK.text,
    marginBottom: 2,
  },
  flyerDesc: {
    fontSize: 11,
    color: DARK.textMuted,
    lineHeight: 16,
  },
  flyerBadge: {
    backgroundColor: 'rgba(255,149,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  flyerBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: DARK.orange,
    letterSpacing: 0.5,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginVertical: 4,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    fontSize: 13,
    color: DARK.textMuted,
    fontWeight: '500' as const,
  },
  formCard: {
    backgroundColor: DARK.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: DARK.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: DARK.surfaceLight,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: DARK.text,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  sendReferralBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  sendReferralGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  sendReferralText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  sentContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  sentIconWrap: {
    marginBottom: 24,
    position: 'relative',
  },
  sentIconGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 50,
    backgroundColor: DARK.green,
    opacity: 0.1,
  },
  sentTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: DARK.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  sentMessage: {
    fontSize: 15,
    color: DARK.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
  sendAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: DARK.accentLight,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.2)',
    marginBottom: 16,
    width: '100%',
    justifyContent: 'center',
  },
  sendAnotherText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: DARK.accent,
  },
  goHomeBtn: {
    paddingVertical: 12,
  },
  goHomeText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: DARK.textMuted,
  },
});
