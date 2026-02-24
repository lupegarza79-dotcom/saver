import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Lock, Star, Shield } from 'lucide-react-native';

interface TrustBadgesProps {
  items?: { icon: 'lock' | 'star' | 'shield'; label: string }[];
  color?: string;
  textColor?: string;
  dotColor?: string;
}

const ICON_MAP = {
  lock: Lock,
  star: Star,
  shield: Shield,
};

export default function TrustBadges({
  items = [],
  color = '#00C96F',
  textColor = 'rgba(255,255,255,0.5)',
  dotColor = 'rgba(255,255,255,0.2)',
}: TrustBadgesProps) {
  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const IconComponent = ICON_MAP[item.icon] || Shield;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
            )}
            <View style={styles.item}>
              <IconComponent size={13} color={color} strokeWidth={2.5} />
              <Text style={[styles.text, { color: textColor }]}>{item.label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  text: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
