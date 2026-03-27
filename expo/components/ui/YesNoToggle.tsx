import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SAVER } from '@/constants/theme';

interface YesNoToggleProps {
  value: boolean | null;
  onSelect: (value: boolean) => void;
  label?: string;
  yesLabel?: string;
  noLabel?: string;
}

export default function YesNoToggle({
  value,
  onSelect,
  label,
  yesLabel = 'Yes',
  noLabel = 'No',
}: YesNoToggleProps) {
  const handleSelect = (v: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onSelect(v);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <Pressable
          onPress={() => handleSelect(true)}
          style={[styles.option, value === true && styles.optionYes]}
        >
          <Check size={16} color={value === true ? SAVER.green : SAVER.textMuted} />
          <Text style={[styles.optionText, value === true && styles.optionTextYes]}>
            {yesLabel}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleSelect(false)}
          style={[styles.option, value === false && styles.optionNo]}
        >
          <X size={16} color={value === false ? SAVER.error : SAVER.textMuted} />
          <Text style={[styles.optionText, value === false && styles.optionTextNo]}>
            {noLabel}
          </Text>
        </Pressable>
      </View>
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
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SAVER.surfaceLight,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  optionYes: {
    backgroundColor: SAVER.greenLight,
    borderColor: SAVER.green,
  },
  optionNo: {
    backgroundColor: SAVER.errorLight,
    borderColor: SAVER.error,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: SAVER.textSecondary,
  },
  optionTextYes: {
    color: SAVER.green,
  },
  optionTextNo: {
    color: SAVER.error,
  },
});
