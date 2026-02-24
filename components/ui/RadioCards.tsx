import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { SAVER } from '@/constants/theme';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface RadioCardsProps {
  options: RadioOption[];
  value: string | null;
  onSelect: (value: string) => void;
  label?: string;
}

export default function RadioCards({ options, value, onSelect, label }: RadioCardsProps) {
  const handleSelect = (v: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onSelect(v);
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.list}>
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => handleSelect(opt.value)}
              style={[styles.card, isActive && styles.cardActive]}
            >
              <View style={styles.cardContent}>
                {opt.icon && <View style={styles.iconWrap}>{opt.icon}</View>}
                <View style={styles.textWrap}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardLabel, isActive && styles.cardLabelActive]}>
                      {opt.label}
                    </Text>
                    {opt.badge && (
                      <View style={[styles.badge, isActive && styles.badgeActive]}>
                        <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                          {opt.badge}
                        </Text>
                      </View>
                    )}
                  </View>
                  {opt.description && (
                    <Text style={styles.cardDesc}>{opt.description}</Text>
                  )}
                </View>
              </View>
              <View style={[styles.radio, isActive && styles.radioActive]}>
                {isActive && <View style={styles.radioInner} />}
              </View>
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
  list: {
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    backgroundColor: SAVER.surfaceLight,
    borderWidth: 1,
    borderColor: SAVER.border,
  },
  cardActive: {
    backgroundColor: SAVER.accentLight,
    borderColor: SAVER.accent,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: SAVER.text,
  },
  cardLabelActive: {
    color: SAVER.accent,
  },
  cardDesc: {
    fontSize: 12,
    color: SAVER.textMuted,
    marginTop: 3,
    lineHeight: 17,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: 'rgba(0,102,255,0.2)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: SAVER.textMuted,
    letterSpacing: 0.5,
  },
  badgeTextActive: {
    color: SAVER.accent,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: SAVER.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioActive: {
    borderColor: SAVER.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SAVER.accent,
  },
});
