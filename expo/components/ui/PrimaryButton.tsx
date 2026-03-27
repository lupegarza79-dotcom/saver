import React, { useRef, useCallback } from 'react';
import { Pressable, Text, StyleSheet, Animated, ActivityIndicator, Platform, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SAVER } from '@/constants/theme';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export default function PrimaryButton({ label, onPress, icon, loading, disabled, style, testID }: PrimaryButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    if (disabled || loading) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 60, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress();
  }, [onPress, disabled, loading, scale]);

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        disabled={disabled || loading}
        style={({ pressed }) => [styles.wrapper, pressed && { opacity: 0.92 }]}
        testID={testID}
      >
        <LinearGradient
          colors={disabled ? ['#334155', '#2D3A4F'] : [SAVER.accent, SAVER.accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {loading ? (
            <ActivityIndicator color={SAVER.white} size="small" />
          ) : (
            <>
              {icon}
              <Text style={styles.label}>{label}</Text>
            </>
          )}
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
});
