import React from 'react';
import { Pressable, Text, StyleSheet, Platform, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SAVER } from '@/constants/theme';

interface SecondaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export default function SecondaryButton({ label, onPress, icon, disabled, style, testID }: SecondaryButtonProps) {
  const handlePress = () => {
    if (disabled) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && { opacity: 0.85 },
        style,
      ]}
      testID={testID}
    >
      {icon}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: SAVER.accentLight,
    borderWidth: 1,
    borderColor: 'rgba(0,102,255,0.2)',
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: SAVER.accent,
  },
  labelDisabled: {
    color: SAVER.textMuted,
  },
});
