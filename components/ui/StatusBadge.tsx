import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SAVER } from '@/constants/theme';

interface StatusBadgeProps {
  status: string;
  language?: 'en' | 'es';
  size?: 'small' | 'medium';
}

const STATUS_CONFIG: Record<string, {
  labelEn: string;
  labelEs: string;
  color: string;
  bgColor: string;
  helperEn?: string;
  helperEs?: string;
}> = {
  WAITING_DOCS: {
    labelEn: 'Waiting for Documents',
    labelEs: 'Esperando Documentos',
    color: SAVER.orange,
    bgColor: SAVER.orangeLight,
    helperEn: 'We need your policy documents to continue.',
    helperEs: 'Necesitamos tus documentos de póliza para continuar.',
  },
  NEEDS_INFO: {
    labelEn: 'Needs More Info',
    labelEs: 'Necesita Más Info',
    color: '#F59E0B',
    bgColor: 'rgba(245,158,11,0.12)',
    helperEn: 'A few details are missing to get you a quote.',
    helperEs: 'Faltan algunos datos para cotizarte.',
  },
  READY_TO_QUOTE: {
    labelEn: 'Ready to Quote',
    labelEs: 'Listo para Cotizar',
    color: SAVER.green,
    bgColor: SAVER.greenLight,
    helperEn: 'We have everything we need!',
    helperEs: '¡Tenemos todo lo que necesitamos!',
  },
  ROUTED_TO_AGENTS: {
    labelEn: 'Sent to Agents',
    labelEs: 'Enviado a Agentes',
    color: SAVER.accent,
    bgColor: SAVER.accentLight,
  },
  QUOTED: {
    labelEn: 'Quoted',
    labelEs: 'Cotizado',
    color: SAVER.accent,
    bgColor: SAVER.accentLight,
  },
  WON: {
    labelEn: 'Bound',
    labelEs: 'Contratado',
    color: SAVER.green,
    bgColor: SAVER.greenLight,
  },
  LOST: {
    labelEn: 'Closed',
    labelEs: 'Cerrado',
    color: SAVER.textMuted,
    bgColor: 'rgba(90,110,138,0.12)',
  },
};

export default function StatusBadge({ status, language = 'en', size = 'medium' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    labelEn: status,
    labelEs: status,
    color: SAVER.textMuted,
    bgColor: 'rgba(90,110,138,0.12)',
  };

  const label = language === 'es' ? config.labelEs : config.labelEn;
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, isSmall && styles.badgeSmall]}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={[styles.label, { color: config.color }, isSmall && styles.labelSmall]}>{label}</Text>
    </View>
  );
}

export function getStatusHelper(status: string, language: 'en' | 'es'): string | undefined {
  const config = STATUS_CONFIG[status];
  if (!config) return undefined;
  return language === 'es' ? config.helperEs : config.helperEn;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 10,
  },
});
