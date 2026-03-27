import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  CheckCircle,
  AlertCircle,
  Lock,
  ChevronRight,
  X,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { SAVER } from '@/constants/theme';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'partial' | 'failed';

interface UploadedFile {
  uri: string;
  name: string;
}

export default function UploadPolicyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useApp();
  const [state, setState] = useState<UploadState>('idle');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const isEs = language === 'es';
  const t = isEs ? {
    title: 'Sube tu Póliza',
    subtitle: 'Toma una foto de tu página de declaraciones o tarjeta de seguro.',
    camera: 'Tomar Foto',
    gallery: 'Galería de Fotos',
    filesPick: 'Elegir Archivo',
    whatTitle: 'Qué subir',
    whatDesc: 'Tu página de declaraciones muestra los detalles de cobertura, límites y prima.',
    processing: 'Extrayendo detalles de tu póliza...',
    processingSub: 'Esto suele tomar unos segundos.',
    success: '¡Encontramos los detalles de tu póliza!',
    partial: 'Obtuvimos algunos datos. Puede que necesitemos unos más.',
    fail: 'No pudimos leer todo claramente. Aún podemos ayudarte — solo responde unas preguntas rápidas.',
    continueBtn: 'Continuar',
    skipBtn: 'Saltar y responder manualmente',
    secure: 'Tus documentos están encriptados y almacenados de forma segura.',
    filesLabel: 'archivos subidos',
    remove: 'Eliminar',
  } : {
    title: 'Upload Your Policy',
    subtitle: 'Take a photo of your declarations page or insurance ID card.',
    camera: 'Take Photo',
    gallery: 'Photo Library',
    filesPick: 'Choose File',
    whatTitle: 'What to upload',
    whatDesc: 'Your declarations page shows your coverage details, limits, and premium.',
    processing: 'Extracting your policy details...',
    processingSub: 'This usually takes a few seconds.',
    success: 'We found your policy details!',
    partial: 'We got some details. We may need a few more.',
    fail: "We couldn't read everything clearly. We can still help — just answer a few quick questions.",
    continueBtn: 'Continue',
    skipBtn: 'Skip and answer manually',
    secure: 'Your documents are encrypted and stored securely.',
    filesLabel: 'files uploaded',
    remove: 'Remove',
  };

  const handleCamera = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isEs ? 'Permiso necesario' : 'Permission needed',
          isEs ? 'Se necesita acceso a la cámara' : 'Camera access is required'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setFiles(prev => [...prev, { uri: asset.uri, name: asset.fileName || 'photo.jpg' }]);
        simulateProcessing();
      }
    } catch (err) {
      console.log('[UploadPolicy] Camera error:', err);
    }
  }, [isEs]);

  const handleGallery = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newFiles = result.assets.map(a => ({
          uri: a.uri,
          name: a.fileName || 'image.jpg',
        }));
        setFiles(prev => [...prev, ...newFiles]);
        simulateProcessing();
      }
    } catch (err) {
      console.log('[UploadPolicy] Gallery error:', err);
    }
  }, []);

  const handleFiles = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const DocumentPicker = await import('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        multiple: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newFiles = result.assets.map(a => ({
          uri: a.uri,
          name: a.name || 'document',
        }));
        setFiles(prev => [...prev, ...newFiles]);
        simulateProcessing();
      }
    } catch (err) {
      console.log('[UploadPolicy] Document picker error:', err);
    }
  }, []);

  const simulateProcessing = useCallback(() => {
    setState('processing');
    setTimeout(() => {
      const random = Math.random();
      if (random > 0.3) {
        setState('success');
      } else if (random > 0.1) {
        setState('partial');
      } else {
        setState('failed');
      }
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }, 2500);
  }, []);

  const handleContinue = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/quote-form' as any);
  }, [router]);

  const handleSkip = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    router.push('/quote-form' as any);
  }, [router]);

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length <= 1) {
      setState('idle');
    }
  }, [files.length]);

  const isProcessing = state === 'processing';
  const hasResult = state === 'success' || state === 'partial' || state === 'failed';

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: t.title,
          headerBackTitle: isEs ? 'Atrás' : 'Back',
          headerStyle: { backgroundColor: SAVER.bg },
          headerTintColor: SAVER.text,
          headerTitleStyle: { fontWeight: '700' as const },
        }}
      />
      <LinearGradient colors={['#0A1120', '#0D1A2D', '#0A1120']} style={StyleSheet.absoluteFill} />

      <LoadingOverlay
        visible={isProcessing}
        message={t.processing}
        submessage={t.processingSub}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>{t.subtitle}</Text>

        {files.length > 0 && (
          <View style={styles.filesSection}>
            <Text style={styles.filesCount}>{files.length} {t.filesLabel}</Text>
            {files.map((f, i) => (
              <View key={i} style={styles.fileRow}>
                <FileText size={16} color={SAVER.accent} />
                <Text style={styles.fileName} numberOfLines={1}>{f.name}</Text>
                <Pressable onPress={() => removeFile(i)} hitSlop={8}>
                  <X size={16} color={SAVER.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {!hasResult && (
          <View style={styles.uploadCards}>
            <Pressable
              onPress={handleCamera}
              style={({ pressed }) => [styles.uploadCard, pressed && { opacity: 0.85 }]}
              testID="upload-camera"
            >
              <View style={[styles.uploadIconWrap, { backgroundColor: `${SAVER.accent}18` }]}>
                <Camera size={22} color={SAVER.accent} />
              </View>
              <Text style={styles.uploadCardLabel}>{t.camera}</Text>
              <ChevronRight size={16} color={SAVER.textMuted} />
            </Pressable>

            <Pressable
              onPress={handleGallery}
              style={({ pressed }) => [styles.uploadCard, pressed && { opacity: 0.85 }]}
              testID="upload-gallery"
            >
              <View style={[styles.uploadIconWrap, { backgroundColor: `${SAVER.green}18` }]}>
                <ImageIcon size={22} color={SAVER.green} />
              </View>
              <Text style={styles.uploadCardLabel}>{t.gallery}</Text>
              <ChevronRight size={16} color={SAVER.textMuted} />
            </Pressable>

            <Pressable
              onPress={handleFiles}
              style={({ pressed }) => [styles.uploadCard, pressed && { opacity: 0.85 }]}
              testID="upload-files"
            >
              <View style={[styles.uploadIconWrap, { backgroundColor: `${SAVER.orange}18` }]}>
                <FileText size={22} color={SAVER.orange} />
              </View>
              <Text style={styles.uploadCardLabel}>{t.filesPick}</Text>
              <ChevronRight size={16} color={SAVER.textMuted} />
            </Pressable>
          </View>
        )}

        {hasResult && (
          <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
            {state === 'success' && (
              <>
                <CheckCircle size={32} color={SAVER.green} />
                <Text style={styles.resultTitle}>{t.success}</Text>
              </>
            )}
            {state === 'partial' && (
              <>
                <AlertCircle size={32} color={SAVER.orange} />
                <Text style={styles.resultTitle}>{t.partial}</Text>
              </>
            )}
            {state === 'failed' && (
              <>
                <AlertCircle size={32} color={SAVER.textMuted} />
                <Text style={styles.resultTitle}>{t.fail}</Text>
              </>
            )}

            <Pressable
              onPress={handleContinue}
              style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.9 }]}
            >
              <LinearGradient
                colors={[SAVER.accent, SAVER.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueBtnGradient}
              >
                <Text style={styles.continueBtnText}>{t.continueBtn}</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {!hasResult && (
          <View style={styles.helperCard}>
            <FileText size={18} color={SAVER.accent} />
            <View style={styles.helperTextWrap}>
              <Text style={styles.helperTitle}>{t.whatTitle}</Text>
              <Text style={styles.helperDesc}>{t.whatDesc}</Text>
            </View>
          </View>
        )}

        <Pressable
          onPress={handleSkip}
          style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.skipBtnText}>{t.skipBtn}</Text>
        </Pressable>

        <View style={styles.secureRow}>
          <Lock size={12} color={SAVER.textMuted} />
          <Text style={styles.secureText}>{t.secure}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SAVER.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  subtitle: {
    fontSize: 15,
    color: SAVER.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  filesSection: {
    marginBottom: 20,
  },
  filesCount: {
    fontSize: 12,
    color: SAVER.textMuted,
    fontWeight: '600' as const,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: SAVER.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  fileName: {
    flex: 1,
    fontSize: 13,
    color: SAVER.text,
  },
  uploadCards: {
    gap: 10,
    marginBottom: 24,
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: SAVER.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  uploadIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadCardLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: SAVER.text,
  },
  resultCard: {
    alignItems: 'center',
    backgroundColor: SAVER.surface,
    borderRadius: 18,
    padding: 28,
    gap: 16,
    borderWidth: 1,
    borderColor: SAVER.border,
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: SAVER.text,
    textAlign: 'center',
    lineHeight: 23,
  },
  continueBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 4,
  },
  continueBtnGradient: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  helperCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: SAVER.accentLight,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.15)',
  },
  helperTextWrap: {
    flex: 1,
  },
  helperTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: SAVER.text,
    marginBottom: 4,
  },
  helperDesc: {
    fontSize: 13,
    color: SAVER.textSecondary,
    lineHeight: 19,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 16,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: SAVER.textMuted,
    textDecorationLine: 'underline' as const,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: {
    fontSize: 12,
    color: SAVER.textMuted,
  },
});
