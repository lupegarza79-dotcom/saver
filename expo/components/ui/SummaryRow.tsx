import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { SAVER } from '@/constants/theme';

interface SummaryRowProps {
  label: string;
  value: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  missing?: boolean;
}

export default function SummaryRow({ label, value, onPress, icon, missing }: SummaryRowProps) {
  const content = (
    <View style={styles.row}>
      {icon && <View style={styles.iconWrap}>{icon}</View>}
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, missing && styles.valueMissing]}>{value}</Text>
      </View>
      {onPress && <ChevronRight size={16} color={SAVER.textMuted} />}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: SAVER.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: SAVER.textMuted,
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    color: SAVER.text,
    fontWeight: '600' as const,
  },
  valueMissing: {
    color: SAVER.orange,
    fontStyle: 'italic' as const,
  },
});
