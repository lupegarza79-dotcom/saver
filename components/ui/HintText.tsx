import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { SAVER } from '@/constants/theme';

interface HintTextProps {
  text: string;
  variant?: 'default' | 'success' | 'error';
  style?: TextStyle;
}

export default function HintText({ text, variant = 'default', style }: HintTextProps) {
  const colorMap = {
    default: SAVER.textMuted,
    success: SAVER.green,
    error: SAVER.error,
  } as const;

  return (
    <Text style={[styles.hint, { color: colorMap[variant] }, style]}>{text}</Text>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
});
