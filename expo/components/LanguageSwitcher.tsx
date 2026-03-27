import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/contexts/AppContext';

const FLAG_USA = 'https://flagcdn.com/w80/us.png';
const FLAG_MEX = 'https://flagcdn.com/w80/mx.png';

const COLORS = {
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  primary: '#1A1A1A',
  accent: '#10B981',
  border: '#E5E7EB',
};

interface LanguageSwitcherProps {
  variant?: 'compact' | 'full' | 'pill';
  showIcon?: boolean;
  style?: object;
}

export default function LanguageSwitcher({ 
  variant = 'pill', 
  showIcon = true,
  style 
}: LanguageSwitcherProps) {
  const { language, setLanguage } = useApp();

  const handleToggle = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setLanguage(language === 'en' ? 'es' : 'en');
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity 
        style={[styles.compactButton, style]} 
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.compactText}>
          {language === 'en' ? 'ES' : 'EN'}
        </Text>
      </TouchableOpacity>
    );
  }

  if (variant === 'full') {
    return (
      <View style={[styles.fullContainer, style]}>
        <TouchableOpacity
          style={[styles.fullOption, language === 'en' && styles.fullOptionActive]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            setLanguage('en');
          }}
        >
          <Text style={[styles.fullText, language === 'en' && styles.fullTextActive]}>
            English
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fullOption, language === 'es' && styles.fullOptionActive]}
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            setLanguage('es');
          }}
        >
          <Text style={[styles.fullText, language === 'es' && styles.fullTextActive]}>
            Español
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.pillContainer, style]}>
      <TouchableOpacity 
        style={[styles.flagOption, language === 'en' && styles.flagOptionActive]} 
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          setLanguage('en');
        }}
        activeOpacity={0.7}
      >
        <Image source={{ uri: FLAG_USA }} style={styles.flagImage} />
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.flagOption, language === 'es' && styles.flagOptionActive]} 
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          setLanguage('es');
        }}
        activeOpacity={0.7}
      >
        <Image source={{ uri: FLAG_MEX }} style={styles.flagImage} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  compactButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  fullContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullOptionActive: {
    backgroundColor: COLORS.primary,
  },
  fullText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: COLORS.textSecondary,
  },
  fullTextActive: {
    color: '#FFFFFF',
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 4,
    gap: 4,
  },
  flagOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    opacity: 0.5,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  flagOptionActive: {
    opacity: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  flagImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
});
