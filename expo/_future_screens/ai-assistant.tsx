import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Alert,
  Image,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Send,
  Camera,
  Image as ImageIcon,
  FileText,
  Plus,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';
import { validateVin, validateDob } from '@/utils/quoteReadiness';
import { trpc } from '@/lib/trpc';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  image?: string;
}

interface CollectedData {
  phone?: string;
  isMarried?: boolean;
  spouseDriving?: boolean;
  primaryDriverName?: string;
  primaryDriverDob?: string;
  spouseName?: string;
  spouseDob?: string;
  idUploaded?: boolean;
  idType?: string;
  vehicleCount?: number;
  vehicles?: { vin: string; index: number }[];
  coverageType?: 'minimum' | 'full';
  collisionDeductible?: number;
  compDeductible?: number;
  zip?: string;
  notifyOnlyIfCheaper?: boolean;
  currentPremiumApprox?: number;
  targetMonthly?: number;
  targetSavings?: number;
}

type FlowStep =
  | 'greeting'
  | 'awaiting_phone'
  | 'awaiting_name'
  | 'awaiting_dob'
  | 'awaiting_married'
  | 'awaiting_spouse_driving'
  | 'awaiting_spouse_name'
  | 'awaiting_spouse_dob'
  | 'awaiting_id_upload'
  | 'awaiting_vehicle_count'
  | 'awaiting_vin'
  | 'awaiting_zip'
  | 'awaiting_coverage_type'
  | 'awaiting_collision_deductible'
  | 'awaiting_comp_deductible'
  | 'awaiting_price_gate'
  | 'awaiting_current_premium'
  | 'awaiting_target_price'
  | 'awaiting_confirmation'
  | 'complete';

function TypingIndicator() {
  const dotAnim1 = useRef(new Animated.Value(0.4)).current;
  const dotAnim2 = useRef(new Animated.Value(0.4)).current;
  const dotAnim3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animate = (anim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.4, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    };
    animate(dotAnim1, 0);
    animate(dotAnim2, 150);
    animate(dotAnim3, 300);
  }, [dotAnim1, dotAnim2, dotAnim3]);

  return (
    <View style={[styles.row, styles.rowLeft]}>
      <View style={[styles.bubble, styles.botBubble]}>
        <View style={styles.typingContainer}>
          {[dotAnim1, dotAnim2, dotAnim3].map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.typingDot, { opacity: anim }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

function MessageBubble({ role, text, image }: { role: 'user' | 'assistant'; text: string; image?: string }) {
  const isUser = role === 'user';
  return (
    <View style={[styles.row, isUser ? styles.rowRight : styles.rowLeft]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        {image && (
          <Image source={{ uri: image }} style={styles.bubbleImage} resizeMode="cover" />
        )}
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.botText]}>{text}</Text>
      </View>
    </View>
  );
}

export default function AIAssistantScreen() {
  const { language, setConsentGiven } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [flowStep, setFlowStep] = useState<FlowStep>('greeting');
  const [isTyping, setIsTyping] = useState(false);
  const [showIdUpload, setShowIdUpload] = useState(false);
  const [currentVinIndex, setCurrentVinIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  
  const collectedData = useRef<CollectedData>({});

  const submitIntakeMutation = trpc.intake.submit.useMutation({
    onSuccess: (data) => {
      console.log('[INTAKE] Submitted:', data.status);
    },
    onError: (error) => {
      console.error('[INTAKE] Error:', error);
    },
  });

  const t = useCallback((en: string, es: string) => language === 'es' ? es : en, [language]);

  const addBotMessage = useCallback((text: string, delay = 800) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { id: `bot-${Date.now()}`, role: 'assistant', text }]);
    }, delay);
  }, []);

  const addUserMessage = useCallback((text: string, image?: string) => {
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', text, image }]);
  }, []);

  useEffect(() => {
    if (messages.length === 0) {
      const greeting = t(
        "Hi 👋 I'll help you build your insurance profile to get quotes.\nThis takes about 2 minutes.",
        "Hola 👋 Te ayudo a crear tu perfil de seguro para cotizar.\nSolo toma 2 minutos."
      );
      addBotMessage(greeting, 500);
      setTimeout(() => {
        setFlowStep('awaiting_phone');
        addBotMessage(t("What's your phone number?", "¿Cuál es tu número de teléfono?"), 1200);
      }, 800);
    }
  }, [messages.length, addBotMessage, t]);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  const showConfirmationFn = useCallback(() => {
    const data = collectedData.current;
    const priceGateTextEs = data.notifyOnlyIfCheaper 
      ? `🔔 Alerta: Solo si < $${data.currentPremiumApprox}${data.targetMonthly ? ` (objetivo: $${data.targetMonthly})` : ''}/mes\n`
      : '';
    const priceGateTextEn = data.notifyOnlyIfCheaper 
      ? `🔔 Alert: Only if < $${data.currentPremiumApprox}${data.targetMonthly ? ` (target: $${data.targetMonthly})` : ''}/mo\n`
      : '';
    const summary = language === 'es'
      ? `📋 Resumen de tu perfil:\n\n` +
        `📱 Teléfono: ${data.phone}\n` +
        `👤 Nombre: ${data.primaryDriverName}\n` +
        `🎂 Nacimiento: ${data.primaryDriverDob}\n` +
        (data.spouseDriving ? `👫 Esposo/a: ${data.spouseName} (${data.spouseDob})\n` : '') +
        `🚗 Vehículos: ${data.vehicleCount}\n` +
        `📍 ZIP: ${data.zip}\n` +
        `🛡️ Cobertura: ${data.coverageType === 'minimum' ? 'Mínima (30/60/25)' : 'Full Coverage'}\n` +
        (data.coverageType === 'full' ? `💰 Deducibles: Colisión $${data.collisionDeductible} / Comp $${data.compDeductible}\n` : '') +
        priceGateTextEs +
        `\n¿Todo correcto? Responde "Sí" para enviar.`
      : `📋 Profile Summary:\n\n` +
        `📱 Phone: ${data.phone}\n` +
        `👤 Name: ${data.primaryDriverName}\n` +
        `🎂 DOB: ${data.primaryDriverDob}\n` +
        (data.spouseDriving ? `👫 Spouse: ${data.spouseName} (${data.spouseDob})\n` : '') +
        `🚗 Vehicles: ${data.vehicleCount}\n` +
        `📍 ZIP: ${data.zip}\n` +
        `🛡️ Coverage: ${data.coverageType === 'minimum' ? 'Minimum (30/60/25)' : 'Full Coverage'}\n` +
        (data.coverageType === 'full' ? `💰 Deductibles: Collision $${data.collisionDeductible} / Comp $${data.compDeductible}\n` : '') +
        priceGateTextEn +
        `\nLook correct? Reply "Yes" to submit.`;
    addBotMessage(summary, 800);
  }, [addBotMessage, language]);

  const submitProfileFn = useCallback(async () => {
    setIsProcessing(true);
    const data = collectedData.current;
    try {
      const drivers = [{ fullName: data.primaryDriverName, dob: data.primaryDriverDob }];
      if (data.spouseDriving && data.spouseName) {
        drivers.push({ fullName: data.spouseName, dob: data.spouseDob });
      }
      const vehicles = (data.vehicles || []).map(v => ({ vin: v.vin }));
      await submitIntakeMutation.mutateAsync({
        userId: `user_${Date.now()}`,
        intake: {
          phone: data.phone,
          garagingAddress: { zip: data.zip, state: 'TX' },
          drivers,
          vehicles,
          coverageType: data.coverageType,
          collisionDeductible: data.collisionDeductible,
          compDeductible: data.compDeductible,
          language: language === 'es' ? 'es' : 'en',
          consentContactAllowed: true,
          priceGate: data.notifyOnlyIfCheaper ? {
            notifyOnlyIfCheaper: data.notifyOnlyIfCheaper,
            currentPremiumApprox: data.currentPremiumApprox,
            targetMonthly: data.targetMonthly,
            targetSavings: data.targetSavings,
          } : undefined,
        },
      });
      setConsentGiven(true);
      setFlowStep('complete');
      addBotMessage(t(
        "✅ Profile submitted!\n\nA licensed agent will review your info and contact you with real quotes.\n\nNo spam. No pressure.",
        "✅ ¡Perfil enviado!\n\nUn agente con licencia revisará tu información y te contactará con cotizaciones reales.\n\nSin spam. Sin presión."
      ), 500);
      setTimeout(() => router.push('/quote-submitted' as any), 2500);
    } catch (error) {
      console.error('[SUBMIT] Error:', error);
      addBotMessage(t("Failed to submit. Please try again.", "Error al enviar. Por favor intenta de nuevo."), 500);
    } finally {
      setIsProcessing(false);
    }
  }, [submitIntakeMutation, language, t, addBotMessage, setConsentGiven, router]);

  const processInput = useCallback(async (userInput: string, imageUri?: string) => {
    const trimmed = userInput.trim().toLowerCase();
    setIsProcessing(true);

    try {
      switch (flowStep) {
        case 'awaiting_phone': {
          const phoneClean = userInput.replace(/[^0-9]/g, '');
          if (phoneClean.length >= 10) {
            collectedData.current.phone = userInput;
            setFlowStep('awaiting_name');
            addBotMessage(t("Got it 👍", "Perfecto 👍"), 300);
            setTimeout(() => addBotMessage(t("What's your full name?", "¿Cuál es tu nombre completo?"), 800), 500);
          } else {
            addBotMessage(t("Please enter a valid phone number (10 digits).", "Por favor ingresa un número válido (10 dígitos)."), 500);
          }
          break;
        }

        case 'awaiting_name': {
          if (userInput.trim().length >= 2 && userInput.includes(' ')) {
            collectedData.current.primaryDriverName = userInput.trim();
            setFlowStep('awaiting_dob');
            addBotMessage(t("Got it 👍", "Perfecto 👍"), 300);
            setTimeout(() => addBotMessage(t("What's your date of birth?\n(MM/DD/YYYY)", "¿Cuál es tu fecha de nacimiento?\n(MM/DD/YYYY)"), 800), 500);
          } else {
            addBotMessage(t("Please enter your full name (first and last).", "Por favor ingresa tu nombre completo (nombre y apellido)."), 500);
          }
          break;
        }

        case 'awaiting_dob': {
          const dobResult = validateDob(userInput);
          if (dobResult.valid) {
            collectedData.current.primaryDriverDob = dobResult.parsed || userInput;
            setFlowStep('awaiting_married');
            addBotMessage(t("Got it 👍", "Perfecto 👍"), 300);
            setTimeout(() => addBotMessage(t("Are you married?\n(Yes / No)", "¿Estás casado/a?\n(Sí / No)"), 800), 500);
          } else {
            addBotMessage(t("Please enter a valid date (MM/DD/YYYY).", "Por favor ingresa una fecha válida (MM/DD/YYYY)."), 500);
          }
          break;
        }

        case 'awaiting_married': {
          if (trimmed.includes('yes') || trimmed.includes('sí') || trimmed.includes('si') || trimmed === 'y') {
            collectedData.current.isMarried = true;
            setFlowStep('awaiting_spouse_driving');
            addBotMessage(t("Will your spouse be driving the vehicle(s)?", "¿Tu esposo/a manejará el/los vehículo(s)?"), 600);
          } else if (trimmed.includes('no') || trimmed === 'n') {
            collectedData.current.isMarried = false;
            setFlowStep('awaiting_id_upload');
            setShowIdUpload(true);
            addBotMessage(t("Got it 👍", "Perfecto 👍"), 300);
            setTimeout(() => addBotMessage(t(
              "Now I need a photo of your ID.\nAccepted: Texas DL, Texas ID, or Matrícula.",
              "Ahora necesito foto de tu identificación.\nAcepto: Licencia TX, ID TX, o Matrícula."
            ), 800), 500);
          } else {
            addBotMessage(t("Please answer Yes or No.", "Por favor responde Sí o No."), 500);
          }
          break;
        }

        case 'awaiting_spouse_driving': {
          if (trimmed.includes('yes') || trimmed.includes('sí') || trimmed.includes('si') || trimmed === 'y') {
            collectedData.current.spouseDriving = true;
            setFlowStep('awaiting_spouse_name');
            addBotMessage(t("What's your spouse's full name?", "¿Cuál es el nombre completo de tu esposo/a?"), 600);
          } else if (trimmed.includes('no') || trimmed === 'n') {
            collectedData.current.spouseDriving = false;
            setFlowStep('awaiting_id_upload');
            setShowIdUpload(true);
            addBotMessage(t("Got it 👍", "Perfecto 👍"), 300);
            setTimeout(() => addBotMessage(t(
              "Now I need a photo of your ID.\nAccepted: Texas DL, Texas ID, or Matrícula.",
              "Ahora necesito foto de tu identificación.\nAcepto: Licencia TX, ID TX, o Matrícula."
            ), 800), 500);
          } else {
            addBotMessage(t("Please answer Yes or No.", "Por favor responde Sí o No."), 500);
          }
          break;
        }

        case 'awaiting_spouse_name': {
          if (userInput.trim().length >= 2) {
            collectedData.current.spouseName = userInput.trim();
            setFlowStep('awaiting_spouse_dob');
            addBotMessage(t("What's your spouse's date of birth?\n(MM/DD/YYYY)", "¿Cuál es la fecha de nacimiento de tu esposo/a?\n(MM/DD/YYYY)"), 600);
          } else {
            addBotMessage(t("Please enter their full name.", "Por favor ingresa su nombre completo."), 500);
          }
          break;
        }

        case 'awaiting_spouse_dob': {
          const dobResult = validateDob(userInput);
          if (dobResult.valid) {
            collectedData.current.spouseDob = dobResult.parsed || userInput;
            setFlowStep('awaiting_id_upload');
            setShowIdUpload(true);
            addBotMessage(t("Got it 👍", "Perfecto 👍"), 300);
            setTimeout(() => addBotMessage(t(
              "Now I need a photo of your ID.\nAccepted: Texas DL, Texas ID, or Matrícula.",
              "Ahora necesito foto de tu identificación.\nAcepto: Licencia TX, ID TX, o Matrícula."
            ), 800), 500);
          } else {
            addBotMessage(t("Please enter a valid date (MM/DD/YYYY).", "Por favor ingresa una fecha válida (MM/DD/YYYY)."), 500);
          }
          break;
        }

        case 'awaiting_id_upload': {
          if (imageUri || trimmed.includes('skip') || trimmed.includes('saltar')) {
            collectedData.current.idUploaded = !!imageUri;
            setShowIdUpload(false);
            setFlowStep('awaiting_vehicle_count');
            addBotMessage(imageUri ? t("ID received ✓", "ID recibido ✓") : t("Skipped", "Omitido"), 300);
            setTimeout(() => addBotMessage(t("How many vehicles do you want to insure?\n(1, 2, 3, etc.)", "¿Cuántos vehículos quieres asegurar?\n(1, 2, 3, etc.)"), 800), 500);
          } else {
            addBotMessage(t("Please upload a photo of your ID using the + button, or type 'skip'.", "Por favor sube foto de tu ID usando el botón +, o escribe 'saltar'."), 500);
          }
          break;
        }

        case 'awaiting_vehicle_count': {
          const count = parseInt(userInput.replace(/[^0-9]/g, ''));
          if (!isNaN(count) && count >= 1 && count <= 10) {
            collectedData.current.vehicleCount = count;
            collectedData.current.vehicles = [];
            setCurrentVinIndex(0);
            setFlowStep('awaiting_vin');
            addBotMessage(t(`Got it, ${count} vehicle${count > 1 ? 's' : ''}.`, `Perfecto, ${count} vehículo${count > 1 ? 's' : ''}.`), 300);
            setTimeout(() => addBotMessage(t(
              "What's the VIN for vehicle #1?\n(17 characters, on dashboard or door sticker)",
              "¿Cuál es el VIN del vehículo #1?\n(17 caracteres, en tablero o sticker de puerta)"
            ), 800), 500);
          } else {
            addBotMessage(t("Please enter a number (1-10).", "Por favor ingresa un número (1-10)."), 500);
          }
          break;
        }

        case 'awaiting_vin': {
          const cleanVin = userInput.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
          const vinResult = validateVin(cleanVin);
          if (vinResult.valid) {
            collectedData.current.vehicles = collectedData.current.vehicles || [];
            collectedData.current.vehicles.push({ vin: cleanVin, index: currentVinIndex });
            
            const vehicleCount = collectedData.current.vehicleCount || 1;
            if (currentVinIndex + 1 < vehicleCount) {
              setCurrentVinIndex(prev => prev + 1);
              addBotMessage(t(`VIN #${currentVinIndex + 1} saved ✓`, `VIN #${currentVinIndex + 1} guardado ✓`), 300);
              setTimeout(() => addBotMessage(t(
                `What's the VIN for vehicle #${currentVinIndex + 2}?`,
                `¿Cuál es el VIN del vehículo #${currentVinIndex + 2}?`
              ), 800), 500);
            } else {
              setFlowStep('awaiting_zip');
              addBotMessage(t(`VIN #${currentVinIndex + 1} saved ✓`, `VIN #${currentVinIndex + 1} guardado ✓`), 300);
              setTimeout(() => addBotMessage(t("What's your ZIP code?", "¿Cuál es tu código postal?"), 800), 500);
            }
          } else {
            addBotMessage(t("That doesn't look like a valid VIN. Please enter 17 characters (letters and numbers, no I, O, or Q).", "Ese VIN no parece válido. Por favor ingresa 17 caracteres (letras y números, sin I, O, o Q)."), 500);
          }
          break;
        }

        case 'awaiting_zip': {
          const zipClean = userInput.replace(/[^0-9]/g, '');
          if (zipClean.length === 5) {
            collectedData.current.zip = zipClean;
            setFlowStep('awaiting_coverage_type');
            addBotMessage(t("Got it 👍", "Perfecto 👍"), 300);
            setTimeout(() => addBotMessage(t(
              "What coverage do you need?\n\n• Minimum (30/60/25) - State required\n• Full Coverage - Collision + Comprehensive",
              "¿Qué cobertura necesitas?\n\n• Mínimo (30/60/25) - Lo que pide el estado\n• Full Coverage - Colisión + Comprehensivo"
            ), 800), 500);
          } else {
            addBotMessage(t("Please enter a valid 5-digit ZIP code.", "Por favor ingresa un código postal válido de 5 dígitos."), 500);
          }
          break;
        }

        case 'awaiting_coverage_type': {
          if (trimmed.includes('min') || trimmed.includes('mín') || trimmed.includes('basic') || trimmed.includes('30/60')) {
            collectedData.current.coverageType = 'minimum';
            setFlowStep('awaiting_price_gate');
            addBotMessage(t("Got it, minimum coverage.", "Perfecto, cobertura mínima."), 300);
            setTimeout(() => addBotMessage(t(
              "Would you like us to notify you only if we find a cheaper price?\n(Yes / No)",
              "¿Quieres que te notifiquemos solo si encontramos un mejor precio?\n(Sí / No)"
            ), 800), 500);
          } else if (trimmed.includes('full') || trimmed.includes('complet') || trimmed.includes('collision') || trimmed.includes('colisión')) {
            collectedData.current.coverageType = 'full';
            setFlowStep('awaiting_collision_deductible');
            addBotMessage(t("Got it, full coverage.", "Perfecto, full coverage."), 300);
            setTimeout(() => addBotMessage(t("Choose your collision deductible:\n$500 or $1000", "Elige tu deducible de colisión:\n$500 o $1000"), 800), 500);
          } else {
            addBotMessage(t("Please choose: Minimum or Full Coverage", "Por favor elige: Mínimo o Full Coverage"), 500);
          }
          break;
        }

        case 'awaiting_collision_deductible': {
          const num = parseInt(userInput.replace(/[^0-9]/g, ''));
          if ([500, 1000].includes(num)) {
            collectedData.current.collisionDeductible = num;
            setFlowStep('awaiting_comp_deductible');
            addBotMessage(t(`Collision: $${num} ✓`, `Colisión: $${num} ✓`), 300);
            setTimeout(() => addBotMessage(t("Choose your comprehensive deductible:\n$250, $500, or $1000", "Elige tu deducible comprehensivo:\n$250, $500, o $1000"), 800), 500);
          } else {
            addBotMessage(t("Please choose $500 or $1000.", "Por favor elige $500 o $1000."), 500);
          }
          break;
        }

        case 'awaiting_comp_deductible': {
          const num = parseInt(userInput.replace(/[^0-9]/g, ''));
          if ([250, 500, 1000].includes(num)) {
            collectedData.current.compDeductible = num;
            setFlowStep('awaiting_price_gate');
            addBotMessage(t(`Comprehensive: $${num} ✓`, `Comprehensivo: $${num} ✓`), 300);
            setTimeout(() => addBotMessage(t(
              "Would you like us to notify you only if we find a cheaper price?\n(Yes / No)",
              "¿Quieres que te notifiquemos solo si encontramos un mejor precio?\n(Sí / No)"
            ), 800), 500);
          } else {
            addBotMessage(t("Please choose $250, $500, or $1000.", "Por favor elige $250, $500, o $1000."), 500);
          }
          break;
        }

        case 'awaiting_price_gate': {
          if (trimmed.includes('yes') || trimmed.includes('sí') || trimmed.includes('si') || trimmed === 'y') {
            collectedData.current.notifyOnlyIfCheaper = true;
            setFlowStep('awaiting_current_premium');
            addBotMessage(t(
              "What do you pay now per month? (approx)\nExample: 150",
              "¿Cuánto pagas ahora por mes? (aprox)\nEjemplo: 150"
            ), 600);
          } else if (trimmed.includes('no') || trimmed === 'n') {
            collectedData.current.notifyOnlyIfCheaper = false;
            setFlowStep('awaiting_confirmation');
            addBotMessage(t("Got it, we'll show you all quotes.", "Perfecto, te mostraremos todas las cotizaciones."), 300);
            setTimeout(() => showConfirmationFn(), 500);
          } else {
            addBotMessage(t("Please answer Yes or No.", "Por favor responde Sí o No."), 500);
          }
          break;
        }

        case 'awaiting_current_premium': {
          const amount = parseInt(userInput.replace(/[^0-9]/g, ''));
          if (!isNaN(amount) && amount > 0 && amount < 2000) {
            collectedData.current.currentPremiumApprox = amount;
            setFlowStep('awaiting_target_price');
            addBotMessage(t(`Current payment: $${amount}/mo ✓`, `Pago actual: $${amount}/mes ✓`), 300);
            setTimeout(() => addBotMessage(t(
              "Target monthly price? (optional)\nOr type 'skip' to continue.",
              "¿Precio mensual objetivo? (opcional)\nO escribe 'saltar' para continuar."
            ), 800), 500);
          } else {
            addBotMessage(t("Please enter a valid amount (e.g. 150).", "Por favor ingresa un monto válido (ej. 150)."), 500);
          }
          break;
        }

        case 'awaiting_target_price': {
          if (trimmed.includes('skip') || trimmed.includes('saltar') || trimmed.includes('no')) {
            setFlowStep('awaiting_confirmation');
            addBotMessage(t("Price alert set ✓", "Alerta de precio activada ✓"), 300);
            setTimeout(() => showConfirmationFn(), 500);
          } else {
            const target = parseInt(userInput.replace(/[^0-9]/g, ''));
            if (!isNaN(target) && target > 0 && target < 2000) {
              collectedData.current.targetMonthly = target;
              if (collectedData.current.currentPremiumApprox && target < collectedData.current.currentPremiumApprox) {
                collectedData.current.targetSavings = collectedData.current.currentPremiumApprox - target;
              }
              setFlowStep('awaiting_confirmation');
              addBotMessage(t(`Target: $${target}/mo ✓ Price alert set!`, `Objetivo: $${target}/mes ✓ ¡Alerta de precio activada!`), 300);
              setTimeout(() => showConfirmationFn(), 500);
            } else {
              addBotMessage(t("Please enter a valid amount or 'skip'.", "Por favor ingresa un monto válido o 'saltar'."), 500);
            }
          }
          break;
        }

        case 'awaiting_confirmation': {
          if (trimmed.includes('yes') || trimmed.includes('sí') || trimmed.includes('si') || trimmed.includes('confirm') || trimmed.includes('submit')) {
            await submitProfileFn();
          } else if (trimmed.includes('no') || trimmed.includes('change') || trimmed.includes('cambiar')) {
            addBotMessage(t("What would you like to change? (phone, name, coverage, etc.)", "¿Qué quieres cambiar? (teléfono, nombre, cobertura, etc.)"), 500);
          } else {
            addBotMessage(t("Please confirm 'Yes' to submit or 'No' to make changes.", "Por favor confirma 'Sí' para enviar o 'No' para hacer cambios."), 500);
          }
          break;
        }

        case 'complete':
          addBotMessage(t("Your profile is already submitted! An agent will contact you soon.", "¡Tu perfil ya fue enviado! Un agente te contactará pronto."), 500);
          break;
      }
    } catch (error) {
      console.error('[ASSISTANT] Error:', error);
      addBotMessage(t("Something went wrong. Please try again.", "Algo salió mal. Por favor intenta de nuevo."), 500);
    } finally {
      setIsProcessing(false);
    }
  }, [flowStep, currentVinIndex, addBotMessage, t, showConfirmationFn, submitProfileFn]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isProcessing) return;
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    addUserMessage(input);
    const userInput = input;
    setInput('');
    processInput(userInput);
  }, [input, isProcessing, addUserMessage, processInput]);

  const handleImageUpload = useCallback(async (source: 'camera' | 'library') => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAttachMenu(false);

    try {
      let result;
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t('Permission needed', 'Permiso requerido'), t('Camera access is required.', 'Se necesita acceso a la cámara.'));
          return;
        }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert(t('Permission needed', 'Permiso requerido'), t('Photo access is required.', 'Se necesita acceso a las fotos.'));
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      }

      if (!result.canceled && result.assets?.[0]) {
        const uri = result.assets[0].uri;
        addUserMessage(t('📎 ID uploaded', '📎 ID subido'), uri);
        processInput('uploaded', uri);
      }
    } catch (error) {
      console.error('[UPLOAD] Error:', error);
      Alert.alert(t('Error', 'Error'), t('Could not open. Try again.', 'No se pudo abrir. Intenta de nuevo.'));
    }
  }, [t, addUserMessage, processInput]);

  const handleDocumentPick = useCallback(async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAttachMenu(false);

    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        addUserMessage(t('📎 Document uploaded', '📎 Documento subido'));
        processInput('uploaded', result.assets[0].uri);
      }
    } catch (error) {
      console.error('[DOC] Error:', error);
    }
  }, [t, addUserMessage, processInput]);

  const quickReplies = useMemo(() => {
    switch (flowStep) {
      case 'awaiting_married':
      case 'awaiting_spouse_driving':
        return [t('Yes', 'Sí'), t('No', 'No')];
      case 'awaiting_coverage_type':
        return [t('Minimum', 'Mínimo'), t('Full Coverage', 'Full Coverage')];
      case 'awaiting_price_gate':
        return [t('Yes', 'Sí'), t('No', 'No')];
      case 'awaiting_collision_deductible':
        return ['$500', '$1000'];
      case 'awaiting_comp_deductible':
        return ['$250', '$500', '$1000'];
      case 'awaiting_confirmation':
        return [t('Yes, submit', 'Sí, enviar'), t('No, change', 'No, cambiar')];
      default:
        return null;
    }
  }, [flowStep, t]);

  const handleQuickReply = useCallback((reply: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addUserMessage(reply);
    processInput(reply);
  }, [addUserMessage, processInput]);

  const progressPercent = useMemo(() => {
    const steps: FlowStep[] = ['greeting', 'awaiting_phone', 'awaiting_name', 'awaiting_dob', 'awaiting_married', 'awaiting_spouse_driving', 'awaiting_spouse_name', 'awaiting_spouse_dob', 'awaiting_id_upload', 'awaiting_vehicle_count', 'awaiting_vin', 'awaiting_zip', 'awaiting_coverage_type', 'awaiting_collision_deductible', 'awaiting_comp_deductible', 'awaiting_price_gate', 'awaiting_current_premium', 'awaiting_target_price', 'awaiting_confirmation', 'complete'];
    const idx = steps.indexOf(flowStep);
    return Math.round((idx / (steps.length - 1)) * 100);
  }, [flowStep]);

  const renderMessage = useCallback(({ item }: { item: ChatMessage }) => (
    <MessageBubble role={item.role} text={item.text} image={item.image} />
  ), []);

  return (
    <View style={styles.page}>
      <Stack.Screen 
        options={{ 
          title: 'Saver', 
          headerStyle: { backgroundColor: '#FFFFFF' }, 
          headerTintColor: '#0F172A',
          headerShadowVisible: false,
        }} 
      />
      
      <KeyboardAvoidingView 
        style={styles.kav} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {flowStep !== 'complete' && (
          <View style={styles.progressWrapper}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.listWrap}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              <>
                {isTyping && <TypingIndicator />}
                {quickReplies && !isTyping && (
                  <View style={styles.quickRepliesRow}>
                    {quickReplies.map((reply, idx) => (
                      <Pressable 
                        key={idx} 
                        style={({ pressed }) => [styles.quickReplyButton, pressed && { opacity: 0.8 }]} 
                        onPress={() => handleQuickReply(reply)}
                      >
                        <Text style={styles.quickReplyText}>{reply}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </>
            }
          />
        </View>

        {showAttachMenu && (
          <View style={styles.attachMenu}>
            <Pressable style={styles.attachClose} onPress={() => setShowAttachMenu(false)}>
              <X size={20} color="#64748B" />
            </Pressable>
            {Platform.OS !== 'web' && (
              <Pressable style={styles.attachOption} onPress={() => handleImageUpload('camera')}>
                <Camera size={24} color="#007AFF" />
                <Text style={styles.attachText}>{t('Take photo', 'Tomar foto')}</Text>
              </Pressable>
            )}
            <Pressable style={styles.attachOption} onPress={() => handleImageUpload('library')}>
              <ImageIcon size={24} color="#007AFF" />
              <Text style={styles.attachText}>{t('Choose photo', 'Elegir foto')}</Text>
            </Pressable>
            <Pressable style={styles.attachOption} onPress={handleDocumentPick}>
              <FileText size={24} color="#007AFF" />
              <Text style={styles.attachText}>{t('Upload file', 'Subir archivo')}</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          {showIdUpload && (
            <Pressable 
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]} 
              onPress={() => setShowAttachMenu(v => !v)}
            >
              <Plus size={20} color="#007AFF" />
            </Pressable>
          )}

          <View style={styles.inputWrap}>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={language === 'es' ? 'Escribe tu respuesta...' : 'Type your answer...'}
              placeholderTextColor="#94A3B8"
              style={styles.input}
              multiline
              onSubmitEditing={handleSend}
              editable={!isProcessing}
            />
          </View>

          <Pressable
            style={[styles.sendBtn, (!input?.trim() || isProcessing) && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!input?.trim() || isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { 
    flex: 1, 
    backgroundColor: '#FFFFFF',
  },
  kav: { 
    flex: 1,
  },
  progressWrapper: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    backgroundColor: '#FFFFFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
  },
  progressTrack: { 
    height: 4, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 2, 
    overflow: 'hidden',
  },
  progressFill: { 
    height: '100%', 
    backgroundColor: '#007AFF', 
    borderRadius: 2,
  },
  listWrap: { 
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 20,
    paddingTop: 10,
  },
  row: { 
    marginVertical: 6, 
    flexDirection: 'row',
  },
  rowLeft: { 
    justifyContent: 'flex-start',
  },
  rowRight: { 
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '78%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  botBubble: { 
    backgroundColor: '#F2F3F5', 
    borderTopLeftRadius: 6,
  },
  userBubble: { 
    backgroundColor: '#007AFF', 
    borderTopRightRadius: 6,
  },
  bubbleText: { 
    fontSize: 16, 
    lineHeight: 22,
  },
  botText: { 
    color: '#0F172A',
  },
  userText: { 
    color: '#FFFFFF',
  },
  bubbleImage: { 
    width: 180, 
    height: 120, 
    borderRadius: 12, 
    marginBottom: 8,
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
    backgroundColor: '#94A3B8',
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
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    borderWidth: 1.5, 
    borderColor: '#007AFF',
  },
  quickReplyText: { 
    fontSize: 15, 
    fontWeight: '600' as const, 
    color: '#007AFF',
  },
  attachMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 20,
  },
  attachClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachOption: {
    alignItems: 'center',
    gap: 4,
  },
  attachText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500' as const,
  },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrap: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  input: {
    fontSize: 16,
    color: '#0F172A',
    paddingVertical: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
