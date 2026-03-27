import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import {
  MessageCircle,
  Phone,
  Copy,
  Send,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { buildFollowUpForLead, buildWhatsAppUrl } from '../utils/followup';
import type { QuoteInput, Language } from '@/types/intake';

interface SearchLeadActionsProps {
  leadId: string;
  phone?: string | null;
  language: Language;
  status: string;
  canQuote: boolean;
  intake?: QuoteInput;
  onCreateQuoteRequest?: () => void;
  isCreatingQuote?: boolean;
}

function hapticFeedback() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

export default function SearchLeadActions({
  leadId,
  phone,
  language,
  status,
  canQuote,
  intake,
  onCreateQuoteRequest,
  isCreatingQuote,
}: SearchLeadActionsProps) {
  const [copiedMessage, setCopiedMessage] = useState(false);

  const followUpMessage = intake
    ? buildFollowUpForLead({ leadId, phone, intake, language })
    : null;

  const handleCopyMessage = () => {
    if (!followUpMessage) return;
    hapticFeedback();

    if (Platform.OS === 'web') {
      navigator.clipboard?.writeText(followUpMessage);
    } else {
      Clipboard.setStringAsync(followUpMessage);
    }

    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!phone) {
      Alert.alert('Error', 'No phone number available');
      return;
    }
    hapticFeedback();

    const message = followUpMessage || '';
    const url = buildWhatsAppUrl(phone, message);
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (!phone) {
      Alert.alert('Error', 'No phone number available');
      return;
    }
    hapticFeedback();
    Linking.openURL(`tel:${phone}`);
  };

  const handleCreateQuoteRequest = () => {
    if (!canQuote || status !== 'READY_TO_QUOTE') {
      Alert.alert('Not Ready', 'This lead is not READY_TO_QUOTE yet.');
      return;
    }
    hapticFeedback();

    Alert.alert(
      'Create Quote Request',
      'This will create a QuoteRequest for this lead. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create', onPress: onCreateQuoteRequest },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {phone && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleOpenWhatsApp}
            >
              <MessageCircle size={16} color={Colors.success} />
              <Text style={styles.actionText}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
              <Phone size={16} color={Colors.info} />
              <Text style={styles.actionText}>Call</Text>
            </TouchableOpacity>
          </>
        )}

        {followUpMessage && (
          <TouchableOpacity
            style={[styles.actionBtn, copiedMessage && styles.actionBtnSuccess]}
            onPress={handleCopyMessage}
          >
            <Copy size={16} color={copiedMessage ? Colors.success : Colors.secondary} />
            <Text style={[styles.actionText, copiedMessage && { color: Colors.success }]}>
              {copiedMessage ? 'Copied!' : 'Copy Msg'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {status === 'READY_TO_QUOTE' && canQuote && onCreateQuoteRequest && (
        <TouchableOpacity
          style={[styles.primaryBtn, isCreatingQuote && styles.primaryBtnDisabled]}
          onPress={handleCreateQuoteRequest}
          disabled={isCreatingQuote}
        >
          <Send size={16} color={Colors.textInverse} />
          <Text style={styles.primaryBtnText}>
            {isCreatingQuote ? 'Creating...' : 'Create Quote Request'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnSuccess: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.secondary,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textInverse,
  },
});
