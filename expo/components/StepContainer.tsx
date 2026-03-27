import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

interface StepContainerProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  canProceed?: boolean;
  isSubmitting?: boolean;
  isLastStep?: boolean;
  submitLabel?: string;
  bottomInset?: number;
  slideDirection?: 'forward' | 'back' | null;
}

const DARK = {
  bg: '#0A1120',
  text: '#F0F4F8',
  textSecondary: '#8B9DC3',
  textMuted: '#5A6E8A',
  accent: '#0066FF',
  accentLight: 'rgba(0,102,255,0.12)',
};

export default function StepContainer({
  children,
  icon,
  title,
  subtitle,
  onBack,
  onNext,
  backLabel = 'Back',
  nextLabel = 'Next',
  canProceed = true,
  isSubmitting = false,
  isLastStep = false,
  submitLabel = 'Submit',
  bottomInset = 20,
  slideDirection = null,
}: StepContainerProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (slideDirection) {
      slideAnim.setValue(slideDirection === 'forward' ? 40 : -40);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [slideDirection, slideAnim]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
            <View style={styles.stepContent}>
              {icon && <View style={styles.iconRow}>{icon}</View>}
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.subtitle}>{subtitle}</Text>
              ) : null}
              {children}
            </View>
          </Animated.View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(bottomInset, 20) }]}>
          {onBack && (
            <Pressable style={styles.backButton} onPress={onBack} testID="step-back">
              <ChevronLeft size={20} color={DARK.textSecondary} />
              <Text style={styles.backButtonText}>{backLabel}</Text>
            </Pressable>
          )}
          {onNext && (
            <Pressable
              style={[
                styles.nextButton,
                !canProceed && styles.nextButtonDisabled,
              ]}
              onPress={onNext}
              disabled={!canProceed || isSubmitting}
              testID="step-next"
            >
              <Text style={styles.nextButtonText}>
                {isLastStep ? submitLabel : nextLabel}
              </Text>
              {!isLastStep && <ChevronRight size={18} color="#FFFFFF" />}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
  },
  stepContent: {
    flex: 1,
  },
  iconRow: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: DARK.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: DARK.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: DARK.textSecondary,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: DARK.accent,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginLeft: 'auto',
  },
  nextButtonDisabled: {
    opacity: 0.4,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
