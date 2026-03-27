import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SAVER } from '@/constants/theme';

interface InlineStatusBadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export default function InlineStatusBadge({
  label,
  color = SAVER.green,
  bgColor = SAVER.greenLight,
}: InlineStatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
});
