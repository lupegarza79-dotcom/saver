import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SAVER } from '@/constants/theme';

interface SegmentOption {
  value: string;
  label: string;
}

interface SegmentedSelectorProps {
  options: SegmentOption[];
  value: string | null;
  onSelect: (value: string) => void;
  label?: string;
}

export default function SegmentedSelector({ options, value, onSelect, label }: SegmentedSelectorProps) {
  const handleSelect = (v: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onSelect(v);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => handleSelect(opt.value)}
              style={[styles.segment, isActive && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
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
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: SAVER.surfaceLight,
    borderWidth: 1,
    borderColor: SAVER.border,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: SAVER.accentLight,
    borderColor: SAVER.accent,
  },
  segmentText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: SAVER.textSecondary,
  },
  segmentTextActive: {
    color: SAVER.accent,
  },
});
