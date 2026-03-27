import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SAVER } from '@/constants/theme';

interface ConsentCheckboxProps {
  checked: boolean;
  onToggle: (value: boolean) => void;
  label: string;
  sublabel?: string;
}

export default function ConsentCheckbox({ checked, onToggle, label, sublabel }: ConsentCheckboxProps) {
  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onToggle(!checked);
  };

  return (
    <Pressable onPress={handleToggle} style={styles.container}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={14} color={SAVER.white} strokeWidth={3} />}
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: SAVER.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: SAVER.accent,
    borderColor: SAVER.accent,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: SAVER.text,
    lineHeight: 20,
  },
  sublabel: {
    fontSize: 12,
    color: SAVER.textMuted,
    marginTop: 4,
    lineHeight: 17,
  },
});
