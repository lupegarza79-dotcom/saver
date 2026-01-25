import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Animated,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import {
  Video,
  ChevronLeft,
  Camera,
  MapPin,
  Check,
  X,
  Circle,
  Car,
  Gauge,
  RotateCcw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { VideoEvidence, VideoEvidenceType } from '@/types';

const MAX_DURATION = 60;
const MAX_WIDTH = 600;

type WizardStep = 'intro' | 'permissions' | 'capture' | 'review';

export default function EvidenceWizardScreen() {
  const router = useRouter();
  const { policyId, caseId, type } = useLocalSearchParams<{
    policyId?: string;
    caseId?: string;
    type?: VideoEvidenceType;
  }>();
  const { t, addVideoEvidence } = useApp();
  const { width: windowWidth } = useWindowDimensions();

  const isWeb = Platform.OS === 'web';
  const isWideScreen = windowWidth > 768;

  const [step, setStep] = useState<WizardStep>('intro');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [, setLocationPermission] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [facing, setFacing] = useState<'back' | 'front'>('back');

  const cameraRef = useRef<CameraView>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopRecordingRef = useRef<() => void>(() => {});
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const evidenceType = type || 'pre_inspection';

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const cameraResult = await requestCameraPermission();
    
    if (Platform.OS !== 'web') {
      const locationResult = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(locationResult.status === 'granted');
      
      if (locationResult.status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        } catch (e) {
          console.log('Could not get location:', e);
        }
      }
    }

    if (cameraResult.granted) {
      setStep('capture');
    } else {
      Alert.alert('Camera Required', 'Camera access is required to record video evidence.');
    }
  };

  const skipPermissions = () => {
    if (cameraPermission?.granted) {
      setStep('capture');
    } else {
      Alert.alert('Camera Required', 'Camera access is required to record video evidence.');
    }
  };

  const startRecording = useCallback(async () => {
    if (!cameraRef.current || isRecording) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    setIsRecording(true);
    setRecordingTime(0);

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: 1,
      duration: MAX_DURATION * 1000,
      useNativeDriver: false,
    }).start();

    recordingTimerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= MAX_DURATION - 1) {
          stopRecordingRef.current();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({
        maxDuration: MAX_DURATION,
      });
      if (video?.uri) {
        setVideoUri(video.uri);
        setStep('review');
      }
    } catch (e) {
      console.log('Recording error:', e);
      setIsRecording(false);
    }
  }, [isRecording, progressAnim, scaleAnim, glowAnim]);

  const stopRecording = useCallback(async () => {
    if (!cameraRef.current || !isRecording) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    progressAnim.stopAnimation();
    progressAnim.setValue(0);

    setIsRecording(false);

    try {
      await cameraRef.current.stopRecording();
    } catch (e) {
      console.log('Stop recording error:', e);
    }
  }, [isRecording, progressAnim, scaleAnim, glowAnim]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  }, [stopRecording]);

  const handleRerecord = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setVideoUri(null);
    setRecordingTime(0);
    progressAnim.setValue(0);
    setStep('capture');
  };

  const handleSave = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const evidence: VideoEvidence = {
      id: `ev_${Date.now()}`,
      userId: 'current_user',
      policyId: policyId || undefined,
      caseId: caseId || undefined,
      type: evidenceType,
      videoUrl: videoUri || '',
      capturedAt: new Date().toISOString(),
      durationSeconds: recordingTime,
      gpsLat: location?.lat,
      gpsLng: location?.lng,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (addVideoEvidence) {
      addVideoEvidence(evidence);
    }

    const successMessage = evidenceType === 'pre_inspection'
      ? (t.policy?.vehicleEvidenceSaved || 'Vehicle video saved to your policy.')
      : (t.evidence?.evidenceAttached || 'Evidence video attached to your incident.');

    Alert.alert('Saved', successMessage, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleCancel = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRecording();
      },
      onPanResponderRelease: () => {
        stopRecording();
      },
      onPanResponderTerminate: () => {
        stopRecording();
      },
    })
  ).current;

  const hints = [
    { icon: Car, text: t.evidence?.wizardIntroHint1 || 'Front and license plate' },
    { icon: RotateCcw, text: t.evidence?.wizardIntroHint2 || 'Left and right sides' },
    { icon: Car, text: t.evidence?.wizardIntroHint3 || 'Back of the car' },
    { icon: Gauge, text: t.evidence?.wizardIntroHint4 || 'Dashboard and odometer' },
  ];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const renderIntroStep = () => (
    <View style={[styles.stepContainer, isWeb && styles.webStepContainer]}>
      <View style={[styles.contentCard, isWideScreen && styles.contentCardWide]}>
        <View style={styles.cardBorder} />
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[Colors.secondary, Colors.info]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Video size={40} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.stepTitle}>
          {t.evidence?.wizardTitle || 'Quick vehicle video'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {t.evidence?.wizardIntroBody || "We'll guide you through a short 30–60s video to document your vehicle."}
        </Text>

        <View style={styles.hintsContainer}>
          {hints.map((hint, index) => {
            const Icon = hint.icon;
            return (
              <View key={index} style={styles.hintRow}>
                <View style={styles.hintIcon}>
                  <Icon size={18} color={Colors.secondary} />
                </View>
                <Text style={styles.hintText}>{hint.text}</Text>
              </View>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setStep('permissions')}
        >
          <LinearGradient
            colors={[Colors.secondary, Colors.info]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>
              {t.evidence?.wizardContinue || 'Continue'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPermissionsStep = () => (
    <View style={[styles.stepContainer, isWeb && styles.webStepContainer]}>
      <View style={[styles.contentCard, isWideScreen && styles.contentCardWide]}>
        <View style={styles.cardBorder} />
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <Camera size={40} color="#FFFFFF" />
          </LinearGradient>
        </View>

        <Text style={styles.stepTitle}>
          {t.evidence?.permissionsTitle || 'Camera and location'}
        </Text>
        <Text style={styles.stepSubtitle}>
          {t.evidence?.permissionsBody || "We'll use your camera (and optionally your location) only for this video."}
        </Text>

        <View style={styles.permissionsList}>
          <View style={styles.permissionItem}>
            <Camera size={20} color={Colors.secondary} />
            <Text style={styles.permissionText}>Camera access (required)</Text>
          </View>
          <View style={styles.permissionItem}>
            <MapPin size={20} color={Colors.textSecondary} />
            <Text style={styles.permissionTextOptional}>Location (optional)</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={requestPermissions}
        >
          <LinearGradient
            colors={[Colors.secondary, Colors.info]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Text style={styles.primaryButtonText}>
              {t.evidence?.permissionsAllow || 'Allow'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={skipPermissions}>
          <Text style={styles.secondaryButtonText}>
            {t.evidence?.permissionsSkip || 'Not now'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCaptureStep = () => (
    <View style={styles.captureContainer}>
      {cameraPermission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="video"
        >
          <SafeAreaView edges={['top']} style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraBackButton}
                onPress={handleCancel}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.timerContainer}>
                <View style={[styles.recordingDot, isRecording && styles.recordingDotActive]} />
                <Text style={styles.timerText}>
                  {formatTime(recordingTime)} / {formatTime(MAX_DURATION)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => setFacing(f => f === 'back' ? 'front' : 'back')}
              >
                <RotateCcw size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </SafeAreaView>

          <View style={styles.captureHintContainer}>
            <Text style={styles.captureTitle}>
              {t.evidence?.captureTitle || 'Hold to record'}
            </Text>
            <Text style={styles.captureSubtitle}>
              {t.evidence?.captureSubtitle || 'Walk around the vehicle while recording.'}
            </Text>
          </View>

          <SafeAreaView edges={['bottom']} style={styles.cameraControls}>
            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>

            <View style={styles.recordButtonContainer}>
              <Animated.View
                style={[
                  styles.recordButtonGlow,
                  { opacity: glowOpacity },
                ]}
              />
              <Animated.View
                style={[
                  styles.recordButton,
                  { transform: [{ scale: scaleAnim }] },
                ]}
                {...panResponder.panHandlers}
              >
                <View style={[styles.recordButtonInner, isRecording && styles.recordButtonInnerActive]}>
                  {isRecording ? (
                    <View style={styles.recordingSquare} />
                  ) : (
                    <Circle size={32} color="#FFFFFF" fill="#FFFFFF" />
                  )}
                </View>
              </Animated.View>
            </View>

            <Text style={styles.captureHint}>
              {t.evidence?.captureHint || 'Hold to record • Release to stop'}
            </Text>
          </SafeAreaView>
        </CameraView>
      ) : (
        <View style={styles.noCameraContainer}>
          <AlertCircle size={48} color={Colors.warning} />
          <Text style={styles.noCameraText}>Camera not available</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
            <Text style={styles.secondaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderReviewStep = () => (
    <View style={[styles.stepContainer, isWeb && styles.webStepContainer]}>
      <View style={[styles.contentCard, isWideScreen && styles.contentCardWide]}>
        <View style={styles.cardBorder} />

        <Text style={styles.stepTitle}>
          {t.evidence?.reviewTitle || 'Review your video'}
        </Text>

        <View style={styles.videoPreviewContainer}>
          <LinearGradient
            colors={[Colors.surface, Colors.surfaceLight]}
            style={styles.videoPreview}
          >
            <View style={styles.playIconContainer}>
              <Video size={48} color={Colors.secondary} />
            </View>
            <Text style={styles.durationText}>{formatTime(recordingTime)}</Text>
          </LinearGradient>
        </View>

        <View style={styles.reviewInfo}>
          <View style={styles.reviewInfoRow}>
            {location ? (
              <>
                <CheckCircle size={18} color={Colors.success} />
                <Text style={styles.reviewInfoTextSuccess}>
                  {t.evidence?.reviewLocationYes || 'Location captured'}
                </Text>
              </>
            ) : (
              <>
                <AlertCircle size={18} color={Colors.textSecondary} />
                <Text style={styles.reviewInfoText}>
                  {t.evidence?.reviewLocationNo || 'Location not available'}
                </Text>
              </>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
          <LinearGradient
            colors={[Colors.secondary, Colors.info]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <Check size={20} color={Colors.textInverse} />
            <Text style={styles.primaryButtonText}>
              {t.evidence?.reviewSave || 'Save video'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.reviewActionButton} onPress={handleRerecord}>
            <RotateCcw size={18} color={Colors.secondary} />
            <Text style={styles.reviewActionText}>
              {t.evidence?.reviewRerecord || 'Re-record'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reviewActionButton} onPress={handleCancel}>
            <X size={18} color={Colors.textSecondary} />
            <Text style={styles.reviewActionTextMuted}>
              {t.evidence?.reviewCancel || 'Cancel'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.backgroundGlow} />
      <View style={styles.backgroundGlow2} />

      {step !== 'capture' && (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
          <View style={[styles.header, isWeb && styles.webHeader]}>
            <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
              <ChevronLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {evidenceType === 'pre_inspection' ? 'Vehicle Evidence' : 'Incident Evidence'}
            </Text>
            <View style={styles.headerSpacer} />
          </View>
        </SafeAreaView>
      )}

      {step === 'intro' && renderIntroStep()}
      {step === 'permissions' && renderPermissionsStep()}
      {step === 'capture' && renderCaptureStep()}
      {step === 'review' && renderReviewStep()}
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
    top: -100,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: Colors.secondary,
    opacity: 0.04,
  },
  backgroundGlow2: {
    position: 'absolute',
    bottom: 100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.accentPurple,
    opacity: 0.03,
  },
  safeArea: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  webHeader: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSpacer: {
    width: 44,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  webStepContainer: {
    alignItems: 'center',
  },
  contentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    position: 'relative',
    overflow: 'hidden',
  },
  contentCardWide: {
    maxWidth: 480,
    width: '100%',
  },
  cardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  hintsContainer: {
    marginBottom: 28,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 14,
    marginBottom: 10,
  },
  hintIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.secondary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.textInverse,
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  permissionsList: {
    marginBottom: 28,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  permissionText: {
    fontSize: 15,
    color: Colors.text,
  },
  permissionTextOptional: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  captureContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cameraBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textSecondary,
  },
  recordingDotActive: {
    backgroundColor: Colors.danger,
  },
  timerText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureHintContainer: {
    position: 'absolute',
    top: '35%',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  captureTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  captureSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
  },
  progressBarContainer: {
    width: '80%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 30,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.secondary,
    borderRadius: 2,
  },
  recordButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  recordButtonGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.danger,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonInnerActive: {
    backgroundColor: Colors.danger,
  },
  recordingSquare: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  captureHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  noCameraContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 16,
  },
  noCameraText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  videoPreviewContainer: {
    marginBottom: 24,
  },
  videoPreview: {
    height: 200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  durationText: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  reviewInfo: {
    marginBottom: 24,
  },
  reviewInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 12,
  },
  reviewInfoTextSuccess: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500' as const,
  },
  reviewInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  reviewActionText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.secondary,
  },
  reviewActionTextMuted: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
