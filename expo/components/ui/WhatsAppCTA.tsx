import React from 'react';
import { Pressable, Text, StyleSheet, Linking, Platform, ViewStyle } from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SAVER } from '@/constants/theme';

interface WhatsAppCTAProps {
  label: string;
  message: string;
  number?: string;
  style?: ViewStyle;
}

const DEFAULT_NUMBER = '+19567738844';

export default function WhatsAppCTA({ label, message, number = DEFAULT_NUMBER, style }: WhatsAppCTAProps) {
  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    Linking.openURL(url);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && { opacity: 0.9 }, style]}
    >
      <MessageCircle size={18} color="#FFFFFF" strokeWidth={2.5} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SAVER.whatsapp,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
