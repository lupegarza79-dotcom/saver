import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Send, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';

interface LeadSummary {
  id: string;
  phone?: string;
  language: string;
  status: string;
  canQuote: boolean;
}

interface ReadyBulkPanelProps {
  leads: LeadSummary[];
  onActionComplete?: () => void;
}

function hapticFeedback() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

export default function ReadyBulkPanel({ leads, onActionComplete }: ReadyBulkPanelProps) {
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const createQuoteRequestMutation = trpc.adminOps.createQuoteRequest.useMutation();

  const readyLeads = leads.filter(l => l.status === 'READY_TO_QUOTE' && l.canQuote);

  if (readyLeads.length === 0) return null;

  const handleBulkCreateQuoteRequests = async () => {
    Alert.alert(
      'Create Quote Requests',
      `This will create QuoteRequests for ${readyLeads.length} leads that are READY_TO_QUOTE. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create All',
          onPress: async () => {
            hapticFeedback();
            setProcessing(true);
            setProcessedCount(0);

            let successCount = 0;
            let errorCount = 0;

            for (const lead of readyLeads) {
              try {
                await createQuoteRequestMutation.mutateAsync({ leadId: lead.id });
                successCount++;
              } catch {
                errorCount++;
              }
              setProcessedCount(prev => prev + 1);
            }

            setProcessing(false);
            setProcessedCount(0);

            Alert.alert(
              'Bulk Create Complete',
              `Created ${successCount} QuoteRequests.\n${errorCount > 0 ? `Failed: ${errorCount}` : ''}`
            );

            onActionComplete?.();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <CheckCircle size={18} color={Colors.success} />
          <Text style={styles.headerTitle}>
            {readyLeads.length} Ready to Quote
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnPrimary]}
          onPress={handleBulkCreateQuoteRequests}
          disabled={processing}
        >
          {processing ? (
            <>
              <ActivityIndicator size="small" color={Colors.textInverse} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                {processedCount}/{readyLeads.length}
              </Text>
            </>
          ) : (
            <>
              <Send size={16} color={Colors.textInverse} />
              <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>
                Create All Quote Requests
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        Creates QuoteRequests for all READY_TO_QUOTE leads
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.success,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: Colors.surface,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.success,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actionBtnTextPrimary: {
    color: Colors.textInverse,
  },
  hint: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
  },
});
