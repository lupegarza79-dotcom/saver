import { useState, useCallback, useRef } from 'react';
import { Platform, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as MailComposer from 'expo-mail-composer';
import * as StoreReview from 'expo-store-review';
import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';
import * as Clipboard from 'expo-clipboard';
import { Reminder, Policy, PolicySnapshot, Agent } from '@/types';

export interface TrustScore {
  overall: number;
  documentVerification: number;
  profileCompleteness: number;
  activityScore: number;
  paymentHistory: number;
  level: 'bronze' | 'silver' | 'gold' | 'platinum';
  badges: TrustBadge[];
}

export interface TrustBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

export interface SmartAction {
  id: string;
  type: 'reminder' | 'savings_alert' | 'renewal_warning' | 'coverage_gap' | 'rate_increase';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  actionLabel: string;
  actionRoute?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
}

const TRUST_BADGES: TrustBadge[] = [
  { id: 'verified_docs', name: 'Verified Documents', description: 'All documents verified by AI', icon: '✓' },
  { id: 'on_time_payer', name: 'On-Time Payer', description: '3+ consecutive on-time payments', icon: '💎' },
  { id: 'complete_profile', name: 'Complete Profile', description: 'All profile information filled', icon: '👤' },
  { id: 'safe_driver', name: 'Safe Driver', description: 'No incidents reported', icon: '🛡️' },
  { id: 'early_adopter', name: 'Early Adopter', description: 'Joined in the first month', icon: '⭐' },
  { id: 'snapshot_shared', name: 'Snapshot Shared', description: 'Shared snapshot with agents', icon: '📤' },
];

export function useSmartFeaturesPro() {
  const [isProcessing] = useState(false);
  const reviewRequestedRef = useRef(false);

  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (Platform.OS === 'web') return;
    
    try {
      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      console.log('[HAPTICS] Error:', error);
    }
  }, []);

  const pickDocument = useCallback(async (): Promise<string | null> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return null;
      }

      console.log('[DOC_PICKER] Document selected:', result.assets[0].name);
      return result.assets[0].uri;
    } catch (error) {
      console.error('[DOC_PICKER] Error:', error);
      return null;
    }
  }, []);

  const printDocument = useCallback(async (
    content: string,
    options?: { title?: string; orientation?: 'portrait' | 'landscape' }
  ): Promise<boolean> => {
    try {
      await Print.printAsync({
        html: content,
        orientation: options?.orientation === 'landscape' 
          ? Print.Orientation.landscape 
          : Print.Orientation.portrait,
      });
      console.log('[PRINT] Document printed');
      return true;
    } catch (error) {
      console.error('[PRINT] Error:', error);
      return false;
    }
  }, []);

  const generateIDCardHTML = useCallback((policy: Policy): string => {
    const vehicle = policy.vehicles[0];
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
    .card { border: 2px solid #00D9FF; border-radius: 12px; padding: 20px; max-width: 400px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .logo { font-size: 24px; font-weight: bold; color: #00D9FF; }
    .carrier { font-size: 18px; font-weight: 600; }
    .row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { color: #666; font-size: 12px; }
    .value { font-weight: 600; font-size: 14px; }
    .vehicle { background: #f5f5f5; padding: 12px; border-radius: 8px; margin-top: 12px; }
    .footer { text-align: center; margin-top: 16px; font-size: 10px; color: #999; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">SAVER</div>
      <div class="carrier">${policy.carrier}</div>
    </div>
    <div class="row">
      <div><span class="label">Policy Number</span><br><span class="value">${policy.policyNumber}</span></div>
      <div><span class="label">Effective</span><br><span class="value">${new Date(policy.effectiveDate).toLocaleDateString()}</span></div>
    </div>
    <div class="row">
      <div><span class="label">Expiration</span><br><span class="value">${new Date(policy.expirationDate).toLocaleDateString()}</span></div>
      <div><span class="label">Premium</span><br><span class="value">$${policy.premium}/mo</span></div>
    </div>
    <div class="vehicle">
      <span class="label">Vehicle</span><br>
      <span class="value">${vehicle?.year} ${vehicle?.make} ${vehicle?.model}</span>
    </div>
    <div class="footer">Generated by Saver.Insurance • saver.insurance</div>
  </div>
</body>
</html>`;
  }, []);

  const printIDCard = useCallback(async (policy: Policy): Promise<boolean> => {
    const html = generateIDCardHTML(policy);
    return printDocument(html, { title: `Insurance ID - ${policy.carrier}` });
  }, [generateIDCardHTML, printDocument]);

  const composeEmail = useCallback(async (
    options: {
      recipients?: string[];
      subject?: string;
      body?: string;
      attachments?: string[];
    }
  ): Promise<boolean> => {
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        if (options.recipients?.[0]) {
          await Linking.openURL(`mailto:${options.recipients[0]}?subject=${encodeURIComponent(options.subject || '')}&body=${encodeURIComponent(options.body || '')}`);
        }
        return true;
      }

      await MailComposer.composeAsync({
        recipients: options.recipients,
        subject: options.subject,
        body: options.body,
        attachments: options.attachments,
      });
      console.log('[MAIL] Email composed');
      return true;
    } catch (error) {
      console.error('[MAIL] Error:', error);
      return false;
    }
  }, []);

  const contactAgent = useCallback(async (
    agent: Agent,
    subject: string,
    message: string
  ): Promise<boolean> => {
    return composeEmail({
      recipients: [agent.email],
      subject: `Saver.Insurance: ${subject}`,
      body: `Hi ${agent.fullName},\n\n${message}\n\nSent via Saver.Insurance`,
    });
  }, [composeEmail]);

  const requestStoreReview = useCallback(async (): Promise<boolean> => {
    if (reviewRequestedRef.current) return false;
    
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (!isAvailable) {
        console.log('[REVIEW] Store review not available');
        return false;
      }

      await StoreReview.requestReview();
      reviewRequestedRef.current = true;
      console.log('[REVIEW] Review requested');
      return true;
    } catch (error) {
      console.error('[REVIEW] Error:', error);
      return false;
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(text);
      console.log('[CLIPBOARD] Text copied');
      return true;
    } catch (error) {
      console.error('[CLIPBOARD] Error:', error);
      return false;
    }
  }, []);

  const openDeepLink = useCallback(async (url: string): Promise<boolean> => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[DEEPLINK] Error:', error);
      return false;
    }
  }, []);

  const openWhatsApp = useCallback(async (phone: string, message?: string): Promise<boolean> => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = message 
      ? `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`
      : `whatsapp://send?phone=${cleanPhone}`;
    return openDeepLink(url);
  }, [openDeepLink]);

  const callPhone = useCallback(async (phone: string): Promise<boolean> => {
    const cleanPhone = phone.replace(/\D/g, '');
    return openDeepLink(`tel:${cleanPhone}`);
  }, [openDeepLink]);

  const openSMS = useCallback(async (phone: string, message?: string): Promise<boolean> => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = message 
      ? `sms:${cleanPhone}?body=${encodeURIComponent(message)}`
      : `sms:${cleanPhone}`;
    return openDeepLink(url);
  }, [openDeepLink]);

  const calculateTrustScore = useCallback((
    policies: Policy[],
    reminders: Reminder[],
    userProfile: { name?: string; email?: string; phone?: string }
  ): TrustScore => {
    let documentVerification = 0;
    let profileCompleteness = 0;
    let activityScore = 0;
    let paymentHistory = 0;
    const badges: TrustBadge[] = [];

    if (policies.length > 0) {
      documentVerification = Math.min(100, policies.length * 25);
      badges.push(TRUST_BADGES[0]);
    }

    let profileFields = 0;
    if (userProfile.name) profileFields++;
    if (userProfile.email) profileFields++;
    if (userProfile.phone) profileFields++;
    profileCompleteness = Math.round((profileFields / 3) * 100);
    if (profileCompleteness === 100) {
      badges.push(TRUST_BADGES[2]);
    }

    activityScore = Math.min(100, policies.length * 20 + reminders.length * 10);

    const completedReminders = reminders.filter(r => r.status === 'completed');
    const totalReminders = reminders.length;
    if (totalReminders > 0) {
      paymentHistory = Math.round((completedReminders.length / totalReminders) * 100);
      if (completedReminders.length >= 3) {
        badges.push(TRUST_BADGES[1]);
      }
    } else {
      paymentHistory = 50;
    }

    const overall = Math.round(
      (documentVerification * 0.3) +
      (profileCompleteness * 0.2) +
      (activityScore * 0.2) +
      (paymentHistory * 0.3)
    );

    let level: TrustScore['level'] = 'bronze';
    if (overall >= 90) level = 'platinum';
    else if (overall >= 75) level = 'gold';
    else if (overall >= 50) level = 'silver';

    return {
      overall,
      documentVerification,
      profileCompleteness,
      activityScore,
      paymentHistory,
      level,
      badges,
    };
  }, []);

  const generateSmartActions = useCallback((
    policies: Policy[],
    reminders: Reminder[],
    snapshots: PolicySnapshot[]
  ): SmartAction[] => {
    const actions: SmartAction[] = [];
    const now = new Date();

    reminders.forEach(reminder => {
      if (reminder.status !== 'pending') return;
      
      const dueDate = new Date(reminder.dueAt);
      const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil <= 0) {
        actions.push({
          id: `overdue_${reminder.id}`,
          type: 'reminder',
          priority: 'urgent',
          title: reminder.type === 'payment' ? 'Payment Overdue!' : 'Renewal Overdue!',
          description: `Your ${reminder.type} was due ${Math.abs(daysUntil)} days ago`,
          actionLabel: 'Take Action',
          actionRoute: '/guardian',
          data: { reminderId: reminder.id },
          createdAt: now.toISOString(),
        });
      } else if (daysUntil <= 3) {
        actions.push({
          id: `urgent_${reminder.id}`,
          type: 'reminder',
          priority: 'high',
          title: `${reminder.type === 'payment' ? 'Payment' : 'Renewal'} Due Soon`,
          description: `Due in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
          actionLabel: 'View Details',
          actionRoute: '/guardian',
          data: { reminderId: reminder.id },
          createdAt: now.toISOString(),
        });
      }
    });

    snapshots.forEach(snapshot => {
      if (snapshot.monthlySavings >= 30) {
        actions.push({
          id: `savings_${snapshot.id}`,
          type: 'savings_alert',
          priority: 'medium',
          title: `Save $${snapshot.monthlySavings}/month!`,
          description: 'We found potential savings on your policy',
          actionLabel: 'See Quotes',
          actionRoute: '/quotes',
          data: { snapshotId: snapshot.id },
          createdAt: now.toISOString(),
        });
      }

      if (snapshot.grade === 'D') {
        actions.push({
          id: `coverage_${snapshot.id}`,
          type: 'coverage_gap',
          priority: 'high',
          title: 'Coverage Needs Review',
          description: 'Your policy grade indicates potential gaps',
          actionLabel: 'Review Policy',
          actionRoute: `/policy-detail?id=${snapshot.policyId}`,
          data: { snapshotId: snapshot.id },
          createdAt: now.toISOString(),
        });
      }
    });

    policies.forEach(policy => {
      const expirationDate = new Date(policy.expirationDate);
      const daysUntilExpiry = Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        actions.push({
          id: `renewal_${policy.id}`,
          type: 'renewal_warning',
          priority: daysUntilExpiry <= 7 ? 'high' : 'medium',
          title: 'Policy Expiring Soon',
          description: `${policy.carrier} expires in ${daysUntilExpiry} days`,
          actionLabel: 'Get Quotes',
          actionRoute: '/quotes',
          data: { policyId: policy.id },
          createdAt: now.toISOString(),
        });
      }
    });

    return actions.sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, []);

  const shareSnapshotRich = useCallback(async (
    snapshot: PolicySnapshot,
    policy: Policy,
    language: 'en' | 'es'
  ): Promise<boolean> => {
    const gradeEmoji = { A: '🟢', B: '🟡', C: '🟠', D: '🔴' }[snapshot.grade] || '⚪';
    
    const message = language === 'es'
      ? `🛡️ Mi Saver Snapshot\n\n${gradeEmoji} Calificación: ${snapshot.grade}\n💰 Ahorro potencial: $${snapshot.monthlySavings}/mes\n🚗 ${policy.carrier} - ${policy.vehicles[0]?.year} ${policy.vehicles[0]?.make}\n\n📋 Hallazgos:\n${snapshot.findings.slice(0, 3).map(f => `• ${f}`).join('\n')}\n\n¿Puedes mejorar esta póliza?\n\n📲 Descarga Saver.Insurance`
      : `🛡️ My Saver Snapshot\n\n${gradeEmoji} Grade: ${snapshot.grade}\n💰 Potential savings: $${snapshot.monthlySavings}/mo\n🚗 ${policy.carrier} - ${policy.vehicles[0]?.year} ${policy.vehicles[0]?.make}\n\n📋 Findings:\n${snapshot.findings.slice(0, 3).map(f => `• ${f}`).join('\n')}\n\nCan you beat this policy?\n\n📲 Download Saver.Insurance`;

    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({
            title: language === 'es' ? 'Mi Saver Snapshot' : 'My Saver Snapshot',
            text: message,
          });
          return true;
        } catch {
          await copyToClipboard(message);
          return true;
        }
      } else {
        await copyToClipboard(message);
        return true;
      }
    }

    const whatsappSuccess = await openWhatsApp('', message);
    if (!whatsappSuccess) {
      await openSMS('', message);
    }
    return true;
  }, [copyToClipboard, openWhatsApp, openSMS]);

  return {
    isProcessing,
    triggerHaptic,
    pickDocument,
    printDocument,
    printIDCard,
    generateIDCardHTML,
    composeEmail,
    contactAgent,
    requestStoreReview,
    copyToClipboard,
    openDeepLink,
    openWhatsApp,
    callPhone,
    openSMS,
    calculateTrustScore,
    generateSmartActions,
    shareSnapshotRich,
  };
}
