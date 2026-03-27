import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SAVER } from '@/constants/theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export default function SectionHeader({ title, subtitle, right }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: SAVER.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },
  subtitle: {
    fontSize: 12,
    color: SAVER.textMuted,
    marginTop: 2,
  },
});
