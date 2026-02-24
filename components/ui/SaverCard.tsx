import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SAVER } from '@/constants/theme';

interface SaverCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated';
}

export default function SaverCard({ children, style, variant = 'default' }: SaverCardProps) {
  return (
    <View style={[styles.card, variant === 'elevated' && styles.elevated, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: SAVER.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  elevated: {
    backgroundColor: SAVER.surfaceLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
});
