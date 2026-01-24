import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  Send,
  Camera,
  Image as ImageIcon,
  FileText,
  Mic,
  StopCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { Audio } from 'expo-av';

import {
  validateVin,
  validateDob,
} from '@/utils/quoteReadiness';



const CHAT_COLORS = {
  background: '#FFFFFF',
  botBubble: '#F2F3F5',
  userBubble: '#007AFF',
  botText: '#000000',
  userText: '#FFFFFF',
  inputBg: '#F2F3F5',
  inputBorder: '#E5E5EA',
  placeholder: '#8E8E93',
  sendButton: '#007AFF',
  sendButtonDisabled: '#C7C7CC',
  timestamp: '#8E8E93',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
  isTyping?: boolean;
}

function MessageBubble({ role, content, isLoading, isTyping }: MessageBubbleProps) {
  const isUser = role === 'user';
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isTyping || isLoading) {
      const animate = (anim: Animated.Value, delay: number) => {
        Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ])
        ).start();
      };
      animate(dotAnim1, 0);
      animate(dotAnim2, 150);
      animate(dotAnim3, 300);
    }
  }, [isTyping, isLoading, dotAnim1, dotAnim2, dotAnim3]);

  if (isTyping || isLoading) {
    return (
      <View style={[styles.bubbleRow, styles.bubbleRowBot]}>
        <View style={[styles.bubble, styles.botBubble]}>
          <View style={styles.typingContainer}>
            {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.typingDot,
                  { opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowBot]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.botText]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

interface AttachmentButtonProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}

function AttachmentButton({ icon, label, onPress }: AttachmentButtonProps) {
  return (
    <TouchableOpacity style={styles.attachButton} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.attachIconContainer}>{icon}</View>
      <Text style={styles.attachLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const QUICK_REPLIES: Record<string, { en: string[]; es: string[] }> = {
  initial: {
    en: ['Upload policy', 'Enter VIN'],
    es: ['Subir póliza', 'Poner VIN'],
  },
  consent: {
    en: ['I agree'],
    es: ['Acepto'],
  },
  vehicleCount: {
    en: ['1', '2', '3+'],
    es: ['1', '2', '3+'],
  },
  coverageType: {
    en: ['Minimum (30/60/25)', 'Full Coverage'],
    es: ['Mínimo (30/60/25)', 'Full Coverage'],
  },
  collisionDeductible: {
    en: ['$500', '$1000'],
    es: ['$500', '$1000'],
  },
  compDeductible: {
    en: ['$250', '$500', '$1000'],
    es: ['$250', '$500', '$1000'],
  },
};

type FlowStep =
  | 'initial'
  | 'awaiting_upload_or_vin'
  | 'awaiting_upload'
  | 'awaiting_vin'
  | 'awaiting_phone'
  | 'awaiting_email'
  | 'awaiting_dob'
  | 'awaiting_zip'
  | 'awaiting_coverage_type'
  | 'awaiting_collision_deductible'
  | 'awaiting_comp_deductible'
  | 'awaiting_consent'
  | 'complete';

export default function AIAssistantScreen() {
  const { policies, language, pendingIntake, updatePendingIntakeField, clearPendingIntake, setConsentGiven } = useApp();
  useLocalSearchParams<{ leadId?: string; intakeStatus?: string; mode?: string }>();
  const router = useRouter();
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isTypingIndicator, setIsTypingIndicator] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [flowStep, setFlowStep] = useState<FlowStep>('initial');

  const collectedDataRef = useRef<Record<string, unknown>>({});

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessingField, setIsProcessingField] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  const webCameraInputRef = useRef<HTMLInputElement | null>(null);



  const t = useCallback((en: string, es: string) => language === 'es' ? es : en, [language]);

  const completeFlowRef = useRef<() => void>(() => { });

  const addBotMessage = useCallback((text: string, delay = 0) => {
    if (delay > 0) {
      setIsTypingIndicator(true);
      setTimeout(() => {
        setIsTypingIndicator(false);
        setMessages(prev => [...prev, {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          text,
        }]);
      }, delay);
    } else {
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        text,
      }]);
    }
  }, []);

  const addUserMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
    }]);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      const hasExistingPolicy = policies.length > 0 && policies.some(p => p.vehicles?.length > 0);

      const greeting = t(
        'Hi 👋\nI\'m Saver. I\'ll help you get a real auto insurance quote and find savings.\nIt takes about 2 minutes.',
        'Hola 👋\nSoy Saver. Te ayudo a cotizar tu seguro de auto y buscar ahorro.\nSolo toma unos 2 minutos.'
      );

      addBotMessage(greeting);

      setTimeout(() => {
        if (hasExistingPolicy) {
          setFlowStep('awaiting_phone');
          addBotMessage(t(
            'What\'s your phone number?',
            '¿Cuál es tu número de teléfono?'
          ), 1200);
        } else {
          setFlowStep('awaiting_upload_or_vin');
          addBotMessage(t(
            'Do you want to upload your policy (Declarations Page) or enter your VIN?',
            '¿Prefieres subir tu póliza (Declaration Page) o escribir tu VIN?'
          ), 1200);
        }
      }, 100);
    }
  }, [messages.length, language, addBotMessage, policies, t]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTypingIndicator]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const startRecording = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t('Permission needed', 'Permiso requerido'),
          t('Microphone access is required', 'Se necesita acceso al micrófono')
        );
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setIsRecording(true);
    } catch (error) {
      console.error('[VOICE] Failed to start recording:', error);
    }
  }, [t]);

  const stopRecording = useCallback(async () => {
    try {
      if (!recordingRef.current) return;

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      setIsRecording(false);
      setIsTranscribing(true);

      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setIsTranscribing(false);
        return;
      }

      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1];

      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('audio', blob, `recording.${fileType}`);
      } else {
        formData.append('audio', { uri, name: `recording.${fileType}`, type: `audio/${fileType}` } as any);
      }

      formData.append('language', language === 'es' ? 'es' : 'en');

      const sttResponse = await fetch('https://toolkit.rork.com/stt/transcribe/', {
        method: 'POST',
        body: formData,
      });

      if (sttResponse.ok) {
        const result = await sttResponse.json();
        if (result.text?.trim()) {
          setInput(result.text.trim());
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    } catch (error) {
      console.error('[VOICE] Failed to transcribe:', error);
    } finally {
      setIsTranscribing(false);
    }
  }, [language]);

  const processUserInput = useCallback(async (userInput: string) => {
    const trimmedInput = userInput.trim().toLowerCase();
    setIsProcessingField(true);

    try {
      switch (flowStep) {
        case 'awaiting_upload_or_vin': {
          if (trimmedInput.includes('upload') || trimmedInput.includes('subir') || trimmedInput.includes('póliza') || trimmedInput.includes('policy')) {
            setFlowStep('awaiting_upload');
            setShowAttachments(true);
            addBotMessage(t(
              'Great. Please upload a photo or PDF of your Declarations Page.',
              'Perfecto. Sube una foto o PDF de tu Declaration Page.'
            ), 500);
          } else if (trimmedInput.includes('vin') || trimmedInput.length === 17) {
            if (trimmedInput.length === 17 || trimmedInput.replace(/[^a-z0-9]/gi, '').length === 17) {
              const vinResult = validateVin(userInput);
              if (vinResult.valid) {
                collectedDataRef.current = { ...collectedDataRef.current, vin: userInput.toUpperCase() };
                setFlowStep('awaiting_phone');
                addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
                setTimeout(() => {
                  addBotMessage(t(
                    'What\'s your phone number?',
                    '¿Cuál es tu número de teléfono?'
                  ), 800);
                }, 500);
              } else {
                addBotMessage(t(
                  'That doesn\'t look like a valid VIN. Please enter your 17-character VIN.',
                  'Ese VIN no parece válido. Por favor ingresa tu VIN de 17 caracteres.'
                ), 500);
              }
            } else {
              setFlowStep('awaiting_vin');
              addBotMessage(t(
                'Please enter your VIN (17 characters).',
                'Por favor escribe tu VIN (17 caracteres).'
              ), 500);
            }
          } else {
            setShowAttachments(false);
            addBotMessage(t(
              'Please choose: "Upload policy" or "Enter VIN"',
              'Por favor elige: "Subir póliza" o "Poner VIN"'
            ), 500);
          }
          break;
        }

        case 'awaiting_upload': {
          if (trimmedInput.includes('vin')) {
            setShowAttachments(false);
            setFlowStep('awaiting_vin');
            addBotMessage(t(
              'Please enter your VIN (17 characters).',
              'Por favor escribe tu VIN (17 caracteres).'
            ), 500);
          } else {
            setShowAttachments(true);
            addBotMessage(t(
              'Please use the buttons below to upload your policy.',
              'Por favor usa los botones de abajo para subir tu póliza.'
            ), 500);
          }
          break;
        }

        case 'awaiting_vin': {
          if (trimmedInput.includes('upload') || trimmedInput.includes('subir') || trimmedInput.includes('póliza') || trimmedInput.includes('policy') || trimmedInput.includes('have policy') || trimmedInput.includes('tengo póliza')) {
            setFlowStep('awaiting_upload');
            setShowAttachments(true);
            addBotMessage(t(
              'Great. Please upload a photo or PDF of your Declarations Page.',
              'Perfecto. Sube una foto o PDF de tu Declaration Page.'
            ), 500);
            break;
          }

          const cleanVin = userInput.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
          const vinResult = validateVin(cleanVin);
          if (vinResult.valid) {
            collectedDataRef.current = { ...collectedDataRef.current, vin: cleanVin };
            setFlowStep('awaiting_phone');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'What\'s your phone number?',
                '¿Cuál es tu número de teléfono?'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'That doesn\'t look like a valid VIN. Please enter your 17-character VIN, or say "upload policy" to upload instead.',
              'Ese VIN no parece válido. Ingresa tu VIN de 17 caracteres, o di "subir póliza" para subir tu documento.'
            ), 500);
          }
          break;
        }

        case 'awaiting_phone': {
          const phoneClean = userInput.replace(/[^0-9]/g, '');
          if (phoneClean.length >= 10) {
            collectedDataRef.current = { ...collectedDataRef.current, phone: userInput };
            if (pendingIntake) {
              await updatePendingIntakeField('phone', userInput);
            }
            setFlowStep('awaiting_email');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'Now, what\'s your email?',
                'Ahora, ¿cuál es tu correo electrónico?'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'Please enter a valid phone number.',
              'Por favor ingresa un número de teléfono válido.'
            ), 500);
          }
          break;
        }

        case 'awaiting_email': {
          if (userInput.includes('@') && userInput.includes('.')) {
            collectedDataRef.current = { ...collectedDataRef.current, email: userInput };
            if (pendingIntake) {
              await updatePendingIntakeField('email', userInput);
            }
            setFlowStep('awaiting_dob');
            addBotMessage(t('Perfect.', 'Perfecto.'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'What\'s your date of birth?\n(MM/DD/YYYY)',
                '¿Cuál es tu fecha de nacimiento?\n(MM/DD/YYYY)'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'Please enter a valid email address.',
              'Por favor ingresa un correo electrónico válido.'
            ), 500);
          }
          break;
        }

        case 'awaiting_dob': {
          const dobResult = validateDob(userInput);
          if (dobResult.valid) {
            collectedDataRef.current = { ...collectedDataRef.current, dob: dobResult.parsed || userInput };
            if (pendingIntake) {
              await updatePendingIntakeField('drivers[0].dob', dobResult.parsed || userInput);
            }
            setFlowStep('awaiting_zip');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'What\'s your ZIP code?',
                '¿Cuál es tu código postal?'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'Please enter a valid date (MM/DD/YYYY).',
              'Por favor ingresa una fecha válida (MM/DD/YYYY).'
            ), 500);
          }
          break;
        }

        case 'awaiting_zip': {
          const zipClean = userInput.replace(/[^0-9]/g, '');
          if (zipClean.length === 5) {
            collectedDataRef.current = { ...collectedDataRef.current, zip: zipClean };
            if (pendingIntake) {
              await updatePendingIntakeField('garagingAddress.zip', zipClean);
            }
            setFlowStep('awaiting_coverage_type');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'Do you want minimum liability or full coverage?',
                '¿Quieres cobertura mínima o full coverage?'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'Please enter a valid 5-digit ZIP code.',
              'Por favor ingresa un código postal válido de 5 dígitos.'
            ), 500);
          }
          break;
        }

        case 'awaiting_coverage_type': {
          if (trimmedInput.includes('min') || trimmedInput.includes('basic') || trimmedInput.includes('30/60') || trimmedInput.includes('mínimo') || trimmedInput.includes('mínima')) {
            collectedDataRef.current = { ...collectedDataRef.current, coverageType: 'minimum' };
            if (pendingIntake) {
              await updatePendingIntakeField('coverageType', 'minimum');
            }
            setFlowStep('awaiting_consent');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'By continuing, you agree that Saver and its partner agents may review your policy to look for savings. We will only share your info with agents you select.\n\nReply "I agree" to continue.',
                'Al continuar, aceptas que Saver y sus agentes asociados revisen tu póliza para buscar ahorros. Solo compartiremos tu información con los agentes que selecciones.\n\nResponde "Acepto" para continuar.'
              ), 800);
            }, 500);
          } else if (trimmedInput.includes('full') || trimmedInput.includes('complet') || trimmedInput.includes('collision')) {
            collectedDataRef.current = { ...collectedDataRef.current, coverageType: 'full' };
            if (pendingIntake) {
              await updatePendingIntakeField('coverageType', 'full');
            }
            setFlowStep('awaiting_collision_deductible');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'Choose your collision deductible:',
                'Elige tu deducible de colisión:'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'Please choose: Minimum (30/60/25) or Full Coverage',
              'Por favor elige: Mínimo (30/60/25) o Full Coverage'
            ), 500);
          }
          break;
        }

        case 'awaiting_collision_deductible': {
          const num = parseInt(userInput.replace(/[^0-9]/g, ''));
          if (!isNaN(num) && [250, 500, 1000, 2500].includes(num)) {
            collectedDataRef.current = { ...collectedDataRef.current, collisionDeductible: num };
            if (pendingIntake) {
              await updatePendingIntakeField('collisionDeductible', num);
            }
            setFlowStep('awaiting_comp_deductible');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'Choose your comprehensive deductible:',
                'Elige tu deducible comprehensivo:'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'Please choose: $250, $500, $1000, or $2500',
              'Por favor elige: $250, $500, $1000 o $2500'
            ), 500);
          }
          break;
        }

        case 'awaiting_comp_deductible': {
          const num = parseInt(userInput.replace(/[^0-9]/g, ''));
          if (!isNaN(num) && [250, 500, 1000, 2500].includes(num)) {
            collectedDataRef.current = { ...collectedDataRef.current, compDeductible: num };
            if (pendingIntake) {
              await updatePendingIntakeField('compDeductible', num);
            }
            setFlowStep('awaiting_consent');
            addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
            setTimeout(() => {
              addBotMessage(t(
                'By continuing, you agree that Saver and its partner agents may review your policy to look for savings. We will only share your info with agents you select.\n\nReply "I agree" to continue.',
                'Al continuar, aceptas que Saver y sus agentes asociados revisen tu póliza para buscar ahorros. Solo compartiremos tu información con los agentes que selecciones.\n\nResponde "Acepto" para continuar.'
              ), 800);
            }, 500);
          } else {
            addBotMessage(t(
              'Please choose: $250, $500, $1000, or $2500',
              'Por favor elige: $250, $500, $1000 o $2500'
            ), 500);
          }
          break;
        }

        case 'awaiting_consent': {
          if (trimmedInput.includes('agree') || trimmedInput.includes('acepto') || trimmedInput.includes('yes') || trimmedInput.includes('sí') || trimmedInput.includes('si')) {
            setConsentGiven(true);
            setFlowStep('complete');
            completeFlowRef.current();
          } else {
            addBotMessage(t(
              'Please reply "I agree" to continue, or "no" to cancel.',
              'Por favor responde "Acepto" para continuar, o "no" para cancelar.'
            ), 500);
          }
          break;
        }

        case 'complete': {
          addBotMessage(t(
            'We\'re already working on your quotes! We\'ll message you here when ready.',
            'Ya estamos trabajando en tus cotizaciones. Te avisamos aquí cuando estén listas.'
          ), 500);
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('[ASSISTANT] Processing error:', error);
      addBotMessage(t(
        'Sorry, something went wrong. Please try again.',
        'Lo siento, algo salió mal. Por favor intenta de nuevo.'
      ), 500);
    } finally {
      setIsProcessingField(false);
    }
  }, [flowStep, pendingIntake, updatePendingIntakeField, addBotMessage, t, setConsentGiven]);

  useEffect(() => {
    completeFlowRef.current = () => {
      addBotMessage(t('Got it 👍', 'Perfecto 👍'), 300);
      setTimeout(() => {
        addBotMessage(t(
          'All set ✅\nI\'ll prepare your real quotes and message you here.\nNo spam. No calls.',
          'Listo ✅\nVoy a preparar tus cotizaciones y te aviso aquí.\nSin spam. Sin llamadas.'
        ), 1000);
      }, 500);

      setTimeout(() => {
        if (pendingIntake) {
          clearPendingIntake();
        }
        router.push('/quote-submitted');
      }, 3000);
    };
  }, [addBotMessage, t, pendingIntake, clearPendingIntake, router]);

  const handleSend = useCallback(async () => {
    if (!input.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    addUserMessage(input);
    const userInput = input;
    setInput('');
    setShowAttachments(false);

    await processUserInput(userInput);
  }, [input, addUserMessage, processUserInput]);

  const handleQuickReply = useCallback((reply: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const lowerReply = reply.toLowerCase();
    if (lowerReply.includes('upload') || lowerReply.includes('subir')) {
      addUserMessage(reply);
      setFlowStep('awaiting_upload');
      setShowAttachments(true);
      addBotMessage(
        language === 'es'
          ? 'Perfecto. Sube una foto o PDF de tu Declaration Page.'
          : 'Great. Please upload a photo or PDF of your Declarations Page.',
        500
      );
      return;
    }

    setInput(reply);
    setTimeout(() => {
      addUserMessage(reply);
      setInput('');
      processUserInput(reply);
    }, 100);
  }, [addUserMessage, processUserInput, addBotMessage, language]);

  const handleUploadSuccess = useCallback(() => {
    setShowAttachments(false);
    collectedDataRef.current = { ...collectedDataRef.current, hasUploadedPolicy: true };

    addBotMessage(t(
      'Got it ✅ I received your document.',
      'Listo ✅ Ya recibí tu documento.'
    ), 500);

    setTimeout(() => {
      setFlowStep('awaiting_phone');
      addBotMessage(t(
        'What\'s your phone number?',
        '¿Cuál es tu número de teléfono?'
      ), 1000);
    }, 800);
  }, [addBotMessage, t]);

  const handleWebFileSelect = useCallback((file: File) => {
    console.log('[AI_ASSISTANT] Web file selected:', file.name, file.type);
    if (Platform.OS !== 'web') return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAttachments(false);

    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (isImage || isPdf) {
      addUserMessage(t(
        isPdf ? '📎 Uploaded: ' + file.name : '📎 Uploaded photo',
        isPdf ? '📎 Subido: ' + file.name : '📎 Foto subida'
      ));
      handleUploadSuccess();
    } else {
      Alert.alert(
        t('Invalid file', 'Archivo inválido'),
        t('Please upload an image or PDF', 'Por favor sube una imagen o PDF')
      );
    }
  }, [t, addUserMessage, handleUploadSuccess]);

  const triggerWebFilePicker = useCallback((type: 'camera' | 'library' | 'files') => {
    if (Platform.OS !== 'web') return;
    console.log('[AI_ASSISTANT] Triggering web file picker, type:', type);

    // Always create a fresh input element for iOS Safari compatibility
    // iOS Safari blocks programmatic clicks on hidden/reused inputs
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = type === 'files' ? 'image/*,application/pdf' : 'image/*';
    if (type === 'camera') {
      tempInput.setAttribute('capture', 'environment');
    }
    // Use offscreen positioning instead of display:none (iOS blocks display:none clicks)
    tempInput.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;';
    
    tempInput.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        console.log('[AI_ASSISTANT] File selected:', file.name);
        handleWebFileSelect(file);
      }
      // Clean up after a delay
      setTimeout(() => {
        if (document.body.contains(tempInput)) {
          document.body.removeChild(tempInput);
        }
      }, 1000);
    };
    
    document.body.appendChild(tempInput);
    
    // Use setTimeout to ensure DOM is ready before clicking
    setTimeout(() => {
      tempInput.click();
      console.log('[AI_ASSISTANT] Temp file input clicked');
    }, 100);
  }, [handleWebFileSelect]);

  const pickImage = useCallback(async (source: 'camera' | 'library') => {
    console.log('[AI_ASSISTANT] pickImage called, source:', source, 'platform:', Platform.OS);

    if (Platform.OS === 'web') {
      console.log('[AI_ASSISTANT] Web platform - using file input');
      triggerWebFilePicker(source === 'camera' ? 'camera' : 'library');
      setShowAttachments(false);
      return;
    }

    setShowAttachments(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      let result;

      if (source === 'camera') {
        console.log('[AI_ASSISTANT] Requesting camera permission...');
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        console.log('[AI_ASSISTANT] Camera permission:', permission.status);
        if (!permission.granted) {
          Alert.alert(
            t('Permission needed', 'Permiso requerido'),
            t('Camera access is required. Go to Settings > Expo Go > Camera', 'Se necesita acceso a la cámara. Ve a Configuración > Expo Go > Cámara'),
            [{ text: 'OK' }]
          );
          return;
        }
        console.log('[AI_ASSISTANT] Launching camera...');
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      } else {
        console.log('[AI_ASSISTANT] Requesting photo library permission...');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('[AI_ASSISTANT] Library permission:', permission.status);
        if (!permission.granted) {
          Alert.alert(
            t('Permission needed', 'Permiso requerido'),
            t('Photo library access is required. Go to Settings > Expo Go > Photos', 'Se necesita acceso a las fotos. Ve a Configuración > Expo Go > Fotos'),
            [{ text: 'OK' }]
          );
          return;
        }
        console.log('[AI_ASSISTANT] Launching photo library...');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsMultipleSelection: false,
        });
      }

      console.log('[AI_ASSISTANT] Picker result:', result.canceled ? 'canceled' : 'success');

      if (!result.canceled && result.assets.length > 0) {
        console.log('[AI_ASSISTANT] Image picked:', result.assets[0].uri);
        addUserMessage(t('📎 Uploaded photo', '📎 Foto subida'));
        handleUploadSuccess();
      } else {
        console.log('[AI_ASSISTANT] Image picker was canceled');
      }
    } catch (error) {
      console.error('[AI_ASSISTANT] Image picker error:', error);
      Alert.alert(
        t('Error', 'Error'),
        t('Could not open. Please try again.', 'No se pudo abrir. Intenta de nuevo.'),
        [{ text: 'OK' }]
      );
    }
  }, [t, addUserMessage, handleUploadSuccess, triggerWebFilePicker]);

  const pickDocument = useCallback(async () => {
    console.log('[AI_ASSISTANT] pickDocument called, platform:', Platform.OS);

    if (Platform.OS === 'web') {
      console.log('[AI_ASSISTANT] Web platform - using file input for documents');
      triggerWebFilePicker('files');
      setShowAttachments(false);
      return;
    }

    setShowAttachments(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      console.log('[AI_ASSISTANT] Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      console.log('[AI_ASSISTANT] Document picker result:', result.canceled ? 'canceled' : 'success');

      if (!result.canceled && result.assets?.[0]) {
        console.log('[AI_ASSISTANT] Document picked:', result.assets[0].name);
        addUserMessage(t('📎 Uploaded: ', '📎 Subido: ') + result.assets[0].name);
        handleUploadSuccess();
      } else {
        console.log('[AI_ASSISTANT] Document picker was canceled');
      }
    } catch (error) {
      console.error('[AI_ASSISTANT] Document picker error:', error);
      Alert.alert(
        t('Error', 'Error'),
        t('Could not open. Please try again.', 'No se pudo abrir. Intenta de nuevo.'),
        [{ text: 'OK' }]
      );
    }
  }, [t, addUserMessage, handleUploadSuccess, triggerWebFilePicker]);

  const handleAttachmentPress = useCallback((type: 'camera' | 'library' | 'files') => {
    console.log('[AI_ASSISTANT] Attachment pressed:', type);
    if (type === 'camera') {
      pickImage('camera');
    } else if (type === 'library') {
      pickImage('library');
    } else {
      pickDocument();
    }
  }, [pickImage, pickDocument]);

  const currentQuickReplies = useMemo(() => {
    if (flowStep === 'awaiting_upload_or_vin') {
      return QUICK_REPLIES.initial[language] || QUICK_REPLIES.initial.en;
    }
    if (flowStep === 'awaiting_coverage_type') {
      return QUICK_REPLIES.coverageType[language] || QUICK_REPLIES.coverageType.en;
    }
    if (flowStep === 'awaiting_collision_deductible') {
      return QUICK_REPLIES.collisionDeductible[language] || QUICK_REPLIES.collisionDeductible.en;
    }
    if (flowStep === 'awaiting_comp_deductible') {
      return QUICK_REPLIES.compDeductible[language] || QUICK_REPLIES.compDeductible.en;
    }
    if (flowStep === 'awaiting_consent') {
      return QUICK_REPLIES.consent[language] || QUICK_REPLIES.consent.en;
    }
    return null;
  }, [flowStep, language]);

  const progressPercent = useMemo(() => {
    const stepOrder: FlowStep[] = [
      'initial',
      'awaiting_upload_or_vin',
      'awaiting_upload',
      'awaiting_vin',
      'awaiting_phone',
      'awaiting_email',
      'awaiting_dob',
      'awaiting_zip',
      'awaiting_coverage_type',
      'awaiting_collision_deductible',
      'awaiting_comp_deductible',
      'awaiting_consent',
      'complete',
    ];
    const currentIndex = stepOrder.indexOf(flowStep);
    return Math.round((currentIndex / (stepOrder.length - 1)) * 100);
  }, [flowStep]);

  const stepNumber = useMemo(() => {
    const steps: FlowStep[] = [
      'awaiting_upload_or_vin',
      'awaiting_upload',
      'awaiting_vin',
      'awaiting_phone',
      'awaiting_email',
      'awaiting_dob',
      'awaiting_zip',
      'awaiting_coverage_type',
      'awaiting_collision_deductible',
      'awaiting_comp_deductible',
      'awaiting_consent',
      'complete',
    ];
    const idx = steps.indexOf(flowStep);
    return idx >= 0 ? idx + 1 : 1;
  }, [flowStep]);

  const onWebFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleWebFileSelect(file);
      e.target.value = '';
    }
  }, [handleWebFileSelect]);

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && (
        <>
          <input
            ref={webFileInputRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept="image/*,application/pdf"
            onChange={onWebFileChange}
            style={{
              position: 'fixed',
              top: -9999,
              left: -9999,
              width: 1,
              height: 1,
              opacity: 0.01,
              pointerEvents: 'none',
            }}
          />
          <input
            ref={webCameraInputRef as React.RefObject<HTMLInputElement>}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onWebFileChange}
            style={{
              position: 'fixed',
              top: -9999,
              left: -9999,
              width: 1,
              height: 1,
              opacity: 0.01,
              pointerEvents: 'none',
            }}
          />
        </>
      )}
      <Stack.Screen
        options={{
          title: 'Saver',
          headerStyle: { backgroundColor: CHAT_COLORS.background },
          headerTintColor: '#000000',
          headerShadowVisible: false,
        }}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'height' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {flowStep !== 'complete' && (
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressLabel}>
              {t(`Step ${stepNumber} of 11`, `Paso ${stepNumber} de 11`)}
            </Text>
          </View>
        )}

        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              role={message.role}
              content={message.text}
            />
          ))}

          {isTypingIndicator && (
            <MessageBubble role="assistant" content="" isTyping />
          )}

          {currentQuickReplies && !isTypingIndicator && (
            <View style={styles.quickRepliesRow}>
              {currentQuickReplies.map((reply, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.quickReplyButton}
                  onPress={() => handleQuickReply(reply)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickReplyText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {showAttachments && (
          <View style={styles.attachmentsPanel}>
            {Platform.OS !== 'web' && (
              <AttachmentButton
                icon={<Camera size={28} color={CHAT_COLORS.userBubble} />}
                label={t('Take photo', 'Tomar foto')}
                onPress={() => handleAttachmentPress('camera')}
              />
            )}
            <AttachmentButton
              icon={<ImageIcon size={28} color={CHAT_COLORS.userBubble} />}
              label={t('Choose from photos', 'Elegir de fotos')}
              onPress={() => handleAttachmentPress('library')}
            />
            <AttachmentButton
              icon={<FileText size={28} color={CHAT_COLORS.userBubble} />}
              label={t('Upload PDF', 'Subir PDF')}
              onPress={() => handleAttachmentPress('files')}
            />
          </View>
        )}

        <SafeAreaView edges={['bottom']} style={styles.inputWrapper}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              style={styles.attachToggle}
              onPress={() => setShowAttachments(!showAttachments)}
              activeOpacity={0.7}
            >
              <Text style={styles.attachToggleIcon}>+</Text>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder={t('Message', 'Mensaje')}
                placeholderTextColor={CHAT_COLORS.placeholder}
                multiline
                maxLength={500}
                onSubmitEditing={handleSend}
              />
            </View>

            {input.trim() ? (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={handleSend}
                disabled={isProcessingField}
                activeOpacity={0.7}
              >
                {isProcessingField ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={isTranscribing}
                activeOpacity={0.7}
              >
                <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                  {isTranscribing ? (
                    <ActivityIndicator size="small" color={CHAT_COLORS.userBubble} />
                  ) : isRecording ? (
                    <StopCircle size={22} color="#FF3B30" />
                  ) : (
                    <Mic size={22} color={CHAT_COLORS.userBubble} />
                  )}
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CHAT_COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  progressWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: CHAT_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: CHAT_COLORS.inputBorder,
  },
  progressTrack: {
    height: 4,
    backgroundColor: CHAT_COLORS.inputBg,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: CHAT_COLORS.userBubble,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: CHAT_COLORS.placeholder,
    textAlign: 'center',
    marginTop: 6,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  bubbleRow: {
    marginBottom: 8,
    flexDirection: 'row',
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowBot: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: CHAT_COLORS.userBubble,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: CHAT_COLORS.botBubble,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: CHAT_COLORS.userText,
  },
  botText: {
    color: CHAT_COLORS.botText,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: CHAT_COLORS.placeholder,
  },
  quickRepliesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    paddingLeft: 4,
  },
  quickReplyButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: CHAT_COLORS.background,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: CHAT_COLORS.userBubble,
  },
  quickReplyText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: CHAT_COLORS.userBubble,
  },
  attachmentsPanel: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: CHAT_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: CHAT_COLORS.inputBorder,
  },
  attachButton: {
    alignItems: 'center',
    gap: 8,
  },
  attachIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: CHAT_COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachLabel: {
    fontSize: 12,
    color: CHAT_COLORS.botText,
    textAlign: 'center',
  },
  inputWrapper: {
    backgroundColor: CHAT_COLORS.background,
    borderTopWidth: 1,
    borderTopColor: CHAT_COLORS.inputBorder,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CHAT_COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  attachToggleIcon: {
    fontSize: 24,
    fontWeight: '300' as const,
    color: CHAT_COLORS.userBubble,
    marginTop: -2,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: CHAT_COLORS.inputBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 36,
    maxHeight: 120,
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: CHAT_COLORS.botText,
    paddingVertical: 0,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CHAT_COLORS.sendButton,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CHAT_COLORS.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  micButtonRecording: {
    backgroundColor: '#FFE5E5',
  },
});
