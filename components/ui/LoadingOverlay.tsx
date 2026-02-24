import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { SAVER } from '@/constants/theme';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  submessage?: string;
}

export default function LoadingOverlay({ visible, message, submessage }: LoadingOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="auto">
      <View style={styles.card}>
        <ActivityIndicator size="large" color={SAVER.accent} />
        {message && <Text style={styles.message}>{message}</Text>}
        {submessage && <Text style={styles.submessage}>{submessage}</Text>}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,17,32,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  card: {
    backgroundColor: SAVER.surface,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: SAVER.border,
    minWidth: 200,
  },
  message: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: SAVER.text,
    textAlign: 'center',
  },
  submessage: {
    fontSize: 13,
    color: SAVER.textSecondary,
    textAlign: 'center',
  },
});
