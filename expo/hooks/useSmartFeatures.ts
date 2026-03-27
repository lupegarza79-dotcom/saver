import { useState, useCallback } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Calendar from 'expo-calendar';
import * as Sharing from 'expo-sharing';
import * as Notifications from 'expo-notifications';
import { Reminder, Policy, PolicySnapshot } from '@/types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
  'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
  'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
  'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
  'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
  'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
  'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
  'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming',
};

export interface LocationData {
  state?: string;
  stateCode?: string;
  city?: string;
  zip?: string;
  latitude: number;
  longitude: number;
}

export function useSmartFeatures() {
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const detectLocation = useCallback(async (): Promise<LocationData | null> => {
    if (Platform.OS === 'web') {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 10000,
          });
        });
        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (error) {
        console.log('[LOCATION] Web geolocation failed:', error);
        return null;
      }
    }

    setIsLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[LOCATION] Permission denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        const stateCode = address.region?.toUpperCase();
        const stateName = stateCode ? US_STATES[stateCode] : undefined;
        
        console.log('[LOCATION] Detected:', {
          state: stateName,
          stateCode,
          city: address.city,
          zip: address.postalCode,
        });

        return {
          state: stateName,
          stateCode,
          city: address.city ?? undefined,
          zip: address.postalCode ?? undefined,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
      }

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('[LOCATION] Error:', error);
      return null;
    } finally {
      setIsLoadingLocation(false);
    }
  }, []);

  const addPaymentToCalendar = useCallback(async (
    reminder: Reminder,
    policy: Policy,
    language: 'en' | 'es'
  ): Promise<boolean> => {
    if (Platform.OS === 'web') {
      const startDate = new Date(reminder.dueAt);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      const title = language === 'es' 
        ? `Pago de seguro - ${policy.carrier}` 
        : `Insurance Payment - ${policy.carrier}`;
      
      const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(`$${reminder.amount || policy.premium}`)}`;
      
      await Linking.openURL(googleCalUrl);
      return true;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          language === 'es' ? 'Permiso requerido' : 'Permission needed',
          language === 'es' ? 'Se necesita acceso al calendario' : 'Calendar access is required'
        );
        return false;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(
        (cal) => cal.allowsModifications && cal.source?.name === 'Default'
      ) || calendars.find((cal) => cal.allowsModifications);

      if (!defaultCalendar) {
        Alert.alert(
          language === 'es' ? 'Error' : 'Error',
          language === 'es' ? 'No se encontró calendario disponible' : 'No available calendar found'
        );
        return false;
      }

      const startDate = new Date(reminder.dueAt);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: language === 'es' 
          ? `Pago de seguro - ${policy.carrier}` 
          : `Insurance Payment - ${policy.carrier}`,
        notes: language === 'es'
          ? `Monto: $${reminder.amount || policy.premium}\nPóliza: ${policy.policyNumber}`
          : `Amount: $${reminder.amount || policy.premium}\nPolicy: ${policy.policyNumber}`,
        startDate,
        endDate,
        alarms: [
          { relativeOffset: -1440 },
          { relativeOffset: -60 },
        ],
      });

      console.log('[CALENDAR] Event created for', reminder.dueAt);
      return true;
    } catch (error) {
      console.error('[CALENDAR] Error:', error);
      return false;
    }
  }, []);

  const shareSnapshot = useCallback(async (
    snapshot: PolicySnapshot,
    policy: Policy,
    language: 'en' | 'es'
  ): Promise<boolean> => {
    const gradeEmoji = {
      'A': '🟢',
      'B': '🟡',
      'C': '🟠',
      'D': '🔴',
    }[snapshot.grade] || '⚪';

    const message = language === 'es'
      ? `🛡️ Mi Saver Snapshot\n\n${gradeEmoji} Calificación: ${snapshot.grade}\n💰 Ahorro potencial: $${snapshot.monthlySavings}/mes\n🚗 ${policy.carrier} - ${policy.vehicles[0]?.year} ${policy.vehicles[0]?.make}\n\n📋 Hallazgos:\n${snapshot.findings.slice(0, 3).map(f => `• ${f}`).join('\n')}\n\n¿Puedes mejorar esta póliza? Descarga Saver.Insurance`
      : `🛡️ My Saver Snapshot\n\n${gradeEmoji} Grade: ${snapshot.grade}\n💰 Potential savings: $${snapshot.monthlySavings}/mo\n🚗 ${policy.carrier} - ${policy.vehicles[0]?.year} ${policy.vehicles[0]?.make}\n\n📋 Findings:\n${snapshot.findings.slice(0, 3).map(f => `• ${f}`).join('\n')}\n\nCan you beat this policy? Download Saver.Insurance`;

    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: language === 'es' ? 'Mi Saver Snapshot' : 'My Saver Snapshot',
            text: message,
          });
          return true;
        } catch {
          await navigator.clipboard.writeText(message);
          Alert.alert(
            language === 'es' ? '¡Copiado!' : 'Copied!',
            language === 'es' ? 'Snapshot copiado al portapapeles' : 'Snapshot copied to clipboard'
          );
          return true;
        }
      } else {
        await navigator.clipboard.writeText(message);
        Alert.alert(
          language === 'es' ? '¡Copiado!' : 'Copied!',
          language === 'es' ? 'Snapshot copiado al portapapeles' : 'Snapshot copied to clipboard'
        );
        return true;
      }
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          language === 'es' ? 'No disponible' : 'Not available',
          language === 'es' ? 'Compartir no está disponible en este dispositivo' : 'Sharing is not available on this device'
        );
        return false;
      }

      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpenWhatsApp) {
        await Linking.openURL(whatsappUrl);
      } else {
        const smsUrl = `sms:?body=${encodeURIComponent(message)}`;
        await Linking.openURL(smsUrl);
      }
      
      console.log('[SHARE] Snapshot shared');
      return true;
    } catch (error) {
      console.error('[SHARE] Error:', error);
      return false;
    }
  }, []);

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      console.log('[NOTIFICATIONS] Not supported on web');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NOTIFICATIONS] Permission not granted');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      
      console.log('[NOTIFICATIONS] Push token:', tokenData.data);
      return tokenData.data;
    } catch (error) {
      console.error('[NOTIFICATIONS] Error getting push token:', error);
      return null;
    }
  }, []);

  const schedulePaymentReminder = useCallback(async (
    reminder: Reminder,
    policy: Policy,
    language: 'en' | 'es'
  ): Promise<boolean> => {
    if (Platform.OS === 'web') {
      console.log('[NOTIFICATIONS] Local notifications not supported on web');
      return false;
    }

    try {
      const dueDate = new Date(reminder.dueAt);
      const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
      
      if (oneDayBefore > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: language === 'es' ? '💳 Pago próximo' : '💳 Payment Due Soon',
            body: language === 'es'
              ? `Tu pago de ${policy.carrier} ($${reminder.amount || policy.premium}) vence mañana`
              : `Your ${policy.carrier} payment ($${reminder.amount || policy.premium}) is due tomorrow`,
            data: { type: 'payment_reminder', policyId: policy.id, reminderId: reminder.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: oneDayBefore,
          },
        });
        console.log('[NOTIFICATIONS] Payment reminder scheduled for', oneDayBefore);
      }

      if (dueDate > new Date()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: language === 'es' ? '⚠️ Pago vence hoy' : '⚠️ Payment Due Today',
            body: language === 'es'
              ? `Tu pago de ${policy.carrier} ($${reminder.amount || policy.premium}) vence hoy`
              : `Your ${policy.carrier} payment ($${reminder.amount || policy.premium}) is due today`,
            data: { type: 'payment_due', policyId: policy.id, reminderId: reminder.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: dueDate,
          },
        });
        console.log('[NOTIFICATIONS] Payment due notification scheduled for', dueDate);
      }

      return true;
    } catch (error) {
      console.error('[NOTIFICATIONS] Error scheduling:', error);
      return false;
    }
  }, []);

  const sendInstantNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    if (Platform.OS === 'web') return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: null,
      });
      console.log('[NOTIFICATIONS] Instant notification sent');
    } catch (error) {
      console.error('[NOTIFICATIONS] Error sending instant notification:', error);
    }
  }, []);

  return {
    detectLocation,
    isLoadingLocation,
    addPaymentToCalendar,
    shareSnapshot,
    registerForPushNotifications,
    schedulePaymentReminder,
    sendInstantNotification,
  };
}
