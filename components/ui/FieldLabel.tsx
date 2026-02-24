import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { SAVER } from '@/constants/theme';

interface FieldLabelProps {
  text: string;
  required?: boolean;
  style?: TextStyle;
}

export default function FieldLabel({ text, required, style }: FieldLabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {text}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: SAVER.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: SAVER.error,
  },
});
