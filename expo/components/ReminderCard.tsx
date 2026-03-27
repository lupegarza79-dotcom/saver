import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell, Clock, CheckCircle, PauseCircle, Calendar } from 'lucide-react-native';
import { Reminder, Policy } from '@/types';
import { useApp } from '@/contexts/AppContext';

const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  primary: '#1A1A1A',
  accent: '#10B981',
  accentLight: '#D1FAE5',
  border: '#E5E7EB',
  success: '#10B981',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
};

interface ReminderCardProps {
  reminder: Reminder;
  policy?: Policy;
  onSnooze: () => void;
  onMarkPaid: () => void;
  onPause: () => void;
}

export default function ReminderCard({ reminder, policy, onSnooze, onMarkPaid, onPause }: ReminderCardProps) {
  const { language } = useApp();
  
  const dueDate = new Date(reminder.dueAt);
  const now = new Date();
  const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const isOverdue = daysUntil < 0;
  const isDueToday = daysUntil === 0;
  const isDueSoon = daysUntil <= 3 && daysUntil > 0;

  const getUrgencyColor = () => {
    if (isOverdue) return COLORS.danger;
    if (isDueToday) return COLORS.warning;
    if (isDueSoon) return COLORS.warning;
    return COLORS.info;
  };

  const getUrgencyBg = () => {
    if (isOverdue) return COLORS.dangerLight;
    if (isDueToday) return COLORS.warningLight;
    if (isDueSoon) return COLORS.warningLight;
    return COLORS.infoLight;
  };

  const getUrgencyText = () => {
    if (isOverdue) return language === 'es' ? `${Math.abs(daysUntil)}d vencido` : `${Math.abs(daysUntil)}d overdue`;
    if (isDueToday) return language === 'es' ? 'Hoy' : 'Due today';
    return language === 'es' ? `En ${daysUntil} días` : `In ${daysUntil} days`;
  };

  const urgencyColor = getUrgencyColor();

  return (
    <View style={[styles.container, isOverdue && styles.overdueContainer]}>
      <View style={styles.header}>
        <View style={styles.typeInfo}>
          <View style={[styles.iconBg, { backgroundColor: getUrgencyBg() }]}>
            {reminder.type === 'payment' ? (
              <Bell size={20} color={urgencyColor} />
            ) : (
              <Calendar size={20} color={urgencyColor} />
            )}
          </View>
          <View>
            <Text style={styles.type}>
              {reminder.type === 'payment' 
                ? (language === 'es' ? 'Pago' : 'Payment') 
                : (language === 'es' ? 'Renovación' : 'Renewal')}
            </Text>
            {policy && (
              <Text style={styles.policyInfo}>{policy.carrier}</Text>
            )}
          </View>
        </View>
        <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyBg() }]}>
          <Text style={[styles.urgencyText, { color: urgencyColor }]}>
            {getUrgencyText()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{language === 'es' ? 'Fecha' : 'Due'}</Text>
          <Text style={styles.detailValue}>
            {dueDate.toLocaleDateString()}
          </Text>
        </View>
        {reminder.amount && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{language === 'es' ? 'Monto' : 'Amount'}</Text>
            <Text style={styles.detailValueBold}>${reminder.amount}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onSnooze} activeOpacity={0.7}>
          <Clock size={16} color={COLORS.info} />
          <Text style={[styles.actionText, { color: COLORS.info }]}>
            {language === 'es' ? '+1 día' : '+1 day'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.paidButton} 
          onPress={onMarkPaid} 
          activeOpacity={0.7}
        >
          <CheckCircle size={16} color="#FFFFFF" />
          <Text style={styles.paidButtonText}>
            {language === 'es' ? 'Pagado' : 'Paid'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonIcon} onPress={onPause} activeOpacity={0.7}>
          <PauseCircle size={22} color={COLORS.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  overdueContainer: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.danger,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  type: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  policyInfo: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  details: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600' as const,
  },
  detailValueBold: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '800' as const,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paidButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
  },
  paidButtonText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  actionButtonIcon: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
