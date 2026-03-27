import React, { useCallback } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { Phone } from 'lucide-react-native';
import { SAVER } from '@/constants/theme';

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  hint?: string;
  error?: string;
  placeholder?: string;
  testID?: string;
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PhoneInput({ value, onChangeText, label, hint, error, placeholder, testID }: PhoneInputProps) {
  const handleChange = useCallback((text: string) => {
    const formatted = formatPhone(text);
    onChangeText(formatted);
  }, [onChangeText]);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, error ? styles.inputError : null]}>
        <View style={styles.prefixWrap}>
          <Phone size={16} color={SAVER.textMuted} />
          <Text style={styles.prefix}>+1</Text>
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder || '(555) 123-4567'}
          placeholderTextColor={SAVER.textMuted}
          keyboardType="phone-pad"
          testID={testID}
        />
      </View>
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SAVER.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  inputError: {
    borderColor: SAVER.error,
  },
  prefixWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 14,
    paddingRight: 4,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 16,
  },
  prefix: {
    fontSize: 15,
    color: SAVER.textSecondary,
    fontWeight: '600' as const,
  },
  input: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: SAVER.text,
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
