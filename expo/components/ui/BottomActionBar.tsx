import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { SAVER } from '@/constants/theme';

interface BottomActionBarProps {
  children: React.ReactNode;
  bottomInset?: number;
  style?: ViewStyle;
}

export default function BottomActionBar({ children, bottomInset = 20, style }: BottomActionBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 20) }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: SAVER.bg,
  },
});
