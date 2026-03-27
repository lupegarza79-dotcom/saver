import React, { useState, useRef } from 'react';
import { View, TextInput, Text, StyleSheet, Animated, TextInputProps } from 'react-native';
import { SAVER } from '@/constants/theme';

interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export default function FormInput({ label, hint, error, required, icon, ...inputProps }: FormInputProps) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 150, useNativeDriver: false }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SAVER.border, SAVER.accent],
  });

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      <Animated.View style={[styles.inputWrap, { borderColor: error ? SAVER.error : borderColor }]}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <TextInput
          style={[styles.input, icon && styles.inputWithIcon]}
          placeholderTextColor={SAVER.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...inputProps}
        />
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: SAVER.textSecondary,
    marginBottom: 8,
  },
  required: {
    color: SAVER.error,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SAVER.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
  },
  iconWrap: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: SAVER.text,
  },
  inputWithIcon: {
    paddingLeft: 10,
  },
  error: {
    fontSize: 12,
    color: SAVER.error,
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: SAVER.textMuted,
    marginTop: 6,
  },
});
