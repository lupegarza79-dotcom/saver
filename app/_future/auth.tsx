import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, ArrowRight, Phone, Globe, Sparkles, Zap, Check, CheckCircle, Circle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

type Step = 'phone' | 'verify';

const MAX_WIDTH = 480;

export default function AuthScreen() {
  const router = useRouter();
  const { t, login, language, setLanguage } = useApp();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const isWeb = Platform.OS === 'web';
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (Platform.OS === 'web' && process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
      (async () => {
        await login('web-demo');
        router.replace('/');
      })();
    }
  }, [login, router]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, slideAnim, glowAnim]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const formatPhone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      const formatted = [match[1], match[2], match[3]].filter(Boolean).join('-');
      return formatted;
    }
    return text;
  };

  const handlePhoneChange = (text: string) => {
    setPhone(formatPhone(text));
  };

  const handleSendCode = async () => {
    if (phone.replace(/\D/g, '').length < 10 || !termsAccepted) return;
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setStep('verify');
    setCountdown(60);
  };

  const handleVerifyCode = async () => {
    if (code.length < 6) return;
    
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    await login(phone);
    setIsLoading(false);
    router.replace('/');
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(60);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const isPhoneValid = phone.replace(/\D/g, '').length >= 10 && termsAccepted;
  const isCodeValid = code.length === 6;

  const features = [
    { icon: Shield, text: 'Upload policy documents' },
    { icon: Zap, text: 'Never miss a payment' },
    { icon: Check, text: 'Find savings automatically' },
  ];

  console.log('[Auth] Rendering auth screen');

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />
      <Animated.View style={[styles.backgroundGlow2, { opacity: glowAnim }]} />
      <View style={styles.backgroundGlow3} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableOpacity 
            style={styles.langToggle}
            onPress={() => setLanguage(language === 'en' ? 'es' : 'en')}
          >
            <Globe size={16} color={Colors.textSecondary} />
            <Text style={styles.langText}>
              {language === 'en' ? 'ES' : 'EN'}
            </Text>
          </TouchableOpacity>

          <Animated.View 
            style={[
              styles.content,
              isWeb && styles.webContent,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
            ]}
          >
            <View style={styles.logoContainer}>
              <View style={styles.logoWrapper}>
                <LinearGradient
                  colors={[Colors.secondary, Colors.info, Colors.accentPurple]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logo}
                >
                  <Shield size={48} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.logoRing} />
                <View style={styles.logoGlow} />
              </View>
              <Text style={styles.appName}>Saver</Text>
              <Text style={styles.appNameAccent}>Insurance</Text>
              <Text style={styles.tagline}>{t.auth?.tagline || 'Your insurance control center in one app.'}</Text>
            </View>

            <View style={styles.formCard}>
              <LinearGradient
                colors={[Colors.surfaceLight, Colors.surface]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.formGradient}
              >
                <View style={styles.formBorder} />
                {step === 'phone' ? (
                  <>
                    <View style={styles.formHeader}>
                      <Sparkles size={20} color={Colors.secondary} />
                      <Text style={styles.formTitle}>{t.auth?.enterPhone || 'Enter your mobile number'}</Text>
                    </View>
                    <Text style={styles.formHint}>{t.auth?.phoneHint || "We'll text you a login code. No spam."}</Text>
                    
                    <View style={styles.inputContainer}>
                      <View style={styles.countryCode}>
                        <Text style={styles.countryCodeText}>+1</Text>
                      </View>
                      <TextInput
                        style={styles.input}
                        placeholder="000-000-0000"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={handlePhoneChange}
                        maxLength={12}
                        autoFocus
                      />
                      <Phone size={20} color={Colors.textTertiary} />
                    </View>

                    <TouchableOpacity
                      style={styles.termsRow}
                      onPress={() => {
                        if (Platform.OS !== 'web') Haptics.selectionAsync();
                        setTermsAccepted(!termsAccepted);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.termsCheckbox, termsAccepted && styles.termsCheckboxChecked]}>
                        {termsAccepted ? (
                          <CheckCircle size={16} color="#FFFFFF" />
                        ) : (
                          <Circle size={16} color={Colors.textTertiary} />
                        )}
                      </View>
                      <Text style={styles.termsText}>
                        {t.consents?.termsCheckbox || 'I agree to the Terms of Use and Privacy Policy.'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, !isPhoneValid && styles.buttonDisabled]}
                      onPress={handleSendCode}
                      disabled={!isPhoneValid || isLoading}
                    >
                      <LinearGradient
                        colors={isPhoneValid ? [Colors.secondary, Colors.info] : [Colors.textTertiary, Colors.textTertiary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                      >
                        <Text style={styles.buttonText}>
                          {isLoading ? (t.common?.loading || 'Loading...') : (t.auth?.sendCode || 'Send code')}
                        </Text>
                        <ArrowRight size={20} color={Colors.textInverse} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.formHeader}>
                      <Sparkles size={20} color={Colors.secondary} />
                      <Text style={styles.formTitle}>{t.auth?.verifyCode || 'Verify Code'}</Text>
                    </View>
                    <Text style={styles.formHint}>
                      {t.auth?.enterCode || 'Enter the 6-digit code sent to'} +1 {phone}
                    </Text>
                    
                    <View style={styles.codeContainer}>
                      <TextInput
                        style={styles.codeInput}
                        placeholder="000000"
                        placeholderTextColor={Colors.textTertiary}
                        keyboardType="number-pad"
                        value={code}
                        onChangeText={setCode}
                        maxLength={6}
                        autoFocus
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.button, !isCodeValid && styles.buttonDisabled]}
                      onPress={handleVerifyCode}
                      disabled={!isCodeValid || isLoading}
                    >
                      <LinearGradient
                        colors={isCodeValid ? [Colors.secondary, Colors.info] : [Colors.textTertiary, Colors.textTertiary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.buttonGradient}
                      >
                        <Text style={styles.buttonText}>
                          {isLoading ? (t.common?.loading || 'Loading...') : (t.auth?.verifyCode || 'Verify & continue')}
                        </Text>
                        <ArrowRight size={20} color={Colors.textInverse} />
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.resendButton}
                      onPress={handleResend}
                      disabled={countdown > 0}
                    >
                      <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                        {countdown > 0 
                          ? `${t.auth?.resendIn || 'Resend in'} ${countdown}s`
                          : (t.auth?.resendCode || 'Resend Code')
                        }
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.backButton}
                      onPress={() => setStep('phone')}
                    >
                      <Text style={styles.backText}>{t.auth?.changePhone || 'Change phone number'}</Text>
                    </TouchableOpacity>
                  </>
                )}
              </LinearGradient>
            </View>

            <View style={styles.features}>
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <View key={index} style={styles.featureItem}>
                    <View style={styles.featureIconContainer}>
                      <Icon size={16} color={Colors.secondary} />
                    </View>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backgroundGlow: {
    position: 'absolute',
    top: -200,
    left: '50%',
    marginLeft: -250,
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: Colors.secondary,
    opacity: 0.04,
  },
  backgroundGlow2: {
    position: 'absolute',
    top: 100,
    right: -150,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.accentPurple,
  },
  backgroundGlow3: {
    position: 'absolute',
    bottom: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.info,
    opacity: 0.03,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  langToggle: {
    position: 'absolute',
    top: 16,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
  },
  langText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  webContent: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: Colors.secondary + '30',
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 50,
    backgroundColor: Colors.secondary,
    opacity: 0.15,
    zIndex: -1,
  },
  appName: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: Colors.text,
    letterSpacing: -1,
  },
  appNameAccent: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.secondary,
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginTop: -4,
  },
  tagline: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
    maxWidth: 320,
  },
  formCard: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  formGradient: {
    padding: 24,
    position: 'relative',
  },
  formBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  formHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  countryCode: {
    paddingRight: 12,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    marginRight: 12,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '500' as const,
    color: Colors.text,
    letterSpacing: 1,
  },
  codeContainer: {
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 32,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  button: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  resendButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  resendTextDisabled: {
    color: Colors.textTertiary,
  },
  backButton: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  features: {
    marginTop: 36,
    gap: 14,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  termsCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  termsCheckboxChecked: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
