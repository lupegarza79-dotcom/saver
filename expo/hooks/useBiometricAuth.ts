import { useState, useCallback, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const BIOMETRIC_ENABLED_KEY = 'saver_biometric_enabled';

export interface BiometricAuthState {
  isAvailable: boolean;
  isEnabled: boolean;
  biometricType: 'fingerprint' | 'facial' | 'iris' | 'none';
  isAuthenticating: boolean;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnabled: false,
    biometricType: 'none',
    isAuthenticating: false,
  });

  const checkBiometricAvailability = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        setState(prev => ({ ...prev, isAvailable: false, biometricType: 'none' }));
        return;
      }

      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      const isAvailable = compatible && enrolled;

      let biometricType: 'fingerprint' | 'facial' | 'iris' | 'none' = 'none';
      if (isAvailable) {
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          biometricType = 'facial';
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          biometricType = 'fingerprint';
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
          biometricType = 'iris';
        }
      }

      const enabledStr = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
      const isEnabled = enabledStr === 'true';

      setState(prev => ({
        ...prev,
        isAvailable,
        isEnabled: isAvailable && isEnabled,
        biometricType,
      }));

      console.log('[BIOMETRIC] Available:', isAvailable, 'Type:', biometricType, 'Enabled:', isEnabled);
    } catch (error) {
      console.error('[BIOMETRIC] Error checking availability:', error);
    }
  }, []);

  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  const authenticate = useCallback(async (reason?: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return true;
    }

    if (!state.isAvailable) {
      console.log('[BIOMETRIC] Not available, skipping auth');
      return true;
    }

    setState(prev => ({ ...prev, isAuthenticating: true }));

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: reason || 'Authenticate to access Saver',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      console.log('[BIOMETRIC] Auth result:', result.success);
      return result.success;
    } catch (error) {
      console.error('[BIOMETRIC] Auth error:', error);
      return false;
    } finally {
      setState(prev => ({ ...prev, isAuthenticating: false }));
    }
  }, [state.isAvailable]);

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!state.isAvailable) {
      Alert.alert(
        'Not Available',
        'Biometric authentication is not available on this device.'
      );
      return false;
    }

    const success = await authenticate('Enable biometric login for Saver');
    if (success) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      setState(prev => ({ ...prev, isEnabled: true }));
      console.log('[BIOMETRIC] Enabled');
    }
    return success;
  }, [state.isAvailable, authenticate]);

  const disableBiometric = useCallback(async () => {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'false');
    setState(prev => ({ ...prev, isEnabled: false }));
    console.log('[BIOMETRIC] Disabled');
  }, []);

  const getBiometricLabel = useCallback(() => {
    switch (state.biometricType) {
      case 'facial':
        return Platform.OS === 'ios' ? 'Face ID' : 'Face Recognition';
      case 'fingerprint':
        return Platform.OS === 'ios' ? 'Touch ID' : 'Fingerprint';
      case 'iris':
        return 'Iris Scanner';
      default:
        return 'Biometric';
    }
  }, [state.biometricType]);

  return {
    ...state,
    authenticate,
    enableBiometric,
    disableBiometric,
    getBiometricLabel,
    checkBiometricAvailability,
  };
}
