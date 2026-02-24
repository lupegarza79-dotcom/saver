import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { X, Shield, AlertTriangle } from 'lucide-react-native';
import { SAVER } from '@/constants/theme';

interface CoverageExplainerProps {
  visible: boolean;
  onClose: () => void;
  language?: 'en' | 'es';
}

export default function CoverageExplainer({ visible, onClose, language = 'en' }: CoverageExplainerProps) {
  const isEs = language === 'es';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Shield size={22} color={SAVER.accent} />
              <Text style={styles.title}>
                {isEs ? 'Cobertura en Texas' : 'Texas Coverage'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
              <X size={20} color={SAVER.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>
              {isEs ? 'Mínimo Legal en Texas' : 'Texas Legal Minimum'}
            </Text>
            <Text style={styles.limitsTitle}>30/60/25</Text>

            <View style={styles.limitRow}>
              <View style={[styles.limitBadge, { backgroundColor: SAVER.accentLight }]}>
                <Text style={[styles.limitBadgeText, { color: SAVER.accent }]}>$30k</Text>
              </View>
              <Text style={styles.limitDesc}>
                {isEs
                  ? 'Lesiones corporales por persona'
                  : 'Bodily injury per person'}
              </Text>
            </View>

            <View style={styles.limitRow}>
              <View style={[styles.limitBadge, { backgroundColor: SAVER.accentLight }]}>
                <Text style={[styles.limitBadgeText, { color: SAVER.accent }]}>$60k</Text>
              </View>
              <Text style={styles.limitDesc}>
                {isEs
                  ? 'Lesiones corporales por accidente'
                  : 'Bodily injury per accident'}
              </Text>
            </View>

            <View style={styles.limitRow}>
              <View style={[styles.limitBadge, { backgroundColor: SAVER.accentLight }]}>
                <Text style={[styles.limitBadgeText, { color: SAVER.accent }]}>$25k</Text>
              </View>
              <Text style={styles.limitDesc}>
                {isEs
                  ? 'Daños a propiedad'
                  : 'Property damage'}
              </Text>
            </View>

            <View style={styles.warningCard}>
              <AlertTriangle size={16} color={SAVER.orange} />
              <Text style={styles.warningText}>
                {isEs
                  ? 'Este es el mínimo legal. Puede no cubrir completamente accidentes más grandes.'
                  : 'This is the legal minimum. It may not fully cover larger accidents.'}
              </Text>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              {isEs ? 'Cobertura Full' : 'Full Coverage'}
            </Text>
            <Text style={styles.fullDesc}>
              {isEs
                ? 'Cobertura full incluye Colisión + Comprehensivo además de la responsabilidad civil. Recomendado si tienes un vehículo financiado.'
                : 'Full coverage includes Collision + Comprehensive in addition to liability. Recommended if your vehicle is financed.'}
            </Text>
          </ScrollView>

          <Pressable onPress={onClose} style={styles.gotItBtn}>
            <Text style={styles.gotItText}>
              {isEs ? 'Entendido' : 'Got it'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: SAVER.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: SAVER.border,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: SAVER.text,
    letterSpacing: -0.3,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: SAVER.textSecondary,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
  },
  limitsTitle: {
    fontSize: 40,
    fontWeight: '800' as const,
    color: SAVER.text,
    letterSpacing: -1,
    marginBottom: 20,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  limitBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  limitBadgeText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  limitDesc: {
    flex: 1,
    fontSize: 14,
    color: SAVER.textSecondary,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: SAVER.orangeLight,
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,149,0,0.15)',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: SAVER.text,
    lineHeight: 19,
  },
  fullDesc: {
    fontSize: 14,
    color: SAVER.textSecondary,
    lineHeight: 21,
  },
  gotItBtn: {
    backgroundColor: SAVER.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  gotItText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
});
