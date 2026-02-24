import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SAVER } from '@/constants/theme';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {action && <View style={styles.actionWrap}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconWrap: {
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: SAVER.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: SAVER.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionWrap: {
    marginTop: 20,
  },
});
