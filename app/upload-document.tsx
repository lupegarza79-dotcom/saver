import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  useWindowDimensions,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  X,
  CheckCircle,
  FolderOpen,
} from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';
import { DocumentType, Document, Policy, Vehicle, Driver, Reminder } from '@/types';
import { trpc } from '@/lib/trpc';
import { scanDocument, ExtractedPolicyData } from '@/services/AIDocumentScanner';
import { useSmartFeaturesPro } from '@/hooks/useSmartFeaturesPro';
import {
  missingFields,
  canQuote,
  getIntakeStatus,
  buildMissingFieldsSummary,
  QuoteInput,
} from '@/utils/quoteReadiness';

interface UploadedFile {
  uri: string;
  type: DocumentType;
  name: string;
  mimeType?: string;
  isScanning?: boolean;
  scanResult?: ExtractedPolicyData | null;
  confidence?: number;
  previewUri?: string;
  isValidDecPage?: boolean;
  validationMessage?: string;
}

const MAX_WIDTH = 500;

const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  text: '#111111',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  primaryBlue: '#1275FF',
  success: '#0BBE7D',
  successLight: '#DCFCE7',
  danger: '#EF4444',
};

export default function UploadDocumentScreen() {
  const router = useRouter();
  const { addDocument, addPolicy, addReminder, user, language, setPendingIntake, consentGiven, setConsentGiven } = useApp();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(consentGiven);
  const [hasShownConsent, setHasShownConsent] = useState(consentGiven);

  const { triggerHaptic } = useSmartFeaturesPro();
  useWindowDimensions();
  const hasAutoNavigated = useRef(false);
  const webFileInputRef = useRef<HTMLInputElement | null>(null);

  const submitIntakeMutation = trpc.intake.submit.useMutation({
    onSuccess: (data) => {
      console.log('[UPLOAD] Intake webhook emitted:', data.status, data.ready ? 'READY' : 'NEEDS_INFO');
    },
    onError: (error) => {
      console.error('[UPLOAD] Intake submission error:', error);
    },
  });

  const isWeb = Platform.OS === 'web';

  // Auto-navigate to chat when all files are invalid
  useEffect(() => {
    if (hasAutoNavigated.current) return;

    const hasFiles = uploadedFiles.length > 0;
    const allDoneScanning = !uploadedFiles.some(f => f.isScanning);
    const allInvalid = uploadedFiles.every(f => f.isValidDecPage === false);

    if (hasFiles && allDoneScanning && allInvalid) {
      hasAutoNavigated.current = true;
      console.log('[UPLOAD] All files invalid, auto-navigating to chat');
      triggerHaptic('warning');

      setTimeout(() => {
        router.push({
          pathname: '/ai-assistant',
          params: { mode: 'intake', skipUpload: 'true', invalidDoc: 'true' },
        } as any);
      }, 500);
    }
  }, [uploadedFiles, router, triggerHaptic]);

  const { t } = useApp();
  const text = t.upload;

  const isValidDeclarationPage = (result: any): { valid: boolean; message: string } => {
    if (!result || !result.extractedData) {
      return {
        valid: false, message: language === 'es'
          ? 'No pudimos leer este documento. Por favor sube tu Declarations Page (página que muestra VIN, coberturas, deducibles).'
          : 'We couldn\'t read this document. Please upload your Declarations Page (shows VIN, coverages, deductibles).'
      };
    }

    const data = result.extractedData;
    let keywordsFound = 0;

    if (data.policyNumber) keywordsFound++;
    if (data.carrier) keywordsFound++;
    if (data.effectiveDate || data.expirationDate) keywordsFound++;
    if (data.liabilityBI || data.liabilityPD) keywordsFound++;
    if (data.deductibleComp || data.deductibleColl) keywordsFound++;
    if (data.vehicles && data.vehicles.length > 0 && data.vehicles[0]?.vin) keywordsFound++;
    if (data.premium) keywordsFound++;

    console.log('[VALIDATION] Declaration page keywords found:', keywordsFound);

    if (keywordsFound < 2 || result.confidence < 40) {
      return {
        valid: false, message: language === 'es'
          ? 'Esta imagen no parece ser una Declarations Page. Por favor sube la página que muestra tu VIN, coberturas y deducibles.'
          : 'This doesn\'t appear to be a Declarations Page. Please upload the page that shows your VIN, coverages, and deductibles.'
      };
    }

    return { valid: true, message: '' };
  };

  const scanWithAI = async (uri: string, index: number, mimeType?: string) => {
    setUploadedFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, isScanning: true } : f
    ));

    try {
      let base64Data = '';
      const isPdf = mimeType?.includes('pdf') || uri.toLowerCase().endsWith('.pdf');

      console.log('[AI_SCAN] Starting scan, isPdf:', isPdf, 'mimeType:', mimeType);

      if (Platform.OS === 'web') {
        try {
          const response = await fetch(uri);
          const blob = await response.blob();
          base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (webError) {
          console.error('[AI_SCAN] Web fetch error:', webError);
          throw new Error('Failed to read file on web');
        }
      } else {
        try {
          // New File API - readAsStringAsync will throw if file doesn't exist
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: 'base64'
          });

          const mimePrefix = isPdf ? 'application/pdf' : 'image/jpeg';
          base64Data = `data:${mimePrefix};base64,${base64}`;
          console.log('[AI_SCAN] Base64 generated, length:', base64.length);
        } catch (fsError) {
          console.error('[AI_SCAN] FileSystem error:', fsError);
          throw new Error(language === 'es'
            ? 'No pudimos leer el archivo. Intenta tomar una foto con la cámara.'
            : 'We couldn\'t read this file. Try taking a photo with the camera.');
        }
      }

      const result = await scanDocument(base64Data);
      console.log('[AI_SCAN] Scan result:', result.success, 'confidence:', result.confidence);

      const validation = isValidDeclarationPage(result);

      setUploadedFiles(prev => prev.map((f, i) =>
        i === index ? {
          ...f,
          isScanning: false,
          scanResult: result.extractedData,
          confidence: result.confidence,
          type: result.documentType,
          isValidDecPage: validation.valid,
          validationMessage: validation.message,
          name: result.extractedData?.carrier
            ? `${result.extractedData.carrier} Policy`
            : f.name,
        } : f
      ));

      if (result.success && result.confidence > 70 && validation.valid) {
        triggerHaptic('success');
      } else if (!validation.valid) {
        triggerHaptic('warning');
      }
    } catch (error) {
      console.error('[AI_SCAN] Error:', error);
      // Always show user-friendly error message, never technical details
      const friendlyMessage = language === 'es'
        ? 'No pude leer ese archivo. Intenta otra foto o PDF (de la Declaration Page).'
        : 'I couldn\'t read that file. Try another photo/PDF (Declarations Page).';

      setUploadedFiles(prev => prev.map((f, i) =>
        i === index ? {
          ...f,
          isScanning: false,
          isValidDecPage: false,
          validationMessage: friendlyMessage,
        } : f
      ));
      triggerHaptic('error');
    }
  };

  // Sync local state with context state
  useEffect(() => {
    if (consentGiven) {
      setHasShownConsent(true);
      setConsentAccepted(true);
    }
  }, [consentGiven]);

  const handleUploadPress = () => {
    console.log('[UPLOAD] Add policy button pressed');
    console.log('[UPLOAD] State - hasShownConsent:', hasShownConsent, 'consentGiven:', consentGiven);

    // Check both local state and context state
    if (hasShownConsent || consentGiven) {
      console.log('[UPLOAD] Consent already given, showing action sheet');
      setShowActionSheet(true);
    } else {
      console.log('[UPLOAD] Showing consent modal');
      setShowConsentModal(true);
    }
  };

  const handleConsentContinue = () => {
    if (consentAccepted) {
      setShowConsentModal(false);
      setHasShownConsent(true);
      setConsentGiven(true);
      // Small timeout to ensure modal closes before next one opens
      setTimeout(() => {
        setShowActionSheet(true);
      }, 300);
    }
  };

  const handleWebFileSelect = (file: File) => {
    console.log('[UPLOAD] Web file selected:', file.name, file.type);
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';

    if (!isImage && !isPdf) {
      Alert.alert(
        language === 'es' ? 'Archivo inválido' : 'Invalid file',
        language === 'es' ? 'Por favor sube una imagen o PDF' : 'Please upload an image or PDF'
      );
      return;
    }

    const url = URL.createObjectURL(file);
    const startIndex = uploadedFiles.length;
    const newFile: UploadedFile = {
      uri: url,
      type: 'DEC_PAGE' as DocumentType,
      name: file.name || `Document_${Date.now()}`,
      mimeType: file.type,
      previewUri: isImage ? url : undefined,
    };

    setUploadedFiles(prev => [...prev, newFile]);
    scanWithAI(url, startIndex, file.type);
  };

  const triggerWebFilePicker = (accept: string) => {
    if (Platform.OS !== 'web') return;
    console.log('[UPLOAD] Triggering web file picker with accept:', accept);
    
    // Always create a fresh input element for iOS Safari compatibility
    // iOS Safari blocks programmatic clicks on hidden/reused inputs
    const tempInput = document.createElement('input');
    tempInput.type = 'file';
    tempInput.accept = accept;
    // Use offscreen positioning instead of display:none (iOS blocks display:none clicks)
    tempInput.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;';
    
    tempInput.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        console.log('[UPLOAD] File selected via temp input:', file.name);
        handleWebFileSelect(file);
      }
      // Clean up after a delay to ensure the file is processed
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
      console.log('[UPLOAD] Temp file input clicked');
    }, 100);
  };

  const pickImage = async (source: 'camera' | 'library') => {
    setShowActionSheet(false);
    console.log('[UPLOAD] pickImage called, source:', source, 'platform:', Platform.OS);

    if (Platform.OS === 'web') {
      console.log('[UPLOAD] Web platform - triggering file picker');
      triggerWebFilePicker('image/*');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    let result;

    try {
      if (source === 'camera') {
        console.log('[UPLOAD] Requesting camera permission...');
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        console.log('[UPLOAD] Camera permission:', permission.status);
        if (!permission.granted) {
          Alert.alert(
            language === 'es' ? 'Permiso requerido' : 'Permission needed',
            language === 'es' ? 'Se necesita acceso a la cámara. Ve a Configuración > Expo Go > Cámara' : 'Camera access is required. Go to Settings > Expo Go > Camera',
            [
              { text: 'OK' }
            ]
          );
          return;
        }
        console.log('[UPLOAD] Launching camera...');
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.8,
        });
      } else {
        console.log('[UPLOAD] Requesting photo library permission...');
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        console.log('[UPLOAD] Library permission:', permission.status);
        if (!permission.granted) {
          Alert.alert(
            language === 'es' ? 'Permiso requerido' : 'Permission needed',
            language === 'es' ? 'Se necesita acceso a las fotos. Ve a Configuración > Expo Go > Fotos' : 'Photo library access is required. Go to Settings > Expo Go > Photos',
            [
              { text: 'OK' }
            ]
          );
          return;
        }
        console.log('[UPLOAD] Launching photo library...');
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.8,
          allowsMultipleSelection: true,
        });
      }
    } catch (error) {
      console.error('[UPLOAD] Picker error:', error);
      Alert.alert(
        language === 'es' ? 'Error' : 'Error',
        language === 'es' ? 'No se pudo abrir. Intenta de nuevo.' : 'Could not open. Please try again.'
      );
      return;
    }

    if (!result.canceled && result.assets.length > 0) {
      const startIndex = uploadedFiles.length;
      const newFiles: UploadedFile[] = result.assets.map((asset, idx) => ({
        uri: asset.uri,
        type: 'DEC_PAGE' as DocumentType,
        name: `Document_${Date.now()}_${idx}`,
        mimeType: asset.mimeType || 'image/jpeg',
        previewUri: asset.uri,
      }));
      setUploadedFiles(prev => [...prev, ...newFiles]);

      newFiles.forEach((file, idx) => {
        scanWithAI(result.assets[idx].uri, startIndex + idx, file.mimeType);
      });
    }
  };

  const handlePickDocument = async () => {
    setShowActionSheet(false);
    console.log('[UPLOAD] handlePickDocument called, platform:', Platform.OS);

    if (Platform.OS === 'web') {
      console.log('[UPLOAD] Web platform - triggering file picker for PDF/images');
      triggerWebFilePicker('image/*,application/pdf');
      return;
    }

    try {
      console.log('[UPLOAD] Opening document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      console.log('[UPLOAD] Document picker result:', result.canceled ? 'canceled' : 'success');
      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      console.log('[DOC_PICKER] Document selected:', asset.name, 'type:', asset.mimeType);

      const startIndex = uploadedFiles.length;
      const isPdf = asset.mimeType?.includes('pdf') || asset.name?.toLowerCase().endsWith('.pdf');

      const newFile: UploadedFile = {
        uri: asset.uri,
        type: 'DEC_PAGE' as DocumentType,
        name: asset.name || `Document_${Date.now()}`,
        mimeType: asset.mimeType || (isPdf ? 'application/pdf' : 'image/jpeg'),
        previewUri: isPdf ? undefined : asset.uri,
      };

      setUploadedFiles(prev => [...prev, newFile]);
      scanWithAI(asset.uri, startIndex, newFile.mimeType);
    } catch (error) {
      console.error('[DOC_PICKER] Error:', error);
      Alert.alert(
        language === 'es' ? 'Error' : 'Error',
        language === 'es' ? 'No se pudo seleccionar el archivo' : 'Failed to select file'
      );
    }
  };

  const removeFile = (index: number) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    hasAutoNavigated.current = false; // Reset so user can try again
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) return;

    const hasScanning = uploadedFiles.some(f => f.isScanning);
    if (hasScanning) {
      Alert.alert(
        language === 'es' ? 'Espera' : 'Please wait',
        language === 'es' ? 'El escaneo IA aún está en progreso' : 'AI scanning is still in progress'
      );
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    setIsUploading(true);
    await new Promise(resolve => setTimeout(resolve, 300));

    // 1) Save documents
    uploadedFiles.forEach(file => {
      const doc: Document = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: file.type,
        name: file.name,
        url: file.uri,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'user',
        source: 'upload_link',
        confidence: file.confidence,
      };
      addDocument(doc);
    });

    // 2) Choose best scan result (highest confidence)
    const best = uploadedFiles
      .filter(f => !!f.scanResult)
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    const scannedData = best?.scanResult || null;

    console.log('[UPLOAD] Best scan result:', scannedData);

    // 3) Build QuoteInput with ONLY real data (NO placeholders)
    const intake: QuoteInput = {
      insuredFullName: scannedData?.drivers?.[0]?.name || user?.name || undefined,
      phone: user?.phone || undefined,
      garagingAddress: {
        zip: user?.zip || undefined,
        state: 'TX',
      },
      contactPreference: user?.preferredChannel === 'sms' ? 'text' : (user?.preferredChannel as 'whatsapp' | 'call' | 'text') || 'whatsapp',
      language: language === 'es' ? 'es' : 'en',
      consentContactAllowed: consentAccepted === true,

      drivers: (scannedData?.drivers || [])
        .filter(d => !!d)
        .map((d) => ({
          fullName: d.name || undefined,
          dob: d.dob || undefined,
          idType: undefined,
          idPhoto: undefined,
          idLast4: d.licenseNumber ? d.licenseNumber.slice(-4) : undefined,
        })),

      vehicles: (scannedData?.vehicles || [])
        .filter(v => !!v)
        .map((v) => ({
          vin: v.vin || undefined,
          year: v.year || undefined,
          make: v.make || undefined,
          model: v.model || undefined,
        })),

      coverageType: (scannedData as any)?.coverageType || undefined,
      liabilityLimits: (scannedData?.liabilityBI && scannedData?.liabilityPD)
        ? `${scannedData.liabilityBI}/${scannedData.liabilityPD}`
        : undefined,
      collisionDeductible: scannedData?.deductibleColl || undefined,
      compDeductible: scannedData?.deductibleComp || undefined,

      currentCarrier: scannedData?.carrier || undefined,
      currentPremium: scannedData?.premium || undefined,
      policyExpiryDate: scannedData?.expirationDate || undefined,

      currentPolicyDoc: uploadedFiles.some(f => f.type === 'DEC_PAGE') ? 'uploaded' : undefined,
    };

    // 4) Gate evaluation
    const missing = missingFields(intake);
    const ready = canQuote(intake);
    const status = getIntakeStatus(intake);
    const summary = buildMissingFieldsSummary(intake, intake.language || 'en');

    console.log('[UPLOAD] Gate evaluation:', { ready, status, missingCount: missing.length });
    console.log('[UPLOAD] Missing fields:', missing.map(m => m.key));

    // 5) Submit intake to backend (emits webhooks)
    let leadId: string | undefined;
    try {
      const intakeResult = await submitIntakeMutation.mutateAsync({
        userId: user?.id || `user_${Date.now()}`,
        intake: {
          ...intake,
          language: intake.language || 'en',
        },
      });
      leadId = intakeResult.leadId;
      console.log('[UPLOAD] Intake submitted, leadId:', leadId, 'status:', intakeResult.status);
    } catch (error) {
      console.error('[UPLOAD] Failed to submit intake:', error);
    }

    // 6) If NOT ready to quote, save pending intake and navigate to assistant
    if (!ready) {
      console.log('[UPLOAD] Not ready to quote, redirecting to assistant');
      console.log('[UPLOAD] Missing summary:', summary.message);
      console.log('[UPLOAD] LeadId for assistant:', leadId);

      // Save pending intake to context so assistant can access it
      await setPendingIntake({
        leadId: leadId || `lead_${Date.now()}`,
        intake,
        missingFields: missing,
        status,
        createdAt: new Date().toISOString(),
      });

      setIsUploading(false);
      router.push({
        pathname: '/ai-assistant',
        params: { leadId: leadId || '', intakeStatus: status, mode: 'intake' },
      } as any);
      return;
    }

    // 7) READY TO QUOTE: Create real Policy with ONLY real values (no placeholders)
    console.log('[UPLOAD] Ready to quote, creating policy');

    // Only include vehicles/drivers with real data (no placeholders)
    const vehicles: Vehicle[] = (intake.vehicles || [])
      .filter((v): v is typeof v & { vin: string; year: number; make: string; model: string } =>
        !!(v.vin && v.vin.length === 17 && v.year && v.make && v.model)
      )
      .map((v, i) => ({
        id: `veh_${Date.now()}_${i}`,
        year: v.year,
        make: v.make,
        model: v.model,
        vin: v.vin,
      }));

    const drivers: Driver[] = (intake.drivers || [])
      .filter((d): d is typeof d & { fullName: string; dob: string } =>
        !!(d.fullName && d.dob)
      )
      .map((d, i) => ({
        id: `drv_${Date.now()}_${i}`,
        name: d.fullName,
        dob: d.dob,
        licenseNumber: d.idLast4 ? `***${d.idLast4}` : undefined,
        isPrimary: i === 0,
      }));

    // Only create policy if we have REAL data: carrier, policy number, at least 1 valid vehicle and driver
    const hasValidVehicle = vehicles.length > 0;
    const hasValidDriver = drivers.length > 0;
    const hasRealPolicyData = intake.currentCarrier && scannedData?.policyNumber &&
      scannedData?.effectiveDate && scannedData?.expirationDate &&
      intake.currentPremium && scannedData?.paymentFrequency &&
      hasValidVehicle && hasValidDriver;

    if (hasRealPolicyData) {
      const policy: Policy = {
        id: `pol_${Date.now()}`,
        carrier: intake.currentCarrier!,
        policyNumber: scannedData!.policyNumber!,
        effectiveDate: scannedData!.effectiveDate!,
        expirationDate: scannedData!.expirationDate!,
        premium: intake.currentPremium!,
        paymentFrequency: scannedData!.paymentFrequency!,
        nextPaymentDue: undefined,
        deductibleComp: intake.compDeductible,
        deductibleColl: intake.collisionDeductible,
        liabilityBI: scannedData.liabilityBI,
        liabilityPD: scannedData.liabilityPD,
        coveragesSummary: scannedData.coveragesSummary,
        vehicles: vehicles,
        drivers: drivers,
        isActive: true,
      };

      addPolicy(policy);
      console.log('[UPLOAD] Policy created with REAL data:', policy.id, policy.carrier);

      // 8) Reminder ONLY if nextPaymentDue and premium are REAL (no zeros)
      if (policy.nextPaymentDue && policy.premium && policy.premium > 0) {
        const paymentReminder: Reminder = {
          id: `rem_${Date.now()}`,
          policyId: policy.id,
          type: 'payment',
          dueAt: policy.nextPaymentDue,
          amount: policy.premium,
          channel: user?.preferredChannel || 'whatsapp',
          status: 'pending',
        };
        addReminder(paymentReminder);
      }
    } else {
      console.log('[UPLOAD] Insufficient real data for policy creation:', {
        hasCarrier: !!intake.currentCarrier,
        hasPolicyNumber: !!scannedData?.policyNumber,
        hasValidVehicle,
        hasValidDriver,
      });
    }

    setIsUploading(false);
    // Navigate to completion screen
    router.push('/quote-submitted');
  };

  const onWebFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleWebFileSelect(file);
      e.target.value = '';
    }
  };

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      {Platform.OS === 'web' && (
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
      )}
      {/* Custom header removed to use system header with Language button */}


      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, isWeb && styles.webContentContainer]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.contentInner, isWeb && styles.webContentInner]}>
          <Text style={styles.bodyText}>{text.body}</Text>

          <TouchableOpacity
            style={styles.mainUploadButton}
            onPress={() => {
              console.log('[UPLOAD] Main upload button tapped');
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              handleUploadPress();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.mainUploadButtonText}>{text.addPolicy}</Text>
          </TouchableOpacity>

          {uploadedFiles.length > 0 && (
            <View style={styles.filesSection}>
              <Text style={styles.filesSectionTitle}>
                {text.filesCount} ({uploadedFiles.length})
              </Text>
              {uploadedFiles.map((file, index) => (
                <View key={index} style={styles.fileCard}>
                  <View style={styles.filePreview}>
                    {file.previewUri ? (
                      <Image source={{ uri: file.previewUri }} style={styles.fileImage} />
                    ) : (
                      <FileText size={24} color={COLORS.primaryBlue} />
                    )}
                    {file.isScanning && (
                      <View style={styles.scanningOverlay}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <View style={styles.fileInfo}>
                    <View style={styles.fileNameRow}>
                      <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                      {file.confidence !== undefined && file.confidence > 0 && (
                        <View style={[
                          styles.confidenceBadge,
                          { backgroundColor: file.confidence > 80 ? COLORS.successLight : COLORS.backgroundSecondary }
                        ]}>
                          <Text style={[
                            styles.confidenceText,
                            { color: file.confidence > 80 ? COLORS.success : COLORS.textSecondary }
                          ]}>
                            {file.confidence}%
                          </Text>
                        </View>
                      )}
                    </View>
                    {file.scanResult && (
                      <View style={styles.scanResultPreview}>
                        {file.scanResult.carrier && (
                          <Text style={styles.scanResultText}>
                            {file.scanResult.carrier}
                            {file.scanResult.premium ? ` • $${file.scanResult.premium}/mo` : ''}
                          </Text>
                        )}
                      </View>
                    )}
                    {file.isScanning && (
                      <Text style={styles.scanningText}>{text.analyzing}</Text>
                    )}
                    {file.isValidDecPage === false && file.validationMessage && (
                      <Text style={styles.validationError} numberOfLines={2}>{file.validationMessage}</Text>
                    )}
                    {file.isValidDecPage === true && (
                      <Text style={styles.validationSuccess}>
                        {language === 'es' ? '✓ Declarations Page válida' : '✓ Valid Declarations Page'}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeFile(index)}
                  >
                    <X size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.infoCard}>
            <CheckCircle size={20} color={COLORS.success} />
            <Text style={styles.infoText}>{text.secure}</Text>
          </View>

          <Text style={styles.noteText}>{text.note}</Text>

          {/* Invalid files card removed - auto-navigates to chat now */}

          {/* Always show option to skip upload */}
          {uploadedFiles.length === 0 && (
            <TouchableOpacity
              style={styles.skipUploadButton}
              onPress={() => {
                triggerHaptic('light');
                router.push({
                  pathname: '/ai-assistant',
                  params: { mode: 'intake', skipUpload: 'true' },
                } as any);
              }}
            >
              <Text style={styles.skipUploadText}>
                {language === 'es'
                  ? '¿No tienes tu póliza? Continúa con el chat'
                  : 'Don\'t have your policy? Continue with chat'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {uploadedFiles.length > 0 && uploadedFiles.some(f => f.isValidDecPage || f.isScanning || f.confidence && f.confidence > 30) && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={[styles.footerInner, isWeb && styles.webFooter]}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (uploadedFiles.some(f => f.isScanning) || !uploadedFiles.some(f => f.isValidDecPage !== false)) && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              disabled={uploadedFiles.some(f => f.isScanning) || isUploading || !uploadedFiles.some(f => f.isValidDecPage !== false)}
            >
              <Text style={styles.submitButtonText}>
                {isUploading ? text.processing : (language === 'es' ? 'Analizar mi póliza' : 'Analyze my policy')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      <Modal
        visible={showActionSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowActionSheet(false)}
          />
          <View
            style={styles.actionSheet}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.actionSheetTitle}>{text.addPolicy}</Text>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => {
                  console.log('[UPLOAD] Camera option pressed');
                  pickImage('camera');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.actionSheetIcon}>
                  <Camera size={22} color={COLORS.primaryBlue} />
                </View>
                <Text style={styles.actionSheetOptionText}>{text.camera}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={() => {
                console.log('[UPLOAD] Library option pressed');
                pickImage('library');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.actionSheetIcon}>
                <ImageIcon size={22} color={COLORS.primaryBlue} />
              </View>
              <Text style={styles.actionSheetOptionText}>{text.library}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={() => {
                console.log('[UPLOAD] Files option pressed');
                handlePickDocument();
              }}
              activeOpacity={0.7}
            >
              <View style={styles.actionSheetIcon}>
                <FolderOpen size={22} color={COLORS.primaryBlue} />
              </View>
              <Text style={styles.actionSheetOptionText}>{text.files}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetCancel}
              onPress={() => {
                console.log('[UPLOAD] Cancel pressed');
                setShowActionSheet(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.actionSheetCancelText}>
                {language === 'es' ? 'Cancelar' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showConsentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View style={styles.consentOverlay}>
          <View style={styles.consentModal}>
            <Text style={styles.consentText}>{text.consent}</Text>

            <TouchableOpacity
              style={styles.consentCheckbox}
              onPress={() => setConsentAccepted(!consentAccepted)}
            >
              <View style={[styles.checkbox, consentAccepted && styles.checkboxChecked]}>
                {consentAccepted && <CheckCircle size={14} color="#FFFFFF" />}
              </View>
              <Text style={styles.consentCheckboxText}>{text.agree}</Text>
            </TouchableOpacity>

            <View style={styles.consentButtons}>
              <TouchableOpacity
                style={[
                  styles.consentButton,
                  !consentAccepted && styles.consentButtonDisabled
                ]}
                onPress={handleConsentContinue}
                disabled={!consentAccepted}
              >
                <Text style={styles.consentButtonText}>
                  {language === 'es' ? 'Continuar' : 'Continue'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.consentCancelButton}
                onPress={() => setShowConsentModal(false)}
              >
                <Text style={styles.consentCancelText}>
                  {language === 'es' ? 'Cancelar' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 120,
  },
  webContentContainer: {
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  contentInner: {
    flex: 1,
  },
  webContentInner: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    paddingHorizontal: 16,
  },
  bodyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: 24,
  },
  mainUploadButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
  },
  mainUploadButtonText: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  filesSection: {
    marginBottom: 24,
  },
  filesSectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
    marginBottom: 12,
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filePreview: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBlue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    overflow: 'hidden',
  },
  fileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  scanningOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.text,
    marginBottom: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: '700' as const,
  },
  scanResultPreview: {
    marginTop: 4,
  },
  scanResultText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: COLORS.primaryBlue,
  },
  scanningText: {
    fontSize: 11,
    color: COLORS.primaryBlue,
    marginTop: 4,
  },
  validationError: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 4,
    lineHeight: 15,
  },
  validationSuccess: {
    fontSize: 11,
    color: COLORS.success,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  removeButton: {
    padding: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.successLight,
    borderRadius: 14,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.success,
    lineHeight: 18,
  },
  noteText: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerInner: {
    padding: 16,
  },
  webFooter: {
    maxWidth: MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryBlue,
    paddingVertical: 18,
    borderRadius: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  actionSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionSheetIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primaryBlue + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionSheetOptionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  actionSheetCancel: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  consentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  consentModal: {
    backgroundColor: COLORS.background,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  consentText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  consentCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primaryBlue,
    borderColor: COLORS.primaryBlue,
  },
  consentCheckboxText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  consentButtons: {
    gap: 12,
  },
  consentButton: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  consentButtonDisabled: {
    backgroundColor: COLORS.textTertiary,
  },
  consentButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  consentCancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  consentCancelText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  invalidFilesCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  invalidFilesTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#991B1B',
    marginBottom: 8,
    textAlign: 'center',
  },
  invalidFilesText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: COLORS.primaryBlue,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  manualIntakeButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  manualIntakeButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  skipUploadButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  skipUploadText: {
    fontSize: 14,
    color: COLORS.primaryBlue,
    fontWeight: '600' as const,
    textDecorationLine: 'underline',
  },
});
