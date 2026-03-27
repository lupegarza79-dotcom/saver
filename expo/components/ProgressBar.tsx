import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface ProgressBarProps {
  progress: number;
  currentStep: number;
  totalSteps: number;
  stepLabel?: string;
  color?: string;
  trackColor?: string;
  textColor?: string;
}

export default function ProgressBar({
  progress,
  currentStep,
  totalSteps,
  stepLabel,
  color = '#0066FF',
  trackColor = 'rgba(255,255,255,0.08)',
  textColor = 'rgba(255,255,255,0.5)',
}: ProgressBarProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedWidth]);

  const widthInterpolation = animatedWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color, width: widthInterpolation },
          ]}
        />
      </View>
      <Text style={[styles.label, { color: textColor }]}>
        {stepLabel || `${currentStep} of ${totalSteps}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500' as const,
    minWidth: 40,
    textAlign: 'right',
  },
});
